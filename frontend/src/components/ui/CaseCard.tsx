import React from 'react';
import { Link } from 'react-router-dom';
import type { CaseRecord } from '../../types';
import { CATEGORY_LABELS, INVESTIGATION_STATUS_LABELS } from '../../types';
import { StatusBadge } from './StatusBadge';

interface CaseCardProps { caseRecord: CaseRecord; }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CaseCard({ caseRecord: c }: CaseCardProps) {
  const pendingRelease = c.evidence.filter((e) => e.protectedCopyStatus === 'pending_release').length;
  const pendingAccess = c.originalAccessRequests.filter((r) => r.status === 'privacy_review_pending' || r.status === 'oversight_review_pending').length;

  return (
    <Link to={`/investigator/cases/${c.id}`} className="block border border-rule rounded-[12px] bg-surface p-5 hover:bg-surface-hover transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-mono text-ink-muted tabular-nums">{c.reference}</p>
          <h3 className="text-[15px] font-semibold text-ink-1 mt-1 leading-snug">{c.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <StatusBadge status={c.status} />
            {c.priority === 'critical' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-error bg-error-bg border border-error/20 rounded-full px-1.5 py-0.5">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1L9 8H1L5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                Critical
              </span>
            )}
            <span className="text-[12px] text-ink-muted">{CATEGORY_LABELS[c.category]}</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-ink-muted mt-1">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-[12px] text-ink-muted mt-3 tabular-nums">
        Received {formatDate(c.receivedAt)}
        {pendingRelease > 0 && ` · ${pendingRelease} evidence pending release`}
        {pendingAccess > 0 && ` · ${pendingAccess} access request${pendingAccess > 1 ? 's' : ''} pending`}
      </p>
    </Link>
  );
}
