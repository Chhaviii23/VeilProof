"""Original-access authorization protocol (P06A/P06B)."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..errors import ConflictError, ForbiddenError, NotFoundError, ValidationFailure
from ..schemas import (
    AccessRequestBody,
    GrantActivateResponse,
    OversightDecisionBody,
    PrivacyDecisionBody,
)
from ..security import acl, tracking
from ..timeutil import is_past, iso, utcnow
from . import audit as audit_svc

FORENSIC_UNAVAILABLE = "forensic analysis mode is unavailable until approved tooling exists"


def _names(db: Session) -> dict[str, str]:
    return {m.human_principal_id: m.display_name for m in db.scalars(select(models.StaffMembership)).all()}


def current_revision(db: Session, request: models.AccessRequest) -> models.RequestRevision | None:
    if request.current_revision_id:
        return db.get(models.RequestRevision, request.current_revision_id)
    return db.scalars(
        select(models.RequestRevision)
        .where(models.RequestRevision.request_id == request.id)
        .order_by(models.RequestRevision.revision_number.desc())
        .limit(1)
    ).first()


def request_digest(body: AccessRequestBody, original_version_id: str) -> str:
    canonical = "|".join(
        [
            original_version_id,
            body.purpose,
            body.insufficiency_reason,
            body.intended_action,
            body.mode,
            str(body.duration_minutes),
            body.urgency,
        ]
    )
    return tracking.command_digest(canonical)


def create_request(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership, body: AccessRequestBody
) -> models.AccessRequest:
    acl.require_role(membership, "investigator")
    if body.mode == "forensic_analysis":
        raise ValidationFailure(FORENSIC_UNAVAILABLE)
    assignment = acl.active_assignment(db, complaint.id)
    if not assignment or assignment.investigator_principal_id != membership.human_principal_id:
        raise ForbiddenError("only the assigned investigator may request an original")
    if complaint.closed or complaint.lifecycle == "closed":
        raise ConflictError("closed cases do not accept new original requests")

    item = db.get(models.EvidenceItem, body.evidence_id)
    if item is None or item.complaint_id != complaint.id:
        raise NotFoundError("evidence not found")
    versions = db.scalars(
        select(models.EvidenceVersion).where(models.EvidenceVersion.item_id == item.id)
    ).all()
    original = next((v for v in versions if v.kind == "original"), None)
    derivative = next((v for v in versions if v.kind == "derivative"), None)
    if original is None or original.inspection_state != "inspected":
        raise ValidationFailure("original is not in a requestable state")
    if derivative is None:
        raise ValidationFailure("protected copy is not available for this item")
    rel = db.scalars(
        select(models.ProtectedRelease)
        .where(
            models.ProtectedRelease.derivative_version_id == derivative.id,
            models.ProtectedRelease.decision == "released",
        )
        .limit(1)
    ).first()
    if rel is None:
        raise ValidationFailure("protected copy must be released before requesting the original")

    existing = db.scalars(
        select(models.AccessRequest).where(
            models.AccessRequest.original_version_id == original.id,
            models.AccessRequest.state.in_(
                ("privacy_review_pending", "oversight_review_pending", "approved", "clarification_requested")
            ),
        )
    ).first()
    if existing is not None:
        raise ConflictError("an active request already exists for this original")

    req = models.AccessRequest(
        complaint_id=complaint.id,
        original_version_id=original.id,
        requester_principal_id=membership.human_principal_id,
        state="privacy_review_pending",
    )
    db.add(req)
    db.flush()
    rev = models.RequestRevision(
        request_id=req.id,
        revision_number=1,
        request_digest=request_digest(body, original.id),
        purpose=body.purpose,
        insufficiency_reason=body.insufficiency_reason,
        intended_action=body.intended_action,
        mode=body.mode,
        duration_minutes=body.duration_minutes,
        urgency=body.urgency,
    )
    db.add(rev)
    db.flush()
    req.current_revision_id = rev.id
    complaint.updated_at = utcnow()
    audit_svc.append_audit(
        db,
        complaint_id=complaint.id,
        event_type="original_access_requested",
        actor_principal_id=membership.human_principal_id,
        actor_role="investigator",
        purpose=body.purpose,
        detail=f"Sealed original access requested — {item.display_label} ({body.duration_minutes} min, {body.mode}, {body.urgency})",
    )
    audit_svc.notify(
        db,
        role_type="privacy-officer",
        complaint_id=complaint.id,
        title="Original evidence access request",
        body=f"{complaint.reference} · {item.display_label} · {body.duration_minutes} min",
        link=f"/privacy-officer/cases/{complaint.id}/review",
        tone="critical" if body.urgency == "critical" else "warning",
    )
    audit_svc.enqueue(
        db, aggregate_type="access_request", aggregate_id=req.id, event_type="OriginalRequested",
        payload={"complaint_id": complaint.id},
    )
    db.flush()
    return req


def privacy_decision(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership,
    request_id: str, body: PrivacyDecisionBody,
) -> models.AccessRequest:
    acl.require_role(membership, "privacy")
    req = db.get(models.AccessRequest, request_id)
    if req is None or req.complaint_id != complaint.id:
        raise NotFoundError("request not found")
    if req.state not in ("privacy_review_pending", "clarification_requested"):
        raise ConflictError("request is not awaiting a Privacy decision")
    if req.requester_principal_id == membership.human_principal_id:
        raise ForbiddenError("self-review is not permitted")
    rev = current_revision(db, req)
    if rev is None:
        raise ConflictError("request revision missing")
    if db.scalars(
        select(models.ApprovalDecision).where(
            models.ApprovalDecision.revision_id == rev.id, models.ApprovalDecision.stage == "privacy"
        )
    ).first():
        raise ConflictError("a Privacy decision already exists for this revision")

    db.add(
        models.ApprovalDecision(
            revision_id=rev.id,
            reviewer_principal_id=membership.human_principal_id,
            reviewer_role="privacy",
            stage="privacy",
            outcome=body.decision,
            notes=body.notes,
        )
    )
    names = _names(db)
    item_label = _item_label(db, req)
    if body.decision == "approved":
        req.state = "oversight_review_pending"
        audit_svc.notify(
            db, role_type="oversight-officer", complaint_id=complaint.id,
            title="Final approval requested",
            body=f"{complaint.reference} · {item_label} · {rev.duration_minutes} min",
            link="/oversight/approvals",
            tone="critical" if rev.urgency == "critical" else "warning",
        )
    elif body.decision == "rejected":
        req.state = "rejected"
        audit_svc.notify(
            db, role_type="case-investigator", officer_code=complaint.assigned_officer_code,
            complaint_id=complaint.id, title="Access request rejected",
            body=f"{complaint.reference} · {item_label}", link=f"/investigator/cases/{complaint.id}",
            tone="warning",
        )
    else:
        req.state = "clarification_requested"
        audit_svc.notify(
            db, role_type="case-investigator", officer_code=complaint.assigned_officer_code,
            complaint_id=complaint.id, title="Clarification requested by Privacy Officer",
            body=f"{complaint.reference} · {item_label}", link=f"/investigator/cases/{complaint.id}",
            tone="info",
        )
    req.updated_at = utcnow()
    complaint.updated_at = utcnow()
    event = {
        "approved": "privacy_review_approved",
        "rejected": "privacy_review_rejected",
        "clarification_requested": "access_clarification_requested",
    }[body.decision]
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type=event,
        actor_principal_id=membership.human_principal_id, actor_role="privacy",
        detail=f"Privacy {body.decision.replace('_', ' ')} — {item_label}",
    )
    audit_svc.enqueue(
        db, aggregate_type="access_request", aggregate_id=req.id, event_type="PrivacyRecommended",
        payload={"outcome": body.decision},
    )
    db.flush()
    return req


def oversight_decision(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership,
    request_id: str, body: OversightDecisionBody,
) -> models.AccessRequest:
    acl.require_role(membership, "oversight")
    req = db.get(models.AccessRequest, request_id)
    if req is None or req.complaint_id != complaint.id:
        raise NotFoundError("request not found")
    if req.state != "oversight_review_pending":
        raise ConflictError("request is not awaiting an Oversight decision")
    rev = current_revision(db, req)
    if rev is None:
        raise ConflictError("request revision missing")
    privacy = db.scalars(
        select(models.ApprovalDecision).where(
            models.ApprovalDecision.revision_id == rev.id, models.ApprovalDecision.stage == "privacy"
        )
    ).first()
    if privacy is None or privacy.outcome != "approved":
        raise ConflictError("a valid Privacy recommendation is required first")
    if membership.human_principal_id in (req.requester_principal_id, privacy.reviewer_principal_id):
        raise ForbiddenError("Oversight must be a third, independent principal")
    if db.scalars(
        select(models.ApprovalDecision).where(
            models.ApprovalDecision.revision_id == rev.id, models.ApprovalDecision.stage == "oversight"
        )
    ).first():
        raise ConflictError("an Oversight decision already exists for this revision")

    if body.decision == "approved":
        duration_minutes = body.approved_duration_minutes or rev.duration_minutes
        if duration_minutes > rev.duration_minutes:
            raise ValidationFailure("Oversight may only narrow the approved duration")
        if duration_minutes < 1:
            raise ValidationFailure("duration must be positive")
        s = get_settings()
        duration_seconds = duration_minutes * 60
        if s.demo_access_duration_seconds and not s.is_production_like:
            # Dev-only rehearsal override; still server-authoritative.
            duration_seconds = min(duration_seconds, s.demo_access_duration_seconds)

    db.add(
        models.ApprovalDecision(
            revision_id=rev.id,
            reviewer_principal_id=membership.human_principal_id,
            reviewer_role="oversight",
            stage="oversight",
            outcome=body.decision,
            duration_minutes=duration_minutes if body.decision == "approved" else None,
            notes=body.notes,
        )
    )
    item_label = _item_label(db, req)
    if body.decision == "approved":
        req.state = "approved"
        grant = models.AccessGrant(
            complaint_id=complaint.id,
            original_version_id=req.original_version_id,
            request_id=req.id,
            revision_id=rev.id,
            requester_principal_id=req.requester_principal_id,
            mode=rev.mode,
            approved_duration_seconds=duration_seconds,
            unused_deadline=utcnow() + timedelta(seconds=get_settings().unused_grant_ttl_seconds),
            state="approved_unused",
        )
        db.add(grant)
        db.flush()
        audit_svc.notify(
            db, role_type="case-investigator", officer_code=complaint.assigned_officer_code,
            complaint_id=complaint.id, title="Original Evidence Access Approved",
            body=f"{complaint.reference} · {item_label} · {duration_minutes} minutes",
            link=f"/investigator/cases/{complaint.id}/evidence/{req.original_version_id}/original",
            tone="success",
        )
        audit_svc.enqueue(
            db, aggregate_type="access_grant", aggregate_id=grant.id, event_type="OriginalApproved",
            payload={"request_id": req.id},
        )
    elif body.decision == "rejected":
        req.state = "rejected"
        audit_svc.notify(
            db, role_type="case-investigator", officer_code=complaint.assigned_officer_code,
            complaint_id=complaint.id, title="Access request rejected by Oversight",
            body=f"{complaint.reference} · {item_label}", link=f"/investigator/cases/{complaint.id}",
            tone="warning",
        )
    else:
        req.state = "clarification_requested"
        audit_svc.notify(
            db, role_type="case-investigator", officer_code=complaint.assigned_officer_code,
            complaint_id=complaint.id, title="Clarification requested by Oversight",
            body=f"{complaint.reference} · {item_label}", link=f"/investigator/cases/{complaint.id}",
            tone="info",
        )
    req.updated_at = utcnow()
    complaint.updated_at = utcnow()
    event = {
        "approved": "oversight_approval_granted",
        "rejected": "oversight_approval_rejected",
        "clarification_requested": "access_clarification_requested",
    }[body.decision]
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type=event,
        actor_principal_id=membership.human_principal_id, actor_role="oversight",
        purpose=rev.purpose,
        detail=f"Oversight {body.decision.replace('_', ' ')} — {item_label}",
    )
    db.flush()
    return req


def _item_label(db: Session, req: models.AccessRequest) -> str:
    return _label_for_version_id(db, req.original_version_id)


def _label_for_grant(db: Session, grant: models.AccessGrant) -> str:
    return _label_for_version_id(db, grant.original_version_id)


def _label_for_version_id(db: Session, version_id: str) -> str:
    version = db.get(models.EvidenceVersion, version_id)
    if not version:
        return version_id
    item = db.get(models.EvidenceItem, version.item_id)
    return item.display_label if item else version.id


def activate_grant(
    db: Session, membership: models.StaffMembership, grant_id: str
) -> GrantActivateResponse:
    acl.require_role(membership, "investigator")
    grant = db.get(models.AccessGrant, grant_id)
    if grant is None:
        raise NotFoundError("grant not found")
    if grant.requester_principal_id != membership.human_principal_id:
        raise ForbiddenError("grant is bound to a different principal")
    complaint = db.get(models.Complaint, grant.complaint_id)
    assignment = acl.active_assignment(db, grant.complaint_id)
    if not assignment or assignment.investigator_principal_id != membership.human_principal_id:
        raise ForbiddenError("no current assignment for this case")
    if complaint.closed:
        raise ForbiddenError("case is closed")

    if grant.state == "approved_unused":
        if is_past(grant.unused_deadline):
            grant.state = "expired"
            db.flush()
            raise ForbiddenError("approval expired unused")
        now = utcnow()
        grant.started_at = now
        grant.expires_at = now + timedelta(seconds=grant.approved_duration_seconds)
        grant.state = "active"
    elif grant.state == "active":
        if is_past(grant.expires_at):
            grant.state = "expired"
            db.flush()
            raise ForbiddenError("access expired")
    else:
        raise ForbiddenError("grant is not active")

    handle = tracking.generate_capability(24)
    vs = models.ViewerSession(
        handle=handle,
        grant_id=grant.id,
        membership_id=membership.id,
        expires_at=grant.expires_at or utcnow(),
    )
    db.add(vs)
    audit_svc.append_audit(
        db, complaint_id=grant.complaint_id, event_type="evidence_opened",
        actor_principal_id=membership.human_principal_id, actor_role="investigator",
        detail=f"Sealed original opened — {_label_for_grant(db, grant)}",
    )
    db.flush()
    return GrantActivateResponse(
        handle=handle,
        started_at=iso(grant.started_at),
        expires_at=iso(grant.expires_at),
        mode=grant.mode,
        evidence_id=grant.original_version_id,
    )


def viewer_content(db: Session, membership: models.StaffMembership, handle: str) -> bytes:
    """Gateway: validate authoritative state, then authenticate and render the original."""
    vs = db.scalars(select(models.ViewerSession).where(models.ViewerSession.handle == handle)).first()
    if vs is None or vs.revoked:
        raise ForbiddenError("viewer session invalid")
    if vs.membership_id != membership.id:
        raise ForbiddenError("viewer session bound to another session")
    grant = db.get(models.AccessGrant, vs.grant_id)
    if grant is None or grant.state != "active":
        raise ForbiddenError("grant not active")
    if is_past(grant.expires_at):
        grant.state = "expired"
        db.flush()
        raise ForbiddenError("grant expired")
    assignment = acl.active_assignment(db, grant.complaint_id)
    complaint = db.get(models.Complaint, grant.complaint_id)
    if not assignment or assignment.investigator_principal_id != membership.human_principal_id:
        raise ForbiddenError("assignment changed")
    if complaint and complaint.closed:
        raise ForbiddenError("case closed")

    version = db.get(models.EvidenceVersion, grant.original_version_id)
    if version is None:
        raise NotFoundError("version not found")
    obj = db.get(models.UploadObject, version.object_id)
    if obj is None:
        raise NotFoundError("object not found")
    from ..storage import get_storage
    from ..security.crypto import CryptoError, open_envelope

    ciphertext = get_storage().get(obj.storage_path)
    try:
        plaintext = open_envelope(version.envelope, ciphertext)
    except CryptoError as exc:
        raise ForbiddenError("content failed authentication") from exc
    # Render a bounded JPEG for the viewer; no storage URL or DEK is returned.
    return plaintext


def end_grant(db: Session, membership: models.StaffMembership, grant_id: str) -> None:
    grant = db.get(models.AccessGrant, grant_id)
    if grant is None:
        raise NotFoundError("grant not found")
    if grant.requester_principal_id != membership.human_principal_id:
        raise ForbiddenError("only the grant holder may end access")
    _finish(db, grant, "ended", membership, "investigator")


def revoke_grant(db: Session, membership: models.StaffMembership, grant_id: str, reason: str | None = None) -> None:
    acl.require_role(membership, "privacy", "oversight")
    grant = db.get(models.AccessGrant, grant_id)
    if grant is None:
        raise NotFoundError("grant not found")
    _finish(db, grant, "revoked", membership, membership.role, reason)


def revoke_all_grants(db: Session, complaint_id: str, actor: models.StaffMembership | None, reason: str) -> None:
    grants = db.scalars(
        select(models.AccessGrant).where(
            models.AccessGrant.complaint_id == complaint_id,
            models.AccessGrant.state.in_(("approved_unused", "active")),
        )
    ).all()
    for g in grants:
        _finish(db, g, "revoked", actor, actor.role if actor else "system", reason)


def _finish(
    db: Session, grant: models.AccessGrant, state: str,
    actor: models.StaffMembership | None, role: str, reason: str | None = None,
) -> None:
    grant.state = state
    for vs in db.scalars(select(models.ViewerSession).where(models.ViewerSession.grant_id == grant.id)).all():
        vs.revoked = True
    req = db.get(models.AccessRequest, grant.request_id)
    if req is not None:
        req.state = state
        req.updated_at = utcnow()
    event = "access_ended" if state == "ended" else "access_revoked"
    audit_svc.append_audit(
        db, complaint_id=grant.complaint_id, event_type=event,
        actor_principal_id=actor.human_principal_id if actor else None, actor_role=role,
        detail=f"Sealed original access {state}" + (f" — {reason}" if reason else ""),
    )
    audit_svc.enqueue(
        db, aggregate_type="access_grant", aggregate_id=grant.id,
        event_type="GrantRevoked" if state == "revoked" else "GrantEnded", payload={"state": state},
    )
    db.flush()
