"""Anonymous intake and idempotent complaint acceptance (P03A/P04C)."""

from __future__ import annotations

import json
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..errors import ConflictError, NotFoundError, PayloadTooLargeError, UnauthorizedError, ValidationFailure
from ..schemas import (
    FinalizeRequest,
    FinalizeResponse,
    IntakeCreateResponse,
    IntakeStateResponse,
    ObjectCompleteRequest,
    ObjectReserveRequest,
    ObjectReserveResponse,
)
from ..security import tracking
from ..security.crypto import sha256_hex
from ..storage import get_storage
from ..timeutil import iso, is_past, utcnow
from . import audit as audit_svc

CRITICAL_FACTORS = {"physical_threat", "family_threat", "public_safety"}
PROTECTED_CATEGORY_LIMIT = {"document", "image", "audio", "video", "reference"}


def create_intake(db: Session) -> IntakeCreateResponse:
    op = db.scalars(select(models.Operator)).first()
    if op is None:
        raise NotFoundError("no operator configured; run the seed")
    capability = tracking.generate_capability()
    s = get_settings()
    session = models.IntakeSession(
        operator_id=op.id,
        capability_verifier=tracking.verifier_for(capability),
        state="open",
        expires_at=utcnow() + timedelta(seconds=s.intake_ttl_seconds),
    )
    db.add(session)
    db.flush()
    return IntakeCreateResponse(
        intake_id=session.id, capability=capability, expires_at=iso(session.expires_at)
    )


def authenticate_intake(db: Session, intake_id: str, capability: str) -> models.IntakeSession:
    session = db.get(models.IntakeSession, intake_id)
    if session is None:
        raise UnauthorizedError("invalid intake")
    if not tracking.constant_time_match(capability, session.capability_verifier):
        raise UnauthorizedError("invalid intake")
    if is_past(session.expires_at):
        raise UnauthorizedError("intake expired")
    return session


def reserve_object(
    db: Session, session: models.IntakeSession, req: ObjectReserveRequest
) -> ObjectReserveResponse:
    if session.state != "open":
        raise ConflictError("intake is not open")
    s = get_settings()
    if req.expected_size > s.max_upload_bytes:
        raise PayloadTooLargeError("declared size exceeds limit")
    obj = models.UploadObject(
        intake_session_id=session.id,
        kind=req.kind,
        category=req.category,
        storage_path=tracking.generate_capability(18),
        expected_size=req.expected_size,
        expected_ciphertext_digest=req.expected_ciphertext_digest,
        state="staging",
        expires_at=session.expires_at,
    )
    db.add(obj)
    db.flush()
    return ObjectReserveResponse(
        object_id=obj.id, version_id=obj.planned_version_id,
        max_bytes=s.max_upload_bytes, expires_at=iso(obj.expires_at),
    )


def store_content(
    db: Session, session: models.IntakeSession, object_id: str, data: bytes
) -> models.UploadObject:
    obj = _get_session_object(db, session, object_id)
    if obj.attached or obj.state in ("complete", "inspected"):
        raise ConflictError("object already completed")
    s = get_settings()
    if len(data) > s.max_upload_bytes:
        raise PayloadTooLargeError("ciphertext exceeds limit")
    if obj.expected_ciphertext_digest and sha256_hex(data) != obj.expected_ciphertext_digest:
        raise ValidationFailure("ciphertext digest does not match reservation")
    storage = get_storage()
    try:
        storage.put(obj.storage_path, data)
    except FileExistsError:
        # upload retry: require identical bytes
        if storage.get(obj.storage_path) != data:
            raise ConflictError("object content already locked with different bytes")
    obj.state = "complete"
    obj.completed_at = utcnow()
    db.flush()
    return obj


def complete_object(
    db: Session, session: models.IntakeSession, object_id: str, req: ObjectCompleteRequest
) -> models.UploadObject:
    obj = _get_session_object(db, session, object_id)
    if obj.attached:
        raise ConflictError("object already attached")
    if obj.state not in ("complete", "inspected"):
        raise ConflictError("object content not uploaded")
    stored = get_storage().get(obj.storage_path)
    if sha256_hex(stored) != req.ciphertext_digest:
        raise ValidationFailure("stored ciphertext digest mismatch")
    if obj.expected_ciphertext_digest and req.ciphertext_digest != obj.expected_ciphertext_digest:
        raise ValidationFailure("completion digest mismatch")
    obj.ciphertext_digest = req.ciphertext_digest
    obj.envelope = req.envelope
    obj.plaintext_sha256 = req.plaintext_sha256
    obj.plaintext_length = req.plaintext_length
    obj.provenance = req.provenance if req.provenance in ("real", "controlled_fixture") else "real"
    obj.metadata_removed = req.metadata_removed
    db.flush()
    audit_svc.enqueue(
        db,
        aggregate_type="upload_object",
        aggregate_id=obj.id,
        event_type="InspectObject",
        payload={"object_id": obj.id},
    )
    db.flush()

    # Local/demo profile runs bounded inspection inline so a single process is sufficient.
    if not get_settings().is_production_like:
        from .inspection import inspect_object

        inspect_object(db, obj.id)
    return obj


def _get_session_object(
    db: Session, session: models.IntakeSession, object_id: str
) -> models.UploadObject:
    obj = db.get(models.UploadObject, object_id)
    if obj is None or obj.intake_session_id != session.id:
        # Do not reveal existence of foreign objects.
        raise NotFoundError("object not found")
    return obj


def _next_reference(db: Session) -> str:
    refs = db.scalars(select(models.Complaint.reference)).all()
    nums = []
    for r in refs:
        tail = r.rsplit("-", 1)[-1]
        if tail.isdigit():
            nums.append(int(tail))
    n = (max(nums) if nums else 1048) + 1
    return f"VP-2026-{n}"


def finalize(
    db: Session, session: models.IntakeSession, req: FinalizeRequest, idempotency_key: str
) -> FinalizeResponse:
    digest = sha256_hex(json.dumps(req.model_dump(), sort_keys=True).encode("utf-8"))

    if session.result_reference:
        if session.last_idempotency_key == idempotency_key and session.last_command_digest == digest:
            stored = session.result_payload or {}
            return FinalizeResponse(**stored)
        raise ConflictError("intake already finalized with a different command")

    # Validate risk exclusivity (defensive; schema also checks).
    threats = [r for r in req.risk_factors if r != "no_risk"]
    if req.no_immediate_risk and threats:
        raise ValidationFailure("no_immediate_risk is exclusive with threat selections")

    # Validate object bindings.
    if len(req.objects) > 5:
        raise ValidationFailure("too many evidence items")
    prepared: list[tuple[models.UploadObject, models.UploadObject | None, object]] = []
    seen_categories: set[str] = set()
    for binding in req.objects:
        if binding.category in seen_categories:
            raise ValidationFailure("one active item per category")
        seen_categories.add(binding.category)
        original = _get_session_object(db, session, binding.original_object_id)
        _require_attachable(original)
        derivative = None
        if binding.derivative_object_id:
            derivative = _get_session_object(db, session, binding.derivative_object_id)
            _require_attachable(derivative)
        elif original.category in ("image", "audio"):
            # Auto-generate a redacted derivative
            derivative = _auto_generate_derivative(db, session, original)
            
        prepared.append((original, derivative, binding))

    priority = "critical" if any(f in CRITICAL_FACTORS for f in req.risk_factors) else "standard"
    reference = _next_reference(db)
    complaint = models.Complaint(
        reference=reference,
        operator_id=session.operator_id,
        lifecycle="received_securely",
        priority=priority,
        title=req.title,
        description=req.description,
        category=req.category,
        incident_date=req.incident_date,
        location=req.location,
        involved_parties=req.involved_parties,
        risk_factors=req.risk_factors,
    )
    db.add(complaint)
    db.flush()

    db.add(
        models.TrackingCredential(
            complaint_id=complaint.id,
            verifier=tracking.verifier_for(req.tracking_secret),
            pepper_version=tracking.PEPPER_VERSION,
        )
    )

    attachment_count = 0
    for original, derivative, binding in prepared:
        item = models.EvidenceItem(
            complaint_id=complaint.id,
            category=binding.category,
            display_label=binding.display_label,
            active=True,
            active_slot=1,
        )
        db.add(item)
        db.flush()
        _version_from_object(db, item.id, original, "original", None, 1)
        if derivative is not None:
            _version_from_object(db, item.id, derivative, "derivative", None, 1)
        original.state = "attached"
        original.attached = True
        if derivative is not None:
            derivative.state = "attached"
            derivative.attached = True
        attachment_count += 1

    db.add(
        models.PublicUpdate(
            complaint_id=complaint.id,
            status="received_securely",
            text="Your report has been received securely. A privacy review is underway.",
        )
    )
    if priority == "critical":
        db.add(models.ProtectionTask(complaint_id=complaint.id, priority="critical", owner_role="oversight"))

    audit_svc.append_audit(
        db,
        complaint_id=complaint.id,
        event_type="report_accepted",
        detail=f"Report received securely — {reference}"
        + (" [Critical priority]" if priority == "critical" else ""),
    )
    audit_svc.enqueue(
        db,
        aggregate_type="complaint",
        aggregate_id=complaint.id,
        event_type="ComplaintAccepted",
        revision=complaint.revision,
        payload={"reference": reference, "priority": priority},
    )
    # Proof jobs for each committed file pair.
    for item in db.scalars(
        select(models.EvidenceItem).where(models.EvidenceItem.complaint_id == complaint.id)
    ):
        audit_svc.enqueue(
            db,
            aggregate_type="evidence_item",
            aggregate_id=item.id,
            event_type="CreateFilePairProof",
            payload={"complaint_id": complaint.id, "item_id": item.id},
        )
    audit_svc.enqueue(
        db,
        aggregate_type="upload_object",
        aggregate_id=session.id,
        event_type="CleanupExpiredObjects",
        payload={},
    )
    db.flush()

    result = FinalizeResponse(
        case_id=complaint.id,
        case_reference=reference,
        accepted_at=iso(complaint.accepted_at),
        attachment_count=attachment_count,
        proof_status="pending",
        priority=priority,
        intake_capability="",
    )
    session.state = "finalized"
    session.last_idempotency_key = idempotency_key
    session.last_command_digest = digest
    session.result_reference = reference
    session.result_payload = result.model_dump()
    db.flush()
    result.intake_capability = ""
    return result


def _require_attachable(obj: models.UploadObject) -> None:
    if obj.state == "quarantined":
        raise ValidationFailure("an object failed inspection and cannot be attached")
    if obj.state != "inspected":
        raise ValidationFailure("object has not completed inspection")
    if not obj.envelope or not obj.plaintext_sha256:
        raise ValidationFailure("object is missing envelope metadata")


def _version_from_object(
    db: Session,
    item_id: str,
    obj: models.UploadObject,
    kind: str,
    parent_id: str | None,
    version_number: int,
) -> models.EvidenceVersion:
    version = models.EvidenceVersion(
        id=obj.planned_version_id,
        item_id=item_id,
        kind=kind,
        version_number=version_number,
        parent_version_id=parent_id,
        object_id=obj.id,
        ciphertext_digest=obj.ciphertext_digest or "",
        plaintext_sha256=obj.plaintext_sha256 or "",
        envelope=obj.envelope or {},
        provenance=obj.provenance,
        inspection_state="inspected",
        metadata_removed=obj.metadata_removed or [],
        immutable=True,
    )
    db.add(version)
    db.flush()
    return version


def intake_state(db: Session, session: models.IntakeSession) -> IntakeStateResponse:
    result = FinalizeResponse(**session.result_payload) if session.result_payload else None
    return IntakeStateResponse(
        intake_id=session.id,
        state=session.state,
        expires_at=iso(session.expires_at),
        result=result,
    )


def _auto_generate_derivative(db: Session, session: models.IntakeSession, original: models.UploadObject) -> models.UploadObject | None:
    from ..security.crypto import open_envelope, sha256_hex, seal, new_dek, new_nonce, wrap_dek, make_envelope, KIND_DERIVATIVE
    from ..storage import get_storage
    from .redaction import redact_image_content
    
    storage = get_storage()
    try:
        ciphertext = storage.get(original.storage_path)
        plaintext = open_envelope(original.envelope, ciphertext)
    except Exception as e:
        print(f"Failed to decrypt original for redaction: {e}")
        return None
        
    if original.category == "audio":
        from .redaction import redact_audio_content
        redacted = redact_audio_content(plaintext)
        removed_metadata = ["voice_characteristics", "metadata"]
    else:
        from .redaction import redact_image_content
        redacted = redact_image_content(plaintext)
        removed_metadata = ["faces", "text", "exif", "metadata"]
    
    obj = models.UploadObject(
        intake_session_id=session.id,
        kind="derivative",
        category=original.category,
        storage_path=original.storage_path + "_deriv",
        state="inspected",
        expires_at=session.expires_at,
    )
    db.add(obj)
    db.flush()
    
    dek = new_dek()
    nonce = new_nonce()
    from ..security.crypto import build_aad
    aad = build_aad(session.operator_id, obj.id, obj.planned_version_id, KIND_DERIVATIVE, len(redacted))
    new_ciphertext = seal(redacted, dek, nonce, aad)
    wrapped_dek = wrap_dek(dek)
    
    obj.envelope = make_envelope(
        key_id=get_settings().key_broker_public_key_id,
        nonce=nonce,
        wrapped_dek=wrapped_dek,
        operator_id=session.operator_id,
        object_id=obj.id,
        version_id=obj.planned_version_id,
        kind=KIND_DERIVATIVE,
        plaintext_length=len(redacted),
        ciphertext=new_ciphertext,
    )
    obj.ciphertext_digest = sha256_hex(new_ciphertext)
    obj.plaintext_sha256 = sha256_hex(redacted)
    obj.plaintext_length = len(redacted)
    obj.provenance = "automated_redaction"
    obj.metadata_removed = removed_metadata
    
    storage.put(obj.storage_path, new_ciphertext)
    return obj

