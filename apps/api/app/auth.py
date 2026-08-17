"""Password hashing and session verification for the admin/user login
feature. Deliberately stdlib-only (hashlib PBKDF2-HMAC + secrets), matching
the app's existing "avoid unnecessary dependencies" convention rather than
adding passlib/bcrypt for a single-admin-scale portfolio app."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.db import get_db
from app.models import Session as SessionModel
from app.models import User

PBKDF2_ITERATIONS = 260_000
SESSION_LIFETIME = timedelta(days=30)


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS)
    return digest.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    candidate, _ = hash_password(password, salt)
    return hmac.compare_digest(candidate, password_hash)


def create_session(db: DbSession, user: User) -> SessionModel:
    # Naive UTC, matching how SQLite round-trips DateTime columns (it drops
    # tzinfo on read) — comparing an aware datetime against one of these
    # raises TypeError, so every timestamp here stays naive-UTC consistently.
    now = datetime.utcnow()
    session = SessionModel(
        token=secrets.token_urlsafe(32),
        user_id=user.id,
        created_at=now,
        expires_at=now + SESSION_LIFETIME,
    )
    db.add(session)
    db.commit()
    return session


def _resolve_bearer_user(authorization: str | None, db: DbSession) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None
    session = db.get(SessionModel, token)
    if session is None:
        return None
    if session.expires_at < datetime.utcnow():
        return None
    return db.get(User, session.user_id)


def get_current_user_optional(
    authorization: str | None = Header(default=None), db: DbSession = Depends(get_db)
) -> User | None:
    """Never raises — existing anonymous flows (creating a use case while
    logged out, etc.) keep working exactly as before."""
    return _resolve_bearer_user(authorization, db)


def get_current_user(user: User | None = Depends(get_current_user_optional)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def get_user_by_email(db: DbSession, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email.lower().strip())).scalars().first()
