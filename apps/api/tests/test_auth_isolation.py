"""Fix 1: the server checks the session on every route, and one account
can't see or change another account's data."""

from fastapi.routing import APIRoute

from app.main import app
from tests.conftest import create_use_case

PUBLIC_ROUTES = {("POST", "/api/auth/register"), ("POST", "/api/auth/login"), ("GET", "/health"), ("POST", "/api/auth/logout")}


def _fill(path: str) -> str:
    return (
        path.replace("{use_case_id}", "x").replace("{experiment_id}", "x")
        .replace("{strategy_id}", "x").replace("{widget_id}", "x")
    )


def test_every_api_route_rejects_anonymous_requests(client):
    checked = 0
    for route in app.routes:
        if not isinstance(route, APIRoute) or not route.path.startswith("/api"):
            continue
        for method in route.methods:
            if (method, route.path) in PUBLIC_ROUTES:
                continue
            res = client.request(method, _fill(route.path), params={"ids": "a,b"})
            assert res.status_code == 401, f"{method} {route.path} answered {res.status_code} without a login"
            checked += 1
    assert checked > 35


def test_users_only_see_their_own_use_cases(client, alice, bob):
    alice_uc = create_use_case(client, alice, "Alice's case")
    bob_uc = create_use_case(client, bob, "Bob's case")

    alice_ids = {uc["id"] for uc in client.get("/api/use-cases", headers=alice).json()}
    assert alice_uc in alice_ids and bob_uc not in alice_ids

    for method, path in [
        ("GET", f"/api/use-cases/{bob_uc}"),
        ("PATCH", f"/api/use-cases/{bob_uc}"),
        ("DELETE", f"/api/use-cases/{bob_uc}"),
        ("POST", f"/api/use-cases/{bob_uc}/duplicate"),
        ("POST", f"/api/use-cases/{bob_uc}/data/generate"),
        ("GET", f"/api/use-cases/{bob_uc}/strategies"),
        ("GET", f"/api/use-cases/{bob_uc}/experiments"),
        ("GET", f"/api/use-cases/{bob_uc}/connectors"),
        ("GET", f"/api/use-cases/{bob_uc}/widget-layout"),
    ]:
        res = client.request(method, path, headers=alice, json={} if method == "PATCH" else None)
        assert res.status_code == 404, f"{method} {path} answered {res.status_code} for another account"

    # Bob's data is untouched and still his.
    assert client.get(f"/api/use-cases/{bob_uc}", headers=bob).status_code == 200


def test_pipeline_stream_needs_a_valid_token(client, alice, bob):
    uc = create_use_case(client, alice)
    assert client.get(f"/api/use-cases/{uc}/pipeline/stream").status_code == 401
    assert client.get(f"/api/use-cases/{uc}/pipeline/stream?token=nope").status_code == 401
    bob_token = bob["Authorization"].removeprefix("Bearer ")
    assert client.get(f"/api/use-cases/{uc}/pipeline/stream?token={bob_token}").status_code == 404


def test_admin_sees_every_use_case(client, alice, admin):
    uc = create_use_case(client, alice)
    assert uc in {u["id"] for u in client.get("/api/use-cases", headers=admin).json()}
    assert client.get(f"/api/use-cases/{uc}", headers=admin).status_code == 200


def test_duplicate_belongs_to_the_user_who_duplicated(client, alice, admin):
    uc = create_use_case(client, alice)
    clone = client.post(f"/api/use-cases/{uc}/duplicate", headers=admin).json()["id"]
    assert clone not in {u["id"] for u in client.get("/api/use-cases", headers=alice).json()}
