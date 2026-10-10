import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useCases, useInvestigator, useApp } from '../../store/AppContext';
import { api } from '../../services/api';
import { ACCESS_MODE_LABELS, URGENCY_LABELS } from '../../types';
import type { OriginalAccessRequest, EvidenceRecord } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface PendingItem { caseId: string; caseRef: string; caseTitle: string; ev: EvidenceRecord | undefined; req: OriginalAccessRequest; }

const CHECKLIST = [
  'Privacy review completed',
  'Request is specific and justified',
  'Duration is limited',
  'Investigator has no conflict',
  'Requester is not the approver',
  'Audit logging is active',
  'Identity-risk controls applied',
];

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function fmtRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

type Dec = 'approved' | 'changes' | 'clarification_requested' | 'rejected';

function AccessCard({ item, officerId, officerName, history }: { item: PendingItem; officerId: string; officerName: string; history: number }) {
  const { dispatch, toast } = useApp();
  const { session } = useInvestigator();
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [duration, setDuration] = useState(item.req.requestedDurationMinutes);
  const [loading, setLoading] = useState<Dec | null>(null);
  const { req } = item;
  const own = req.requestedBy === officerId;
  const allChecked = checks.every(Boolean);
  const noNotes = !notes.trim();
  const changed = duration !== req.requestedDurationMinutes;
  const invalidDuration = !Number.isFinite(duration) || duration < 5 || duration > 120;

  async function decide(d: Dec) {
    setLoading(d);
    try {
      const decision = d === 'changes' ? 'approved' : d;
      if (!session?.token) throw new Error('Oversight session is not connected to the local API. Sign in again.');
      await api.staffAction(session.token, `/cases/${item.caseId}/access-requests/${req.id}/oversight-decisions`, {
        decision,
        notes: notes.trim() || null,
        approved_duration_minutes: d === 'changes' ? duration : null,
      });
      dispatch({ type: 'OVERSIGHT_REVIEW_DECISION', payload: { caseId: item.caseId, requestId: req.id, decision, officerId, officerName, notes: notes.trim() || undefined, approvedDurationMinutes: d === 'changes' ? duration : undefined } });
      toast(d === 'approved' || d === 'changes' ? 'success' : 'info', d === 'approved' ? `Limited access granted for ${req.requestedDurationMinutes} minutes.` : d === 'changes' ? `Access approved with changes: ${duration} minutes.` : d === 'rejected' ? 'Access request rejected.' : 'Clarification requested.');
    } catch (err: any) {
      toast('error', `Approval was not saved: ${err?.message || 'Please try again.'}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
      <div className="px-5 py-3 bg-surface-2 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-mono text-ink-muted">{item.caseRef}</p>
          <p className="text-[14px] font-medium text-ink-1">{item.ev?.name ?? req.evidenceId}</p>
          <p className="text-[12px] text-ink-muted truncate max-w-[380px]">{item.caseTitle}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-warning-bg text-warning font-medium shrink-0">Awaiting Final Approval</span>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div><p className="text-ink-muted mb-0.5">Requested by</p><p className="text-ink-1 font-medium">{req.requestedByName}</p></div>
          <div><p className="text-ink-muted mb-0.5">Requested duration</p><p className="text-ink-1 font-medium">{req.requestedDurationMinutes} minutes</p></div>
          <div><p className="text-ink-muted mb-0.5">Access mode</p><p className="text-ink-1 font-medium">{req.accessMode ? ACCESS_MODE_LABELS[req.accessMode] : '—'}</p></div>
          <div><p className="text-ink-muted mb-0.5">Urgency</p><p className="text-ink-1 font-medium">{req.urgency ? URGENCY_LABELS[req.urgency] : '—'}</p></div>
          <div><p className="text-ink-muted mb-0.5">Previous access requests by this officer</p><p className="text-ink-1 font-medium">{history}</p></div>
          <div><p className="text-ink-muted mb-0.5">Original evidence</p><p className="text-ink-1 font-medium">Stays sealed — you do not open it</p></div>
          <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Purpose</p><p className="text-ink-1">{req.purpose}</p></div>
          <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Reason protected copy is insufficient</p><p className="text-ink-1">{req.reason}</p></div>
          {req.intendedAction && <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Intended action</p><p className="text-ink-1">{req.intendedAction}</p></div>}
        </div>
        <div className="p-3 bg-success-bg rounded-[8px]">
          <p className="text-[12px] font-medium text-success mb-0.5">Privacy Officer recommended approval</p>
          <p className="text-[12px] text-ink-2">{req.privacyDecidedByName} · {req.privacyDecidedAt ? formatDate(req.privacyDecidedAt) : '—'}</p>
          {req.privacyNotes && <p className="text-[12px] text-ink-2 mt-1">Notes: {req.privacyNotes}</p>}
        </div>
        <div className="border-t border-rule pt-4 flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-medium text-ink-1 mb-2">Mandatory checklist</p>
            {CHECKLIST.map((label, i) => (
              <label key={label} className="flex items-center gap-3 min-h-[36px] text-[13px] text-ink-1 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#B94725]" checked={checks[i]} onChange={() => setChecks((p) => p.map((v, j) => (j === i ? !v : v)))} />
                {label}
              </label>
            ))}
          </div>
          <label className="text-[13px] text-ink-1 flex flex-col gap-1 max-w-[220px]">
            Approved duration (minutes)
            <input type="number" min={5} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="border border-rule rounded-[8px] bg-canvas px-3 py-2 text-[13px] tabular-nums" />
          </label>
          <textarea className="w-full border border-rule rounded-[8px] bg-canvas px-3 py-2 text-[13px] text-ink-1 placeholder:text-ink-muted resize-none focus:outline-2 focus:outline-offset-2 focus:outline-ink-1 h-20" placeholder="Notes (required for changes, clarification or rejection)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {own && <p className="text-[12px] text-error">You cannot approve your own request.</p>}
          <div className="flex gap-3 flex-wrap">
            <Button variant="primary" size="sm" onClick={() => decide('approved')} loading={loading === 'approved'} disabled={!allChecked || own || changed || !!loading}>Approve Limited Access</Button>
            <Button variant="secondary" size="sm" onClick={() => decide('changes')} loading={loading === 'changes'} disabled={!allChecked || own || !changed || invalidDuration || noNotes || !!loading}>Approve With Changes</Button>
            <Button variant="secondary" size="sm" onClick={() => decide('clarification_requested')} loading={loading === 'clarification_requested'} disabled={own || noNotes || !!loading}>Request Clarification</Button>
            <Button variant="danger" size="sm" onClick={() => decide('rejected')} loading={loading === 'rejected'} disabled={own || noNotes || !!loading}>Reject</Button>
          </div>
          <p className="text-[12px] text-ink-muted -mt-2">{changed ? 'Duration changed: use Approve With Changes.' : 'Change the duration to enable Approve With Changes.'} A window opens immediately on approval.</p>
        </div>
      </div>
    </div>
  );
}

function ActiveWindow({ item, officerId, officerName }: { item: PendingItem; officerId: string; officerName: string }) {
  const { dispatch, toast } = useApp();
  const now = useNow();
  const { req } = item;
  const ms = req.accessExpiresAt ? new Date(req.accessExpiresAt).getTime() - now : 0;
  return (
    <div className="border border-ember/30 rounded-[10px] bg-ember-soft p-4 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono text-ink-muted">{item.caseRef}</p>
        <p className="text-[14px] font-medium text-ink-1">{item.ev?.name ?? req.evidenceId}</p>
        <p className="text-[13px] text-ink-2">{req.requestedByName} · Purpose: {req.purpose}</p>
        <p className="text-[12px] text-ink-muted mt-1">Started {req.accessGrantedAt ? formatDate(req.accessGrantedAt) : '—'} · Expires {req.accessExpiresAt ? formatDate(req.accessExpiresAt) : '—'}</p>
      </div>
      <p className="text-[20px] font-semibold tabular-nums text-ember">{fmtRemaining(ms)}</p>
      <Button variant="danger" size="sm" onClick={() => { dispatch({ type: 'END_ORIGINAL_ACCESS', payload: { caseId: item.caseId, requestId: req.id, reason: 'revoked', actorId: officerId, actorName: officerName, actorRole: 'Oversight Officer' } }); toast('info', 'Access revoked.'); }}>Revoke access</Button>
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="border border-rule rounded-[10px] bg-surface p-4">
      <p className={`text-[28px] font-semibold tabular-nums ${accent ?? 'text-ink-1'}`}>{value}</p>
      <p className="text-[12px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}

export function OversightApprovalsPage() {
  const allCases = useCases();
  const { session } = useInvestigator();

  const pending = useMemo<PendingItem[]>(() => {
    const result: PendingItem[] = [];
    for (const c of allCases) {
      for (const req of c.originalAccessRequests) {
        if (req.status === 'oversight_review_pending') {
          result.push({ caseId: c.id, caseRef: c.reference, caseTitle: c.title, ev: c.evidence.find((e) => e.id === req.evidenceId), req });
        }
      }
    }
    return result;
  }, [allCases]);

  const active = useMemo<PendingItem[]>(() => {
    const result: PendingItem[] = [];
    for (const c of allCases) {
      for (const req of c.originalAccessRequests) {
        if (req.status === 'approved') {
          result.push({ caseId: c.id, caseRef: c.reference, caseTitle: c.title, ev: c.evidence.find((e) => e.id === req.evidenceId), req });
        }
      }
    }
    return result;
  }, [allCases]);

  const historical = useMemo<PendingItem[]>(() => {
    const result: PendingItem[] = [];
    for (const c of allCases) {
      for (const req of c.originalAccessRequests) {
        if (['ended', 'expired', 'revoked', 'rejected'].includes(req.status)) {
          result.push({ caseId: c.id, caseRef: c.reference, caseTitle: c.title, ev: c.evidence.find((e) => e.id === req.evidenceId), req });
        }
      }
    }
    return result.sort((a, b) => b.req.requestedAt.localeCompare(a.req.requestedAt));
  }, [allCases]);

  const officerId = session?.investigator.id ?? '';
  const officerName = session?.investigator.name ?? '';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[26px] font-semibold text-ink-1">Access approvals</h1>
        {session && <p className="text-[13px] text-ink-muted mt-1">{session.investigator.name} · Oversight Officer</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryTile label="Awaiting your approval" value={pending.length} accent={pending.length > 0 ? 'text-warning' : undefined} />
        <SummaryTile label="Active access windows" value={active.length} accent={active.length > 0 ? 'text-ember' : undefined} />
        <SummaryTile label="Historical accesses" value={historical.length} />
      </div>

      <section>
        <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Awaiting your approval</h2>
        {pending.length === 0 ? (
          <div className="border border-rule rounded-[10px] bg-surface p-6 text-center"><p className="text-[14px] text-ink-muted">No access requests awaiting your approval.</p></div>
        ) : (
          <div className="flex flex-col gap-4">{pending.map((item) => <AccessCard key={item.req.id} item={item} officerId={officerId} officerName={officerName} history={allCases.flatMap((c) => c.originalAccessRequests).filter((r) => r.requestedBy === item.req.requestedBy && r.id !== item.req.id).length} />)}</div>
        )}
      </section>

      {active.length > 0 && (
        <section>
          <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Active access windows</h2>
          <div className="flex flex-col gap-3">
            {active.map((item) => <ActiveWindow key={item.req.id} item={item} officerId={officerId} officerName={officerName} />)}
          </div>
        </section>
      )}

      {historical.length > 0 && (
        <section>
          <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Access history</h2>
          <div className="flex flex-col gap-2">
            {historical.map((item) => (
              <div key={item.req.id} className="border border-rule rounded-[10px] bg-surface p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-ink-muted">{item.caseRef}</p>
                  <p className="text-[13px] font-medium text-ink-1 truncate">{item.ev?.name ?? item.req.evidenceId}</p>
                  <p className="text-[12px] text-ink-muted">{item.req.requestedByName} · {item.req.status}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${item.req.status === 'rejected' ? 'bg-error-bg text-error' : 'bg-surface-2 text-ink-2'}`}>{item.req.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
