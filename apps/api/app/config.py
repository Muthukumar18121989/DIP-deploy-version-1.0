import os
from pathlib import Path

API_ROOT = Path(__file__).resolve().parent.parent
# DIP_DATA_DIR lets tests (and deployments) point the database and artifact
# store somewhere other than the repo checkout.
DATA_DIR = Path(os.environ.get("DIP_DATA_DIR") or API_ROOT / "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

DEMO_ROW_COUNT = int(os.environ.get("DIP_DEMO_ROW_COUNT", "150000"))

# CORS_ORIGINS: comma-separated list of allowed frontend origins via env var
# (e.g. "https://your-frontend.vercel.app"), on top of the local dev defaults.
_env_origins = os.environ.get("CORS_ORIGINS", "")
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + [origin.strip() for origin in _env_origins.split(",") if origin.strip()]

# Seeded once at startup if no admin account exists yet (see main.py).
#
# ADMIN_PASSWORD deliberately has no fallback value. A literal default here
# would be a working admin credential published in this repo, so anyone who
# found a deployment's URL could sign in as admin and read every user's data
# through the Admin Dashboard. When it is unset, main.py generates a random
# password at first startup and prints it once — see _seed_default_admin.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@decisionos.local")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD") or None
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin")
