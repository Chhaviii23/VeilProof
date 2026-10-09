import React, { useState } from 'react';
import type { SubmissionReceipt } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

interface ReceiptPanelProps {
  receipt: SubmissionReceipt;
  onRetryProof?: () => void;
  onTrack?: () => void;
  onFinish?: () => void;
  retryingProof?: boolean;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-start justify-between gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-ink-muted mb-0.5">{label}</p>
        <p className="text-[11px] font-mono text-ink-2 break-all leading-relaxed">{value}</p>
      </div>
      <button
        onClick={copy}
        className="text-[11px] text-ember hover:underline shrink-0 mt-4"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function ReceiptPanel({ receipt, onRetryProof, onTrack, onFinish, retryingProof }: ReceiptPanelProps) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    await navigator.clipboard.writeText(receipt.trackingSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadReceipt() {
    const data = JSON.stringify(receipt, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veilproof-receipt-${receipt.caseReference}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasBlockchain = receipt.proofStatus === 'confirmed' && receipt.proofTransactionRef;

  return (
    <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
      <div className="px-6 py-5 border-b border-rule bg-success-bg/50">
        <div className="flex items-center gap-2 mb-1">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-success shrink-0">
            <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.4" />
            <path d="M5 9l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="text-[20px] font-semibold text-ink-1">Demo report received</h2>
        </div>
        <p className="text-[14px] text-ink-2">Keep the information below in a safe place.</p>
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Case reference */}
        <div>
          <p className="text-[12px] font-medium text-ink-muted uppercase tracking-wide mb-1">Case reference</p>
          <p className="text-[20px] font-mono font-medium text-ink-1 tabular-nums">{receipt.caseReference}</p>
          <p className="text-[12px] text-ink-muted mt-0.5">The case reference alone does not grant access to your report.</p>
        </div>

        <div className="h-px bg-rule" />

        {/* Tracking secret */}
        <div>
          <p className="text-[12px] font-medium text-ink-muted uppercase tracking-wide mb-1">Private tracking secret</p>
          <div className="flex items-center gap-2">
            <p className="text-[18px] font-mono text-ink-1 tabular-nums flex-1 break-all">{receipt.trackingSecret}</p>
            <Button variant="secondary" size="sm" onClick={copySecret} className="shrink-0">
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-[12px] text-error mt-1 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            This secret cannot be recovered. Keep a secure copy.
          </p>
        </div>

        <div className="h-px bg-rule" />

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-ink-muted mb-0.5">Submitted</p>
            <p className="text-[13px] text-ink-1 tabular-nums">{formatDateTime(receipt.submittedAt)}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-muted mb-0.5">Attachments</p>
            <p className="text-[13px] text-ink-1 tabular-nums">{receipt.attachmentCount}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[12px] text-ink-muted mb-0.5">Proof status</p>
            <StatusBadge status={receipt.proofStatus} />
          </div>
        </div>

        {/* Blockchain proof section */}
        {hasBlockchain && (
          <>
            <div className="h-px bg-rule" />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ember shrink-0">
                  <rect x="1" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="9" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="5" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="5" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 3H3v3M9 3h2v3M5 11H3V8M9 11h2V8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <p className="text-[13px] font-semibold text-ink-1">Immutable proof record</p>
                <span className="text-[10px] font-medium text-ink-muted bg-surface-2 border border-rule rounded-full px-2 py-0.5">
                  {receipt.blockchainNetwork ?? 'Polygon Amoy Testnet'}
                </span>
              </div>
              <p className="text-[12px] text-ink-muted mb-3 leading-relaxed">
                A cryptographic commitment to your evidence set has been recorded on the Polygon Amoy testnet. This record is immutable and can be independently verified. Evidence is never stored on-chain — only a hash commitment.
              </p>
              <div className="bg-surface-2 rounded-[10px] border border-rule p-4 flex flex-col gap-3">
                <CopyField
                  label={`Transaction hash · ${receipt.blockchainNetwork ?? 'Polygon Amoy Testnet'}`}
                  value={receipt.proofTransactionRef!}
                />
                {receipt.contractAddress && (
                  <CopyField label="Contract address" value={receipt.contractAddress} />
                )}
                {receipt.evidenceCommitment && (
                  <CopyField label="Evidence commitment (SHA-3 hash)" value={receipt.evidenceCommitment} />
                )}
                {receipt.blockTimestamp && (
                  <div>
                    <p className="text-[11px] text-ink-muted mb-0.5">Block timestamp</p>
                    <p className="text-[12px] text-ink-2 tabular-nums">{formatDateTime(receipt.blockTimestamp)}</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-ink-muted italic mt-2">
                Demo simulation — all hashes and addresses are fictional. No real transaction has been submitted.
              </p>
            </div>
          </>
        )}

        <div className="h-px bg-rule" />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={downloadReceipt}>
            Save demo receipt
          </Button>
          {onTrack && (
            <Button variant="secondary" onClick={onTrack}>
              Track this report
            </Button>
          )}
          {receipt.proofStatus !== 'confirmed' && onRetryProof && (
            <Button variant="secondary" onClick={onRetryProof} loading={retryingProof}>
              Retry proof recording
            </Button>
          )}
        </div>

        {onFinish && (
          <button
            onClick={onFinish}
            className="text-[13px] text-ink-muted hover:text-ink-1 underline text-left transition-colors"
          >
            Finish and clear session
          </button>
        )}
      </div>
    </div>
  );
}
