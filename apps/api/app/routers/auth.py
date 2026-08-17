import re
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth import create_session, get_current_user, get_user_by_email, hash_password, verify_password
from app.db import get_db
from app.models import Session as SessionModel
from app.models import User
from app.schemas import AuthOut, LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("/register", response_model=AuthOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if get_user_by_email(db, email) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    password_hash, salt = hash_password(payload.password)
    user = User(email=email, name=payload.name.strip(), password_hash=password_hash, password_salt=salt)
    db.add(user)
    db.commit()
    db.refresh(user)

    session = create_session(db, user)
    return AuthOut(token=session.token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash, user.password_salt):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    user.last_login_at = datetime.utcnow()
    db.commit()

    session = create_session(db, user)
    return AuthOut(token=session.token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/logout", status_code=204)
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        session = db.get(SessionModel, token)
        if session is not None:
            db.delete(session)
            db.commit()
    return None
