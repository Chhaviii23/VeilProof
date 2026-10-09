import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EvidenceRow } from '../../components/ui/EvidenceRow';
import { Button } from '../../components/ui/Button';
import { useDraft, useApp } from '../../store/AppContext';
import type { EvidenceItem } from '../../types';

const SUPPORTED_FILE_TYPES = [
  'application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
  'audio/mpeg', 'video/mp4',
];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getProcessingStages(type: string): string[] {
  if (type === 'application/pdf') return [
    'Inspecting document properties…',
    'Removing author and device fields…',
    'Creating protected document…',
  ];
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') return [
    'Inspecting location and device metadata…',
    'Removing identity-related metadata…',
    'Applying selected visual protection…',
    'Creating protected image…',
  ];
  if (type === 'audio/mpeg') return [
    'Inspecting audio metadata…',
    'Removing device and account fields…',
    'Creating protected audio…',
    'Generating protected transcript…',
  ];
  if (type === 'video/mp4') return [
    'Inspecting video metadata…',
    'Removing location and device fields…',
    'Applying face, number-plate and voice protection…',
    'Creating protected video…',
  ];
  if (type === 'link') return [
    'Validating link format…',
    'Removing tracking parameters…',
    'Creating safe reference record…',
  ];
  return ['Scanning…'];
}

function MetadataTag({ label, risk }: { label: string; risk: 'high' | 'medium' | 'low' }) {
  const color = risk === 'high' ? 'bg-error-bg text-error' : risk === 'medium' ? 'bg-warning-bg text-warning' : 'bg-surface-2 text-ink-muted';
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[4px] ${color}`}>{label} — removed</span>;
}

interface ProtectionSummaryProps {
  items: EvidenceItem[];
}

function ProtectionSummary({ items }: ProtectionSummaryProps) {
  const processed = items.filter((i) => i.scanState === 'sanitized' || i.scanState === 'protected');
  if (processed.length === 0) return null;

  const totalFields = processed.reduce((acc, i) => acc + i.findings.length, 0);
  const fileItems = processed.filter((i) => i.type !== 'link');
  const linkItems = processed.filter((i) => i.type === 'link');

  return (
    <div className="border border-success/30 rounded-[12px] bg-success-bg/30 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-success shrink-0">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-[14px] font-semibold text-success">Identity protection completed</p>
      </div>
      <ul className="flex flex-col gap-1 text-[13px] text-ink-2">
        <li>{processed.length} evidence item{processed.length > 1 ? 's' : ''} processed</li>
        {totalFields > 0 && <li>{totalFields} identity-related metadata field{totalFields > 1 ? 's' : ''} removed</li>}
        {fileItems.length > 0 && <li>{fileItems.length} encrypted original{fileItems.length > 1 ? 's' : ''} sealed in Controlled Evidence Vault</li>}
        {fileItems.length > 0 && <li>{fileItems.length} protected evidence record{fileItems.length > 1 ? 's' : ''} prepared</li>}
        {linkItems.length > 0 && <li>{linkItems.length} reference link{linkItems.length > 1 ? 's' : ''} validated and recorded</li>}
      </ul>
      {fileItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-success/20 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-success uppercase tracking-wide">Protected investigator copy</span>
            <span className="text-[11px] text-ink-muted">Available through the authorized investigation workflow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-ink-2 uppercase tracking-wide">Sealed original</span>
            <span className="text-[11px] text-ink-muted">Encrypted and restricted by independent approval</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PrivacyPage() {
  const { draft, updateEvidence, removeEvidence } = useDraft();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState<Set<string>>(new Set());
  const [unsupportedAcknowledged, setUnsupportedAcknowledged] = useState<Set<string>>(new Set());
  const [stageMsg, setStageMsg] = useState<Record<string, string>>({});

  const items = draft.evidence;
  const hasItems = items.length > 0;

  async function scanItem(item: EvidenceItem) {
    if (scanning.has(item.id)) return;
    const isLink = item.type === 'link';
    const isSupported = isLink || SUPPORTED_FILE_TYPES.includes(item.type);

    if (!isSupported) {
      updateEvidence(item.id, { scanState: 'unsupported' });
      return;
    }

    setScanning((s) => new Set([...s, item.id]));
    updateEvidence(item.id, { scanState: 'scanning' });

    const stages = getProcessingStages(item.type);
    for (const stage of stages) {
      setStageMsg((m) => ({ ...m, [item.id]: stage }));
      await delay(900);
    }
    setStageMsg((m) => { const n = { ...m }; delete n[item.id]; return n; });

    if (item.type === 'link') {
      updateEvidence(item.id, { scanState: 'protected' });
    } else if (item.isDemo && item.findings.length > 0) {
      updateEvidence(item.id, { scanState: 'found' });
    } else if (item.isDemo) {
      updateEvidence(item.id, { scanState: 'sanitized', sanitizedName: item.name.replace(/\.\w+$/, '_protected$&') });
    } else {
      const hasMeta = item.type.startsWith('image/') || item.type === 'application/pdf';
      updateEvidence(item.id, { scanState: hasMeta ? 'found' : 'sanitized', findings: [] });
    }

    setScanning((s) => { const n = new Set(s); n.delete(item.id); return n; });
  }

  async function protectItem(item: EvidenceItem) {
    setScanning((s) => new Set([...s, item.id]));
    updateEvidence(item.id, { scanState: 'scanning' });

    const stages = getProcessingStages(item.type);
    for (const stage of stages) {
      setStageMsg((m) => ({ ...m, [item.id]: stage }));
      await delay(700);
    }
    setStageMsg((m) => { const n = { ...m }; delete n[item.id]; return n; });
    updateEvidence(item.id, { scanState: 'sanitized', sanitizedName: item.name.replace(/\.\w+$/, '_protected$&') });
    setScanning((s) => { const n = new Set(s); n.delete(item.id); return n; });
  }

  useEffect(() => {
    for (const item of items) {
      if (item.scanState === 'idle') scanItem(item);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unsupportedBlocking = items.filter(
    (i) => i.scanState === 'unsupported' && !unsupportedAcknowledged.has(i.id)
  );
  const canContinue = unsupportedBlocking.length === 0 && !scanning.size;

  return (
    <main className="max-w-[720px] mx-auto px-5 md:px-8 py-8">
      <h1 className="text-[24px] font-semibold text-ink-1 mb-2">Identity protection</h1>
      <p className="text-[14px] text-ink-2 mb-2 leading-relaxed">
        VeilProof prepares protected evidence for investigation while the encrypted original remains inside the Controlled Evidence Vault.
      </p>

      <div className="p-4 bg-warning-bg border border-warning/30 rounded-[8px] mb-6">
        <p className="text-[13px] text-warning font-medium">Content inside files may still identify you.</p>
        <p className="text-[13px] text-ink-2 mt-0.5">
          Metadata removal reduces risk but does not sanitize visible content — names, faces, and distinctive phrases within files.
        </p>
      </div>

      {!hasItems && (
        <div className="border border-rule rounded-[12px] p-8 text-center mb-6">
          <p className="text-[15px] text-ink-2">No evidence attached.</p>
          <p className="text-[13px] text-ink-muted mt-1">You can continue without attachments.</p>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="mb-4 border border-rule rounded-[12px] overflow-hidden bg-surface">
          <div className="p-4 border-b border-rule">
            <EvidenceRow item={item} onRemove={() => removeEvidence(item.id)} showScan />
          </div>

          {item.scanState === 'scanning' && (
            <div className="p-4 flex items-center gap-2 text-ink-muted">
              <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[13px]">{stageMsg[item.id] ?? 'Processing…'}</span>
            </div>
          )}

          {item.scanState === 'found' && (
            <div className="p-4">
              <p className="text-[13px] font-medium text-ink-1 mb-2">Identity-linked metadata found</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {item.findings.map((f) => (
                  <MetadataTag key={f.field} label={f.field} risk={f.risk} />
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="primary" size="sm" onClick={() => protectItem(item)} loading={scanning.has(item.id)}>
                  Create protected copy
                </Button>
                <Button variant="danger" size="sm" onClick={() => removeEvidence(item.id)}>
                  Remove file
                </Button>
              </div>
            </div>
          )}

          {(item.scanState === 'sanitized' || item.scanState === 'protected') && (
            <div className="p-4">
              {item.findings.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.findings.map((f) => (
                    <MetadataTag key={f.field} label={f.field} risk={f.risk} />
                  ))}
                </div>
              )}
              <p className="text-[13px] text-success flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item.type === 'link' ? 'Safe reference record created.' : 'Protected copy created. Encrypted original sealed.'}
              </p>
            </div>
          )}

          {item.scanState === 'unsupported' && (
            <div className="p-4">
              <p className="text-[13px] text-error mb-3 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Unsupported file type — cannot be processed.
              </p>
              <div className="flex gap-3">
                <Button variant="danger" size="sm" onClick={() => removeEvidence(item.id)}>Remove file</Button>
                <Button variant="secondary" size="sm" onClick={() => setUnsupportedAcknowledged((s) => new Set([...s, item.id]))}>
                  Continue without scanning
                </Button>
              </div>
            </div>
          )}

          {item.scanState === 'failed' && (
            <div className="p-4">
              <p className="text-[13px] text-error mb-3">Processing failed. Try again or remove the file.</p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={() => { updateEvidence(item.id, { scanState: 'idle' }); scanItem(item); }}>
                  Retry
                </Button>
                <Button variant="danger" size="sm" onClick={() => removeEvidence(item.id)}>Remove file</Button>
              </div>
            </div>
          )}
        </div>
      ))}

      <ProtectionSummary items={items} />

      <div className="flex justify-between pt-2">
        <Button variant="secondary" onClick={() => navigate('/report/evidence')}>
          Back
        </Button>
        <Button variant="primary" size="lg" onClick={() => navigate('/report/review')} disabled={!canContinue}>
          Continue with protected evidence
        </Button>
      </div>
    </main>
  );
}
