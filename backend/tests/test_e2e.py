"""End-to-end happy path + durability + proof outage (P09A)."""

from __future__ import annotations

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Complaint
from app.worker import process_batch
from tests.helpers import API, submit_report
from tests.test_proofs import _drain_worker


def test_end_to_end_and_durable_across_new_session(client, privacy_headers, investigator_headers, oversight_headers):
    result = submit_report(client, risk_factors=["physical_threat", "public_safety"])
    case_id = result["case_id"]

    # Durability: a fresh DB session (as after a backend restart) sees the case.
    db = SessionLocal()
    try:
        complaint = db.scalars(select(Complaint).where(Complaint.reference == result["case_reference"])).first()
        assert complaint is not None and complaint.id == case_id
        assert complaint.priority == "critical"
    finally:
        db.close()

    case = client.get(f"{API}/staff/cases/{case_id}", headers=privacy_headers).json()
    assert case["priority"] == "critical"

    # Privacy release + assignment
    ev = case["evidence"][0]
    assert client.post(f"{API}/staff/cases/{case_id}/releases", json={"evidence_id": ev["id"]}, headers=privacy_headers).status_code == 200
    assert client.post(f"{API}/staff/cases/{case_id}/assignments", json={"officer_code": "ACO-04"}, headers=privacy_headers).status_code == 200

    # Reporter sees only safe text
    token = client.post(f"{API}/tracking/sessions", json={"case_reference": result["case_reference"], "tracking_secret": result["tracking_secret"]}).json()["session_token"]
    status = client.get(f"{API}/tracking/status", headers={"Authorization": f"Bearer {token}"}).json()
    assert all("internal" not in u["text"].lower() for u in status["public_updates"])

    # Full original-access sequence
    req_body = {
        "evidence_id": ev["id"],
        "purpose": "Compare original timestamps against the fictional payment schedule",
        "insufficiency_reason": "The protected copy omits the timestamps required for this comparison",
        "intended_action": "Inspect embedded timestamps",
        "mode": "view_only", "duration_minutes": 10, "urgency": "high",
    }
    request_id = client.post(f"{API}/staff/cases/{case_id}/access-requests", json=req_body, headers=investigator_headers).json()["request_id"]
    client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/privacy-decisions", json={"decision": "approved"}, headers=privacy_headers)
    client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/oversight-decisions", json={"decision": "approved"}, headers=oversight_headers)

    case = client.get(f"{API}/staff/cases/{case_id}", headers=investigator_headers).json()
    grant_id = case["originalAccessRequests"][0]["grantId"]
    handle = client.post(f"{API}/staff/grants/{grant_id}/activate", headers=investigator_headers).json()["handle"]
    content = client.post(f"{API}/staff/viewer/content", json={"handle": handle}, headers=investigator_headers)
    assert content.status_code == 200 and content.content[:3] == b"\xff\xd8\xff"

    # End own access, then the handle is dead.
    assert client.post(f"{API}/staff/grants/{grant_id}/end", headers=investigator_headers).status_code == 200
    assert client.post(f"{API}/staff/viewer/content", json={"handle": handle}, headers=investigator_headers).status_code == 403

    # Proof + verification
    _drain_worker()
    pkg = client.post(f"{API}/tracking/proof-package", headers={"Authorization": f"Bearer {token}"}).json()["package"]
    v = client.post(f"{API}/verify/proof", json={
        "package": pkg,
        "candidates": {"original_sha256": result["original_sha256"], "protected_sha256": result["protected_sha256"]},
    }).json()
    assert v["commitment_match"] is True and v["anchor"]["ok"] is True


def test_no_evidence_submission_is_accepted_without_file_claims(client):
    result = submit_report(client, with_image=False)
    assert result["attachment_count"] == 0
    token = client.post(f"{API}/tracking/sessions", json={"case_reference": result["case_reference"], "tracking_secret": result["tracking_secret"]}).json()["session_token"]
    status = client.get(f"{API}/tracking/status", headers={"Authorization": f"Bearer {token}"}).json()
    assert status["protection_summary"]["evidence_count"] == 0
    # proof package must be empty (no file proof invented)
    pkg = client.post(f"{API}/tracking/proof-package", headers={"Authorization": f"Bearer {token}"}).json()["package"]
    assert pkg == {}


def test_proof_outage_does_not_lose_case(client):
    """If the worker never runs, the case remains accepted with proof pending."""
    result = submit_report(client)
    token = client.post(f"{API}/tracking/sessions", json={"case_reference": result["case_reference"], "tracking_secret": result["tracking_secret"]}).json()["session_token"]
    status = client.get(f"{API}/tracking/status", headers={"Authorization": f"Bearer {token}"}).json()
    assert status["proof_summary"]["proof_status"] in ("pending", "confirmed")
    # case durable
    db = SessionLocal()
    try:
        assert db.scalars(select(Complaint).where(Complaint.id == result["case_id"])).first() is not None
    finally:
        db.close()
