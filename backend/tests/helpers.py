"""Helpers that simulate the reporter client (local crypto + upload + finalize)."""

from __future__ import annotations

import secrets

from gen_fixture_jpeg import build_fixture

from app.security import crypto
from app.services import jpeg

API = "/api/v1"

DEFAULT_DESC = (
    "Fictional complaint used for automated tests. It describes a suspected procurement "
    "irregularity on a fictional public project and requests an independent review. "
    "All persons and organisations are invented."
)


def _upload_object(client, intake_id, cap, broker, operator_id, kind, category, plaintext, metadata_removed=None):
    h = {"X-Intake-Capability": cap}
    reserve = client.post(
        f"{API}/intakes/{intake_id}/objects",
        json={"kind": kind, "category": category, "expected_size": len(plaintext)},
        headers=h,
    ).json()
    oid, vid = reserve["object_id"], reserve["version_id"]
    kind_const = crypto.KIND_ORIGINAL if kind == "original" else crypto.KIND_DERIVATIVE
    dek = crypto.new_dek()
    nonce = crypto.new_nonce()
    aad = crypto.build_aad(operator_id, oid, vid, kind_const, len(plaintext))
    ct = crypto.seal(plaintext, dek, nonce, aad)
    envelope = crypto.make_envelope(
        key_id=broker["key_id"], nonce=nonce, wrapped_dek=crypto.wrap_dek(dek),
        operator_id=operator_id, object_id=oid, version_id=vid, kind=kind_const,
        plaintext_length=len(plaintext), ciphertext=ct,
    )
    r = client.put(f"{API}/intakes/{intake_id}/objects/{oid}/content", content=ct, headers=h)
    assert r.status_code == 200, r.text
    body = {
        "ciphertext_digest": crypto.sha256_hex(ct),
        "plaintext_sha256": crypto.sha256_hex(plaintext),
        "plaintext_length": len(plaintext),
        "envelope": envelope,
        "provenance": "real",
        "metadata_removed": metadata_removed or [],
    }
    r = client.post(f"{API}/intakes/{intake_id}/objects/{oid}/complete", json=body, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["state"] == "inspected", r.text
    return oid, vid


def submit_report(
    client,
    *,
    title: str | None = None,
    risk_factors: list[str] | None = None,
    no_immediate_risk: bool = False,
    with_image: bool = True,
    tracking_secret: str | None = None,
    category: str = "corruption",
):
    mid = client.post(f"{API}/intakes").json()
    intake_id, cap = mid["intake_id"], mid["capability"]
    broker = client.get(f"{API}/public/broker-key").json()
    operator_id = broker["operator_id"]

    objects = []
    original_sha = protected_sha = uploaded_derivative_sha = None
    if with_image:
        data = build_fixture()
        result = jpeg.protect(data)
        original_sha = result.original_sha256
        # The server re-applies content redaction (face/text blur + re-encode) to any
        # client-uploaded derivative at finalize time. Recompute the expected
        # protected hash with the same pipeline so tests verify independently.
        from app.security.crypto import sha256_hex
        from app.services.redaction import redact_image_content

        uploaded_derivative_sha = result.protected_sha256
        protected_sha = sha256_hex(redact_image_content(result.derivative_bytes))
        oid, vid = _upload_object(client, intake_id, cap, broker, operator_id, "original", "image", data)
        did, dvid = _upload_object(
            client, intake_id, cap, broker, operator_id, "derivative", "image",
            result.derivative_bytes, result.removed_fields,
        )
        objects.append(
            {
                "original_object_id": oid,
                "derivative_object_id": did,
                "category": "image",
                "display_label": "Fictional_Site_Photo.jpg",
            }
        )

    tracking_secret = tracking_secret or f"TRK-{secrets.token_hex(8)}"
    body = {
        "title": title or f"Fictional procurement concern {secrets.token_hex(3)}",
        "description": DEFAULT_DESC,
        "category": category,
        "risk_factors": risk_factors if risk_factors is not None else ["workplace_retaliation"],
        "no_immediate_risk": no_immediate_risk,
        "tracking_secret": tracking_secret,
        "objects": objects,
    }
    h = {"X-Intake-Capability": cap, "Idempotency-Key": f"idem-{secrets.token_hex(8)}"}
    r = client.post(f"{API}/intakes/{intake_id}/finalize", json=body, headers=h)
    assert r.status_code == 200, r.text
    result = r.json()
    result.update(
        {
            "intake_id": intake_id,
            "capability": cap,
            "tracking_secret": tracking_secret,
            "original_sha256": original_sha,
            "protected_sha256": protected_sha,
            "uploaded_derivative_sha256": uploaded_derivative_sha,
            "body": body,
            "headers": h,
        }
    )
    return result
