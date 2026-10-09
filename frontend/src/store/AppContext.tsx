import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type {
  ReportDraft,
  SubmissionReceipt,
  InvestigatorSession,
  ToastMessage,
  DemoSettings,
  DemoRole,
  EvidenceItem,
  CaseRecord,
  InvestigationStatus,
  AuditEvent,
  AuditEventType,
  PublicUpdate,
  InternalNote,
  OriginalAccessRequest,
  OriginalAccessStatus,
  AccessDecision,
  EvidenceRecord,
  ClosureRecommendation,
  AppNotification,
  AccessMode,
  AccessUrgency,
} from '../types';
import { makeSeedCases, SEED_TRACKING_SECRETS, DEMO_INVESTIGATORS, ANTI_CORRUPTION_OFFICERS } from '../services/fixtures';

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  draft: ReportDraft;
  receipt: SubmissionReceipt | null;
  cases: CaseRecord[];
  trackingSecrets: Record<string, string>;
  investigatorSession: InvestigatorSession | null;
  demoRole: DemoRole;
  demoSettings: DemoSettings;
  toasts: ToastMessage[];
  notifications: AppNotification[];
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'UPDATE_DRAFT'; payload: Partial<ReportDraft> }
  | { type: 'RESET_DRAFT' }
  | { type: 'ADD_EVIDENCE'; payload: EvidenceItem }
  | { type: 'REMOVE_EVIDENCE'; payload: string }
  | { type: 'UPDATE_EVIDENCE'; payload: { id: string; patch: Partial<EvidenceItem> } }
  | { type: 'SUBMIT_COMPLAINT'; payload: { caseRecord: CaseRecord; receipt: SubmissionReceipt; trackingSecret: string } }
  | { type: 'SET_RECEIPT'; payload: SubmissionReceipt }
  | { type: 'UPDATE_RECEIPT'; payload: Partial<SubmissionReceipt> }
  | { type: 'CLEAR_RECEIPT' }
  | { type: 'UPDATE_CASE_STATUS'; payload: { caseId: string; status: InvestigationStatus; publicUpdate?: string; internalNote?: string; investigatorId: string; investigatorName: string; investigatorRole: string } }
  | { type: 'RELEASE_PROTECTED_COPY'; payload: { caseId: string; evidenceId: string; officerId: string; officerName: string } }
  | { type: 'RELEASE_ALL_PROTECTED_COPIES'; payload: { caseId: string; officerId: string; officerName: string } }
  | { type: 'RETURN_FOR_CORRECTION'; payload: { caseId: string; officerId: string; officerName: string; reason: string } }
  | { type: 'RESPOND_CLARIFICATION'; payload: { caseId: string; requestId: string; investigatorId: string; investigatorName: string; response: string } }
  | { type: 'EXPIRE_ACCESS_WINDOWS' }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ'; payload: { roleType: AppNotification['roleType']; officerCode?: string } }
  | { type: 'ASSIGN_CASE_OFFICER'; payload: { caseId: string; officerCode: string; officerName: string; assignedById: string; assignedByName: string } }
  | { type: 'REQUEST_ORIGINAL_ACCESS'; payload: { caseId: string; evidenceId: string; investigatorId: string; investigatorName: string; purpose: string; reason: string; durationMinutes: number; accessMode: AccessMode; urgency: AccessUrgency; intendedAction: string } }
  | { type: 'PRIVACY_REVIEW_DECISION'; payload: { caseId: string; requestId: string; decision: AccessDecision; officerId: string; officerName: string; notes?: string } }
  | { type: 'OVERSIGHT_REVIEW_DECISION'; payload: { caseId: string; requestId: string; decision: AccessDecision; officerId: string; officerName: string; notes?: string; approvedDurationMinutes?: number } }
  | { type: 'END_ORIGINAL_ACCESS'; payload: { caseId: string; requestId: string; reason: 'ended' | 'revoked' | 'expired'; actorId?: string; actorName?: string; actorRole?: string } }
  | { type: 'RECOMMEND_CLOSURE'; payload: { caseId: string; investigatorId: string; investigatorName: string; outcome: string; reporterMessage: string } }
  | { type: 'OVERSIGHT_CLOSURE_DECISION'; payload: { caseId: string; decision: 'approved' | 'returned'; officerId: string; officerName: string; returnReason?: string } }
  | { type: 'SET_INVESTIGATOR'; payload: InvestigatorSession }
  | { type: 'CLEAR_INVESTIGATOR' }
  | { type: 'SET_DEMO_ROLE'; payload: DemoRole }
  | { type: 'RESET_DEMO' }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_DEMO_SETTINGS'; payload: Partial<DemoSettings> }
  // Backend sync actions (P08B)
  | { type: 'SYNC_STAFF_CASES'; payload: CaseRecord[] }
  | { type: 'SYNC_STAFF_NOTIFICATIONS'; payload: AppNotification[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function auditEv(type: AuditEventType, caseId: string, opts: Partial<Omit<AuditEvent, 'id' | 'type' | 'caseId' | 'occurredAt'>> = {}): AuditEvent {
  return { id: `ae-${uid()}`, type, caseId, occurredAt: new Date().toISOString(), ...opts };
}

const PRIVACY_DONE_TEXT = 'Evidence privacy review completed.';
const ROLE_PRIVACY = 'Privacy & Evidence Officer';
const ROLE_ACO = 'Anti-Corruption Officer';
const ROLE_OVERSIGHT = 'Oversight & Whistleblower Protection Officer';

function makeNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification {
  return { id: `nt-${uid()}`, createdAt: new Date().toISOString(), read: false, ...n };
}

function officerCodeOf(investigatorId: string): string | undefined {
  return DEMO_INVESTIGATORS.find((i) => i.id === investigatorId)?.officerCode;
}

function withPrivacyCompletion(c: CaseRecord, now: string): CaseRecord {
  // Reference links never require a protected copy ('not_required').
  const done = c.evidence.length > 0 && c.evidence.every((e) => e.protectedCopyStatus === 'released' || e.protectedCopyStatus === 'not_required');
  if (!done || c.publicUpdates.some((u) => u.text === PRIVACY_DONE_TEXT)) return c;
  return { ...c, correctionRequest: undefined, publicUpdates: [...c.publicUpdates, { id: `pu-${uid()}`, status: 'privacy_review', text: PRIVACY_DONE_TEXT, addedAt: now }] };
}

function endAccess(c: CaseRecord, requestId: string, reason: 'ended' | 'revoked' | 'expired', actor: { id?: string; name?: string; role?: string }, now: string): { next: CaseRecord; note?: AppNotification } {
  const req = c.originalAccessRequests.find((r) => r.id === requestId);
  if (!req || req.status !== 'approved') return { next: c };
  const evName = c.evidence.find((e) => e.id === req.evidenceId)?.name ?? req.evidenceId;
  const auditType: AuditEventType = reason === 'ended' ? 'access_ended' : reason === 'revoked' ? 'access_revoked' : 'access_expired';
  const next: CaseRecord = {
    ...c, lastUpdated: now,
    originalAccessRequests: c.originalAccessRequests.map((r) => r.id === requestId ? { ...r, status: reason } : r),
    evidence: c.evidence.map((e) => e.id === req.evidenceId ? { ...e, sealedOriginalStatus: reason } : e),
    auditTrail: [...c.auditTrail, auditEv(auditType, c.id, { actorId: actor.id, actorName: actor.name ?? 'System', actorRole: actor.role ?? 'System', detail: reason === 'expired' ? `Access Expired — permission removed — ${evName}` : `Sealed original access ${reason} — ${evName}` })],
  };
  const note = reason === 'ended' ? undefined : makeNotification({
    roleType: 'case-investigator', officerCode: c.assignedOfficerCode, caseId: c.id,
    title: reason === 'expired' ? 'Original evidence access expired' : 'Original evidence access revoked',
    body: `${c.reference} · ${evName}`, link: `/investigator/cases/${c.id}`, tone: reason === 'expired' ? 'info' : 'warning',
  });
  return { next, note };
}

function makeDraft(): ReportDraft {
  return { title: '', category: '', description: '', incidentDate: '', location: '', involvedParties: '', evidence: [], acknowledged: false, idempotencyKey: `idem-${uid()}`, riskFactors: [] };
}

function updateCase(cases: CaseRecord[], caseId: string, fn: (c: CaseRecord) => CaseRecord): CaseRecord[] {
  return cases.map((c) => (c.id === caseId ? fn(c) : c));
}

// ─── Initial state ────────────────────────────────────────────────────────────

const ACCESS_LABEL: Record<AccessMode, string> = { view_only: 'View only', stream_only: 'Stream only', forensic_analysis: 'Forensic analysis' };

const initialDemoSettings: DemoSettings = { simulateSlow: false, simulateSubmissionFailure: false, simulatePendingProof: false, simulateFailedProof: false };

const initialState: AppState = {
  draft: makeDraft(),
  receipt: null,
  cases: makeSeedCases(),
  trackingSecrets: { ...SEED_TRACKING_SECRETS },
  investigatorSession: null,
  demoRole: 'reporter',
  demoSettings: initialDemoSettings,
  toasts: [],
  notifications: [],
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_DRAFT': return { ...state, draft: { ...state.draft, ...action.payload } };
    case 'RESET_DRAFT': return { ...state, draft: makeDraft() };
    case 'ADD_EVIDENCE': return { ...state, draft: { ...state.draft, identityProtectionApplied: false, evidence: [...state.draft.evidence, action.payload] } };
    case 'REMOVE_EVIDENCE': return { ...state, draft: { ...state.draft, identityProtectionApplied: false, evidence: state.draft.evidence.filter((e) => e.id !== action.payload) } };
    case 'UPDATE_EVIDENCE': return { ...state, draft: { ...state.draft, identityProtectionApplied: false, evidence: state.draft.evidence.map((e) => e.id === action.payload.id ? { ...e, ...action.payload.patch } : e) } };

    case 'SUBMIT_COMPLAINT': {
      const { caseRecord, receipt, trackingSecret } = action.payload;
      return { ...state, cases: [caseRecord, ...state.cases], trackingSecrets: { ...state.trackingSecrets, [receipt.caseReference]: trackingSecret }, receipt, draft: makeDraft() };
    }

    case 'SET_RECEIPT': return { ...state, receipt: action.payload };
    case 'UPDATE_RECEIPT': return { ...state, receipt: state.receipt ? { ...state.receipt, ...action.payload } : state.receipt };
    case 'CLEAR_RECEIPT': return { ...state, receipt: null };

    case 'UPDATE_CASE_STATUS': {
      const { caseId, status, publicUpdate, internalNote, investigatorId, investigatorName, investigatorRole } = action.payload;
      const now = new Date().toISOString();
      return {
        ...state,
        cases: updateCase(state.cases, caseId, (c) => {
          const newAudit: AuditEvent[] = [...c.auditTrail];
          const newPublicUpdates: PublicUpdate[] = [...c.publicUpdates];
          const newInternalNotes: InternalNote[] = [...c.internalNotes];
          if (c.status !== status) newAudit.push(auditEv('status_changed', caseId, { actorId: investigatorId, actorName: investigatorName, actorRole: investigatorRole, detail: `Status updated to ${status.replace(/_/g, ' ')}` }));
          if (publicUpdate?.trim()) { newPublicUpdates.push({ id: `pu-${uid()}`, status, text: publicUpdate.trim(), addedAt: now }); newAudit.push(auditEv('public_update_added', caseId, { actorId: investigatorId, actorName: investigatorName, actorRole: investigatorRole, detail: 'Reporter update added' })); }
          if (internalNote?.trim()) { newInternalNotes.push({ id: `in-${uid()}`, text: internalNote.trim(), addedBy: investigatorId, addedByName: investigatorName, addedAt: now }); newAudit.push(auditEv('internal_note_added', caseId, { actorId: investigatorId, actorName: investigatorName, actorRole: investigatorRole, detail: 'Internal note added' })); }
          return { ...c, status, lastUpdated: now, auditTrail: newAudit, publicUpdates: newPublicUpdates, internalNotes: newInternalNotes };
        }),
      };
    }

    case 'RELEASE_PROTECTED_COPY': {
      const { caseId, evidenceId, officerId, officerName } = action.payload;
      const now = new Date().toISOString();
      return {
        ...state,
        cases: updateCase(state.cases, caseId, (c) => {
          const target = c.evidence.find((e) => e.id === evidenceId);
          if (!target || target.protectedCopyStatus === 'released') return c;
          return withPrivacyCompletion({
            ...c,
            lastUpdated: now,
            evidence: c.evidence.map((ev) => ev.id === evidenceId ? { ...ev, protectedCopyStatus: 'released' as const, protectedCopyReleasedAt: now, protectedCopyReleasedBy: officerId, protectedCopyReleasedByName: officerName } : ev),
            auditTrail: [...c.auditTrail, auditEv('protected_copy_released', caseId, { actorId: officerId, actorName: officerName, actorRole: ROLE_PRIVACY, detail: `Protected copy released — ${target.name}` })],
          }, now);
        }),
      };
    }

    case 'RELEASE_ALL_PROTECTED_COPIES': {
      const { caseId, officerId, officerName } = action.payload;
      const now = new Date().toISOString();
      return {
        ...state,
        cases: updateCase(state.cases, caseId, (c) => {
          const pending = c.evidence.filter((e) => e.protectedCopyStatus !== 'released' && e.protectedCopyStatus !== 'not_required');
          if (pending.length === 0) return c;
          return withPrivacyCompletion({
            ...c,
            lastUpdated: now,
            evidence: c.evidence.map((ev) => ev.protectedCopyStatus === 'released' || ev.protectedCopyStatus === 'not_required' ? ev : { ...ev, protectedCopyStatus: 'released' as const, protectedCopyReleasedAt: now, protectedCopyReleasedBy: officerId, protectedCopyReleasedByName: officerName }),
            auditTrail: [...c.auditTrail, auditEv('protected_copy_released', caseId, { actorId: officerId, actorName: officerName, actorRole: ROLE_PRIVACY, detail: `Protected copies released — ${pending.length} item${pending.length === 1 ? '' : 's'}. Originals remain sealed.` })],
          }, now);
        }),
      };
    }

    case 'RETURN_FOR_CORRECTION': {
      const { caseId, officerId, officerName, reason } = action.payload;
      const now = new Date().toISOString();
      return {
        ...state,
        cases: updateCase(state.cases, caseId, (c) => {
          if (c.assignedOfficerCode || c.status === 'closed') return c;
          return {
            ...c, lastUpdated: now, status: 'privacy_review', correctionRequest: reason,
            auditTrail: [...c.auditTrail, auditEv('protection_correction_requested', caseId, { actorId: officerId, actorName: officerName, actorRole: ROLE_PRIVACY, detail: `Returned for protection correction: ${reason}` })],
          };
        }),
      };
    }

    case 'ASSIGN_CASE_OFFICER': {
      const { caseId, officerCode, officerName, assignedById, assignedByName } = action.payload;
      const now = new Date().toISOString();
      const officer = ANTI_CORRUPTION_OFFICERS.find((o) => o.code === officerCode);
      const target = state.cases.find((c) => c.id === caseId);
      if (!target || !officer || officer.conflictDetected) return state;
      if (target.assignedOfficerCode || target.status === 'closed') return state;
      if (target.evidence.some((e) => e.protectedCopyStatus !== 'released' && e.protectedCopyStatus !== 'not_required')) return state;
      const note = makeNotification({
        roleType: 'case-investigator', officerCode, caseId,
        title: target.priority === 'critical' ? 'New Critical Case Assigned' : 'New Case Assigned',
        body: `${target.reference} · ${target.title}`, link: `/investigator/cases/${caseId}`,
        tone: target.priority === 'critical' ? 'critical' : 'info',
      });
      return {
        ...state,
        notifications: [note, ...state.notifications],
        cases: updateCase(state.cases, caseId, (c) => ({
          ...c,
          lastUpdated: now,
          assignedOfficerCode: officerCode,
          assignedAt: now,
          assignedInvestigatorId: DEMO_INVESTIGATORS.find((i) => i.officerCode === officerCode)?.id ?? officerCode,
          status: 'assigned_for_investigation' as const,
          publicUpdates: [...c.publicUpdates, { id: `pu-${uid()}`, status: 'assigned_for_investigation' as const, text: 'Your report has been assigned for investigation.', addedAt: now }],
          auditTrail: [...c.auditTrail, auditEv('investigator_assigned', caseId, { actorId: assignedById, actorName: assignedByName, actorRole: ROLE_PRIVACY, detail: `Case assigned to ${officerCode} — ${officerName}` })],
        })),
      };
    }

    case 'REQUEST_ORIGINAL_ACCESS': {
      const { caseId, evidenceId, investigatorId, investigatorName, purpose, reason, durationMinutes, accessMode, urgency, intendedAction } = action.payload;
      const now = new Date().toISOString();
      const target = state.cases.find((c) => c.id === caseId);
      const targetEv = target?.evidence.find((e) => e.id === evidenceId);
      if (!target || !targetEv) return state;
      const myCode = officerCodeOf(investigatorId);
      if (!myCode || target.assignedOfficerCode !== myCode) return state;
      if (targetEv.protectedCopyStatus !== 'released') return state;
      if (!['sealed', 'expired', 'ended'].includes(targetEv.sealedOriginalStatus)) return state;
      const reqId = `oar-${uid()}`;
      const newReq: OriginalAccessRequest = {
        id: reqId, caseId, evidenceId, requestedBy: investigatorId, requestedByName: investigatorName, requestedAt: now,
        purpose, reason, requestedDurationMinutes: durationMinutes, accessMode, urgency, intendedAction,
        privacyDecision: 'pending', oversightDecision: 'pending', status: 'privacy_review_pending',
      };
      const note = makeNotification({
        roleType: 'privacy-officer', caseId, title: 'Original evidence access request',
        body: `${target.reference} · ${targetEv.name} · ${durationMinutes} min`, link: `/privacy-officer/cases/${caseId}/review`,
        tone: urgency === 'critical' ? 'critical' : 'warning',
      });
      return {
        ...state,
        notifications: [note, ...state.notifications],
        cases: updateCase(state.cases, caseId, (c) => ({
          ...c,
          lastUpdated: now,
          evidence: c.evidence.map((e) => e.id === evidenceId ? { ...e, sealedOriginalStatus: 'request_pending' as const, originalAccessRequestId: reqId } : e),
          originalAccessRequests: [...c.originalAccessRequests, newReq],
          auditTrail: [...c.auditTrail, auditEv('original_access_requested', caseId, { actorId: investigatorId, actorName: investigatorName, actorRole: ROLE_ACO, purpose, detail: `Sealed original access requested — ${targetEv.name} (${durationMinutes} min, ${accessMode.replace(/_/g, ' ')}, ${urgency} urgency)` })],
        })),
      };
    }

    case 'PRIVACY_REVIEW_DECISION': {
      const { caseId, requestId, decision, officerId, officerName, notes } = action.payload;
      const now = new Date().toISOString();
      const target = state.cases.find((c) => c.id === caseId);
      const req = target?.originalAccessRequests.find((r) => r.id === requestId);
      if (!target || !req || req.status !== 'privacy_review_pending' || req.requestedBy === officerId) return state;
      const ev = target.evidence.find((e) => e.id === req.evidenceId);
      const evName = ev?.name ?? req.evidenceId;
      const newStatus: OriginalAccessStatus = decision === 'approved' ? 'oversight_review_pending' : decision === 'rejected' ? 'rejected' : 'clarification_requested';
      const sealed = decision === 'approved' ? 'privacy_approved' as const : decision === 'rejected' ? 'rejected' as const : 'request_pending' as const;
      const auditType: AuditEventType = decision === 'approved' ? 'privacy_review_approved' : decision === 'rejected' ? 'privacy_review_rejected' : 'access_clarification_requested';
      const detail = decision === 'approved' ? `Recommended for approval — Awaiting Final Approval — ${evName}` : decision === 'rejected' ? `Request rejected — ${evName}` : `Clarification requested — ${evName}`;
      const notes_: AppNotification[] = decision === 'approved'
        ? [makeNotification({ roleType: 'oversight-officer', caseId, title: 'Final approval requested', body: `${target.reference} · ${evName} · ${req.requestedDurationMinutes} min`, link: '/oversight/approvals', tone: req.urgency === 'critical' ? 'critical' : 'warning' })]
        : [makeNotification({ roleType: 'case-investigator', officerCode: target.assignedOfficerCode, caseId, title: decision === 'rejected' ? 'Access request rejected' : 'Clarification requested by Privacy Officer', body: `${target.reference} · ${evName}`, link: `/investigator/cases/${caseId}`, tone: decision === 'rejected' ? 'warning' : 'info' })];
      return {
        ...state,
        notifications: [...notes_, ...state.notifications],
        cases: updateCase(state.cases, caseId, (c) => ({
          ...c, lastUpdated: now,
          originalAccessRequests: c.originalAccessRequests.map((r) => r.id !== requestId ? r : {
            ...r, status: newStatus, privacyDecision: decision === 'clarification_requested' ? 'pending' : decision,
            privacyDecidedBy: officerId, privacyDecidedByName: officerName, privacyDecidedAt: now, privacyNotes: notes,
            ...(decision === 'clarification_requested' ? { clarificationFrom: 'privacy' as const, clarificationQuestion: notes, clarificationResponse: undefined } : {}),
          }),
          evidence: c.evidence.map((e) => e.id === req.evidenceId ? { ...e, sealedOriginalStatus: sealed } : e),
          auditTrail: [...c.auditTrail, auditEv(auditType, caseId, { actorId: officerId, actorName: officerName, actorRole: ROLE_PRIVACY, detail })],
        })),
      };
    }

    case 'RESPOND_CLARIFICATION': {
      const { caseId, requestId, investigatorId, investigatorName, response } = action.payload;
      const now = new Date().toISOString();
      const target = state.cases.find((c) => c.id === caseId);
      const req = target?.originalAccessRequests.find((r) => r.id === requestId);
      if (!target || !req || req.status !== 'clarification_requested' || req.requestedBy !== investigatorId) return state;
      const toOversight = req.clarificationFrom === 'oversight';
      const evName = target.evidence.find((e) => e.id === req.evidenceId)?.name ?? req.evidenceId;
      const note = makeNotification({
        roleType: toOversight ? 'oversight-officer' : 'privacy-officer', caseId, title: 'Clarification provided',
        body: `${target.reference} · ${evName}`, link: toOversight ? '/oversight/approvals' : `/privacy-officer/cases/${caseId}/review`, tone: 'info',
      });
      return {
        ...state,
        notifications: [note, ...state.notifications],
        cases: updateCase(state.cases, caseId, (c) => ({
          ...c, lastUpdated: now,
          originalAccessRequests: c.originalAccessRequests.map((r) => r.id !== requestId ? r : {
            ...r, clarificationResponse: response, status: toOversight ? 'oversight_review_pending' as const : 'privacy_review_pending' as const,
            ...(toOversight ? { oversightDecision: 'pending' as const } : { privacyDecision: 'pending' as const }),
          }),
          evidence: c.evidence.map((e) => e.id === req.evidenceId ? { ...e, sealedOriginalStatus: toOversight ? 'privacy_approved' as const : 'request_pending' as const } : e),
          auditTrail: [...c.auditTrail, auditEv('access_clarification_answered', caseId, { actorId: investigatorId, actorName: investigatorName, actorRole: ROLE_ACO, detail: `Clarification provided — ${evName}` })],
        })),
      };
    }

    case 'OVERSIGHT_REVIEW_DECISION': {
      const { caseId, requestId, decision, officerId, officerName, notes, approvedDurationMinutes } = action.payload;
      const now = new Date().toISOString();
      const target = state.cases.find((c) => c.id === caseId);
      const req = target?.originalAccessRequests.find((r) => r.id === requestId);
      if (!target || !req || req.status !== 'oversight_review_pending') return state;
      if (req.requestedBy === officerId || req.privacyDecidedBy === officerId) return state;
      const ev = target.evidence.find((e) => e.id === req.evidenceId);
      const evName = ev?.name ?? req.evidenceId;
      const duration = decision === 'approved' ? (approvedDurationMinutes ?? req.requestedDurationMinutes) : req.requestedDurationMinutes;
      const changed = decision === 'approved' && duration !== req.requestedDurationMinutes;
      const newStatus: OriginalAccessStatus = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'clarification_requested';
      const sealed = decision === 'approved' ? 'access_granted' as const : decision === 'rejected' ? 'rejected' as const : 'privacy_approved' as const;
      const expiry = new Date(Date.now() + duration * 60 * 1000).toISOString();
      const auditType: AuditEventType = decision === 'approved' ? 'oversight_approval_granted' : decision === 'rejected' ? 'oversight_approval_rejected' : 'access_clarification_requested';
      const detail = decision === 'approved' ? `Limited access approved${changed ? ` with changes (${duration} min)` : ''} — ${evName}` : decision === 'rejected' ? `Request rejected — ${evName}` : `Clarification requested — ${evName}`;
      const note = makeNotification({
        roleType: 'case-investigator', officerCode: target.assignedOfficerCode, caseId,
        title: decision === 'approved' ? 'Original Evidence Access Approved' : decision === 'rejected' ? 'Access request rejected by Oversight' : 'Clarification requested by Oversight',
        body: decision === 'approved'
          ? `${target.reference} · ${evName} · ${req.purpose} · ${(ACCESS_LABEL[req.accessMode ?? 'view_only'])} · ${duration} minutes`
          : `${target.reference} · ${evName}`,
        link: decision === 'approved' ? `/investigator/cases/${caseId}/evidence/${req.evidenceId}/original` : `/investigator/cases/${caseId}`,
        tone: decision === 'approved' ? 'success' : decision === 'rejected' ? 'warning' : 'info',
      });
      return {
        ...state,
        notifications: [note, ...state.notifications],
        cases: updateCase(state.cases, caseId, (c) => ({
          ...c, lastUpdated: now,
          originalAccessRequests: c.originalAccessRequests.map((r) => r.id !== requestId ? r : {
            ...r, status: newStatus,
            oversightDecision: decision === 'clarification_requested' ? 'pending' : decision,
            oversightDecidedBy: officerId, oversightDecidedByName: officerName, oversightDecidedAt: now, oversightNotes: notes,
            ...(decision === 'approved' ? { requestedDurationMinutes: duration, approvedWithChanges: changed, accessGrantedAt: now, accessExpiresAt: expiry } : {}),
            ...(decision === 'clarification_requested' ? { clarificationFrom: 'oversight' as const, clarificationQuestion: notes, clarificationResponse: undefined } : {}),
          }),
          evidence: c.evidence.map((e) => e.id === req.evidenceId ? { ...e, sealedOriginalStatus: sealed } : e),
          auditTrail: [...c.auditTrail, auditEv(auditType, caseId, { actorId: officerId, actorName: officerName, actorRole: ROLE_OVERSIGHT, purpose: req.purpose, detail })],
        })),
      };
    }

    case 'END_ORIGINAL_ACCESS': {
      const { caseId, requestId, reason, actorId, actorName, actorRole } = action.payload;
      const now = new Date().toISOString();
      const target = state.cases.find((c) => c.id === caseId);
      if (!target) return state;
      const { next, note } = endAccess(target, requestId, reason, { id: actorId, name: actorName, role: actorRole }, now);
      if (next === target) return state;
      return { ...state, notifications: note ? [note, ...state.notifications] : state.notifications, cases: updateCase(state.cases, caseId, () => next) };
    }

    case 'EXPIRE_ACCESS_WINDOWS': {
      const nowMs = Date.now();
      const now = new Date(nowMs).toISOString();
      let changed = false;
      const fresh: AppNotification[] = [];
      const cases = state.cases.map((c) => {
        let cur = c;
        for (const r of c.originalAccessRequests) {
          if (r.status === 'approved' && r.accessExpiresAt && new Date(r.accessExpiresAt).getTime() <= nowMs) {
            const { next, note } = endAccess(cur, r.id, 'expired', {}, now);
            cur = next;
            if (note) fresh.push(note);
            changed = true;
          }
        }
        return cur;
      });
      return changed ? { ...state, cases, notifications: [...fresh, ...state.notifications] } : state;
    }

    case 'MARK_NOTIFICATION_READ': return { ...state, notifications: state.notifications.map((n) => n.id === action.payload ? { ...n, read: true } : n) };
    case 'MARK_ALL_NOTIFICATIONS_READ': return { ...state, notifications: state.notifications.map((n) => n.roleType === action.payload.roleType && (!n.officerCode || n.officerCode === action.payload.officerCode) ? { ...n, read: true } : n) };

    case 'RECOMMEND_CLOSURE': {
      const { caseId, investigatorId, investigatorName, outcome, reporterMessage } = action.payload;
      const now = new Date().toISOString();
      const rec: ClosureRecommendation = { id: `cr-${uid()}`, recommendedBy: investigatorId, recommendedByName: investigatorName, recommendedAt: now, outcome, reporterMessage, status: 'pending_oversight' };
      return {
        ...state,
        cases: updateCase(state.cases, caseId, (c) => ({
          ...c, lastUpdated: now, status: 'resolution_prepared', closureRecommendation: rec,
          auditTrail: [...c.auditTrail, auditEv('closure_recommended', caseId, { actorId: investigatorId, actorName: investigatorName, actorRole: ROLE_ACO, detail: outcome })],
        })),
      };
    }

    case 'OVERSIGHT_CLOSURE_DECISION': {
      const { caseId, decision, officerId, officerName, returnReason } = action.payload;
      const now = new Date().toISOString();
      return {
        ...state,
        cases: updateCase(state.cases, caseId, (c) => {
          const rec = c.closureRecommendation;
          return {
            ...c, lastUpdated: now,
            status: decision === 'approved' ? 'closed' : c.status,
            publicUpdates: decision === 'approved' && rec ? [...c.publicUpdates, { id: `pu-${uid()}`, status: 'closed' as const, text: rec.reporterMessage, addedAt: now }] : c.publicUpdates,
            closureRecommendation: rec ? { ...rec, status: decision === 'approved' ? 'approved' : 'returned', decidedBy: officerId, decidedByName: officerName, decidedAt: now, returnReason } : rec,
            auditTrail: [...c.auditTrail, auditEv(decision === 'approved' ? 'closure_approved' : 'status_changed', caseId, { actorId: officerId, actorName: officerName, actorRole: ROLE_OVERSIGHT, detail: decision === 'approved' ? 'Case closure approved' : `Closure returned: ${returnReason}` })],
          };
        }),
      };
    }

    case 'SET_INVESTIGATOR': return { ...state, investigatorSession: action.payload };
    case 'CLEAR_INVESTIGATOR': return { ...state, investigatorSession: null };
    case 'SET_DEMO_ROLE': return { ...state, demoRole: action.payload };
    case 'RESET_DEMO': return { ...initialState, notifications: [], cases: makeSeedCases(), trackingSecrets: { ...SEED_TRACKING_SECRETS }, toasts: state.toasts };
    case 'ADD_TOAST': return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST': return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case 'UPDATE_DEMO_SETTINGS': return { ...state, demoSettings: { ...state.demoSettings, ...action.payload } };

    // ── Backend sync (P08B) ────────────────────────────────────────────────────
    case 'SYNC_STAFF_CASES': {
      // Replace any case whose id matches a backend case; keep local-only cases
      // (e.g. just-submitted reporter cases not yet in the backend list).
      const backendIds = new Set(action.payload.map((c) => c.id));
      const localOnly = state.cases.filter((c) => !backendIds.has(c.id));
      return { ...state, cases: [...action.payload, ...localOnly] };
    }
    case 'SYNC_STAFF_NOTIFICATIONS': {
      // Merge: preserve local read-state for notifications that already exist
      const localReadMap = new Map(state.notifications.map((n) => [n.id, n.read]));
      const merged = action.payload.map((n) => ({
        ...n,
        read: localReadMap.has(n.id) ? (localReadMap.get(n.id) ?? n.read) : n.read,
      }));
      return { ...state, notifications: merged };
    }

    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  toast: (type: ToastMessage['type'], message: string, duration?: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastCounter = useRef(0);
  const casesRef = useRef(state.cases);
  casesRef.current = state.cases;

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const due = casesRef.current.some((c) => c.originalAccessRequests.some((r) => r.status === 'approved' && r.accessExpiresAt && new Date(r.accessExpiresAt).getTime() <= now));
      if (due) dispatch({ type: 'EXPIRE_ACCESS_WINDOWS' });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const toast = useCallback(
    (type: ToastMessage['type'], message: string, duration = 4000) => {
      const id = `toast-${++toastCounter.current}`;
      dispatch({ type: 'ADD_TOAST', payload: { id, type, message, duration } });
      if (duration > 0) setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
    },
    []
  );

  return <AppContext.Provider value={{ state, dispatch, toast }}>{children}</AppContext.Provider>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useDraft() {
  const { state, dispatch } = useApp();
  return {
    draft: state.draft,
    updateDraft: (patch: Partial<ReportDraft>) => dispatch({ type: 'UPDATE_DRAFT', payload: patch }),
    resetDraft: () => dispatch({ type: 'RESET_DRAFT' }),
    addEvidence: (item: EvidenceItem) => dispatch({ type: 'ADD_EVIDENCE', payload: item }),
    removeEvidence: (id: string) => dispatch({ type: 'REMOVE_EVIDENCE', payload: id }),
    updateEvidence: (id: string, patch: Partial<EvidenceItem>) => dispatch({ type: 'UPDATE_EVIDENCE', payload: { id, patch } }),
  };
}

export function useInvestigator() {
  const { state, dispatch } = useApp();
  return {
    session: state.investigatorSession,
    setSession: (s: InvestigatorSession) => dispatch({ type: 'SET_INVESTIGATOR', payload: s }),
    clearSession: () => dispatch({ type: 'CLEAR_INVESTIGATOR' }),
  };
}

export function useCases() {
  const { state } = useApp();
  return state.cases;
}

export function useCase(caseId: string | undefined): CaseRecord | undefined {
  const { state } = useApp();
  if (!caseId) return undefined;
  return state.cases.find((c) => c.id === caseId || c.reference === caseId);
}

export function useTrackComplaint(caseReference: string, trackingSecret: string): CaseRecord | null {
  const { state } = useApp();
  const expectedSecret = state.trackingSecrets[caseReference];
  if (!expectedSecret || expectedSecret !== trackingSecret) return null;
  return state.cases.find((c) => c.reference === caseReference) ?? null;
}

export function useNotifications() {
  const { state, dispatch } = useApp();
  const session = state.investigatorSession;
  const roleType = session?.investigator.roleType;
  const officerCode = session?.investigator.officerCode;
  const mine = roleType
    ? state.notifications.filter((n) => n.roleType === roleType && (!n.officerCode || n.officerCode === officerCode))
    : [];
  return {
    all: mine,
    unread: mine.filter((n) => !n.read),
    markRead: (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }),
    markAllRead: () => roleType && dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ', payload: { roleType, officerCode } }),
  };
}
