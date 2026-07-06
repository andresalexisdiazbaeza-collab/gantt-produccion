from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..auth_utils import (
    INITIAL_PASSWORD,
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from ..database import get_db
from ..deps import get_current_user, require_user_management
from ..email_service import APP_URL, send_password_reset_email
from ..models import User
from ..permissions import (
    default_permissions_for_role,
    load_user_permissions,
    normalize_permissions,
    permissions_schema,
    save_user_permissions,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    username: str
    role: str
    display_name: str
    email: Optional[str] = None
    permissions: dict[str, Any]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UpdateProfileRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


class AdminResetPasswordRequest(BaseModel):
    username: str
    new_password: Optional[str] = None


class AdminUserOut(BaseModel):
    username: str
    role: str
    display_name: str
    email: Optional[str] = None
    active: bool
    permissions: dict[str, Any]


class PermissionEntryIn(BaseModel):
    view: bool = False
    modify: bool = False


class UserPermissionsIn(BaseModel):
    modules: dict[str, PermissionEntryIn] = Field(default_factory=dict)
    items: dict[str, PermissionEntryIn] = Field(default_factory=dict)


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=5)
    role: str
    display_name: str = Field(min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    permissions: Optional[UserPermissionsIn] = None


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    active: Optional[bool] = None
    permissions: Optional[UserPermissionsIn] = None


def user_out(user: User) -> UserOut:
    return UserOut(
        username=user.username,
        role=user.role,
        display_name=user.display_name,
        email=user.email,
        permissions=load_user_permissions(user),
    )


def _permissions_from_input(role: str, data: Optional[UserPermissionsIn]) -> dict[str, Any]:
    if not data:
        return default_permissions_for_role(role)
    raw = {
        "modules": {k: v.model_dump() for k, v in data.modules.items()},
        "items": {k: v.model_dump() for k, v in data.items.items()},
    }
    return normalize_permissions(raw, role)


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip(), User.active.is_(True)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    token = create_access_token(username=user.username, role=user.role)
    return LoginResponse(access_token=token, user=user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.put("/profile", response_model=UserOut)
def update_profile(data: UpdateProfileRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    email = data.email.strip().lower()
    existing = db.query(User).filter(User.email == email, User.id != user.id).first()
    if existing:
        raise HTTPException(400, "Ese correo ya está en uso")
    user.email = email
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "La contraseña actual no es correcta")
    try:
        validate_password_strength(data.new_password)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    if verify_password(data.new_password, user.password_hash):
        raise HTTPException(400, "La nueva contraseña debe ser diferente a la actual")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return MessageResponse(message="Contraseña actualizada correctamente")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email, User.active.is_(True)).first()
    if user:
        token = create_reset_token(username=user.username)
        reset_url = f"{APP_URL}/reset-password?token={token}"
        send_password_reset_email(to_email=user.email, username=user.username, reset_url=reset_url)
    return MessageResponse(
        message="Si el correo está registrado, recibirás un enlace para restablecer la contraseña.",
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    username = decode_reset_token(data.token)
    if not username:
        raise HTTPException(400, "El enlace de recuperación no es válido o ha expirado")
    user = db.query(User).filter(User.username == username, User.active.is_(True)).first()
    if not user:
        raise HTTPException(400, "El enlace de recuperación no es válido o ha expirado")
    try:
        validate_password_strength(data.new_password)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return MessageResponse(message="Contraseña restablecida. Ya puedes iniciar sesión.")


@router.get("/permissions/schema")
def get_permissions_schema(_user: User = Depends(get_current_user)):
    return permissions_schema()


@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), _mgr: User = Depends(require_user_management)):
    users = db.query(User).order_by(User.username).all()
    return [
        AdminUserOut(
            username=u.username,
            role=u.role,
            display_name=u.display_name,
            email=u.email,
            active=u.active,
            permissions=load_user_permissions(u),
        )
        for u in users
    ]


@router.post("/users", response_model=AdminUserOut)
def create_user(data: CreateUserRequest, db: Session = Depends(get_db), _mgr: User = Depends(require_user_management)):
    username = data.username.strip().lower()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(400, "El nombre de usuario ya existe")
    if data.email:
        email = data.email.strip().lower()
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(400, "Ese correo ya está en uso")
    else:
        email = None
    if data.role not in permissions_schema()["roles"]:
        raise HTTPException(400, "Rol no válido")
    try:
        validate_password_strength(data.password, admin_reset=True)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    perms = _permissions_from_input(data.role, data.permissions)
    user = User(
        username=username,
        role=data.role,
        display_name=data.display_name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        permissions_json=save_user_permissions(perms),
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AdminUserOut(
        username=user.username,
        role=user.role,
        display_name=user.display_name,
        email=user.email,
        active=user.active,
        permissions=load_user_permissions(user),
    )


@router.put("/users/{username}", response_model=AdminUserOut)
def update_user(
    username: str,
    data: UpdateUserRequest,
    db: Session = Depends(get_db),
    mgr: User = Depends(require_user_management),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.username == mgr.username and data.active is False:
        raise HTTPException(400, "No puedes desactivar tu propio usuario")
    if data.role is not None:
        if data.role not in permissions_schema()["roles"]:
            raise HTTPException(400, "Rol no válido")
        user.role = data.role
    if data.display_name is not None:
        user.display_name = data.display_name.strip()
    if data.email is not None:
        email = data.email.strip().lower()
        existing = db.query(User).filter(User.email == email, User.id != user.id).first()
        if existing:
            raise HTTPException(400, "Ese correo ya está en uso")
        user.email = email
    if data.active is not None:
        user.active = data.active
    if data.permissions is not None or data.role is not None:
        role = user.role
        perms = _permissions_from_input(role, data.permissions)
        user.permissions_json = save_user_permissions(perms)
    db.commit()
    db.refresh(user)
    return AdminUserOut(
        username=user.username,
        role=user.role,
        display_name=user.display_name,
        email=user.email,
        active=user.active,
        permissions=load_user_permissions(user),
    )


@router.post("/admin/reset-password", response_model=MessageResponse)
def admin_reset_password(
    data: AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    _mgr: User = Depends(require_user_management),
):
    username = data.username.strip()
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    new_password = data.new_password or INITIAL_PASSWORD
    try:
        validate_password_strength(new_password, admin_reset=True)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    user.password_hash = hash_password(new_password)
    db.commit()
    return MessageResponse(message=f"Contraseña de {username} restablecida")
