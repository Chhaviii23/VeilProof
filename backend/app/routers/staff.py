"""Staff endpoints. Deny-by-default; role and assignment checked server-side."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Header, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..db import get_db
from ..deps import current_membership, request_id
from ..errors import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationFailure
from ..schemas import (
    AccessRequestBody,
    AssignmentRequest,
    AuditEventModel,
    CaseRecordView,
    ClosureDecisionBody,
    ClosureRecommendationBody,
    GrantActivateResponse,
    HoldRequest,
    InternalNoteRequest,
    NotificationView,
    OfficerView,
    OversightDecisionBody,
    PrivacyDecisionBody,
    PublicUpdateRequest,
    ReleaseRequest,
    StaffAccountView,
    StaffLoginRequest,
    StaffLoginResponse,
    ViewerContentRequest,
)
from ..security import acl, auth, tracking
from ..services import access as access_svc
from ..services import roster, workflow
from ..services import audit as audit_svc
from ..services.views import build_audit_view, build_case_view
from ..timeutil import iso, utcnow

router = APIRouter(prefix="/staff", tags=["staff"])


def _account(m: models.StaffMembership) -> StaffAccountView:
    return StaffAccountView(
        id=m.id,
        name=m.display_name,
        role=auth.role_type_of(m.role).replace("-", " ").title().replace("Case", "Case"),
        roleType=auth.role_type_of(m.role),
        organization="Public Integrity Office",
        officerCode=m.officer_code,
    )


# ─── Auth ────────────────────────────────────────────────────────────────────


@router.post("/sessions", response_model=StaffLoginResponse)
def login(body: StaffLoginRequest, db: Session = Depends(get_db)):
    if get_settings().is_production_like:
        raise UnauthorizedError("local provider disabled")
    m = db.scalars(
        select(models.StaffMembership).where(models.StaffMembership.auth_subject == body.username)
    ).first()
    if m is None or not m.active or not auth.verify_password(body.password, m.password_hash):
        raise UnauthorizedError("invalid credentials")
    jti = tracking.generate_capability(24)
    s = get_settings()
    expires = utcnow() + timedelta(seconds=s.staff_session_ttl_seconds)
    db.add(models.StaffSession(membership_id=m.id, jti=jti, expires_at=expires))
    db.flush()
    token = auth.create_session_token(
        membership_id=m.id, human_principal_id=m.human_principal_id, role=m.role,
        officer_code=m.officer_code, jti=jti,
    )
    # roleType drives the frontend account view
    return StaffLoginResponse(token=token, expires_at=iso(expires), investigator=_account(m))


@router.get("/me", response_model=StaffAccountView)
def me(membership: models.StaffMembership = Depends(current_membership)):
    return _account(membership)


@router.delete("/sessions/current")
def logout(
    membership: models.StaffMembership = Depends(current_membership),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    claims = auth.decode_session_token(authorization.split(" ", 1)[1].strip())
    session = db.scalars(select(models.StaffSession).where(models.StaffSession.jti == claims.jti)).first()
    if session:
        session.revoked = True
    return {"ok": True}


# ─── Case reads ──────────────────────────────────────────────────────────────


def _load_case(db: Session, membership: models.StaffMembership, case_id: str) -> models.Complaint:
    complaint = db.get(models.Complaint, case_id)
    if complaint is None:
        complaint = db.scalars(
            select(models.Complaint).where(models.Complaint.reference == case_id)
        ).first()
    if complaint is None:
        raise NotFoundError("case not found")
    acl.require_case_view(db, membership, complaint.id)
    return complaint


@router.get("/cases", response_model=list[CaseRecordView])
def list_cases(membership: models.StaffMembership = Depends(current_membership), db: Session = Depends(get_db)):
    if membership.role == "investigator":
        assignments = db.scalars(
            select(models.Assignment).where(
                models.Assignment.investigator_principal_id == membership.human_principal_id,
                models.Assignment.active.is_(True),
            )
        ).all()
        case_ids = {a.complaint_id for a in assignments}
        complaints = [c for c in db.scalars(select(models.Complaint)).all() if c.id in case_ids]
    else:
        complaints = list(db.scalars(select(models.Complaint)).all())
    complaints.sort(key=lambda c: (c.priority != "critical", c.accepted_at))
    return [build_case_view(db, c) for c in complaints]


@router.get("/cases/{case_id}", response_model=CaseRecordView)
def get_case(
    case_id: str,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    return build_case_view(db, _load_case(db, membership, case_id))


@router.get("/privacy/queue", response_model=list[CaseRecordView])
def privacy_queue(membership: models.StaffMembership = Depends(current_membership), db: Session = Depends(get_db)):
    acl.require_role(membership, "privacy")
    complaints = list(db.scalars(select(models.Complaint)).all())
    complaints.sort(key=lambda c: (c.priority != "critical", c.accepted_at))
    return [build_case_view(db, c) for c in complaints]


@router.get("/cases/{case_id}/audit", response_model=list[AuditEventModel])
def case_audit(
    case_id: str,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    return build_audit_view(db, complaint.id)


@router.get("/officers", response_model=list[OfficerView])
def officers(membership: models.StaffMembership = Depends(current_membership)):
    acl.require_role(membership, "privacy")
    return [OfficerView(**roster.view(o["code"])) for o in roster.OFFICERS]


# ─── Privacy commands ────────────────────────────────────────────────────────


@router.post("/cases/{case_id}/releases")
def release(
    case_id: str,
    body: ReleaseRequest,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    return workflow.release_derivative(db, complaint, membership, body.evidence_id, body.version_id)


@router.post("/cases/{case_id}/holds")
def hold(
    case_id: str,
    body: HoldRequest,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    return workflow.hold_derivative(db, complaint, membership, body.evidence_id, body.reason)


@router.post("/cases/{case_id}/assignments")
def assign(
    case_id: str,
    body: AssignmentRequest,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    assignment = workflow.assign_officer(db, complaint, membership, body.officer_code)
    return {"assignment_id": assignment.id, "officer_code": assignment.investigator_officer_code}


# ─── Investigation commands ──────────────────────────────────────────────────


@router.post("/cases/{case_id}/public-updates")
def public_update(
    case_id: str,
    body: PublicUpdateRequest,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    if body.expected_revision is not None and body.expected_revision < complaint.revision:
        raise ConflictError("stale revision")
    workflow.add_public_update(db, complaint, membership, body.status, body.text)
    complaint.revision += 1
    return {"ok": True, "revision": complaint.revision}


@router.post("/cases/{case_id}/internal-notes")
def internal_note(
    case_id: str,
    body: InternalNoteRequest,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    workflow.add_internal_note(db, complaint, membership, body.text)
    return {"ok": True}


@router.post("/cases/{case_id}/closure-recommendations")
def closure_recommendation(
    case_id: str,
    body: ClosureRecommendationBody,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    rec = workflow.recommend_closure(db, complaint, membership, body.outcome, body.reporter_message)
    return {"recommendation_id": rec.id}


@router.post("/cases/{case_id}/closure-decisions")
def closure_decision(
    case_id: str,
    body: ClosureDecisionBody,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    workflow.closure_decision(db, complaint, membership, body.decision, body.reason)
    return {"ok": True}


@router.post("/cases/{case_id}/protection-tasks/ack")
def protection_ack(
    case_id: str,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    workflow.acknowledge_protection_task(db, complaint, membership)
    return {"ok": True}


# ─── Original access ─────────────────────────────────────────────────────────


@router.post("/cases/{case_id}/access-requests")
def create_request(
    case_id: str,
    body: AccessRequestBody,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    req = access_svc.create_request(db, complaint, membership, body)
    return {"request_id": req.id, "state": req.state}


@router.post("/cases/{case_id}/access-requests/{request_id}/privacy-decisions")
def privacy_decision(
    case_id: str,
    request_id: str,
    body: PrivacyDecisionBody,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    req = access_svc.privacy_decision(db, complaint, membership, request_id, body)
    return {"request_id": req.id, "state": req.state}


@router.post("/cases/{case_id}/access-requests/{request_id}/oversight-decisions")
def oversight_decision(
    case_id: str,
    request_id: str,
    body: OversightDecisionBody,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    complaint = _load_case(db, membership, case_id)
    req = access_svc.oversight_decision(db, complaint, membership, request_id, body)
    return {"request_id": req.id, "state": req.state}


@router.post("/grants/{grant_id}/activate", response_model=GrantActivateResponse)
def activate(
    grant_id: str,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    return access_svc.activate_grant(db, membership, grant_id)


@router.post("/grants/{grant_id}/end")
def end(
    grant_id: str,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    access_svc.end_grant(db, membership, grant_id)
    return {"ok": True}


@router.post("/grants/{grant_id}/revoke")
def revoke(
    grant_id: str,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    access_svc.revoke_grant(db, membership, grant_id)
    return {"ok": True}


@router.post("/viewer/content")
def viewer_content(
    body: ViewerContentRequest,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    data = access_svc.viewer_content(db, membership, body.handle)
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


@router.get("/evidence/{version_id}/protected")
def protected_content(
    version_id: str,
    membership: models.StaffMembership = Depends(current_membership),
    db: Session = Depends(get_db),
):
    version = db.get(models.EvidenceVersion, version_id)
    if version is None or version.kind != "derivative":
        raise NotFoundError("protected copy not found")
    item = db.get(models.EvidenceItem, version.item_id)
    complaint = db.get(models.Complaint, item.complaint_id)
    acl.require_case_view(db, membership, complaint.id)
    if membership.role == "investigator":
        rel = db.scalars(
            select(models.ProtectedRelease).where(
                models.ProtectedRelease.derivative_version_id == version.id,
                models.ProtectedRelease.decision == "released",
            )
        ).first()
        if rel is None:
            raise ForbiddenError("protected copy not released")
    obj = db.get(models.UploadObject, version.object_id)
    from ..security.crypto import CryptoError, open_envelope
    from ..storage import get_storage

    try:
        plaintext = open_envelope(version.envelope, get_storage().get(obj.storage_path))
    except CryptoError as exc:
        raise ForbiddenError("content failed authentication") from exc
    from ..services.views import CATEGORY_MIME

    media_type = CATEGORY_MIME.get(item.category, "application/octet-stream")
    return Response(content=plaintext, media_type=media_type, headers={"Cache-Control": "no-store"})


# ─── Notifications ───────────────────────────────────────────────────────────


@router.get("/notifications", response_model=list[NotificationView])
def notifications(
    membership: models.StaffMembership = Depends(current_membership), db: Session = Depends(get_db)
):
    role_type = auth.role_type_of(membership.role)
    rows = db.scalars(
        select(models.Notification)
        .where(models.Notification.role_type == role_type)
        .order_by(models.Notification.created_at.desc())
        .limit(100)
    ).all()
    out = []
    for n in rows:
        if n.officer_code and n.officer_code != membership.officer_code:
            continue
        out.append(
            NotificationView(
                id=n.id, roleType=n.role_type, officerCode=n.officer_code, caseId=n.complaint_id,
                title=n.title, body=n.body, link=n.link, tone=n.tone, createdAt=iso(n.created_at),
                read=n.read,
            )
        )
    return out
