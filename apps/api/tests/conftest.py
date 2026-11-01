import os
import tempfile

# Must be set before `app` is imported: config.py reads them at import time.
_tmp = tempfile.mkdtemp(prefix="dip-test-")
os.environ["DIP_DATA_DIR"] = _tmp
os.environ["DIP_DEMO_ROW_COUNT"] = "6000"
os.environ["ADMIN_EMAIL"] = "admin@test.local"
os.environ["ADMIN_PASSWORD"] = "admin-test-password"

import uuid  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


def _register(client, name):
    email = f"{name}-{uuid.uuid4().hex[:8]}@test.local"
    res = client.post("/api/auth/register", json={"email": email, "name": name, "password": "pw-123456"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture
def alice(client):
    return _register(client, "alice")


@pytest.fixture
def bob(client):
    return _register(client, "bob")


@pytest.fixture
def admin(client):
    res = client.post("/api/auth/login", json={"email": "admin@test.local", "password": "admin-test-password"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}


def create_use_case(client, headers, name="Revenue drop"):
    res = client.post(
        "/api/use-cases",
        headers=headers,
        json={"name": name, "problem": "Revenue fell", "objective": "Recover revenue", "kpi": "Revenue", "description": "test"},
    )
    assert res.status_code == 200, res.text
    return res.json()["id"]


def run_pipeline(client, headers, use_case_id):
    """Consume the SSE stream and return the list of events."""
    import json

    token = headers["Authorization"].removeprefix("Bearer ")
    events = []
    with client.stream("GET", f"/api/use-cases/{use_case_id}/pipeline/stream?token={token}") as res:
        assert res.status_code == 200, res.read()
        for line in res.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))
    return events
