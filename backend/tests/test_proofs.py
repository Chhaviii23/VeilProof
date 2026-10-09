"""Commitment protocol and independent verification tests (P07A/B)."""

from __future__ import annotations

from app.db import SessionLocal
from app.worker import process_batch
from tests.helpers import API, submit_report


def _drain_worker(rounds: int = 6) -> None:
    db = SessionLocal()
    try:
        for _ in range(rounds):
            if process_batch(db, 50) == 0:
                break
    finally:
        db.close()


def _package_for(client, result):
    token = client.post(
        f"{API}/tracking/sessions",
        json={"case_reference": result["case_reference"], "tracking_secret": result["tracking_secret"]},
    ).json()["session_token"]
    return client.post(f"{API}/tracking/proof-package", headers={"Authorization": f"Bearer {token}"}).json()["package"]


def test_real_local_commitment_and_verification(client):
    result = submit_report(client)
    _drain_worker()
    pkg = _package_for(client, result)
    assert pkg and pkg["provider"] == "local_registry"
    assert pkg["tx_ref"].startswith("local-registry-")

    v = client.post(
        f"{API}/verify/proof",
        json={
            "package": pkg,
            "candidates": {
                "original_sha256": result["original_sha256"],
                "protected_sha256": result["protected_sha256"],
            },
        },
    )
    assert v.status_code == 200, v.text
    body = v.json()
    assert body["commitment_match"] is True
    assert body["original_match"] is True and body["protected_match"] is True
    assert body["anchor"]["checked"] is True and body["anchor"]["ok"] is True


def test_one_byte_change_fails_original_match(client):
    result = submit_report(client)
    _drain_worker()
    pkg = _package_for(client, result)
    changed = list(result["original_sha256"])
    changed[-1] = "0" if changed[-1] != "0" else "1"
    v = client.post(
        f"{API}/verify/proof",
        json={"package": pkg, "candidates": {"original_sha256": "".join(changed)}},
    ).json()
    assert v["original_match"] is False
    assert v["commitment_match"] is True


def test_tampered_commitment_fails_match(client):
    result = submit_report(client)
    _drain_worker()
    pkg = _package_for(client, result)
    tampered = dict(pkg, commitment="00" * 32)
    v = client.post(f"{API}/verify/proof", json={"package": tampered}).json()
    assert v["commitment_match"] is False


def test_unknown_package_field_rejected(client):
    result = submit_report(client)
    _drain_worker()
    pkg = _package_for(client, result)
    bad = dict(pkg, rpc_url="http://evil.example")
    r = client.post(f"{API}/verify/proof", json={"package": bad})
    assert r.status_code == 422


def test_offline_scope_reports_none_supplied(client):
    result = submit_report(client)
    _drain_worker()
    pkg = _package_for(client, result)
    v = client.post(f"{API}/verify/proof", json={"package": pkg}).json()
    assert v["supplied_scope"] == "none"
    assert v["original_match"] is None


def test_proof_retry_does_not_duplicate_logical_identity(client):
    result = submit_report(client)
    _drain_worker()
    _drain_worker()  # second drain must not create a second proof identity
    from sqlalchemy import func, select

    from app.models import ProofRecord

    db = SessionLocal()
    try:
        count = db.scalar(
            select(func.count()).select_from(ProofRecord).where(ProofRecord.complaint_id == result["case_id"])
        )
        # exactly one item -> one logical file-pair proof
        assert count == 1
    finally:
        db.close()
