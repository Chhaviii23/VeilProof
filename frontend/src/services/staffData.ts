/**
 * staffData.ts — Backend data sync for staff pages (P08B).
 *
 * Polls GET /staff/cases and GET /staff/notifications on a 5-second interval
 * whenever a staff session is active, then syncs the results into AppContext
 * via SYNC_STAFF_CASES / SYNC_STAFF_NOTIFICATIONS.
 *
 * Mutation helpers call the backend API then trigger an immediate re-sync.
 * No secrets, credentials, or DEKs are placed in URLs or logs.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useApp, useInvestigator } from '../store/AppContext';
import { api } from './api';
import type {
  CaseRecord,
  AppNotification,
  EvidenceRecord,
  OriginalAccessRequest,
  AuditEvent,
} from '../types';

// ─── Shape adapters ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptEvidence(e: any): EvidenceRecord {
  return {
    id: e.id ?? '',
    name: e.name ?? '',
    type: e.type ?? '',
    size: e.size ?? 0,
    metadataRemoved: e.metadataRemoved ?? [],
    protectedCopyStatus: e.protectedCopyStatus ?? 'pending_release',
    protectedCopyReleasedAt: e.protectedCopyReleasedAt ?? undefined,
    protectedCopyReleasedBy: e.protectedCopyReleasedBy ?? undefined,
    protectedCopyReleasedByName: e.protectedCopyReleasedByName ?? undefined,
    sealedOriginalStatus: e.sealedOriginalStatus ?? 'sealed',
    originalAccessRequestId: e.originalAccessRequestId ?? undefined,
    protectionNote: e.protectionNote ?? undefined,
    versions: e.versions ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptOAR(r: any): OriginalAccessRequest {
  return {
    id: r.id,
    caseId: r.caseId,
    evidenceId: r.evidenceId,
    requestedBy: r.requestedBy,
    requestedByName: r.requestedByName,
    requestedAt: r.requestedAt,
    purpose: r.purpose,
    reason: r.reason,
    requestedDurationMinutes: r.requestedDurationMinutes,
    accessMode: r.accessMode,
    urgency: r.urgency,
    intendedAction: r.intendedAction,
    privacyDecision: r.privacyDecision ?? 'pending',
    privacyDecidedByName: r.privacyDecidedByName ?? undefined,
    privacyDecidedAt: r.privacyDecidedAt ?? undefined,
    privacyNotes: r.privacyNotes ?? undefined,
    oversightDecision: r.oversightDecision ?? 'pending',
    oversightDecidedByName: r.oversightDecidedByName ?? undefined,
    oversightDecidedAt: r.oversightDecidedAt ?? undefined,
    oversightNotes: r.oversightNotes ?? undefined,
    status: r.status,
    accessGrantedAt: r.accessGrantedAt ?? undefined,
    accessExpiresAt: r.accessExpiresAt ?? undefined,
    grantId: r.grantId ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptAuditEvent(a: any): AuditEvent {
  return {
    id: a.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: a.type as any,
    caseId: a.caseId,
    actorId: a.actorId ?? undefined,
    actorName: a.actorName ?? undefined,
    actorRole: a.actorRole ?? undefined,
    scope: a.scope ?? undefined,
    purpose: a.purpose ?? undefined,
    detail: a.detail ?? undefined,
    occurredAt: a.occurredAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptCase(raw: any): CaseRecord {
  return {
    id: raw.id,
    reference: raw.reference,
    title: raw.title,
    category: raw.category,
    description: raw.description,
    incidentDate: raw.incidentDate ?? undefined,
    location: raw.location ?? undefined,
    involvedParties: raw.involvedParties ?? undefined,
    receivedAt: raw.receivedAt,
    lastUpdated: raw.lastUpdated,
    status: raw.status,
    priority: raw.priority,
    riskFactors: raw.riskFactors ?? [],
    evidence: (raw.evidence ?? []).map(adaptEvidence),
    originalAccessRequests: (raw.originalAccessRequests ?? []).map(adaptOAR),
    publicUpdates: (raw.publicUpdates ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (u: any) => ({ id: u.id, status: u.status, text: u.text, addedAt: u.addedAt }),
    ),
    internalNotes: (raw.internalNotes ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n: any) => ({
        id: n.id,
        text: n.text,
        addedBy: n.addedBy,
        addedByName: n.addedByName,
        addedAt: n.addedAt,
      }),
    ),
    auditTrail: (raw.auditTrail ?? []).map(adaptAuditEvent),
    assignedInvestigatorId: raw.assignedInvestigatorId ?? '',
    assignedOfficerCode: raw.assignedOfficerCode ?? undefined,
    assignedAt: raw.assignedAt ?? undefined,
    correctionRequest: raw.correctionRequest ?? undefined,
    isSeeded: raw.isSeeded ?? false,
    integrity: raw.integrity ?? undefined,
    protectionSummary: raw.protectionSummary ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptNotification(n: any): AppNotification {
  return {
    id: n.id,
    roleType: n.roleType,
    officerCode: n.officerCode ?? undefined,
    caseId: n.caseId,
    title: n.title,
    body: n.body,
    link: n.link,
    createdAt: n.createdAt,
    read: n.read ?? false,
    tone: n.tone ?? 'info',
  };
}

// ─── Polling hook ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;

/**
 * Mount once inside AppProvider. Polls backend and syncs case + notification
 * data into AppContext while a staff session token is present.
 * Returns sync() so mutation callers can trigger an immediate re-sync.
 */
export function useStaffDataSync() {
  const { dispatch } = useApp();
  const { session } = useInvestigator();
  const tokenRef = useRef<string | undefined>(undefined);
  tokenRef.current = session?.token;

  const sync = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const [rawCases, rawNotifs] = await Promise.all([
        api.staffCases(token),
        api.notifications(token),
      ]);
      const cases = (rawCases as unknown[]).map(adaptCase);
      const notifications = (rawNotifs as unknown[]).map(adaptNotification);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch({ type: 'SYNC_STAFF_CASES', payload: cases } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch({ type: 'SYNC_STAFF_NOTIFICATIONS', payload: notifications } as any);
    } catch {
      // Network / auth error — silently skip; local fixture state remains usable
    }
  }, [dispatch]);

  useEffect(() => {
    if (!session?.token) return;
    void sync();
    const id = setInterval(() => void sync(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session?.token, sync]);

  return sync;
}

// ─── Mutation helpers ─────────────────────────────────────────────────────────

export function useStaffMutations(sync: () => Promise<void>) {
  const { session } = useInvestigator();
  const tok = () => session?.token ?? '';

  async function releaseEvidence(caseId: string, evidenceId: string, versionId?: string) {
    try {
      await api.staffAction(tok(), `/cases/${caseId}/releases`, {
        evidence_id: evidenceId,
        version_id: versionId ?? null,
      });
    } catch { /* local dispatch already applied */ }
    await sync();
  }

  async function assignOfficer(caseId: string, officerCode: string) {
    try {
      await api.staffAction(tok(), `/cases/${caseId}/assignments`, { officer_code: officerCode });
    } catch { /* optimistic */ }
    await sync();
  }

  async function privacyDecision(
    caseId: string,
    requestId: string,
    decision: 'approved' | 'rejected' | 'clarification_requested',
    notes?: string,
  ) {
    try {
      await api.staffAction(
        tok(),
        `/cases/${caseId}/access-requests/${requestId}/privacy-decisions`,
        { decision, notes: notes ?? null },
      );
    } catch { /* optimistic */ }
    await sync();
  }

  async function oversightDecision(
    caseId: string,
    requestId: string,
    decision: 'approved' | 'rejected' | 'clarification_requested',
    notes?: string,
    approvedDurationMinutes?: number,
  ) {
    try {
      await api.staffAction(
        tok(),
        `/cases/${caseId}/access-requests/${requestId}/oversight-decisions`,
        { decision, notes: notes ?? null, approved_duration_minutes: approvedDurationMinutes ?? null },
      );
    } catch { /* optimistic */ }
    await sync();
  }

  async function addPublicUpdate(caseId: string, status: string, text: string) {
    try {
      await api.staffAction(tok(), `/cases/${caseId}/public-updates`, { status, text });
    } catch { /* optimistic */ }
    await sync();
  }

  async function addInternalNote(caseId: string, text: string) {
    try {
      await api.staffAction(tok(), `/cases/${caseId}/internal-notes`, { text });
    } catch { /* optimistic */ }
    await sync();
  }

  async function recommendClosure(caseId: string, outcome: string, reporterMessage: string) {
    try {
      await api.staffAction(tok(), `/cases/${caseId}/closure-recommendations`, {
        outcome,
        reporter_message: reporterMessage,
      });
    } catch { /* optimistic */ }
    await sync();
  }

  async function closureDecision(
    caseId: string,
    decision: 'approved' | 'returned' | 'reopen',
    reason?: string,
  ) {
    try {
      await api.staffAction(tok(), `/cases/${caseId}/closure-decisions`, {
        decision,
        reason: reason ?? null,
      });
    } catch { /* optimistic */ }
    await sync();
  }

  return {
    releaseEvidence,
    assignOfficer,
    privacyDecision,
    oversightDecision,
    addPublicUpdate,
    addInternalNote,
    recommendClosure,
    closureDecision,
  };
}
