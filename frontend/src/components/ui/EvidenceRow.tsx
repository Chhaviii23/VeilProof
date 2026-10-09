import React from 'react';
import type { EvidenceItem } from '../../types';

interface EvidenceRowProps {
  item: EvidenceItem;
  onRemove?: () => void;
  showScan?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes === 0 || !bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function FileIcon({ type }: { type: string }) {
  if (type === 'application/pdf')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ember shrink-0">
        <rect x="2" y="1" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 7h10M5 10h10M5 13h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-info shrink-0">
        <rect x="1" y="1" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1 13l5-5 4.5 4.5 3-3L19 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (type === 'audio/mpeg')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-success shrink-0">
        <rect x="1" y="1" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 13V7l8-2v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="14" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  if (type === 'video/mp4')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-warning shrink-0">
        <rect x="1" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M15 8l4-2v8l-4-2V8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 8.5l5 3-5 3v-6z" fill="currentColor" opacity="0.5" />
      </svg>
    );
  if (type === 'link')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-2 shrink-0">
        <path d="M8.5 11.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1.07 1.07" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11.5 8.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L10.57 14.43" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-muted shrink-0">
      <rect x="2" y="1" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

const scanLabels: Record<EvidenceItem['scanState'], string> = {
  idle: '',
  scanning: 'Scanning…',
  found: 'Identity clues found',
  sanitized: 'Protected copy ready',
  unsupported: 'Unsupported format',
  failed: 'Scan failed',
  protected: 'Protected copy ready',
};

export function EvidenceRow({ item, onRemove, showScan }: EvidenceRowProps) {
  const isLink = item.type === 'link';
  const sizeStr = formatSize(item.size);
  const ext = isLink ? 'Link' : item.type.split('/')[1]?.toUpperCase();

  return (
    <div className="flex items-center gap-3 p-4 border border-rule rounded-[8px] bg-surface">
      <FileIcon type={item.type} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink-1 truncate">{isLink ? (item.linkTitle || item.name) : item.name}</p>
        {isLink ? (
          <p className="text-[12px] text-ink-muted truncate">{item.url}</p>
        ) : (
          <p className="text-[12px] text-ink-muted tabular-nums">
            {sizeStr && `${sizeStr} · `}{ext}
            {item.durationSecs !== undefined && ` · ${formatDuration(item.durationSecs)}`}
            {item.isDemo && ' · Demo'}
          </p>
        )}
        {showScan && item.scanState !== 'idle' && (
          <p className={`text-[12px] mt-0.5 ${
            item.scanState === 'sanitized' || item.scanState === 'protected' ? 'text-success' :
            item.scanState === 'found' ? 'text-warning' :
            item.scanState === 'unsupported' || item.scanState === 'failed' ? 'text-error' :
            'text-ink-muted'
          }`}>
            {scanLabels[item.scanState]}
          </p>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="shrink-0 text-ink-muted hover:text-error transition-colors p-1 rounded focus-visible:outline-2 focus-visible:outline-ink-1"
          aria-label={`Remove ${item.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
