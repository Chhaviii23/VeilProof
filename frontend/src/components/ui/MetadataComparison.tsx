import React from 'react';
import type { EvidenceItem, MetadataFinding } from '../../types';

interface MetadataComparisonProps {
  item: EvidenceItem;
}

const riskColors: Record<MetadataFinding['risk'], string> = {
  high: 'text-error',
  medium: 'text-warning',
  low: 'text-ink-2',
};

const riskLabels: Record<MetadataFinding['risk'], string> = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
};

export function MetadataComparison({ item }: MetadataComparisonProps) {
  if (item.findings.length === 0) return null;

  return (
    <div className="border border-rule rounded-[12px] overflow-hidden bg-surface">
      <div className="px-4 py-3 border-b border-rule bg-surface-2">
        <p className="text-[13px] font-medium text-ink-2 uppercase tracking-wide">Metadata findings</p>
      </div>
      <div className="divide-y divide-rule">
        {item.findings.map((finding, i) => (
          <div key={i} className="grid grid-cols-2 gap-4 p-4">
            <div>
              <p className="text-[12px] text-ink-muted mb-1">Original</p>
              <div className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`shrink-0 mt-0.5 ${riskColors[finding.risk]}`}>
                  <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M8 6.5v3M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="text-[13px] font-medium text-ink-1">{finding.field}</p>
                  <p className="text-[13px] text-ink-2 font-mono">{finding.value}</p>
                  <p className={`text-[11px] ${riskColors[finding.risk]}`}>{riskLabels[finding.risk]}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[12px] text-ink-muted mb-1">Sanitized copy</p>
              {item.scanState === 'sanitized' ? (
                <div className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-success">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <p className="text-[13px] font-medium text-success">Field removed</p>
                    <p className="text-[13px] text-ink-muted font-mono">[REDACTED]</p>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-ink-muted italic">Not yet processed</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
