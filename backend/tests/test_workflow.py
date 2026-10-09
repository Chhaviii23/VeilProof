"""Ordinary and original-access workflow tests (P05/P06)."""

from __future__ import annotations

from tests.helpers import API, submit_report


def _case(client, headers, case_id):
    r = client.get(f"{API}/staff/cases/{case_id}", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _evidence_id(case):
    return case["evidence"][0]["id"]


def test_investigator_cannot_retrieve_unreleased(client, privacy_headers, investigator_headers):
    result = submit_report(client)
    # Not assigned yet -> investigator cannot even see the case.
    r = client.get(f"{API}/staff/cases/{result['case_id']}", headers=investigator_headers)
    assert r.status_code == 403


def test_aco09_conflicted_officer_rejected(client, privacy_headers):
    result = submit_report(client)
    case = _case(client, privacy_headers, result["case_id"])
    ev = case["evidence"][0]
    client.post(f"{API}/staff/cases/{result['case_id']}/releases", json={"evidence_id": ev["id"]}, headers=privacy_headers)
    r = client.post(
        f"{API}/staff/cases/{result['case_id']}/assignments",
        json={"officer_code": "ACO-09"}, headers=privacy_headers,
    )
    assert r.status_code == 422


def test_full_original_access_flow(client, privacy_headers, investigator_headers, oversight_headers):
    result = submit_report(client, risk_factors=["physical_threat"])
    case_id = result["case_id"]
    case = _case(client, privacy_headers, case_id)
    ev = case["evidence"][0]
    assert ev["protectedCopyStatus"] == "pending_release"

    # Cannot assign until release
    r = client.post(f"{API}/staff/cases/{case_id}/assignments", json={"officer_code": "ACO-04"}, headers=privacy_headers)
    assert r.status_code == 422

    # Release + assign ACO-04
    assert client.post(f"{API}/staff/cases/{case_id}/releases", json={"evidence_id": ev["id"]}, headers=privacy_headers).status_code == 200
    assign = client.post(f"{API}/staff/cases/{case_id}/assignments", json={"officer_code": "ACO-04"}, headers=privacy_headers)
    assert assign.status_code == 200, assign.text

    # Investigator now sees released protected copy but not the original.
    case = _case(client, investigator_headers, case_id)
    deriv = next(v for v in case["evidence"][0]["versions"] if v["kind"] == "derivative")
    orig = next(v for v in case["evidence"][0]["versions"] if v["kind"] == "original")
    assert client.get(f"{API}/staff/evidence/{deriv['id']}/protected", headers=investigator_headers).status_code == 200

    # Request the original
    req_body = {
        "evidence_id": ev["id"],
        "purpose": "Verify original metadata to establish the payment timeline",
        "insufficiency_reason": "The protected copy omits timestamps needed to test whether approvals were backdated",
        "intended_action": "Compare embedded timestamps against records",
        "mode": "view_only",
        "duration_minutes": 10,
        "urgency": "high",
    }
    r = client.post(f"{API}/staff/cases/{case_id}/access-requests", json=req_body, headers=investigator_headers)
    assert r.status_code == 200, r.text
    request_id = r.json()["request_id"]

    # Privacy approves; no grant yet.
    r = client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/privacy-decisions", json={"decision": "approved"}, headers=privacy_headers)
    assert r.status_code == 200, r.text
    case = _case(client, investigator_headers, case_id)
    assert case["originalAccessRequests"][0]["oversightDecision"] == "pending"
    assert case["originalAccessRequests"][0]["accessExpiresAt"] is None
    # Still cannot obtain original content (no grant).
    assert client.post(f"{API}/staff/viewer/content", json={"handle": "x" * 20}, headers=investigator_headers).status_code == 403

    # Oversight approves
    r = client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/oversight-decisions", json={"decision": "approved"}, headers=oversight_headers)
    assert r.status_code == 200, r.text
    case = _case(client, investigator_headers, case_id)
    grant_id = case["originalAccessRequests"][0]["grantId"]
    assert grant_id

    # Activate -> viewer handle; content returns real bytes.
    act = client.post(f"{API}/staff/grants/{grant_id}/activate", headers=investigator_headers)
    assert act.status_code == 200, act.text
    handle = act.json()["handle"]
    content = client.post(f"{API}/staff/viewer/content", json={"handle": handle}, headers=investigator_headers)
    assert content.status_code == 200
    assert content.headers["content-type"].startswith("image/jpeg")
    assert content.content[:3] == b"\xff\xd8\xff"

    # Revoke via Privacy -> further delivery denied.
    assert client.post(f"{API}/staff/grants/{grant_id}/revoke", headers=privacy_headers).status_code == 200
    assert client.post(f"{API}/staff/viewer/content", json={"handle": handle}, headers=investigator_headers).status_code == 403


def test_one_approval_is_insufficient_and_same_principal_blocked(client, privacy_headers, investigator_headers, dup_oversight_headers):
    result = submit_report(client)
    case_id = result["case_id"]
    case = _case(client, privacy_headers, case_id)
    ev = case["evidence"][0]
    client.post(f"{API}/staff/cases/{case_id}/releases", json={"evidence_id": ev["id"]}, headers=privacy_headers)
    client.post(f"{API}/staff/cases/{case_id}/assignments", json={"officer_code": "ACO-04"}, headers=privacy_headers)
    req = {
        "evidence_id": ev["id"],
        "purpose": "Establish the timeline of the fictional payments",
        "insufficiency_reason": "Protected copy omits the needed metadata fields",
        "intended_action": "Inspect timestamps",
        "mode": "view_only", "duration_minutes": 5, "urgency": "standard",
    }
    request_id = client.post(f"{API}/staff/cases/{case_id}/access-requests", json=req, headers=investigator_headers).json()["request_id"]
    # Oversight before Privacy -> conflict
    r = client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/oversight-decisions", json={"decision": "approved"}, headers=dup_oversight_headers)
    assert r.status_code == 409
    # Privacy approves
    client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/privacy-decisions", json={"decision": "approved"}, headers=privacy_headers)
    # Oversight by a principal sharing identity with the Privacy reviewer -> forbidden
    r = client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/oversight-decisions", json={"decision": "approved"}, headers=dup_oversight_headers)
    assert r.status_code == 403


def test_self_review_forbidden(client, privacy_headers, investigator_headers, oversight_headers):
    result = submit_report(client)
    case_id = result["case_id"]
    case = _case(client, privacy_headers, case_id)
    ev = case["evidence"][0]
    client.post(f"{API}/staff/cases/{case_id}/releases", json={"evidence_id": ev["id"]}, headers=privacy_headers)
    client.post(f"{API}/staff/cases/{case_id}/assignments", json={"officer_code": "ACO-04"}, headers=privacy_headers)
    req = {
        "evidence_id": ev["id"], "purpose": "Establish the payment approval timeline",
        "insufficiency_reason": "Protected copy omits the timestamps required",
        "intended_action": "Inspect timestamps", "mode": "view_only",
        "duration_minutes": 5, "urgency": "standard",
    }
    request_id = client.post(f"{API}/staff/cases/{case_id}/access-requests", json=req, headers=investigator_headers).json()["request_id"]
    # Investigator (requester) attempts a Privacy decision -> forbidden (role)
    r = client.post(f"{API}/staff/cases/{case_id}/access-requests/{request_id}/privacy-decisions", json={"decision": "approved"}, headers=investigator_headers)
    assert r.status_code == 403
    # Forensic mode unavailable
    req2 = dict(req, mode="forensic_analysis")
    r2 = client.post(f"{API}/staff/cases/{case_id}/access-requests", json=req2, headers=investigator_headers)
    assert r2.status_code == 422
