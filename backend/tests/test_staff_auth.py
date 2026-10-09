"""Staff authentication and server-side authorization tests (P02A)."""

from __future__ import annotations

from tests.helpers import API


def test_login_and_me(client, privacy_headers):
    me = client.get(f"{API}/staff/me", headers=privacy_headers)
    assert me.status_code == 200
    assert me.json()["roleType"] == "privacy-officer"


def test_missing_and_bad_token(client):
    assert client.get(f"{API}/staff/me").status_code == 401
    assert client.get(f"{API}/staff/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_tampered_client_role_does_not_grant_permission(client, investigator_headers):
    # An investigator may not read the privacy queue regardless of any client-supplied role.
    r = client.get(
        f"{API}/staff/privacy/queue",
        headers={**investigator_headers, "X-Role": "privacy-officer"},
    )
    assert r.status_code == 403


def test_logout_invalidates_session(client):
    token = client.post(
        f"{API}/staff/sessions", json={"username": "priya.nair", "password": "demo-priv"}
    ).json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    assert client.get(f"{API}/staff/me", headers=h).status_code == 200
    assert client.delete(f"{API}/staff/sessions/current", headers=h).status_code == 200
    assert client.get(f"{API}/staff/me", headers=h).status_code == 401


def test_wrong_password_rejected(client):
    r = client.post(f"{API}/staff/sessions", json={"username": "priya.nair", "password": "nope"})
    assert r.status_code == 401


def test_dual_account_same_principal_is_recognized_as_same_human(client, dual_headers, oversight_headers):
    # meera.rao (oversight) and meera.dual (privacy) share human principal 'meera'.
    a = client.get(f"{API}/staff/me", headers=dual_headers).json()
    b = client.get(f"{API}/staff/me", headers=oversight_headers).json()
    assert a["id"] != b["id"]  # distinct memberships
    assert a["name"].startswith("Meera") and b["name"].startswith("Meera")
