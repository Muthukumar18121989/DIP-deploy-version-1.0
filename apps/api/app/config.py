import os
from pathlib import Path

API_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = API_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = DATA_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

DEMO_ROW_COUNT = 150_000

# CORS_ORIGINS: comma-separated list of allowed frontend origins via env var
# (e.g. "https://your-frontend.vercel.app"), on top of the local dev defaults.
_env_origins = os.environ.get("CORS_ORIGINS", "")
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + [origin.strip() for origin in _env_origins.split(",") if origin.strip()]

# Seeded once at startup if no admin account exists yet (see main.py). Change
# these via env vars for any deployment beyond local/demo use.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@decisionos.local")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin12345")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin")
