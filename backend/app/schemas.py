"""Strict request/response DTOs (API_CONTRACT.md)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

ReportCategory = Literal[
    "corruption",
    "financial_misconduct",
    "workplace_misconduct",
    "safety_concern",
    "other",
]
RiskFactor = Literal[
    "no_risk",
    "workplace_retaliation",
    "job_threat",
    "physical_threat",
    "family_threat",
    "public_safety",
]
AccessMode = Literal["view_only", "stream_only", "forensic_analysis"]
AccessUrgency = Literal["standard", "high", "critical"]
EvidenceKind = Literal["original", "derivative"]
EvidenceCategory = Literal["document", "image", "audio", "video", "reference"]


# ─── Intake ──────────────────────────────────────────────────────────────────


class IntakeCreateResponse(BaseModel):
    intake_id: str
    capability: str
    expires_at: str


class ObjectReserveRequest(BaseModel):
    kind: EvidenceKind = "original"
    category: EvidenceCategory
    expected_size: int = Field(ge=0)
    expected_ciphertext_digest: str | None = None


class ObjectReserveResponse(BaseModel):
    object_id: str
    version_id: str
    max_bytes: int
    expires_at: str


class ObjectCompleteRequest(BaseModel):
    ciphertext_digest: str
    plaintext_sha256: str = Field(min_length=64, max_length=64)
    plaintext_length: int = Field(ge=0)
    envelope: dict
    provenance: str = "real"
    metadata_removed: list[str] = Field(default_factory=list)


class EnvelopeBinding(BaseModel):
    protection_receipt: str | None = Field(default=None, max_length=2000)
    original_object_id: str
    derivative_object_id: str | None = None
    category: EvidenceCategory
    display_label: str = Field(min_length=1, max_length=200)


class FinalizeRequest(BaseModel):
    title: str = Field(min_length=10, max_length=120)
    description: str = Field(min_length=50, max_length=5000)
    category: ReportCategory
    incident_date: str | None = Field(default=None, max_length=20)
    location: str | None = Field(default=None, max_length=200)
    involved_parties: str | None = Field(default=None, max_length=500)
    risk_factors: list[RiskFactor] = Field(default_factory=list)
    no_immediate_risk: bool = False
    objects: list[EnvelopeBinding] = Field(default_factory=list)
    tracking_secret: str = Field(min_length=8, max_length=200)

    @field_validator("risk_factors")
    @classmethod
    def _validate_risk(cls, v: list[str]) -> list[str]:
        return v

    def model_post_init(self, __context) -> None:
        threats = [r for r in self.risk_factors if r != "no_risk"]
        if self.no_immediate_risk and threats:
            raise ValueError("no_immediate_risk is exclusive with threat selections")
        if not self.no_immediate_risk and not self.risk_factors:
            raise ValueError("select at least one risk factor or no_immediate_risk")


class FinalizeResponse(BaseModel):
    case_id: str
    case_reference: str
    accepted_at: str
    attachment_count: int
    proof_status: str
    priority: str
    intake_capability: str


class IntakeStateResponse(BaseModel):
    intake_id: str
    state: str
    expires_at: str
    result: FinalizeResponse | None = None


# ─── Tracking ────────────────────────────────────────────────────────────────


class TrackingSessionRequest(BaseModel):
    case_reference: str = Field(min_length=4, max_length=40)
    tracking_secret: str = Field(min_length=8, max_length=200)


class TrackingSessionResponse(BaseModel):
    session_token: str
    expires_at: str


class PublicUpdateView(BaseModel):
    id: str
    status: str
    text: str
    added_at: str


class ProtectionSummary(BaseModel):
    evidence_count: int
    metadata_fields_removed: int
    provenance: str


class ProofSummary(BaseModel):
    proof_status: str
    provider: str | None = None
    tx_ref: str | None = None
    network: str | None = None


class TrackingStatusResponse(BaseModel):
    case_reference: str
    status: str
    priority: str
    protection_summary: ProtectionSummary
    proof_summary: ProofSummary
    public_updates: list[PublicUpdateView]
    updated_at: str


class ProofPackageResponse(BaseModel):
    package: dict


# ─── Verification ────────────────────────────────────────────────────────────


class VerifyCandidates(BaseModel):
    original_sha256: str | None = Field(default=None, min_length=64, max_length=64)
    protected_sha256: str | None = Field(default=None, min_length=64, max_length=64)


class VerifyProofRequest(BaseModel):
    package: dict
    candidates: VerifyCandidates = VerifyCandidates()


class VerifyProofResponse(BaseModel):
    schema_ok: bool
    original_match: bool | None
    protected_match: bool | None
    commitment_match: bool
    supplied_scope: str
    anchor: dict


# ─── Staff auth ──────────────────────────────────────────────────────────────


class StaffLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class StaffAccountView(BaseModel):
    id: str
    name: str
    role: str
    roleType: str
    organization: str
    officerCode: str | None = None


class StaffLoginResponse(BaseModel):
    token: str
    expires_at: str
    investigator: StaffAccountView


# ─── Staff case views ────────────────────────────────────────────────────────


class EvidenceVersionView(BaseModel):
    id: str
    kind: str
    version_number: int
    provenance: str
    inspection_state: str
    metadata_removed: list[str]


class EvidenceRecordView(BaseModel):
    id: str
    name: str
    type: str
    size: int
    metadataRemoved: list[str]
    protectedCopyStatus: str
    protectedCopyReleasedAt: str | None = None
    protectedCopyReleasedByName: str | None = None
    sealedOriginalStatus: str
    originalAccessRequestId: str | None = None
    protectionNote: str | None = None
    versions: list[EvidenceVersionView] = Field(default_factory=list)


class PublicUpdateModel(BaseModel):
    id: str
    status: str
    text: str
    addedAt: str


class InternalNoteModel(BaseModel):
    id: str
    text: str
    addedBy: str
    addedByName: str
    addedAt: str


class AuditEventModel(BaseModel):
    id: str
    type: str
    caseId: str
    actorId: str | None = None
    actorName: str | None = None
    actorRole: str | None = None
    scope: str | None = None
    purpose: str | None = None
    detail: str | None = None
    occurredAt: str


class OriginalAccessRequestModel(BaseModel):
    id: str
    caseId: str
    evidenceId: str
    requestedBy: str
    requestedByName: str
    requestedAt: str
    purpose: str
    reason: str
    requestedDurationMinutes: int
    accessMode: str
    urgency: str
    intendedAction: str
    privacyDecision: str
    privacyDecidedByName: str | None = None
    privacyDecidedAt: str | None = None
    privacyNotes: str | None = None
    oversightDecision: str
    oversightDecidedByName: str | None = None
    oversightDecidedAt: str | None = None
    oversightNotes: str | None = None
    status: str
    accessGrantedAt: str | None = None
    accessExpiresAt: str | None = None
    grantId: str | None = None
    revisionNumber: int = 1


class CaseRecordView(BaseModel):
    id: str
    reference: str
    title: str
    category: str
    description: str
    incidentDate: str | None = None
    location: str | None = None
    involvedParties: str | None = None
    receivedAt: str
    lastUpdated: str
    status: str
    priority: str
    riskFactors: list[str]
    evidence: list[EvidenceRecordView]
    originalAccessRequests: list[OriginalAccessRequestModel]
    publicUpdates: list[PublicUpdateModel]
    internalNotes: list[InternalNoteModel]
    auditTrail: list[AuditEventModel]
    assignedInvestigatorId: str = ""
    assignedOfficerCode: str | None = None
    assignedAt: str | None = None
    correctionRequest: str | None = None
    isSeeded: bool = False
    integrity: dict | None = None
    protectionSummary: dict | None = None


# ─── Staff commands ──────────────────────────────────────────────────────────


class ReleaseRequest(BaseModel):
    evidence_id: str
    version_id: str | None = None


class HoldRequest(BaseModel):
    evidence_id: str
    reason: str = Field(min_length=3, max_length=500)


class AssignmentRequest(BaseModel):
    officer_code: str = Field(min_length=3, max_length=20)


class OfficerView(BaseModel):
    code: str
    name: str
    specialization: str
    jurisdiction: str
    activeCases: int
    availability: str
    conflictDetected: bool
    status: str
    recommendationReason: str


class PublicUpdateRequest(BaseModel):
    status: str = Field(min_length=3, max_length=40)
    text: str = Field(min_length=1, max_length=2000)
    expected_revision: int | None = None


class InternalNoteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class AccessRequestBody(BaseModel):
    evidence_id: str
    purpose: str = Field(min_length=10, max_length=1000)
    insufficiency_reason: str = Field(min_length=10, max_length=1000)
    intended_action: str = Field(min_length=3, max_length=500)
    mode: AccessMode
    duration_minutes: int = Field(ge=1, le=480)
    urgency: AccessUrgency


class PrivacyDecisionBody(BaseModel):
    decision: Literal["approved", "rejected", "clarification_requested"]
    notes: str | None = Field(default=None, max_length=1000)


class OversightDecisionBody(BaseModel):
    decision: Literal["approved", "rejected", "clarification_requested"]
    notes: str | None = Field(default=None, max_length=1000)
    approved_duration_minutes: int | None = Field(default=None, ge=1, le=480)


class GrantActivateResponse(BaseModel):
    handle: str
    started_at: str | None
    expires_at: str | None
    mode: str
    evidence_id: str


class ViewerContentRequest(BaseModel):
    handle: str = Field(min_length=8, max_length=400)


class ClosureRecommendationBody(BaseModel):
    outcome: str = Field(min_length=10, max_length=2000)
    reporter_message: str = Field(min_length=10, max_length=2000)


class ClosureDecisionBody(BaseModel):
    decision: Literal["approved", "returned", "reopen"]
    reason: str | None = Field(default=None, max_length=1000)


class NotificationView(BaseModel):
    id: str
    roleType: str
    officerCode: str | None = None
    caseId: str
    title: str
    body: str
    link: str
    tone: str
    createdAt: str
    read: bool
