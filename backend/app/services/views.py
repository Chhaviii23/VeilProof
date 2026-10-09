"""Read projections. Reporter output is purpose-built and excludes internal fields."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..schemas import (
    AuditEventModel,
    CaseRecordView,
    EvidenceRecordView,
    EvidenceVersionView,
    InternalNoteModel,
    OriginalAccessRequestModel,
    ProtectionSummary,
    ProofSummary,
    PublicUpdateModel,
    PublicUpdateView,
    TrackingStatusResponse,
)
from ..timeutil import iso

CATEGORY_MIME = {
    "document": "application/pdf",
    "image": "image/jpeg",
    "audio": "audio/mpeg",
    "video": "video/mp4",
    "reference": "link",
}


def _principal_names(db: Session) -> dict[str, str]:
    rows = db.scalars(select(models.StaffMembership)).all()
    return {m.human_principal_id: m.display_name for m in rows}


def build_case_view(db: Session, complaint: models.Complaint) -> CaseRecordView:
    names = _principal_names(db)
    items = db.scalars(
        select(models.EvidenceItem).where(
            models.EvidenceItem.complaint_id == complaint.id, models.EvidenceItem.active.is_(True)
        )
    ).all()
    requests = db.scalars(
        select(models.AccessRequest).where(models.AccessRequest.complaint_id == complaint.id)
    ).all()
    request_by_version = {r.original_version_id: r for r in requests}

    evidence_views: list[EvidenceRecordView] = []
    for item in items:
        versions = db.scalars(
            select(models.EvidenceVersion).where(models.EvidenceVersion.item_id == item.id)
        ).all()
        original = next((v for v in versions if v.kind == "original"), None)
        derivative = next((v for v in versions if v.kind == "derivative"), None)

        if not versions and item.seeded_meta:
            sm = item.seeded_meta
            evidence_views.append(
                EvidenceRecordView(
                    id=item.id,
                    name=sm.get("display_label") or item.display_label,
                    type=sm.get("type", "application/pdf"),
                    size=int(sm.get("size", 0)),
                    metadataRemoved=list(sm.get("metadata_removed", [])),
                    protectedCopyStatus=sm.get("protectedCopyStatus", "pending_release"),
                    protectedCopyReleasedAt=sm.get("protectedCopyReleasedAt"),
                    protectedCopyReleasedByName=sm.get("protectedCopyReleasedByName"),
                    sealedOriginalStatus=sm.get("sealedOriginalStatus", "sealed"),
                    versions=[],
                )
            )
            continue

        version_views = [
            EvidenceVersionView(
                id=v.id,
                kind=v.kind,
                version_number=v.version_number,
                provenance=v.provenance,
                inspection_state=v.inspection_state,
                metadata_removed=list(v.metadata_removed or []),
            )
            for v in sorted(versions, key=lambda v: (v.kind, v.version_number))
        ]
        protected_status = "pending_release"
        released_at = None
        released_by = None
        if derivative is not None:
            rel = db.scalars(
                select(models.ProtectedRelease)
                .where(models.ProtectedRelease.derivative_version_id == derivative.id)
                .order_by(models.ProtectedRelease.created_at.desc())
                .limit(1)
            ).first()
            if rel is not None:
                protected_status = {"released": "released", "held": "held", "rejected": "rejected"}.get(
                    rel.decision, "pending_release"
                )
                released_at = iso(rel.created_at)
                released_by = names.get(rel.reviewer_principal_id)

        sealed_status = "sealed"
        req_id = None
        version_for_lookup = original.id if original else None
        req = request_by_version.get(version_for_lookup) if version_for_lookup else None
        if req is not None:
            req_id = req.id
            if req.state == "privacy_review_pending":
                sealed_status = "request_pending"
            elif req.state == "oversight_review_pending":
                sealed_status = "privacy_approved"
            elif req.state == "approved":
                grant = db.scalars(
                    select(models.AccessGrant)
                    .where(models.AccessGrant.request_id == req.id)
                    .order_by(models.AccessGrant.created_at.desc())
                    .limit(1)
                ).first()
                if grant and grant.state == "active":
                    sealed_status = "access_granted"
                elif grant and grant.state == "expired":
                    sealed_status = "expired"
                elif grant and grant.state == "revoked":
                    sealed_status = "revoked"
                elif grant and grant.state == "ended":
                    sealed_status = "ended"
                else:
                    sealed_status = "access_granted"
            elif req.state in ("rejected", "expired", "revoked", "ended"):
                sealed_status = req.state

        label = item.display_label
        size = 0
        mime = CATEGORY_MIME.get(item.category, "application/octet-stream")
        if original is not None:
            obj = db.get(models.UploadObject, original.object_id)
            if obj and obj.plaintext_length is not None:
                size = int(obj.plaintext_length)
        evidence_views.append(
            EvidenceRecordView(
                id=item.id,
                name=label,
                type=mime,
                size=size,
                metadataRemoved=list((derivative.metadata_removed if derivative else ()) or []),
                protectedCopyStatus=protected_status,
                protectedCopyReleasedAt=released_at,
                protectedCopyReleasedByName=released_by,
                sealedOriginalStatus=sealed_status,
                originalAccessRequestId=req_id,
                versions=version_views,
            )
        )

    request_models = [_request_model(db, r, names) for r in requests]
    public_updates = [
        PublicUpdateModel(id=u.id, status=u.status, text=u.text, addedAt=iso(u.created_at))
        for u in db.scalars(
            select(models.PublicUpdate)
            .where(models.PublicUpdate.complaint_id == complaint.id)
            .order_by(models.PublicUpdate.created_at.asc())
        )
    ]
    internal_notes = [
        InternalNoteModel(
            id=n.id, text=n.text, addedBy=n.author_principal_id, addedByName=n.author_name,
            addedAt=iso(n.created_at),
        )
        for n in db.scalars(
            select(models.InternalNote)
            .where(models.InternalNote.complaint_id == complaint.id)
            .order_by(models.InternalNote.created_at.asc())
        )
    ]
    audit = build_audit_view(db, complaint.id, names)
    from .proofs import proof_summary

    summary = proof_summary(db, complaint.id)

    return CaseRecordView(
        id=complaint.id,
        reference=complaint.reference,
        title=complaint.title,
        category=complaint.category,
        description=complaint.description,
        incidentDate=complaint.incident_date,
        location=complaint.location,
        involvedParties=complaint.involved_parties,
        receivedAt=iso(complaint.accepted_at),
        lastUpdated=iso(complaint.updated_at),
        status=complaint.lifecycle,
        priority=complaint.priority,
        riskFactors=list(complaint.risk_factors or []),
        evidence=evidence_views,
        originalAccessRequests=request_models,
        publicUpdates=public_updates,
        internalNotes=internal_notes,
        auditTrail=audit,
        assignedOfficerCode=complaint.assigned_officer_code,
        assignedInvestigatorId="",
        correctionRequest=complaint.correction_request,
        isSeeded=complaint.is_seeded,
        integrity={"proofStatus": summary["proof_status"], "transactionRef": summary["tx_ref"], "network": summary["network"]},
        protectionSummary={
            "namesProtected": 0,
            "facesBlurred": 0,
            "voicesMasked": 0,
            "metadataFieldsRemoved": sum(len(e.metadataRemoved) for e in evidence_views),
        },
    )


def _request_model(db: Session, req: models.AccessRequest, names: dict[str, str]) -> OriginalAccessRequestModel:
    rev = (
        db.get(models.RequestRevision, req.current_revision_id)
        if req.current_revision_id
        else db.scalars(
            select(models.RequestRevision)
            .where(models.RequestRevision.request_id == req.id)
            .order_by(models.RequestRevision.revision_number.desc())
            .limit(1)
        ).first()
    )
    decisions = (
        db.scalars(select(models.ApprovalDecision).where(models.ApprovalDecision.revision_id == rev.id)).all()
        if rev
        else []
    )
    priv = next((d for d in decisions if d.stage == "privacy"), None)
    over = next((d for d in decisions if d.stage == "oversight"), None)
    grant = db.scalars(
        select(models.AccessGrant)
        .where(models.AccessGrant.request_id == req.id)
        .order_by(models.AccessGrant.created_at.desc())
        .limit(1)
    ).first()
    return OriginalAccessRequestModel(
        id=req.id,
        caseId=req.complaint_id,
        evidenceId=req.original_version_id,
        requestedBy=req.requester_principal_id,
        requestedByName=names.get(req.requester_principal_id, req.requester_principal_id),
        requestedAt=iso(req.created_at),
        purpose=rev.purpose if rev else "",
        reason=rev.insufficiency_reason if rev else "",
        requestedDurationMinutes=rev.duration_minutes if rev else 0,
        accessMode=rev.mode if rev else "view_only",
        urgency=rev.urgency if rev else "standard",
        intendedAction=rev.intended_action if rev else "",
        privacyDecision=priv.outcome if priv else "pending",
        privacyDecidedByName=names.get(priv.reviewer_principal_id) if priv else None,
        privacyDecidedAt=iso(priv.created_at) if priv else None,
        privacyNotes=priv.notes if priv else None,
        oversightDecision=over.outcome if over else "pending",
        oversightDecidedByName=names.get(over.reviewer_principal_id) if over else None,
        oversightDecidedAt=iso(over.created_at) if over else None,
        oversightNotes=over.notes if over else None,
        status=req.state,
        accessGrantedAt=iso(grant.started_at) if grant and grant.started_at else None,
        accessExpiresAt=iso(grant.expires_at) if grant and grant.expires_at else None,
        grantId=grant.id if grant else None,
        revisionNumber=rev.revision_number if rev else 1,
    )


def build_audit_view(db: Session, complaint_id: str, names: dict[str, str] | None = None) -> list[AuditEventModel]:
    names = names or _principal_names(db)
    rows = db.scalars(
        select(models.AuditEvent)
        .where(models.AuditEvent.complaint_id == complaint_id)
        .order_by(models.AuditEvent.sequence.asc())
    ).all()
    return [
        AuditEventModel(
            id=e.id,
            type=e.event_type,
            caseId=e.complaint_id,
            actorId=e.actor_principal_id,
            actorName=names.get(e.actor_principal_id) if e.actor_principal_id else None,
            actorRole=e.actor_role,
            scope=e.scope,
            purpose=e.purpose,
            detail=e.detail,
            occurredAt=iso(e.created_at),
        )
        for e in rows
    ]


def build_tracking_status(db: Session, complaint: models.Complaint) -> TrackingStatusResponse:
    updates = db.scalars(
        select(models.PublicUpdate)
        .where(models.PublicUpdate.complaint_id == complaint.id)
        .order_by(models.PublicUpdate.created_at.asc())
    ).all()
    items = db.scalars(
        select(models.EvidenceItem).where(
            models.EvidenceItem.complaint_id == complaint.id, models.EvidenceItem.active.is_(True)
        )
    ).all()
    removed = 0
    provenance = "real"
    for item in items:
        versions = db.scalars(
            select(models.EvidenceVersion).where(models.EvidenceVersion.item_id == item.id)
        ).all()
        derivative = next((v for v in versions if v.kind == "derivative"), None)
        if derivative:
            removed += len(derivative.metadata_removed or [])
            if derivative.provenance == "controlled_fixture":
                provenance = "controlled_fixture"
        elif item.seeded_meta:
            removed += len(item.seeded_meta.get("metadata_removed", []))
    from .proofs import proof_summary

    summary = proof_summary(db, complaint.id)
    return TrackingStatusResponse(
        case_reference=complaint.reference,
        status=complaint.lifecycle,
        priority=complaint.priority,
        protection_summary=ProtectionSummary(
            evidence_count=len(items), metadata_fields_removed=removed, provenance=provenance
        ),
        proof_summary=ProofSummary(
            proof_status=summary["proof_status"],
            provider=summary["provider"],
            tx_ref=summary["tx_ref"],
            network=summary["network"],
        ),
        public_updates=[
            PublicUpdateView(id=u.id, status=u.status, text=u.text, added_at=iso(u.created_at))
            for u in updates
        ],
        updated_at=iso(complaint.updated_at),
    )
