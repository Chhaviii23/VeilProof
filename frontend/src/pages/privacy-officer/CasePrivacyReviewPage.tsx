import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useApp, useCase, useInvestigator } from '../../store/AppContext';
import { ANTI_CORRUPTION_OFFICERS } from '../../services/fixtures';
import { ACCESS_MODE_LABELS, URGENCY_LABELS, RISK_FACTOR_LABELS, CRITICAL_RISK_FACTORS } from '../../types';
import type { CaseRecord, EvidenceRecord, OriginalAccessRequest, AntiCorruptionOfficer } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number) {
  if (bytes === 0) return 'Link';
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const textareaClass = 'w-full border border-rule rounded-[8px] bg-canvas px-3 py-2 text-[13px] text-ink-1 placeholder:text-ink-muted resize-none focus:outline-2 focus:outline-offset-2 focus:outline-ink-1 h-20';

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="border border-rule rounded-[10px] bg-surface p-4">
      <p className="text-[12px] text-ink-muted mb-1">{label}</p>
      <div className={`text-[14px] font-medium ${tone ?? 'text-ink-1'}`}>{value}</div>
    </div>
  );
}

function CaseSummary({ c }: { c: CaseRecord }) {
  const risks = c.riskFactors ?? [];
  const critical = c.priority === 'critical';
  const meta = c.evidence.reduce((n, e) => n + e.metadataRemoved.length, 0);
  const ps = c.protectionSummary;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[16px] font-semibold text-ink-1">Review summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Stat label="Priority" value={critical ? 'Critical' : 'Standard'} tone={critical ? 'text-error' : undefined} />
        <Stat label="Original evidence" value="Encrypted and Sealed" tone="text-success" />
        <Stat label="Identity-protection summary" value={ps ? `${ps.namesProtected} name${ps.namesProtected === 1 ? '' : 's'} protected · ${ps.facesBlurred} face${ps.facesBlurred === 1 ? '' : 's'} blurred · ${ps.voicesMasked} voice${ps.voicesMasked === 1 ? '' : 's'} masked` : 'Metadata-only protection'} />
        <Stat label="Metadata-removal summary" value={`${meta} hidden field${meta === 1 ? '' : 's'} removed across ${c.evidence.length} item${c.evidence.length === 1 ? '' : 's'}`} />
        <Stat label="Evidence integrity" value={c.integrity?.proofStatus === 'confirmed' ? 'Integrity commitment verified' : c.integrity?.proofStatus === 'failed' ? 'Integrity proof failed' : 'Integrity proof pending'} tone={c.integrity?.proofStatus === 'confirmed' ? 'text-success' : 'text-warning'} />
        <Stat label="Blockchain receipt" value={c.integrity?.transactionRef ? <span className="font-mono text-[12px] break-all">{c.integrity.network ?? 'Network'} · {c.integrity.transactionRef.slice(0, 18)}…</span> : 'No receipt on record'} />
        <div className="md:col-span-2">
          <Stat label="Threat and retaliation risk" value={risks.length === 0 ? 'None reported' : (
            <div className="flex flex-wrap gap-2">
              {risks.map((r) => (
                <span key={r} className={`text-[12px] px-2 py-0.5 rounded-full ${CRITICAL_RISK_FACTORS.has(r) ? 'bg-error-bg text-error' : 'bg-warning-bg text-warning'}`}>{RISK_FACTOR_LABELS[r] ?? r}</span>
              ))}
            </div>
          )} />
        </div>
      </div>
      {critical && <p className="text-[13px] text-ink-2">Critical cases: protective action may begin on protected evidence without waiting for original-evidence approval.</p>}
    </section>
  );
}

function ProtectedCopyCard({ ev }: { ev: EvidenceRecord }) {
  return (
    <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
      <div className="px-5 py-3 bg-surface-2 border-b border-rule flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink-1 truncate">{ev.name}</p>
          <p className="text-[12px] text-ink-muted">{formatSize(ev.size)} · {ev.type}</p>
        </div>
        {ev.protectedCopyStatus === 'pending_release' && <span className="px-2 py-0.5 rounded-full text-[11px] bg-warning-bg text-warning font-medium shrink-0">Awaiting release</span>}
        {ev.protectedCopyStatus === 'released' && <span className="px-2 py-0.5 rounded-full text-[11px] bg-success-bg text-success font-medium shrink-0">Released</span>}
      </div>
      <div className="p-5 flex flex-col gap-3">
        {ev.protectionNote && <p className="text-[13px] text-ink-1">{ev.protectionNote}</p>}
        <div>
          <p className="text-[13px] font-medium text-ink-1 mb-2">Metadata removed by Privacy Guardian</p>
          {ev.metadataRemoved.length === 0 ? (
            <p className="text-[13px] text-ink-muted italic">No identity-related metadata found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ev.metadataRemoved.map((field) => <span key={field} className="px-2 py-1 bg-success-bg text-success text-[12px] rounded-[4px]">{field} — removed</span>)}
            </div>
          )}
        </div>
        <p className="text-[12px] text-ink-muted">Original: Encrypted and Sealed — not available to this role.</p>
        {ev.protectedCopyStatus === 'released' && <p className="text-[13px] text-success">Released by {ev.protectedCopyReleasedByName} · {ev.protectedCopyReleasedAt ? formatDate(ev.protectedCopyReleasedAt) : '—'}</p>}
      </div>
    </div>
  );
}

function ReleasePanel({ c, officerId, officerName }: { c: CaseRecord; officerId: string; officerName: string }) {
  const { dispatch, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const pending = c.evidence.filter((e) => e.protectedCopyStatus !== 'released').length;
  const locked = !!c.assignedOfficerCode || c.status === 'closed';

  async function releaseAll() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    dispatch({ type: 'RELEASE_ALL_PROTECTED_COPIES', payload: { caseId: c.id, officerId, officerName } });
    toast('success', 'Protected copies released. Originals remain sealed.');
    setLoading(false);
  }

  function returnForCorrection() {
    if (!reason.trim()) return;
    dispatch({ type: 'RETURN_FOR_CORRECTION', payload: { caseId: c.id, officerId, officerName, reason: reason.trim() } });
    toast('info', 'Returned for protection correction.');
    setReturning(false); setReason('');
  }

  if (pending === 0 || locked) return null;
  return (
    <div className="border border-rule rounded-[12px] bg-surface p-5 flex flex-col gap-3">
      <p className="text-[14px] font-medium text-ink-1">{pending} protected cop{pending === 1 ? 'y' : 'ies'} awaiting release</p>
      <p className="text-[13px] text-ink-2">Only protected copies are released. Originals stay encrypted and sealed. After release you can assign an Anti-Corruption Officer.</p>
      {c.correctionRequest && <p className="text-[12px] text-warning">Returned for correction: {c.correctionRequest}</p>}
      {returning ? (
        <div className="flex flex-col gap-2">
          <textarea className={textareaClass} placeholder="What needs to be corrected in the protection step?" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="danger" size="sm" disabled={!reason.trim()} onClick={returnForCorrection}>Return for protection correction</Button>
            <Button variant="secondary" size="sm" onClick={() => setReturning(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          <Button variant="primary" size="sm" onClick={releaseAll} loading={loading}>Release Protected Copies</Button>
          <Button variant="secondary" size="sm" onClick={() => setReturning(true)}>Return for protection correction</Button>
        </div>
      )}
    </div>
  );
}

const CHECKLIST = [
  'Active case verified',
  'Exact file specified',
  'Purpose is investigation-related',
  'Protected copy is insufficient',
  'Conflict check passed',
  'Requested duration is limited',
  'Identity-risk controls applied',
];

const statusLabel: Record<string, string> = {
  privacy_review_pending: 'Awaiting your review',
  oversight_review_pending: 'Awaiting Final Approval',
  clarification_requested: 'Clarification requested',
  approved: 'Access active',
  rejected: 'Rejected',
  ended: 'Ended',
  expired: 'Access Expired',
  revoked: 'Revoked',
};

function AccessRequestCard({ c, ev, req, officerId, officerName }: { c: CaseRecord; ev: EvidenceRecord | undefined; req: OriginalAccessRequest; officerId: string; officerName: string }) {
  const { dispatch, toast } = useApp();
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [loading, setLoading] = useState<string | null>(null);
  const reviewing = req.status === 'privacy_review_pending';
  const allChecked = checks.every(Boolean);
  const ownRequest = req.requestedBy === officerId;
  const investigatorCode = c.assignedOfficerCode;
  const officer = ANTI_CORRUPTION_OFFICERS.find((o) => o.code === investigatorCode);

  async function decide(decision: 'approved' | 'rejected' | 'clarification_requested') {
    setLoading(decision);
    await new Promise((r) => setTimeout(r, 400));
    dispatch({ type: 'PRIVACY_REVIEW_DECISION', payload: { caseId: c.id, requestId: req.id, decision, officerId, officerName, notes: notes.trim() || undefined } });
    toast(decision === 'rejected' ? 'info' : 'success', decision === 'approved' ? 'Recommended. Sent to the Oversight Officer for final approval.' : decision === 'rejected' ? 'Access request rejected.' : 'Clarification requested from the Anti-Corruption Officer.');
    setLoading(null);
  }

  const needsNotes = !notes.trim();
  const rows: [string, React.ReactNode][] = [
    ['Exact file requested', ev?.name ?? req.evidenceId],
    ['Requested by', `${req.requestedByName}${investigatorCode ? ` · ${investigatorCode}` : ''}`],
    ['Duration', `${req.requestedDurationMinutes} minutes`],
    ['Access mode', req.accessMode ? ACCESS_MODE_LABELS[req.accessMode] : '—'],
    ['Urgency', req.urgency ? URGENCY_LABELS[req.urgency] : '—'],
    ['Case priority', c.priority === 'critical' ? 'Critical' : 'Standard'],
    ['Investigator conflict status', officer ? (officer.conflictDetected ? 'Conflict detected' : 'No conflict detected') : 'Not recorded'],
    ['Identity-exposure risk', req.accessMode === 'view_only' ? 'Lower — view only, no stream or export' : 'Elevated — narrower access may be possible (e.g. view only)'],
  ];

  return (
    <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
      <div className="px-5 py-3 bg-surface-2 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[14px] font-medium text-ink-1">{ev?.name ?? req.evidenceId}</p>
          <p className="text-[12px] text-ink-muted">Sealed original access request · {formatDate(req.requestedAt)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${reviewing ? 'bg-warning-bg text-warning' : req.status === 'rejected' ? 'bg-error-bg text-error' : req.status === 'approved' || req.status === 'oversight_review_pending' ? 'bg-success-bg text-success' : 'bg-surface-2 text-ink-2'}`}>{statusLabel[req.status] ?? req.status}</span>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          {rows.map(([k, v]) => <div key={k}><p className="text-ink-muted mb-0.5">{k}</p><p className="text-ink-1 font-medium">{v}</p></div>)}
          <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Investigation purpose</p><p className="text-ink-1">{req.purpose}</p></div>
          <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Why the protected copy is insufficient</p><p className="text-ink-1">{req.reason}</p></div>
          {req.intendedAction && <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Intended investigative action</p><p className="text-ink-1">{req.intendedAction}</p></div>}
          {req.clarificationResponse && <div className="md:col-span-2 p-3 bg-info-bg rounded-[8px]"><p className="text-ink-muted mb-0.5">Clarification provided by investigator</p><p className="text-ink-1">{req.clarificationResponse}</p></div>}
        </div>

        {reviewing && (
          <div className="border-t border-rule pt-4 flex flex-col gap-4">
            <div>
              <p className="text-[13px] font-medium text-ink-1 mb-2">Mandatory checklist</p>
              <div className="flex flex-col gap-1">
                {CHECKLIST.map((label, i) => (
                  <label key={label} className="flex items-center gap-3 min-h-[36px] text-[13px] text-ink-1 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#B94725]" checked={checks[i]} onChange={() => setChecks((p) => p.map((v, j) => j === i ? !v : v))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-medium text-ink-1 mb-2">Notes</p>
              <textarea className={textareaClass} placeholder="Required for clarification or rejection" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {ownRequest && <p className="text-[12px] text-error">You cannot review your own request.</p>}
            <p className="text-[12px] text-ink-muted">The Privacy Officer recommends only. Final access is granted by the Oversight Officer.</p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" size="sm" onClick={() => decide('approved')} loading={loading === 'approved'} disabled={!allChecked || ownRequest || !!loading}>Recommend for Approval</Button>
              <Button variant="secondary" size="sm" onClick={() => decide('clarification_requested')} loading={loading === 'clarification_requested'} disabled={needsNotes || ownRequest || !!loading}>Request Clarification</Button>
              <Button variant="danger" size="sm" onClick={() => decide('rejected')} loading={loading === 'rejected'} disabled={needsNotes || ownRequest || !!loading}>Reject Request</Button>
            </div>
            {!allChecked && <p className="text-[12px] text-ink-muted -mt-2">Complete every checklist item to recommend.</p>}
          </div>
        )}

        {req.status === 'clarification_requested' && <p className="border-t border-rule pt-3 text-[13px] text-ink-2">Waiting for the investigator to respond: {req.clarificationQuestion}</p>}
        {req.privacyDecidedAt && req.status !== 'privacy_review_pending' && req.status !== 'clarification_requested' && (
          <div className="border-t border-rule pt-3">
            <p className="text-[12px] text-ink-muted">Your decision: <span className={req.privacyDecision === 'approved' ? 'text-success font-medium' : 'text-error font-medium'}>{req.privacyDecision === 'approved' ? 'Recommended for approval' : req.privacyDecision}</span></p>
            {req.privacyNotes && <p className="text-[12px] text-ink-2 mt-1">Notes: {req.privacyNotes}</p>}
            <p className="text-[12px] text-ink-muted mt-0.5">{formatDate(req.privacyDecidedAt)}</p>
          </div>
        )}
        {req.oversightDecision !== 'pending' && (
          <div className="border-t border-rule pt-3">
            <p className="text-[12px] text-ink-muted">Oversight decision: <span className={req.oversightDecision === 'approved' ? 'text-success font-medium' : 'text-error font-medium'}>{req.oversightDecision === 'approved' ? (req.approvedWithChanges ? 'approved with changes' : 'approved') : req.oversightDecision}</span></p>
            {req.oversightNotes && <p className="text-[12px] text-ink-2 mt-1">{req.oversightNotes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

type SortKey = 'recommended' | 'workload' | 'expertise' | 'availability';

function expertiseScore(o: AntiCorruptionOfficer, c: CaseRecord) {
  const hay = `${c.title} ${c.description} ${c.involvedParties ?? ''}`.toLowerCase();
  return o.specialization.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && hay.includes(w.replace(/s$/, ''))).length + (hay.includes('pwd') && o.specialization.includes('PWD') ? 2 : 0);
}

function OfficerAssignmentPanel({ c, officerId, officerName }: { c: CaseRecord; officerId: string; officerName: string }) {
  const { dispatch, toast } = useApp();
  const [sort, setSort] = useState<SortKey>('recommended');
  const [pick, setPick] = useState<AntiCorruptionOfficer | null>(null);
  const [assigning, setAssigning] = useState(false);
  const assignedCode = c.assignedOfficerCode;
  const assigned = ANTI_CORRUPTION_OFFICERS.find((o) => o.code === assignedCode);

  const sorted = useMemo(() => {
    const list = [...ANTI_CORRUPTION_OFFICERS];
    const rank = { Available: 0, Moderate: 1, 'High workload': 2 };
    if (sort === 'recommended') return list.sort((a, b) => Number(b.status === 'Recommended') - Number(a.status === 'Recommended') || Number(a.conflictDetected) - Number(b.conflictDetected));
    if (sort === 'workload') return list.sort((a, b) => a.activeCases - b.activeCases);
    if (sort === 'availability') return list.sort((a, b) => rank[a.availability] - rank[b.availability]);
    return list.sort((a, b) => expertiseScore(b, c) - expertiseScore(a, c));
  }, [sort, c]);

  async function confirmAssign() {
    if (!pick) return;
    setAssigning(true);
    await new Promise((r) => setTimeout(r, 500));
    dispatch({ type: 'ASSIGN_CASE_OFFICER', payload: { caseId: c.id, officerCode: pick.code, officerName: pick.name, assignedById: officerId, assignedByName: officerName } });
    toast('success', `Case assigned to ${pick.code}. They have been notified.`);
    setAssigning(false);
    setPick(null);
  }

  const availabilityColor = { Available: 'text-success bg-success-bg', Moderate: 'text-warning bg-warning-bg', 'High workload': 'text-error bg-error-bg' };

  if (assigned) {
    return (
      <section>
        <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Assigned Anti-Corruption Officer</h2>
        <div className="border border-success rounded-[12px] bg-surface p-5">
          <p className="text-[14px] font-semibold text-ink-1"><span className="font-mono text-[12px] text-ink-muted mr-2">{assigned.code}</span>{assigned.name}</p>
          <p className="text-[13px] text-ink-2 mt-1">{assigned.specialization} · {assigned.jurisdiction}</p>
          {c.assignedAt && <p className="text-[12px] text-ink-muted mt-1">Assigned {formatDate(c.assignedAt)} · officer notified · recorded in audit trail</p>}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h2 className="text-[16px] font-semibold text-ink-1">Assign Anti-Corruption Officer</h2>
        <div className="flex gap-1.5 flex-wrap">
          {([['recommended', 'Recommended'], ['workload', 'Lowest workload'], ['expertise', 'Relevant expertise'], ['availability', 'Availability']] as [SortKey, string][]).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSort(key)} className={`text-[12px] font-medium px-3 py-1.5 rounded-[6px] border transition-colors ${sort === key ? 'bg-ember text-white border-ember' : 'border-rule text-ink-2 bg-canvas hover:border-ember hover:text-ember'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {sorted.map((officer) => {
          const ineligible = officer.conflictDetected;
          return (
            <div key={officer.code} className={`border border-rule rounded-[12px] bg-surface overflow-hidden ${ineligible ? 'opacity-70' : ''}`}>
              <div className="px-4 py-3 bg-surface-2 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-mono text-ink-muted">{officer.code}</span>
                  <span className="text-[14px] font-semibold text-ink-1">{officer.name}</span>
                  {officer.status === 'Recommended' && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Recommended</span>}
                  {ineligible && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-error-bg text-error">Ineligible</span>}
                </div>
                <Button variant="primary" size="sm" disabled={ineligible} onClick={() => setPick(officer)} aria-label={ineligible ? `${officer.code} cannot be assigned: conflict detected` : `Assign ${officer.code}`}>{ineligible ? 'Conflict detected' : 'Assign'}</Button>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-[12px]">
                <div><p className="text-ink-muted mb-0.5">Specialization</p><p className="text-ink-1">{officer.specialization}</p></div>
                <div><p className="text-ink-muted mb-0.5">Jurisdiction</p><p className="text-ink-1">{officer.jurisdiction}</p></div>
                <div><p className="text-ink-muted mb-0.5">Active cases</p><p className="text-ink-1 tabular-nums">{officer.activeCases}</p></div>
                <div><p className="text-ink-muted mb-0.5">Availability</p><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${availabilityColor[officer.availability]}`}>{officer.availability}</span></div>
                <div><p className="text-ink-muted mb-0.5">Conflict-of-interest</p><p className={ineligible ? 'text-error font-medium' : 'text-success'}>{ineligible ? 'Detected' : 'None'}</p></div>
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmationDialog
        open={!!pick}
        title={`Assign ${pick?.code ?? ''} — ${pick?.name ?? ''}?`}
        description={`${c.reference} will move to "Assigned", appear on the officer's dashboard, and the officer will be notified. The officer receives protected copies only.`}
        confirmLabel={assigning ? 'Assigning…' : 'Assign case'}
        onConfirm={confirmAssign}
        onCancel={() => setPick(null)}
      />
    </section>
  );
}

export function CasePrivacyReviewPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { session } = useInvestigator();
  const caseRecord = useCase(caseId);

  if (!caseRecord) return <ErrorState title="Case not found" />;
  if (!session) return <ErrorState title="Not signed in" />;

  const officerId = session.investigator.id;
  const officerName = session.investigator.name;
  const allReleased = caseRecord.evidence.length === 0 || caseRecord.evidence.every((e) => e.protectedCopyStatus === 'released');

  return (
    <div className="flex flex-col gap-6 max-w-[760px]">
      <nav className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Link to="/privacy-officer/queue" className="hover:text-ink-1">Dashboard</Link>
        <span>/</span>
        <span className="font-mono text-ink-1">{caseRecord.reference}</span>
      </nav>
      <div>
        <h1 className="text-[22px] font-semibold text-ink-1">{caseRecord.title}</h1>
        <p className="text-[13px] text-ink-muted mt-1">Privacy review — {caseRecord.reference} · {caseRecord.evidence.length} protected item{caseRecord.evidence.length === 1 ? '' : 's'}</p>
      </div>
      <div className="p-3 bg-info-bg rounded-[8px] text-[13px] text-info">
        You release protected copies and assign the investigating officer. You recommend original-evidence requests; the Oversight Officer gives final approval.
      </div>

      <CaseSummary c={caseRecord} />

      <section className="flex flex-col gap-4">
        <h2 className="text-[16px] font-semibold text-ink-1">Protected evidence</h2>
        {caseRecord.evidence.length === 0 ? (
          <div className="border border-rule rounded-[10px] bg-surface p-6 text-center"><p className="text-[14px] text-ink-muted">No evidence attached to this case.</p></div>
        ) : caseRecord.evidence.map((ev) => <ProtectedCopyCard key={ev.id} ev={ev} />)}
        <ReleasePanel c={caseRecord} officerId={officerId} officerName={officerName} />
      </section>

      {allReleased && caseRecord.status !== 'closed' && <OfficerAssignmentPanel c={caseRecord} officerId={officerId} officerName={officerName} />}

      {caseRecord.originalAccessRequests.length > 0 && (
        <section>
          <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Sealed original access requests</h2>
          <div className="flex flex-col gap-4">
            {caseRecord.originalAccessRequests.map((req) => (
              <AccessRequestCard key={req.id} c={caseRecord} ev={caseRecord.evidence.find((e) => e.id === req.evidenceId)} req={req} officerId={officerId} officerName={officerName} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
