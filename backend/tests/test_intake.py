"""Intake acceptance, idempotency, and no-evidence tests (P03A/P04C)."""

from __future__ import annotations

from tests.helpers import API, submit_report


def test_written_report_without_evidence(client):
    result = submit_report(client, with_image=False)
    assert result["attachment_count"] == 0
    assert result["case_reference"].startswith("VP-2026-")
    assert result["priority"] == "standard"


def test_critical_risk_sets_priority_and_task(client):
    result = submit_report(client, risk_factors=["physical_threat"], with_image=True)
    assert result["priority"] == "critical"
    # privacy queue must show the critical case
    token = client.post(f"{API}/staff/sessions", json={"username": "priya.nair", "password": "demo-priv"}).json()["token"]
    queue = client.get(f"{API}/staff/privacy/queue", headers={"Authorization": f"Bearer {token}"}).json()
    assert any(c["id"] == result["case_id"] for c in queue)


def test_duplicate_finalize_same_key_is_idempotent(client):
    from app.security import crypto

    from tests.helpers import _upload_object

    mid = client.post(f"{API}/intakes").json()
    intake_id, cap = mid["intake_id"], mid["capability"]
    broker = client.get(f"{API}/public/broker-key").json()
    h = {"X-Intake-Capability": cap}
    body = {
        "title": "Unique idempotency test report abc",
        "description": "x" * 60,
        "category": "corruption",
        "risk_factors": ["workplace_retaliation"],
        "no_immediate_risk": False,
        "tracking_secret": "TRK-idempotent-test-0001",
        "objects": [],
    }
    key = {"Idempotency-Key": "same-key-123"}
    r1 = client.post(f"{API}/intakes/{intake_id}/finalize", json=body, headers={**h, **key})
    r2 = client.post(f"{API}/intakes/{intake_id}/finalize", json=body, headers={**h, **key})
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["case_reference"] == r2.json()["case_reference"]

    # changed digest on the same key -> 409
    changed = dict(body, title="Changed idempotency test report abc")
    r3 = client.post(f"{API}/intakes/{intake_id}/finalize", json=changed, headers={**h, **key})
    assert r3.status_code == 409
    # different key after finalize -> 409
    r4 = client.post(f"{API}/intakes/{intake_id}/finalize", json=body, headers={**h, "Idempotency-Key": "new-key"})
    assert r4.status_code == 409


def test_validation_rejects_short_title_and_exclusive_risk(client):
    mid = client.post(f"{API}/intakes").json()
    intake_id, cap = mid["intake_id"], mid["capability"]
    h = {"X-Intake-Capability": cap, "Idempotency-Key": "k1"}
    bad = {
        "title": "short",
        "description": "x" * 60,
        "category": "corruption",
        "risk_factors": ["workplace_retaliation"],
        "no_immediate_risk": True,
        "tracking_secret": "TRK-00000000000000",
        "objects": [],
    }
    assert client.post(f"{API}/intakes/{intake_id}/finalize", json=bad, headers=h).status_code == 422


def test_cross_intake_object_theft_rejected(client):
    mid_a = client.post(f"{API}/intakes").json()
    mid_b = client.post(f"{API}/intakes").json()
    broker = client.get(f"{API}/public/broker-key").json()
    reserve = client.post(
        f"{API}/intakes/{mid_a['intake_id']}/objects",
        json={"kind": "original", "category": "image", "expected_size": 100},
        headers={"X-Intake-Capability": mid_a["capability"]},
    ).json()
    r = client.put(
        f"{API}/intakes/{mid_b['intake_id']}/objects/{reserve['object_id']}/content",
        content=b"x" * 100,
        headers={"X-Intake-Capability": mid_b["capability"]},
    )
    assert r.status_code == 404


def test_upload_without_capability_rejected(client):
    mid = client.post(f"{API}/intakes").json()
    r = client.post(
        f"{API}/intakes/{mid['intake_id']}/objects",
        json={"kind": "original", "category": "image", "expected_size": 10},
    )
    assert r.status_code == 401
