import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCases, useInvestigator } from '../../store/AppContext';
import type { EvidenceRecord, OriginalAccessRequest } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface EvidenceNeedingReview { caseId: string; caseRef: string; caseTitle: string; ev: EvidenceRecord; }
interface AccessNeedingReview { caseId: string; caseRef: string; ev: EvidenceRecord | undefined; req: OriginalAccessRequest; }

function SummaryTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="border border-rule rounded-[10px] bg-surface p-4">
      <p className={`text-[28px] font-semibold tabular-nums ${accent ?? 'text-ink-1'}`}>{value}</p>
      <p className="text-[12px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}

export function PrivacyQueuePage() {
  const allCases = useCases();
  const { session } = useInvestigator();

  const awaitingAssignment = useMemo(
    () => allCases.filter((c) => !c.assignedOfficerCode && c.status !== 'closed' && c.evidence.every((e) => e.protectedCopyStatus === 'released' || e.protectedCopyStatus === 'not_required')),
    [allCases],
  );
  const pendingRelease = useMemo<EvidenceNeedingReview[]>(() => {
    const result: EvidenceNeedingReview[] = [];
    for (const c of allCases) {
      for (const ev of c.evidence) {
        if (ev.protectedCopyStatus === 'pending_release') {
          result.push({ caseId: c.id, caseRef: c.reference, caseTitle: c.title, ev });
        }
      }
    }
    return result;
  }, [allCases]);

  const pendingAccessReview = useMemo<AccessNeedingReview[]>(() => {
    const result: AccessNeedingReview[] = [];
    for (const c of allCases) {
      for (const req of c.originalAccessRequests) {
        if (req.status === 'privacy_review_pending') {
          const ev = c.evidence.find((e) => e.id === req.evidenceId);
          result.push({ caseId: c.id, caseRef: c.reference, ev, req });
        }
      }
    }
    return result;
  }, [allCases]);

  const activeAccess = useMemo<AccessNeedingReview[]>(() => {
    const result: AccessNeedingReview[] = [];
    for (const c of allCases) {
      for (const req of c.originalAccessRequests) {
        if (req.status === 'approved') {
          const ev = c.evidence.find((e) => e.id === req.evidenceId);
          result.push({ caseId: c.id, caseRef: c.reference, ev, req });
        }
      }
    }
    return result;
  }, [allCases]);

  const recentlyEnded = useMemo<AccessNeedingReview[]>(() => {
    const result: AccessNeedingReview[] = [];
    for (const c of allCases) {
      for (const req of c.originalAccessRequests) {
        if (req.status === 'ended' || req.status === 'expired' || req.status === 'revoked') {
          const ev = c.evidence.find((e) => e.id === req.evidenceId);
          result.push({ caseId: c.id, caseRef: c.reference, ev, req });
        }
      }
    }
    return result;
  }, [allCases]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[26px] font-semibold text-ink-1">Privacy & Evidence Dashboard</h1>
        {session && <p className="text-[13px] text-ink-muted mt-1">{session.investigator.name} · {session.investigator.organization}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label="Awaiting protection release" value={pendingRelease.length} accent={pendingRelease.length > 0 ? 'text-warning' : undefined} />
        <SummaryTile label="Access requests to review" value={pendingAccessReview.length} accent={pendingAccessReview.length > 0 ? 'text-warning' : undefined} />
        <SummaryTile label="Active evidence access" value={activeAccess.length} accent={activeAccess.length > 0 ? 'text-ember' : undefined} />
        <SummaryTile label="Ended / expired accesses" value={recentlyEnded.length} />
      </div>

      <section>
        <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Awaiting officer assignment</h2>
        {awaitingAssignment.length === 0 ? (
          <div className="border border-rule rounded-[10px] bg-surface p-6 text-center"><p className="text-[14px] text-ink-muted">No released cases waiting for an Anti-Corruption Officer.</p></div>
        ) : (
          <div className="flex flex-col gap-3">
            {awaitingAssignment.map((c) => (
              <div key={c.id} className="border border-rule rounded-[10px] bg-surface p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-ink-muted">{c.reference}</p>
                  <p className="text-[14px] font-medium text-ink-1 truncate">{c.title}</p>
                </div>
                <Link to={`/privacy-officer/cases/${c.id}/review`} className="px-3 py-1.5 bg-ember text-white rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity">Assign officer</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Protected copies awaiting release</h2>
        {pendingRelease.length === 0 ? (
          <div className="border border-rule rounded-[10px] bg-surface p-6 text-center">
            <p className="text-[14px] text-ink-muted">No evidence copies awaiting release.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingRelease.map(({ caseId, caseRef, caseTitle, ev }) => (
              <div key={ev.id} className="border border-rule rounded-[10px] bg-surface p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-ink-muted">{caseRef}</p>
                  <p className="text-[14px] font-medium text-ink-1 truncate">{ev.name}</p>
                  <p className="text-[13px] text-ink-2 truncate">{caseTitle}</p>
                  <p className="text-[12px] text-ink-muted mt-0.5">{ev.metadataRemoved.length} metadata field(s) removed</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-warning-bg text-warning font-medium">Awaiting release</span>
                  <Link to={`/privacy-officer/cases/${caseId}/review`} className="px-3 py-1.5 bg-ember text-white rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity">Review</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Original access requests awaiting your review</h2>
        {pendingAccessReview.length === 0 ? (
          <div className="border border-rule rounded-[10px] bg-surface p-6 text-center">
            <p className="text-[14px] text-ink-muted">No access requests pending your review.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingAccessReview.map(({ caseId, caseRef, ev, req }) => (
              <div key={req.id} className="border border-rule rounded-[10px] bg-surface p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-ink-muted">{caseRef}</p>
                  <p className="text-[14px] font-medium text-ink-1 truncate">{ev?.name ?? req.evidenceId}</p>
                  <p className="text-[13px] text-ink-2">Requested by {req.requestedByName} · {formatDate(req.requestedAt)}</p>
                  <p className="text-[12px] text-ink-muted truncate mt-0.5">Purpose: {req.purpose}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-warning-bg text-warning font-medium">Awaiting your review</span>
                  <Link to={`/privacy-officer/cases/${caseId}/review`} className="px-3 py-1.5 bg-ember text-white rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity">Review</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {activeAccess.length > 0 && (
        <section>
          <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Active evidence access</h2>
          <div className="flex flex-col gap-3">
            {activeAccess.map(({ caseId, caseRef, ev, req }) => {
              const expiresMs = req.accessExpiresAt ? new Date(req.accessExpiresAt).getTime() - Date.now() : null;
              return (
                <div key={req.id} className="border border-ember/30 rounded-[10px] bg-ember-soft p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-ink-muted">{caseRef}</p>
                    <p className="text-[14px] font-medium text-ink-1 truncate">{ev?.name ?? req.evidenceId}</p>
                    <p className="text-[13px] text-ink-2">Accessed by {req.requestedByName}</p>
                    {expiresMs !== null && <p className="text-[12px] text-ember mt-0.5">{expiresMs > 0 ? `Expires in ${Math.ceil(expiresMs / 60000)} min` : 'Expired'}</p>}
                  </div>
                  <Link to={`/privacy-officer/cases/${caseId}/review`} className="text-[13px] text-ember hover:underline">View</Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {recentlyEnded.length > 0 && (
        <section>
          <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Recently ended access</h2>
          <div className="flex flex-col gap-2">
            {recentlyEnded.slice(0, 5).map(({ caseId, caseRef, ev, req }) => (
              <div key={req.id} className="border border-rule rounded-[10px] bg-surface p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-ink-muted">{caseRef}</p>
                  <p className="text-[13px] font-medium text-ink-1 truncate">{ev?.name ?? req.evidenceId}</p>
                  <p className="text-[12px] text-ink-muted">{req.requestedByName} · {req.status}</p>
                </div>
                <Link to={`/privacy-officer/cases/${caseId}/review`} className="text-[13px] text-ink-muted hover:text-ink-1 transition-colors">View</Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
