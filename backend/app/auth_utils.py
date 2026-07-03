from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt

SECRET_KEY = os.environ.get("GANTT_JWT_SECRET", "gantt-produccion-dev-secret-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12
RESET_TOKEN_EXPIRE_MINUTES = 60
MIN_PASSWORD_LENGTH = 8
INITIAL_PASSWORD = "12345"
MIN_ADMIN_RESET_LENGTH = 5

PLANNING_ROLES = frozenset({"admin", "production"})


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, digest = password_hash.split("$", 1)
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return secrets.compare_digest(digest, check)


def create_access_token(*, username: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": username, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def validate_password_strength(password: str, *, admin_reset: bool = False) -> None:
    min_len = MIN_ADMIN_RESET_LENGTH if admin_reset else MIN_PASSWORD_LENGTH
    if len(password) < min_len:
        raise ValueError(f"La contraseña debe tener al menos {min_len} caracteres")


def create_reset_token(*, username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "type": "password_reset", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_reset_token(token: str) -> Optional[str]:
    payload = decode_token(token)
    if not payload or payload.get("type") != "password_reset":
        return None
    username = payload.get("sub")
    return str(username) if username else None
