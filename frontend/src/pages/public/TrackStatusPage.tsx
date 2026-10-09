import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useTrackComplaint } from '../../store/AppContext';
import { Button } from '../../components/ui/Button';
import type { InvestigationStatus, PublicUpdate } from '../../types';
import { INVESTIGATION_STATUS_LABELS } from '../../types';

const statusSteps: { status: InvestigationStatus; label: string }[] = [
  { status: 'received_securely', label: 'Received securely' },
  { status: 'under_investigation', label: 'Under investigation' },
  { status: 'resolution_prepared', label: 'Resolution prepared' },
  { status: 'closed', label: 'Closed' },
];

const statusOrder: Record<InvestigationStatus, number> = {
  received_securely: 0,
  privacy_review: 0,
  assigned_for_investigation: 1,
  under_investigation: 1,
  additional_review_required: 1,
  resolution_prepared: 2,
  closed: 3,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function PublicTimeline({ updates }: { updates: PublicUpdate[] }) {
  if (updates.length === 0) return null;
  const sorted = [...updates].sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  return (
    <div className="border border-rule rounded-[12px] bg-surface overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-rule bg-surface-2">
        <p className="text-[13px] font-medium text-ink-2">Status updates</p>
      </div>
      <ol className="divide-y divide-rule">
        {sorted.map((update) => (
          <li key={update.id} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-ink-1">
                {INVESTIGATION_STATUS_LABELS[update.status]}
              </span>
              <span className="text-[11px] text-ink-muted tabular-nums">{formatDateTime(update.addedAt)}</span>
            </div>
            <p className="text-[14px] text-ink-2 leading-relaxed">{update.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TrackStatusPage() {
  const { state, toast } = useApp();
  const [checked, setChecked] = useState(false);

  const receipt = state.receipt;
  const caseRef = receipt?.caseReference ?? '';
  const trackingSecret = receipt?.trackingSecret ?? '';

  const caseRecord = useTrackComplaint(caseRef, trackingSecret);

  if (!caseRecord || !receipt) {
    return (
      <main className="max-w-[560px] mx-auto px-5 md:px-8 py-12 pb-20 md:pb-12">
        <p className="text-[16px] text-ink-2">No active tracking session.</p>
        <Link to="/track" className="text-[14px] text-ember underline mt-4 block">
          Track a report
        </Link>
      </main>
    );
  }

  const currentOrder = statusOrder[caseRecord.status] ?? 0;

  function checkForUpdates() {
    setChecked(true);
    toast('info', 'Status is up to date.');
    setTimeout(() => setChecked(false), 3000);
  }

  return (
    <main className="max-w-[600px] mx-auto px-5 md:px-8 py-12 pb-20 md:pb-12">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-semibold text-ink-1">Report status</h1>
          <p className="text-[13px] font-mono text-ink-muted mt-1 tabular-nums">{caseRef}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={checkForUpdates} disabled={checked}>
          {checked ? 'Up to date' : 'Check for updates'}
        </Button>
      </div>

      <div className="mb-2 text-[12px] text-ink-muted tabular-nums">
        Received {formatDate(caseRecord.receivedAt)} · Last updated {formatDateTime(caseRecord.lastUpdated)}
      </div>

      <div className="border border-rule rounded-[12px] bg-surface overflow-hidden mb-6">
        <ol>
          {statusSteps.map((step, i) => {
            const isReached = (statusOrder[step.status] ?? 0) <= currentOrder;
            const isCurrent = statusOrder[step.status] === currentOrder;
            return (
              <li
                key={step.status}
                className={`flex gap-4 px-5 py-4 ${i < statusSteps.length - 1 ? 'border-b border-rule' : ''}`}
              >
                <div className="shrink-0 mt-0.5">
                  {isReached ? (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isCurrent ? 'bg-ember' : 'bg-success-bg'}`}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke={isCurrent ? 'white' : '#326047'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-rule bg-surface-2" />
                  )}
                </div>
                <p className={`text-[14px] font-medium ${isReached ? 'text-ink-1' : 'text-ink-muted'}`}>{step.label}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <PublicTimeline updates={caseRecord.publicUpdates} />

      <p className="text-[13px] text-ink-muted mb-6">
        Internal investigator notes are never shown here.
      </p>

      <Link
        to="/track"
        className="text-[13px] text-ink-muted hover:text-ink-1 underline transition-colors"
      >
        Clear tracking session
      </Link>
    </main>
  );
}
