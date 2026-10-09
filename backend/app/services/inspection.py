"""Bounded automated inspection (DECISIONS D-05).

Job-bound to a single completed upload object. Unwraps the broker key for that object only,
authenticates the full GCM ciphertext, verifies the declared plaintext hash, checks type/decode
and resource limits, and records a safe result (counts only — never extracted values). There is
no human original-preview endpoint.
"""

from __future__ import annotations

import io

from sqlalchemy.orm import Session

from .. import models
from ..security.crypto import CryptoError, open_envelope, sha256_hex
from ..timeutil import utcnow
from ..storage import get_storage

MAGIC = {
    "image": (b"\xff\xd8\xff",),
    "document": (b"%PDF",),
    "audio": (b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2", b"RIFF", b"OggS", b"fLaC"),
    "video": (b"\x00\x00\x00", b"ftyp"),
}


def inspect_object(db: Session, object_id: str) -> models.UploadObject | None:
    obj = db.get(models.UploadObject, object_id)
    if obj is None:
        return None
    if obj.state in ("inspected", "quarantined", "attached"):
        return obj
    if obj.state != "complete":
        return obj
    if not obj.envelope or not obj.plaintext_sha256:
        return _fail(db, obj, "missing_envelope")

    try:
        ciphertext = get_storage().get(obj.storage_path)
    except FileNotFoundError:
        return _fail(db, obj, "missing_object")

    try:
        plaintext = open_envelope(obj.envelope, ciphertext)
    except CryptoError:
        return _fail(db, obj, "authentication_failed")

    if sha256_hex(plaintext) != obj.plaintext_sha256:
        return _fail(db, obj, "plaintext_hash_mismatch")

    detail = _validate_type(obj, plaintext)
    if detail.get("ok") is False:
        return _fail(db, obj, detail.get("reason", "invalid_media"), detail)

    obj.state = "inspected"
    obj.inspection_detail = {
        "processor_version": "inspect-1",
        "plaintext_bytes": len(plaintext),
        "category": obj.category,
        "mime_ok": detail.get("mime_ok", True),
        "decode_ok": detail.get("decode_ok", True),
        "provenance": obj.provenance,
    }
    db.add(
        models.InspectionResult(
            version_id=None,
            object_id=obj.id,
            processor_version="inspect-1",
            result="passed",
            detail=obj.inspection_detail,
            validated_at=utcnow(),
        )
    )
    db.flush()
    return obj


def _validate_type(obj: models.UploadObject, plaintext: bytes) -> dict:
    detail: dict = {"ok": True, "mime_ok": True, "decode_ok": True}
    category = obj.category
    if category == "reference":
        detail["mime_ok"] = plaintext.startswith(b"https://")
        if not detail["mime_ok"]:
            return {"ok": False, "reason": "reference_not_https"}
        return detail
    if category == "image":
        from PIL import Image

        try:
            img = Image.open(io.BytesIO(plaintext))
            img.load()
            # Any format the pipeline can decode is acceptable; the protected
            # derivative is re-encoded to JPEG regardless (PNG/webp included).
            if img.format not in {"JPEG", "JPG", "MPO", "PNG", "WEBP", "BMP", "GIF"}:
                return {"ok": False, "reason": "unsupported_image_format", "decode_ok": False}
            if img.width * img.height > 80_000_000:
                return {"ok": False, "reason": "image_too_large", "decode_ok": False}
            detail["decode_ok"] = True
        except Exception:
            return {"ok": False, "reason": "image_decode_failed", "decode_ok": False}
        return detail
    prefixes = MAGIC.get(category)
    if prefixes and not any(plaintext.startswith(p) for p in prefixes):
        # video magic is a container ftyp; accept if 'ftyp' appears early
        if category in {"audio", "video"} and b"ftyp" in plaintext[:32]:
            return detail
        return {"ok": False, "reason": "signature_mismatch", "mime_ok": False}
    return detail


def _fail(db: Session, obj: models.UploadObject, reason: str, detail: dict | None = None) -> models.UploadObject:
    obj.state = "quarantined"
    safe = {"processor_version": "inspect-1", "reason": reason}
    obj.inspection_detail = safe
    db.add(
        models.InspectionResult(
            version_id=None,
            object_id=obj.id,
            processor_version="inspect-1",
            result="failed",
            detail=detail or safe,
            validated_at=utcnow(),
        )
    )
    db.flush()
    return obj
