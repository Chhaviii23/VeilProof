"""Content-protection and workflow-completion regression tests.

Covers the fixes for:
  - client-uploaded image "derivatives" being released without face blurring
  - PDF uploads never receiving a protected derivative (stalling privacy review)
  - reference-link items blocking privacy completion / release-all flows
"""

from __future__ import annotations

import secrets

from app.security.crypto import sha256_hex
from tests.helpers import API, DEFAULT_DESC, _upload_object, submit_report


def _case(client, headers, case_id):
    r = client.get(f"{API}/staff/cases/{case_id}", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _pdf_bytes(text: str = "Fictional internal memo for automated tests") -> bytes:
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def _finalize(client, intake_id, cap, objects):
    body = {
        "title": f"Fictional protection concern {secrets.token_hex(3)}",
        "description": DEFAULT_DESC,
        "category": "corruption",
        "risk_factors": ["workplace_retaliation"],
        "no_immediate_risk": False,
        "tracking_secret": f"TRK-{secrets.token_hex(8)}",
        "objects": objects,
    }
    r = client.post(
        f"{API}/intakes/{intake_id}/finalize",
        json=body,
        headers={"X-Intake-Capability": cap, "Idempotency-Key": f"idem-{secrets.token_hex(8)}"},
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_client_image_derivative_is_rescreened_server_side(client, privacy_headers):
    """A metadata-only client derivative must be re-redacted by the server."""
    result = submit_report(client)
    assert result["uploaded_derivative_sha256"] != result["protected_sha256"], (
        "server must re-encode/redact the derivative, not release client bytes as-is"
    )

    case = _case(client, privacy_headers, result["case_id"])
    ev = case["evidence"][0]
    deriv = next(v for v in ev["versions"] if v["kind"] == "derivative")
    assert deriv["provenance"] == "automated_redaction"
    assert "faces" in deriv["metadata_removed"]

    # The protected content delivered to staff is the server-redacted bytes.
    content = client.get(f"{API}/staff/evidence/{deriv['id']}/protected", headers=privacy_headers)
    assert content.status_code == 200, content.text
    assert sha256_hex(content.content) == result["protected_sha256"]
    assert sha256_hex(content.content) != result["uploaded_derivative_sha256"]


def test_pdf_upload_gets_protected_derivative_and_releases(client, privacy_headers):
    """PDF originals must receive a server-generated redacted derivative."""
    mid = client.post(f"{API}/intakes").json()
    intake_id, cap = mid["intake_id"], mid["capability"]
    broker = client.get(f"{API}/public/broker-key").json()
    operator_id = broker["operator_id"]

    pdf = _pdf_bytes()
    oid, _vid = _upload_object(client, intake_id, cap, broker, operator_id, "original", "document", pdf)
    result = _finalize(client, intake_id, cap, [
        {"original_object_id": oid, "derivative_object_id": None, "category": "document",
         "display_label": "Fictional_Memo.pdf"},
    ])

    case = _case(client, privacy_headers, result["case_id"])
    ev = case["evidence"][0]
    derivs = [v for v in ev["versions"] if v["kind"] == "derivative"]
    assert len(derivs) == 1, "PDF must have a protected derivative"
    assert derivs[0]["provenance"] == "automated_redaction"
    assert ev["protectedCopyStatus"] == "pending_release"

    # Protected copy is a redacted PDF, distinct from the original bytes.
    content = client.get(f"{API}/staff/evidence/{derivs[0]['id']}/protected", headers=privacy_headers)
    assert content.status_code == 200, content.text
    assert content.headers["content-type"].startswith("application/pdf")
    assert content.content[:4] == b"%PDF"
    assert content.content != pdf

    # Privacy can release the PDF protected copy and then assign.
    r = client.post(
        f"{API}/staff/cases/{result['case_id']}/releases",
        json={"evidence_id": ev["id"]},
        headers=privacy_headers,
    )
    assert r.status_code == 200, r.text


def test_reference_link_does_not_block_privacy_completion(client, privacy_headers):
    """Reference-link items have no protected copy and must not stall the workflow."""
    from gen_fixture_jpeg import build_fixture
    from app.services import jpeg

    mid = client.post(f"{API}/intakes").json()
    intake_id, cap = mid["intake_id"], mid["capability"]
    broker = client.get(f"{API}/public/broker-key").json()
    operator_id = broker["operator_id"]

    photo = build_fixture()
    protected = jpeg.protect(photo)
    oid, _ = _upload_object(client, intake_id, cap, broker, operator_id, "original", "image", photo)
    did, _ = _upload_object(
        client, intake_id, cap, broker, operator_id, "derivative", "image",
        protected.derivative_bytes, protected.removed_fields,
    )
    rid, _ = _upload_object(
        client, intake_id, cap, broker, operator_id, "original", "reference",
        b"https://gov.example/tender/42",
    )

    result = _finalize(client, intake_id, cap, [
        {"original_object_id": oid, "derivative_object_id": did, "category": "image",
         "display_label": "Fictional_Site_Photo.jpg"},
        {"original_object_id": rid, "derivative_object_id": None, "category": "reference",
         "display_label": "Government Tender Notice"},
    ])

    case = _case(client, privacy_headers, result["case_id"])
    by_label = {e["name"]: e for e in case["evidence"]}
    assert by_label["Government Tender Notice"]["protectedCopyStatus"] == "not_required"
    assert by_label["Fictional_Site_Photo.jpg"]["protectedCopyStatus"] == "pending_release"

    # Releasing the image must complete privacy review even though the link has no derivative.
    r = client.post(
        f"{API}/staff/cases/{result['case_id']}/releases",
        json={"evidence_id": by_label["Fictional_Site_Photo.jpg"]["id"]},
        headers=privacy_headers,
    )
    assert r.status_code == 200, r.text

    case = _case(client, privacy_headers, result["case_id"])
    assert any(u["text"] == "Evidence privacy review completed." for u in case["publicUpdates"])

    # Assignment now proceeds.
    r = client.post(
        f"{API}/staff/cases/{result['case_id']}/assignments",
        json={"officer_code": "ACO-04"},
        headers=privacy_headers,
    )
    assert r.status_code == 200, r.text
