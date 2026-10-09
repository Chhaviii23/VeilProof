"""Durable domain schema (P01B).

Scaled to a single operator but with explicit security boundaries between workflow,
evidence, access control, reporter-public, and audit data.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base
from .timeutil import utcnow


def new_id() -> str:
    return str(uuid.uuid4())


class Operator(Base):
    __tablename__ = "operators"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StaffMembership(Base):
    __tablename__ = "staff_memberships"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    operator_id: Mapped[str] = mapped_column(ForeignKey("operators.id"), nullable=False)
    auth_subject: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    human_principal_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)  # privacy|investigator|oversight
    officer_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StaffSession(Base):
    __tablename__ = "staff_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    membership_id: Mapped[str] = mapped_column(ForeignKey("staff_memberships.id"), nullable=False)
    jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class IntakeSession(Base):
    __tablename__ = "intake_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    operator_id: Mapped[str] = mapped_column(ForeignKey("operators.id"), nullable=False)
    capability_verifier: Mapped[str] = mapped_column(String(128), nullable=False)
    state: Mapped[str] = mapped_column(String(30), default="open")  # open|finalized|abandoned
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # idempotency bookkeeping
    last_idempotency_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_command_digest: Mapped[str | None] = mapped_column(String(128), nullable=True)
    result_reference: Mapped[str | None] = mapped_column(String(40), nullable=True)
    result_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Complaint(Base):
    __tablename__ = "complaints"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    reference: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    operator_id: Mapped[str] = mapped_column(ForeignKey("operators.id"), nullable=False)
    lifecycle: Mapped[str] = mapped_column(String(40), default="received_securely", index=True)
    priority: Mapped[str] = mapped_column(String(20), default="standard")
    revision: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    incident_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    involved_parties: Mapped[str | None] = mapped_column(String(500), nullable=True)
    risk_factors: Mapped[list] = mapped_column(JSON, default=list)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    closed: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_officer_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    correction_request: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_seeded: Mapped[bool] = mapped_column(Boolean, default=False)


class TrackingCredential(Base):
    __tablename__ = "tracking_credentials"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id"), unique=True, nullable=False
    )
    verifier: Mapped[str] = mapped_column(String(128), nullable=False)
    pepper_version: Mapped[str] = mapped_column(String(30), default="v1")
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UploadObject(Base):
    __tablename__ = "upload_objects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    intake_session_id: Mapped[str] = mapped_column(
        ForeignKey("intake_sessions.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), default="original")
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    planned_version_id: Mapped[str] = mapped_column(String(36), default=new_id)
    storage_path: Mapped[str] = mapped_column(String(300), nullable=False)
    expected_size: Mapped[int] = mapped_column(BigInteger, default=0)
    expected_ciphertext_digest: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ciphertext_digest: Mapped[str | None] = mapped_column(String(128), nullable=True)
    envelope: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    plaintext_sha256: Mapped[str | None] = mapped_column(String(128), nullable=True)
    plaintext_length: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    provenance: Mapped[str] = mapped_column(String(24), default="real")
    metadata_removed: Mapped[list] = mapped_column(JSON, default=list)
    inspection_detail: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    state: Mapped[str] = mapped_column(String(20), default="staging", index=True)
    # staging|complete|inspected|attached|quarantined
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attached: Mapped[bool] = mapped_column(Boolean, default=False)


class EvidenceItem(Base):
    __tablename__ = "evidence_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    display_label: Mapped[str] = mapped_column(String(200), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    # NULL for superseded items (SQL unique indexes allow repeated NULLs), 1 for the active slot.
    active_slot: Mapped[int | None] = mapped_column(Integer, nullable=True, default=1)
    # Display metadata for seeded (object-less) fixtures only; never used for real evidence.
    seeded_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        # at most one active item per (complaint, category); superseded rows use NULL
        UniqueConstraint(
            "complaint_id", "category", "active_slot", name="uq_active_item_category"
        ),
    )


class EvidenceVersion(Base):
    __tablename__ = "evidence_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    item_id: Mapped[str] = mapped_column(ForeignKey("evidence_items.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # original|derivative
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    parent_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    object_id: Mapped[str] = mapped_column(ForeignKey("upload_objects.id"), nullable=False)
    ciphertext_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    plaintext_sha256: Mapped[str] = mapped_column(String(128), nullable=False)
    envelope: Mapped[dict] = mapped_column(JSON, default=dict)
    provenance: Mapped[str] = mapped_column(String(24), default="real")  # real|controlled_fixture
    inspection_state: Mapped[str] = mapped_column(String(20), default="pending")
    metadata_removed: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    immutable: Mapped[bool] = mapped_column(Boolean, default=False)


class InspectionResult(Base):
    __tablename__ = "inspection_results"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    version_id: Mapped[str | None] = mapped_column(
        ForeignKey("evidence_versions.id"), nullable=True
    )
    object_id: Mapped[str] = mapped_column(ForeignKey("upload_objects.id"), nullable=False)
    processor_version: Mapped[str] = mapped_column(String(30), default="inspect-1")
    result: Mapped[str] = mapped_column(String(20), nullable=False)  # passed|failed
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    validated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProtectedRelease(Base):
    __tablename__ = "protected_releases"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    derivative_version_id: Mapped[str] = mapped_column(
        ForeignKey("evidence_versions.id"), nullable=False
    )
    reviewer_principal_id: Mapped[str] = mapped_column(String(64), nullable=False)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)  # released|held|rejected
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    investigator_principal_id: Mapped[str] = mapped_column(String(64), nullable=False)
    investigator_officer_code: Mapped[str] = mapped_column(String(20), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    assigned_by: Mapped[str] = mapped_column(String(64), nullable=False)
    epoch: Mapped[int] = mapped_column(Integer, default=1)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AccessRequest(Base):
    __tablename__ = "access_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    original_version_id: Mapped[str] = mapped_column(
        ForeignKey("evidence_versions.id"), nullable=False
    )
    requester_principal_id: Mapped[str] = mapped_column(String(64), nullable=False)
    current_revision_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    state: Mapped[str] = mapped_column(String(40), default="privacy_review_pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RequestRevision(Base):
    __tablename__ = "request_revisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    request_id: Mapped[str] = mapped_column(ForeignKey("access_requests.id"), nullable=False)
    revision_number: Mapped[int] = mapped_column(Integer, default=1)
    request_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    purpose: Mapped[str] = mapped_column(String(1000), nullable=False)
    insufficiency_reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    intended_action: Mapped[str] = mapped_column(String(500), nullable=False)
    mode: Mapped[str] = mapped_column(String(30), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    superseded: Mapped[bool] = mapped_column(Boolean, default=False)


class ApprovalDecision(Base):
    __tablename__ = "approval_decisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    revision_id: Mapped[str] = mapped_column(ForeignKey("request_revisions.id"), nullable=False)
    reviewer_principal_id: Mapped[str] = mapped_column(String(64), nullable=False)
    reviewer_role: Mapped[str] = mapped_column(String(30), nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)  # privacy|oversight
    outcome: Mapped[str] = mapped_column(String(30), nullable=False)
    # approved|rejected|clarification_requested
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        UniqueConstraint("revision_id", "stage", name="uq_decision_revision_stage"),
    )


class AccessGrant(Base):
    __tablename__ = "access_grants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    original_version_id: Mapped[str] = mapped_column(
        ForeignKey("evidence_versions.id"), nullable=False
    )
    request_id: Mapped[str] = mapped_column(ForeignKey("access_requests.id"), nullable=False)
    revision_id: Mapped[str] = mapped_column(ForeignKey("request_revisions.id"), nullable=False)
    requester_principal_id: Mapped[str] = mapped_column(String(64), nullable=False)
    mode: Mapped[str] = mapped_column(String(30), nullable=False)
    approved_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    unused_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    state: Mapped[str] = mapped_column(String(20), default="approved_unused", index=True)
    policy_epoch: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ViewerSession(Base):
    __tablename__ = "viewer_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    handle: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    grant_id: Mapped[str] = mapped_column(ForeignKey("access_grants.id"), nullable=False)
    membership_id: Mapped[str] = mapped_column(ForeignKey("staff_memberships.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class InternalNote(Base):
    __tablename__ = "internal_notes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    author_principal_id: Mapped[str] = mapped_column(String(64), nullable=False)
    author_name: Mapped[str] = mapped_column(String(200), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PublicUpdate(Base):
    __tablename__ = "public_updates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProtectionTask(Base):
    __tablename__ = "protection_tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="critical")
    owner_role: Mapped[str] = mapped_column(String(30), default="oversight")
    state: Mapped[str] = mapped_column(String(20), default="open")  # open|acknowledged|actioned
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ClosureRecommendation(Base):
    __tablename__ = "closure_recommendations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    recommended_by: Mapped[str] = mapped_column(String(64), nullable=False)
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    reporter_message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending_oversight")
    decided_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    return_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    recommended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProofRecord(Base):
    __tablename__ = "proof_records"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    evidence_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    logical_identity: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    kind: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 file-pair | 3 submission
    commitment: Mapped[str] = mapped_column(String(66), nullable=False)
    proof_version: Mapped[int] = mapped_column(Integer, default=1)
    provider: Mapped[str] = mapped_column(String(24), default="local_registry")
    state: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    tx_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    block_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    event_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(300), nullable=True)


class LocalCommitment(Base):
    __tablename__ = "local_commitments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    commitment: Mapped[str] = mapped_column(String(66), unique=True, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    tx_ref: Mapped[str] = mapped_column(String(120), nullable=False)
    anchored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProofPrivateInput(Base):
    __tablename__ = "proof_private_inputs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    proof_record_id: Mapped[str] = mapped_column(
        ForeignKey("proof_records.id"), unique=True, nullable=False
    )
    material: Mapped[dict] = mapped_column(JSON, default=dict)  # salts/nonces/hashes (private)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    aggregate_type: Mapped[str] = mapped_column(String(40), nullable=False)
    aggregate_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    revision: Mapped[int] = mapped_column(Integer, default=0)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    state: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    # pending|leased|delivered|dead
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    locked_by: Mapped[str | None] = mapped_column(String(60), nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class JobAttempt(Base):
    __tablename__ = "job_attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    outbox_event_id: Mapped[str] = mapped_column(ForeignKey("outbox_events.id"), nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    result_code: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    complaint_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    actor_principal_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(40), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    scope: Mapped[str | None] = mapped_column(String(120), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(500), nullable=True)
    detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    role_type: Mapped[str] = mapped_column(String(30), nullable=False)
    officer_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    complaint_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[str] = mapped_column(String(300), nullable=False)
    tone: Mapped[str] = mapped_column(String(20), default="info")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FixtureRegistry(Base):
    __tablename__ = "fixture_registry"
    fixture_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    mime: Mapped[str] = mapped_column(String(60), nullable=False)
    operation: Mapped[str] = mapped_column(String(60), nullable=False)
    provenance: Mapped[str] = mapped_column(String(24), default="controlled_fixture")
    description: Mapped[str] = mapped_column(String(200), default="")
