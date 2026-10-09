"""Pytest configuration: isolated temp DB, secrets, and storage."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

_TMP = tempfile.mkdtemp(prefix="veilproof-test-")
os.environ["APP_ENV"] = "test"
os.environ["RUN_PROFILE"] = "demo"
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_TMP}/test.db"
os.environ["STORAGE_BACKEND"] = "local"
os.environ["STORAGE_LOCAL_DIR"] = f"{_TMP}/storage"
os.environ["SECRETS_DIR"] = f"{_TMP}/keys"
os.environ["TRACKING_PEPPER_FILE"] = f"{_TMP}/keys/pepper.bin"
os.environ["KEY_BROKER_PRIVATE_KEY_FILE"] = f"{_TMP}/keys/broker_private.pem"
os.environ["KEY_BROKER_PUBLIC_KEY_FILE"] = f"{_TMP}/keys/broker_public.pem"
os.environ["STAFF_SESSION_SECRET_FILE"] = f"{_TMP}/keys/session.bin"
os.environ["DEMO_RESET_ENABLED"] = "true"
os.environ["DEMO_ACCESS_DURATION_SECONDS"] = "0"

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

API = "/api/v1"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client: TestClient, username: str, password: str) -> dict:
    r = client.post(f"{API}/staff/sessions", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture
def privacy_headers(client):
    return _login(client, "priya.nair", "demo-priv")


@pytest.fixture
def investigator_headers(client):
    return _login(client, "arjun.mehta", "demo-inv")


@pytest.fixture
def oversight_headers(client):
    return _login(client, "meera.rao", "demo-over")


@pytest.fixture
def dual_headers(client):
    # same human principal as meera, role=privacy (test-only)
    return _login(client, "meera.dual", "demo-dual")


@pytest.fixture
def dup_oversight_headers(client):
    # oversight account that shares a principal with the Privacy reviewer (test-only)
    return _login(client, "priya.dup", "demo-dup")
