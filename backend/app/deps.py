from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .auth_utils import decode_token
from .permissions import can_manage_users, can_modify_module
from .database import get_db
from .models import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(401, "No autenticado")
    payload = decode_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(401, "Token inválido o expirado")
    user = db.query(User).filter(User.username == payload["sub"], User.active.is_(True)).first()
    if not user:
        raise HTTPException(401, "Usuario no encontrado")
    return user


def require_planning_access(user: User = Depends(get_current_user)) -> User:
    if not can_modify_module(user, "active_orders") and not can_modify_module(user, "import"):
        raise HTTPException(403, "No tienes permiso de modificación en planificación")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Solo admin puede realizar esta acción")
    return user


def require_user_management(user: User = Depends(get_current_user)) -> User:
    if not can_manage_users(user):
        raise HTTPException(403, "Solo admin y production con permiso de usuarios pueden gestionar usuarios")
    return user
