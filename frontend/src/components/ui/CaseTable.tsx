import React from 'react';
import { Link } from 'react-router-dom';
import type { CaseRecord } from '../../types';
import { CATEGORY_LABELS } from '../../types';
import { StatusBadge } from './StatusBadge';

interface CaseTableProps {
  cases: CaseRecord[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CaseTable({ cases }: CaseTableProps) {
  return (
    <div className="border border-rule rounded-[12px] overflow-hidden bg-surface">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-rule bg-surface-2">
            <th className="px-4 py-3 text-[12px] font-medium text-ink-2">Reference</th>
            <th className="px-4 py-3 text-[12px] font-medium text-ink-2">Title</th>
            <th className="px-4 py-3 text-[12px] font-medium text-ink-2">Category</th>
            <th className="px-4 py-3 text-[12px] font-medium text-ink-2">Received</th>
            <th className="px-4 py-3 text-[12px] font-medium text-ink-2">Status</th>
            <th className="px-4 py-3 text-[12px] font-medium text-ink-2 sr-only">View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3 text-[13px] font-mono text-ink-muted tabular-nums whitespace-nowrap">{c.reference}</td>
              <td className="px-4 py-3">
                <Link
                  to={`/investigator/cases/${c.id}`}
                  className="text-[14px] font-medium text-ink-1 hover:text-ember transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  {c.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-[13px] text-ink-2 whitespace-nowrap">{CATEGORY_LABELS[c.category]}</td>
              <td className="px-4 py-3 text-[13px] text-ink-muted tabular-nums whitespace-nowrap">{formatDate(c.receivedAt)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/investigator/cases/${c.id}`}
                  className="text-[13px] text-ember hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
