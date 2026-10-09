"""High-impact security boundary tests (P09B)."""

from __future__ import annotations

from app.db import SessionLocal
from app.models import AuditEvent, ProtectedRelease, UploadObject
from app.security import crypto
from tests.helpers import API, submit_report


def test_reporter_cannot_reach_staff_apis(client, investigator_headers):
    assert client.get(f"{API}/staff/cases").status_code == 401
    # cookie-less investigator token on the wrong role's endpoint
    assert client.get(f"{API}/staff/privacy/queue", headers=investigator_headers).status_code == 403


def test_public_queue_hides_other_case_investigator(client, investigator_headers):
    result = submit_report(client)
    # Unassigned case is invisible to the investigator by id.
    r = client.get(f"{API}/staff/cases/{result['case_id']}", headers=investigator_headers)
    assert r.status_code == 403


def test_stored_objects_are_ciphertext_not_plaintext(client):
    result = submit_report(client, with_image=True)
    db = SessionLocal()
    try:
        objs = db.query(UploadObject).filter(UploadObject.state == "attached").all()
        assert objs
        from app.storage import get_storage

        storage = get_storage()
        for obj in objs[-2:]:
            data = storage.get(obj.storage_path)
            # ciphertext must not begin with the JPEG SOI marker
            assert not data.startswith(b"\xff\xd8\xff")
            assert obj.ciphertext_digest == crypto.sha256_hex(data)
    finally:
        db.close()


def test_tampered_ciphertext_fails_inspection(client):
    """Flip a byte in the stored object, then confirm inspection/quarantine behavior."""
    from app.services.inspection import inspect_object

    result = submit_report(client, with_image=True)
    db = SessionLocal()
    try:
        obj = (
            db.query(UploadObject)
            .filter(UploadObject.state == "attached", UploadObject.kind == "original")
            .order_by(UploadObject.created_at.desc())
            .first()
        )
        obj.state = "complete"  # force re-inspection
        db.commit()
        from app.storage import get_storage

        storage = get_storage()
        data = bytearray(storage.get(obj.storage_path))
        storage.delete(obj.storage_path)
        data[-1] ^= 0xFF
        storage.put(obj.storage_path, bytes(data))
        inspect_object(db, obj.id)
        db.refresh(obj)
        assert obj.state == "quarantined"
    finally:
        db.close()


def test_released_copy_does_not_unlock_original(client, privacy_headers, investigator_headers):
    result = submit_report(client)
    case_id = result["case_id"]
    case = client.get(f"{API}/staff/cases/{case_id}", headers=privacy_headers).json()
    ev = case["evidence"][0]
    client.post(f"{API}/staff/cases/{case_id}/releases", json={"evidence_id": ev["id"]}, headers=privacy_headers)
    client.post(f"{API}/staff/cases/{case_id}/assignments", json={"officer_code": "ACO-04"}, headers=privacy_headers)
    case = client.get(f"{API}/staff/cases/{case_id}", headers=investigator_headers).json()
    orig = next(v for v in case["evidence"][0]["versions"] if v["kind"] == "original")
    # No gateway endpoint can serve an original by id.
    assert client.get(f"{API}/staff/evidence/{orig['id']}/protected", headers=investigator_headers).status_code == 404


def test_canary_secret_never_in_error_logs(client, caplog):
    import logging

    caplog.set_level(logging.INFO)
    canary = "CANARY-TRACKING-SECRET-9F3A"
    client.post(f"{API}/tracking/sessions", json={"case_reference": "VP-SEED-0001", "tracking_secret": canary})
    assert canary not in caplog.text
    for rec in caplog.records:
        assert "password" not in rec.getMessage().lower()


def test_audit_chain_is_linked(client):
    result = submit_report(client)
    db = SessionLocal()
    try:
        events = (
            db.query(AuditEvent)
            .filter(AuditEvent.complaint_id == result["case_id"])
            .order_by(AuditEvent.sequence.asc())
            .all()
        )
        assert events
        assert events[0].prev_hash is None
        for prev, cur in zip(events, events[1:]):
            assert cur.prev_hash == prev.event_hash
    finally:
        db.close()
