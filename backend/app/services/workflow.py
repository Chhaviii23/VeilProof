"""Staff case workflow: privacy release, assignment, updates, closure (P05A-C)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..errors import ConflictError, ForbiddenError, NotFoundError, ValidationFailure
from ..security import acl
from ..timeutil import iso, utcnow
from . import access as access_svc
from . import audit as audit_svc
from . import roster

PRIVACY_DONE_TEXT = "Evidence privacy review completed."
# Categories that require a released protected derivative before the privacy
# review can complete. Reference links have no file content to protect.
REQUIRES_DERIVATIVE_CATEGORIES = {"image", "audio", "video", "document"}


def _item(db: Session, complaint_id: str, evidence_id: str) -> models.EvidenceItem:
    item = db.get(models.EvidenceItem, evidence_id)
    if item is None or item.complaint_id != complaint_id:
        raise NotFoundError("evidence not found")
    return item


def _derivative_version(db: Session, item_id: str) -> models.EvidenceVersion | None:
    return db.scalars(
        select(models.EvidenceVersion)
        .where(models.EvidenceVersion.item_id == item_id, models.EvidenceVersion.kind == "derivative")
        .order_by(models.EvidenceVersion.version_number.desc())
    ).first()


def protected_images(db: Session, complaint: models.Complaint) -> list[dict]:
    """Released derivative summaries for staff inventory."""
    items = db.scalars(
        select(models.EvidenceItem).where(
            models.EvidenceItem.complaint_id == complaint.id, models.EvidenceItem.active.is_(True)
        )
    ).all()
    out = []
    for item in items:
        deriv = _derivative_version(db, item.id)
        status = "pending_release"
        provenance = "real"
        inspection = "pending"
        if item.category not in REQUIRES_DERIVATIVE_CATEGORIES:
            # Reference links carry no file content — nothing to redact or release.
            status = "not_required"
        elif deriv is None and item.seeded_meta:
            status = item.seeded_meta.get("protectedCopyStatus", "pending_release")
        elif deriv is not None:
            rel = db.scalars(
                select(models.ProtectedRelease)
                .where(models.ProtectedRelease.derivative_version_id == deriv.id)
                .order_by(models.ProtectedRelease.created_at.desc())
                .limit(1)
            ).first()
            if rel:
                status = rel.decision
            provenance = deriv.provenance
            inspection = deriv.inspection_state
        out.append(
            {
                "evidence_id": item.id,
                "label": item.display_label,
                "category": item.category,
                "protected_status": status,
                "provenance": provenance,
                "inspection": inspection,
                "has_derivative": deriv is not None,
            }
        )
    return out


def release_derivative(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership,
    evidence_id: str, version_id: str | None = None,
) -> dict:
    acl.require_role(membership, "privacy")
    item = _item(db, complaint.id, evidence_id)
    deriv = _derivative_version(db, item.id)
    if deriv is None:
        raise ValidationFailure("this item has no protected derivative to release")
    if version_id and version_id != deriv.id:
        raise ConflictError("stale version")
    if deriv.inspection_state != "inspected":
        raise ValidationFailure("a failed or missing inspection cannot be released")
    existing = db.scalars(
        select(models.ProtectedRelease).where(
            models.ProtectedRelease.derivative_version_id == deriv.id,
            models.ProtectedRelease.decision == "released",
        )
    ).first()
    if existing is not None:
        raise ConflictError("derivative already released")
    db.add(
        models.ProtectedRelease(
            complaint_id=complaint.id,
            derivative_version_id=deriv.id,
            reviewer_principal_id=membership.human_principal_id,
            decision="released",
        )
    )
    if complaint.lifecycle in ("received_securely",):
        complaint.lifecycle = "privacy_review"
    complaint.updated_at = utcnow()
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type="protected_copy_released",
        actor_principal_id=membership.human_principal_id, actor_role="privacy",
        detail=f"Protected copy released — {item.display_label}",
    )
    audit_svc.enqueue(
        db, aggregate_type="protected_release", aggregate_id=item.id,
        event_type="ProtectedVersionReleased", payload={"evidence_id": item.id},
    )
    _maybe_privacy_done(db, complaint)
    db.flush()
    return {"evidence_id": item.id, "status": "released"}


def hold_derivative(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership,
    evidence_id: str, reason: str,
) -> dict:
    acl.require_role(membership, "privacy")
    item = _item(db, complaint.id, evidence_id)
    deriv = _derivative_version(db, item.id)
    if deriv is None:
        raise ValidationFailure("this item has no protected derivative to hold")
    db.add(
        models.ProtectedRelease(
            complaint_id=complaint.id, derivative_version_id=deriv.id,
            reviewer_principal_id=membership.human_principal_id, decision="held", reason=reason,
        )
    )
    complaint.correction_request = reason
    complaint.updated_at = utcnow()
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type="protection_correction_requested",
        actor_principal_id=membership.human_principal_id, actor_role="privacy",
        detail=f"Held for correction: {reason}",
    )
    db.flush()
    return {"evidence_id": item.id, "status": "held"}


def _maybe_privacy_done(db: Session, complaint: models.Complaint) -> None:
    # Sessions run with autoflush=False; flush so the release row added by the
    # caller is visible to the queries below (otherwise completion never fires).
    db.flush()
    items = db.scalars(
        select(models.EvidenceItem).where(
            models.EvidenceItem.complaint_id == complaint.id, models.EvidenceItem.active.is_(True)
        )
    ).all()
    if not items:
        return
    for item in items:
        if item.category not in REQUIRES_DERIVATIVE_CATEGORIES:
            # Reference links have nothing to redact — they never block completion.
            continue
        deriv = _derivative_version(db, item.id)
        if deriv is None:
            return
        rel = db.scalars(
            select(models.ProtectedRelease).where(
                models.ProtectedRelease.derivative_version_id == deriv.id,
                models.ProtectedRelease.decision == "released",
            )
        ).first()
        if rel is None:
            return
    existing = db.scalars(
        select(models.PublicUpdate).where(
            models.PublicUpdate.complaint_id == complaint.id,
            models.PublicUpdate.text == PRIVACY_DONE_TEXT,
        )
    ).first()
    if existing:
        return
    db.add(
        models.PublicUpdate(
            complaint_id=complaint.id, status="privacy_review", text=PRIVACY_DONE_TEXT
        )
    )


def assign_officer(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership, officer_code: str
) -> models.Assignment:
    acl.require_role(membership, "privacy")
    if complaint.closed or complaint.lifecycle == "closed":
        raise ConflictError("cannot assign a closed case")
    officer = roster.get_officer(officer_code)
    if officer is None:
        raise NotFoundError("officer not found")
    if not roster.is_eligible(officer_code):
        raise ValidationFailure("officer is not eligible (conflict or unavailable)")
    # protected copies must be released first
    for entry in protected_images(db, complaint):
        if entry["has_derivative"] and entry["protected_status"] not in ("released",):
            raise ValidationFailure("release the protected copies before assignment")

    principal = roster.OFFICER_PRINCIPAL_MAP.get(officer_code)
    if not principal:
        raise ValidationFailure("officer has no login-able principal in this demo")
    current = acl.active_assignment(db, complaint.id)
    epoch = 1
    if current is not None:
        current.active = False
        current.revoked_at = utcnow()
        epoch = current.epoch + 1
        access_svc.revoke_all_grants(db, complaint.id, membership, "reassignment")
    assignment = models.Assignment(
        complaint_id=complaint.id,
        investigator_principal_id=principal,
        investigator_officer_code=officer_code,
        active=True,
        assigned_by=membership.human_principal_id,
        epoch=epoch,
    )
    db.add(assignment)
    complaint.assigned_officer_code = officer_code
    complaint.lifecycle = "assigned_for_investigation"
    complaint.updated_at = utcnow()
    db.add(
        models.PublicUpdate(
            complaint_id=complaint.id, status="assigned_for_investigation",
            text="Your report has been assigned for investigation.",
        )
    )
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type="investigator_assigned",
        actor_principal_id=membership.human_principal_id, actor_role="privacy",
        detail=f"Case assigned to {officer_code} — {officer['name']}",
    )
    audit_svc.notify(
        db, role_type="case-investigator", officer_code=officer_code, complaint_id=complaint.id,
        title="New Critical Case Assigned" if complaint.priority == "critical" else "New Case Assigned",
        body=f"{complaint.reference} · {complaint.title}", link=f"/investigator/cases/{complaint.id}",
        tone="critical" if complaint.priority == "critical" else "info",
    )
    audit_svc.enqueue(
        db, aggregate_type="complaint", aggregate_id=complaint.id, event_type="InvestigatorAssigned",
        payload={"officer_code": officer_code, "epoch": epoch},
    )
    db.flush()
    return assignment


ALLOWED_UPDATE_STATUSES = {
    "received_securely", "privacy_review", "assigned_for_investigation",
    "under_investigation", "additional_review_required", "resolution_prepared", "closed",
}


def add_public_update(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership,
    status: str, text: str,
) -> None:
    acl.require_case_view(db, membership, complaint.id)
    if membership.role == "investigator":
        acl.require_role(membership, "investigator")
    if status not in ALLOWED_UPDATE_STATUSES:
        raise ValidationFailure("invalid status")
    if membership.role == "privacy" and status != complaint.lifecycle:
        # Privacy only publishes system milestones through release/assign; block free text.
        raise ForbiddenError("Privacy may not author arbitrary reporter updates")
    complaint.lifecycle = status
    complaint.updated_at = utcnow()
    db.add(models.PublicUpdate(complaint_id=complaint.id, status=status, text=text))
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type="public_update_added",
        actor_principal_id=membership.human_principal_id, actor_role=membership.role,
        detail="Reporter update added",
    )
    audit_svc.enqueue(
        db, aggregate_type="complaint", aggregate_id=complaint.id,
        event_type="PublicUpdatePublished", payload={"status": status},
    )
    db.flush()


def add_internal_note(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership, text: str
) -> None:
    acl.require_case_view(db, membership, complaint.id)
    db.add(
        models.InternalNote(
            complaint_id=complaint.id,
            author_principal_id=membership.human_principal_id,
            author_name=membership.display_name,
            text=text,
        )
    )
    complaint.updated_at = utcnow()
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type="internal_note_added",
        actor_principal_id=membership.human_principal_id, actor_role=membership.role,
        detail="Internal note added",
    )
    db.flush()


def recommend_closure(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership,
    outcome: str, reporter_message: str,
) -> models.ClosureRecommendation:
    acl.require_role(membership, "investigator")
    assignment = acl.active_assignment(db, complaint.id)
    if not assignment or assignment.investigator_principal_id != membership.human_principal_id:
        raise ForbiddenError("only the assigned investigator may recommend closure")
    rec = models.ClosureRecommendation(
        complaint_id=complaint.id,
        recommended_by=membership.human_principal_id,
        outcome=outcome,
        reporter_message=reporter_message,
    )
    db.add(rec)
    complaint.lifecycle = "resolution_prepared"
    complaint.updated_at = utcnow()
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type="closure_recommended",
        actor_principal_id=membership.human_principal_id, actor_role="investigator",
        detail="Closure recommended",
    )
    audit_svc.notify(
        db, role_type="oversight-officer", complaint_id=complaint.id,
        title="Case closure awaiting decision", body=f"{complaint.reference}",
        link="/oversight/closures", tone="info",
    )
    db.flush()
    return rec


def closure_decision(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership,
    decision: str, reason: str | None,
) -> None:
    acl.require_role(membership, "oversight")
    rec = db.scalars(
        select(models.ClosureRecommendation)
        .where(models.ClosureRecommendation.complaint_id == complaint.id)
        .order_by(models.ClosureRecommendation.recommended_at.desc())
        .limit(1)
    ).first()
    if decision in ("approved", "returned"):
        if rec is None or rec.status != "pending_oversight":
            raise ConflictError("no pending closure recommendation")
        if decision == "approved":
            rec.status = "approved"
            rec.decided_by = membership.human_principal_id
            rec.decided_at = utcnow()
            complaint.lifecycle = "closed"
            complaint.closed = True
            db.add(
                models.PublicUpdate(
                    complaint_id=complaint.id, status="closed", text=rec.reporter_message
                )
            )
            access_svc.revoke_all_grants(db, complaint.id, membership, "case closed")
            audit_svc.append_audit(
                db, complaint_id=complaint.id, event_type="closure_approved",
                actor_principal_id=membership.human_principal_id, actor_role="oversight",
                detail="Case closure approved",
            )
            audit_svc.enqueue(
                db, aggregate_type="complaint", aggregate_id=complaint.id,
                event_type="CaseClosed", payload={},
            )
        else:
            rec.status = "returned"
            rec.return_reason = reason
            rec.decided_by = membership.human_principal_id
            rec.decided_at = utcnow()
            audit_svc.append_audit(
                db, complaint_id=complaint.id, event_type="status_changed",
                actor_principal_id=membership.human_principal_id, actor_role="oversight",
                detail=f"Closure returned: {reason or ''}",
            )
    elif decision == "reopen":
        if not complaint.closed:
            raise ConflictError("case is not closed")
        complaint.closed = False
        complaint.lifecycle = "under_investigation"
        audit_svc.append_audit(
            db, complaint_id=complaint.id, event_type="case_reopened",
            actor_principal_id=membership.human_principal_id, actor_role="oversight",
            detail="Case reopened; prior grants remain revoked",
        )
    else:
        raise ValidationFailure("invalid decision")
    complaint.updated_at = utcnow()
    db.flush()


def acknowledge_protection_task(
    db: Session, complaint: models.Complaint, membership: models.StaffMembership
) -> None:
    acl.require_role(membership, "oversight")
    task = db.scalars(
        select(models.ProtectionTask).where(
            models.ProtectionTask.complaint_id == complaint.id,
            models.ProtectionTask.state == "open",
        )
    ).first()
    if task is None:
        raise NotFoundError("no open protection task")
    task.state = "acknowledged"
    task.acknowledged_at = utcnow()
    audit_svc.append_audit(
        db, complaint_id=complaint.id, event_type="protection_task_acknowledged",
        actor_principal_id=membership.human_principal_id, actor_role="oversight",
        detail="Protection task acknowledged",
    )
    db.flush()
