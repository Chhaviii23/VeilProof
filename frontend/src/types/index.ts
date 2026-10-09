export type ReportCategory =
  | 'corruption'
  | 'financial_misconduct'
  | 'workplace_misconduct'
  | 'safety_concern'
  | 'other';

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  corruption: 'Corruption',
  financial_misconduct: 'Financial misconduct',
  workplace_misconduct: 'Workplace misconduct',
  safety_concern: 'Safety concern',
  other: 'Other',
};

export type InvestigationStatus =
  | 'received_securely'
  | 'privacy_review'
  | 'assigned_for_investigation'
  | 'under_investigation'
  | 'additional_review_required'
  | 'resolution_prepared'
  | 'closed';

export const INVESTIGATION_STATUS_LABELS: Record<InvestigationStatus, string> = {
  received_securely: 'Received securely',
  privacy_review: 'Privacy review',
  assigned_for_investigation: 'Assigned for investigation',
  under_investigation: 'Under investigation',
  additional_review_required: 'Additional review required',
  resolution_prepared: 'Resolution prepared',
  closed: 'Closed',
};

export const INVESTIGATOR_SETTABLE_STATUSES: InvestigationStatus[] = [
  'assigned_for_investigation',
  'under_investigation',
  'additional_review_required',
  'resolution_prepared',
];

export type DemoRole = 'reporter' | 'case-investigator' | 'privacy-officer' | 'oversight-officer';

export type StaffRoleType = 'case-investigator' | 'privacy-officer' | 'oversight-officer';

export type AccessDecision = 'approved' | 'rejected' | 'clarification_requested';

export type AccessMode = 'view_only' | 'stream_only' | 'forensic_analysis';
export const ACCESS_MODE_LABELS: Record<AccessMode, string> = {
  view_only: 'View only',
  stream_only: 'Stream only',
  forensic_analysis: 'Forensic analysis',
};
export type AccessUrgency = 'standard' | 'high' | 'critical';
export const URGENCY_LABELS: Record<AccessUrgency, string> = { standard: 'Standard', high: 'High', critical: 'Critical' };

export type OriginalAccessStatus =
  | 'privacy_review_pending'
  | 'oversight_review_pending'
  | 'clarification_requested'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked'
  | 'ended';

export type EvidenceFileType = 'image/jpeg' | 'image/png' | 'application/pdf' | 'audio/mpeg' | 'video/mp4' | 'link';

export type ScanState = 'idle' | 'scanning' | 'found' | 'sanitized' | 'unsupported' | 'failed' | 'protected';

export interface MetadataFinding {
  field: string;
  value: string;
  risk: 'high' | 'medium' | 'low';
}

export interface EvidenceItem {
  id: string;
  name: string;
  size: number;
  type: EvidenceFileType | string;
  scanState: ScanState;
  findings: MetadataFinding[];
  sanitizedName?: string;
  isDemo?: boolean;
  // In-memory only. Analysis sends the file to this backend; vault uploads are encrypted.
  file?: File;
  protectedReviewed?: boolean;
  protectedBlob?: Blob;
  protectionReceipt?: string;
  // Link-type fields
  url?: string;
  linkTitle?: string;
  linkProof?: string;
  linkDateAccessed?: string;
  durationSecs?: number;
  // Audio-specific: true if whistleblower is the louder/dominant speaker (closer to mic)
  whistleblowerIsLouder?: boolean;
}

export interface EvidenceRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  metadataRemoved: string[];
  protectedCopyStatus: 'pending_release' | 'released' | 'rejected' | 'held' | 'not_required';
  protectedCopyReleasedAt?: string;
  protectedCopyReleasedBy?: string;
  protectedCopyReleasedByName?: string;
  sealedOriginalStatus:
    | 'sealed'
    | 'request_pending'
    | 'privacy_approved'
    | 'access_granted'
    | 'expired'
    | 'revoked'
    | 'rejected'
    | 'ended';
  originalAccessRequestId?: string;
  protectionNote?: string;
  versions?: {
    id: string;
    kind: string;
    version_number: number;
    provenance: string;
    inspection_state: string;
    metadata_removed: string[];
  }[];
}

export const RISK_FACTOR_LABELS: Record<string, string> = {
  no_risk: 'No immediate risk',
  workplace_retaliation: 'Workplace retaliation concern',
  job_threat: 'Job termination or forced transfer threat',
  physical_threat: 'Physical threat received',
  family_threat: 'Family threat received',
  public_safety: 'Immediate public-safety danger',
};

export const CRITICAL_RISK_FACTORS = new Set(['physical_threat', 'family_threat', 'public_safety']);

export interface IdentityProtectionResult {
  namesProtected: number;
  facesBlurred: number;
  voicesMasked: number;
  metadataFieldsRemoved: number;
}

export interface ReportDraft {
  title: string;
  category: ReportCategory | '';
  description: string;
  incidentDate: string;
  location: string;
  involvedParties: string;
  evidence: EvidenceItem[];
  acknowledged: boolean;
  idempotencyKey: string;
  riskFactors: string[];
  identityProtectionApplied?: boolean;
  identityProtectionResult?: IdentityProtectionResult;
}

export interface SubmissionReceipt {
  caseReference: string;
  trackingSecret: string;
  submittedAt: string;
  attachmentCount: number;
  proofStatus: 'pending' | 'confirmed' | 'failed';
  proofTransactionRef?: string;
  blockchainNetwork?: string;
  blockTimestamp?: string;
  contractAddress?: string;
  evidenceCommitment?: string;
}

export interface OriginalAccessRequest {
  id: string;
  caseId: string;
  evidenceId: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  purpose: string;
  reason: string;
  requestedDurationMinutes: number;
  accessMode?: AccessMode;
  urgency?: AccessUrgency;
  intendedAction?: string;
  clarificationFrom?: 'privacy' | 'oversight';
  clarificationQuestion?: string;
  clarificationResponse?: string;
  approvedWithChanges?: boolean;
  privacyDecision: 'pending' | AccessDecision;
  privacyDecidedBy?: string;
  privacyDecidedByName?: string;
  privacyDecidedAt?: string;
  privacyNotes?: string;
  oversightDecision: 'pending' | AccessDecision;
  oversightDecidedBy?: string;
  oversightDecidedByName?: string;
  oversightDecidedAt?: string;
  oversightNotes?: string;
  status: OriginalAccessStatus;
  accessGrantedAt?: string;
  accessExpiresAt?: string;
  grantId?: string;
}

export interface PublicUpdate {
  id: string;
  status: InvestigationStatus;
  text: string;
  addedAt: string;
}

export interface InternalNote {
  id: string;
  text: string;
  addedBy: string;
  addedByName: string;
  addedAt: string;
}

export interface ClosureRecommendation {
  id: string;
  recommendedBy: string;
  recommendedByName: string;
  recommendedAt: string;
  outcome: string;
  reporterMessage: string;
  status: 'pending_oversight' | 'approved' | 'returned';
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  returnReason?: string;
}

export type AuditEventType =
  | 'report_accepted'
  | 'privacy_protection_completed'
  | 'protected_copy_released'
  | 'investigator_assigned'
  | 'status_changed'
  | 'original_access_requested'
  | 'privacy_review_approved'
  | 'privacy_review_rejected'
  | 'protection_correction_requested'
  | 'access_clarification_requested'
  | 'access_clarification_answered'
  | 'oversight_approval_granted'
  | 'oversight_approval_rejected'
  | 'evidence_opened'
  | 'access_expired'
  | 'access_revoked'
  | 'access_ended'
  | 'closure_recommended'
  | 'closure_approved'
  | 'case_reopened'
  | 'public_update_added'
  | 'internal_note_added';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  caseId: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  scope?: string;
  purpose?: string;
  detail?: string;
  occurredAt: string;
}

export interface CaseRecord {
  id: string;
  reference: string;
  title: string;
  category: ReportCategory;
  description: string;
  incidentDate?: string;
  location?: string;
  involvedParties?: string;
  receivedAt: string;
  lastUpdated: string;
  status: InvestigationStatus;
  priority?: 'critical' | 'standard';
  riskFactors?: string[];
  evidence: EvidenceRecord[];
  originalAccessRequests: OriginalAccessRequest[];
  publicUpdates: PublicUpdate[];
  internalNotes: InternalNote[];
  auditTrail: AuditEvent[];
  closureRecommendation?: ClosureRecommendation;
  assignedInvestigatorId: string;
  assignedOfficerCode?: string;
  assignedAt?: string;
  correctionRequest?: string;
  protectionSummary?: IdentityProtectionResult;
  integrity?: { proofStatus: 'confirmed' | 'pending' | 'failed'; transactionRef?: string; network?: string };
  isSeeded?: boolean;
}

export interface AppNotification {
  id: string;
  roleType: StaffRoleType;
  officerCode?: string;
  caseId: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
  tone: 'critical' | 'success' | 'info' | 'warning';
}

export interface AntiCorruptionOfficer {
  code: string;
  name: string;
  specialization: string;
  jurisdiction: string;
  activeCases: number;
  availability: 'Available' | 'Moderate' | 'High workload';
  conflictDetected: boolean;
  status: 'Recommended' | 'Available' | 'Ineligible';
}

export interface InvestigatorAccount {
  id: string;
  name: string;
  role: string;
  roleType: StaffRoleType;
  organization: string;
  officerCode?: string;
}

export interface InvestigatorSession {
  investigator: InvestigatorAccount;
  signedInAt: string;
  // Server session token (in-memory only; not persisted to disk).
  token?: string;
}

export interface DemoSettings {
  simulateSlow: boolean;
  simulateSubmissionFailure: boolean;
  simulatePendingProof: boolean;
  simulateFailedProof: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
