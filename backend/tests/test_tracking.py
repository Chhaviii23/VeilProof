"""Reporter tracking confidentiality tests (P03B)."""

from __future__ import annotations

from tests.helpers import API, submit_report

SEED_REF = "VP-SEED-0001"
SEED_SECRET = "TRK-E9F2-8C3A-1B7D"


def test_seed_tracking_works(client):
    r = client.post(f"{API}/tracking/sessions", json={"case_reference": SEED_REF, "tracking_secret": SEED_SECRET})
    assert r.status_code == 200, r.text
    token = r.json()["session_token"]
    s = client.get(f"{API}/tracking/status", headers={"Authorization": f"Bearer {token}"})
    assert s.status_code == 200
    body = s.json()
    assert body["case_reference"] == SEED_REF
    # Internal-only fields must never appear.
    raw = s.text
    for forbidden in ("internalNotes", "auditTrail", "assignedInvestigatorId", "description"):
        assert forbidden not in raw


def test_wrong_secret_and_reference_are_uniform(client):
    r1 = client.post(f"{API}/tracking/sessions", json={"case_reference": SEED_REF, "tracking_secret": "WRONG-SECRET-XYZ"})
    r2 = client.post(f"{API}/tracking/sessions", json={"case_reference": "VP-DOES-NOT-EXIST", "tracking_secret": "WHATEVER"})
    assert r1.status_code == 401 and r2.status_code == 401
    assert r1.json()["safe_message"] == r2.json()["safe_message"]


def test_fresh_case_tracking_and_proof_package(client):
    result = submit_report(client, risk_factors=["physical_threat"])
    r = client.post(f"{API}/tracking/sessions", json={
        "case_reference": result["case_reference"], "tracking_secret": result["tracking_secret"],
    })
    assert r.status_code == 200
    token = r.json()["session_token"]
    status = client.get(f"{API}/tracking/status", headers={"Authorization": f"Bearer {token}"}).json()
    assert status["proof_summary"]["proof_status"] in ("pending", "confirmed")
    pkg = client.post(f"{API}/tracking/proof-package", headers={"Authorization": f"Bearer {token}"}).json()["package"]
    # No tracking secret or narrative in the package.
    assert result["tracking_secret"] not in str(pkg)
    assert "description" not in pkg
    if pkg:
        assert "salt" in pkg and "commitment" in pkg
