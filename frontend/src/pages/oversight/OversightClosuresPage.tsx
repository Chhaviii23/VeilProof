import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { useCases, useInvestigator, useApp } from '../../store/AppContext';
import type { CaseRecord } from '../../types';
import { INVESTIGATION_STATUS_LABELS } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ClosureCard({ caseRecord, officerId, officerName }: { caseRecord: CaseRecord; officerId: string; officerName: string; }) {
  const { dispatch, toast } = useApp();
  const rec = caseRecord.closureRecommendation!;
  const [returnReason, setReturnReason] = useState('');
  const [loading, setLoading] = useState<'approve' | 'return' | null>(null);

  async function approve() {
    setLoading('approve');
    await new Promise((r) => setTimeout(r, 400));
    dispatch({ type: 'OVERSIGHT_CLOSURE_DECISION', payload: { caseId: caseRecord.id, decision: 'approved', officerId, officerName } });
    toast('success', `Case ${caseRecord.reference} closed.`);
    setLoading(null);
  }

  async function returnToInvestigator() {
    if (!returnReason.trim()) { toast('error', 'Please provide a reason for returning.'); return; }
    setLoading('return');
    await new Promise((r) => setTimeout(r, 400));
    dispatch({ type: 'OVERSIGHT_CLOSURE_DECISION', payload: { caseId: caseRecord.id, decision: 'returned', officerId, officerName, returnReason: returnReason.trim() } });
    toast('info', 'Closure recommendation returned to investigator.');
    setLoading(null);
  }

  return (
    <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
      <div className="px-5 py-4 bg-surface-2 border-b border-rule">
        <p className="text-[11px] font-mono text-ink-muted">{caseRecord.reference}</p>
        <p className="text-[15px] font-medium text-ink-1">{caseRecord.title}</p>
        <p className="text-[12px] text-ink-muted mt-0.5">Recommended by {rec.recommendedByName} · {formatDate(rec.recommendedAt)}</p>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div><p className="text-ink-muted mb-0.5">Current status</p><p className="text-ink-1 font-medium">{INVESTIGATION_STATUS_LABELS[caseRecord.status]}</p></div>
          <div><p className="text-ink-muted mb-0.5">Category</p><p className="text-ink-1 font-medium">{caseRecord.category.replace(/_/g, ' ')}</p></div>
          <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Recommended outcome</p><p className="text-ink-1">{rec.outcome}</p></div>
          <div className="md:col-span-2"><p className="text-ink-muted mb-0.5">Reporter message</p><p className="text-ink-1 bg-surface-2 rounded-[6px] px-3 py-2 border border-rule text-[13px]">{rec.reporterMessage}</p></div>
        </div>
        <div className="border-t border-rule pt-4">
          <p className="text-[13px] font-medium text-ink-1 mb-3">Your decision</p>
          <Button variant="primary" size="sm" onClick={approve} loading={loading === 'approve'} disabled={loading === 'return'}>Approve closure</Button>
          <div className="mt-4">
            <p className="text-[13px] text-ink-muted mb-2">Or return to investigator:</p>
            <textarea className="w-full border border-rule rounded-[8px] bg-canvas px-3 py-2 text-[13px] text-ink-1 placeholder:text-ink-muted resize-none focus:outline-2 focus:outline-offset-2 focus:outline-ink-1 h-16" placeholder="Reason for returning (required)" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            <Button variant="secondary" size="sm" onClick={returnToInvestigator} loading={loading === 'return'} disabled={loading === 'approve'} className="mt-2">Return to investigator</Button>
          </div>
        </div>
      </div>
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

export function OversightClosuresPage() {
  const allCases = useCases();
  const { session } = useInvestigator();

  const pending = useMemo(() => allCases.filter((c) => c.closureRecommendation?.status === 'pending_oversight'), [allCases]);
  const resolved = useMemo(() => allCases.filter((c) => c.closureRecommendation?.status === 'approved' || c.closureRecommendation?.status === 'returned').sort((a, b) => (b.closureRecommendation?.decidedAt ?? '').localeCompare(a.closureRecommendation?.decidedAt ?? '')), [allCases]);

  const officerId = session?.investigator.id ?? '';
  const officerName = session?.investigator.name ?? '';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[26px] font-semibold text-ink-1">Closure recommendations</h1>
        {session && <p className="text-[13px] text-ink-muted mt-1">{session.investigator.name} · Oversight & Whistleblower Protection Officer</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SummaryTile label="Awaiting your decision" value={pending.length} accent={pending.length > 0 ? 'text-warning' : undefined} />
        <SummaryTile label="Resolved closures" value={resolved.length} />
      </div>
      <section>
        <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Pending closures</h2>
        {pending.length === 0 ? (
          <div className="border border-rule rounded-[10px] bg-surface p-6 text-center"><p className="text-[14px] text-ink-muted">No closure recommendations pending.</p></div>
        ) : (
          <div className="flex flex-col gap-4">{pending.map((c) => <ClosureCard key={c.id} caseRecord={c} officerId={officerId} officerName={officerName} />)}</div>
        )}
      </section>
      {resolved.length > 0 && (
        <section>
          <h2 className="text-[16px] font-semibold text-ink-1 mb-3">Resolved closures</h2>
          <div className="flex flex-col gap-2">
            {resolved.map((c) => {
              const rec = c.closureRecommendation!;
              return (
                <div key={c.id} className="border border-rule rounded-[10px] bg-surface p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-ink-muted">{c.reference}</p>
                    <p className="text-[13px] font-medium text-ink-1 truncate">{c.title}</p>
                    <p className="text-[12px] text-ink-muted">Decision: {rec.status} · {rec.decidedAt ? formatDate(rec.decidedAt) : '—'}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${rec.status === 'approved' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{rec.status === 'approved' ? 'Closed' : 'Returned'}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
