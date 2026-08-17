from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from app.auth import get_user_by_email, hash_password
from app.config import ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, CORS_ORIGINS
from app.db import Base, SessionLocal, engine
from app import models  # noqa: F401  (ensures models are registered before create_all)
from app.models import User
from app.routers import admin, auth, connectors, data, experiments, monitoring, pipeline, strategies, use_cases, widgets

Base.metadata.create_all(bind=engine)


def _ensure_owner_user_id_column() -> None:
    """create_all() only creates whole new tables, never alters existing
    ones — the pre-existing use_cases table (and any real data in it) needs
    this column added in place so old rows keep working unchanged (NULL =
    still 'Unassigned', exactly as before)."""
    with engine.connect() as conn:
        columns = {row[1] for row in conn.execute(text("PRAGMA table_info(use_cases)"))}
        if "owner_user_id" not in columns:
            conn.execute(text("ALTER TABLE use_cases ADD COLUMN owner_user_id VARCHAR"))
            conn.commit()


_ensure_owner_user_id_column()


def _seed_default_admin() -> None:
    """Idempotent: only creates an admin if none exists at all, so this is
    safe to run on every startup and never overwrites an admin's changed
    password or duplicates accounts."""
    db = SessionLocal()
    try:
        has_admin = db.execute(select(User).where(User.role == "admin")).scalars().first()
        if has_admin is not None:
            return
        if get_user_by_email(db, ADMIN_EMAIL) is not None:
            return
        password_hash, salt = hash_password(ADMIN_PASSWORD)
        db.add(
            User(
                email=ADMIN_EMAIL.lower().strip(),
                name=ADMIN_NAME,
                password_hash=password_hash,
                password_salt=salt,
                role="admin",
            )
        )
        db.commit()
    finally:
        db.close()


_seed_default_admin()

app = FastAPI(
    title="Decision Intelligence Platform API",
    description="Real data profiling, ML training, forecasting, and decision "
    "generation for the Decision Intelligence Platform vertical slice.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(use_cases.router)
app.include_router(data.router)
app.include_router(pipeline.router)
app.include_router(connectors.router)
app.include_router(experiments.router)
app.include_router(strategies.router)
app.include_router(monitoring.router)
app.include_router(widgets.router)
app.include_router(auth.router)
app.include_router(admin.router)
