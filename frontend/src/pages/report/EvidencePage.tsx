import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/FormField';
import { useDraft, useApp } from '../../store/AppContext';
import { DEMO_EVIDENCE_ITEMS, DEMO_EXAMPLE_REPORT } from '../../services/fixtures';
import type { EvidenceItem } from '../../types';

function makeId() {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Evidence type definitions ────────────────────────────────────────────────

interface EvidenceTypeConfig {
  key: 'pdf' | 'image' | 'audio' | 'video' | 'link';
  label: string;
  description: string;
  accepts: string[];
  mimeTypes: string[];
  maxBytes: number;
  icon: React.ReactNode;
  demoItemId: string;
}

const EvidenceTypes: EvidenceTypeConfig[] = [
  {
    key: 'pdf',
    label: 'Document',
    description: 'PDF document, up to 15 MB',
    accepts: ['.pdf'],
    mimeTypes: ['application/pdf'],
    maxBytes: 15 * 1024 * 1024,
    demoItemId: 'demo-ev-pdf',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ember">
        <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'image',
    label: 'Photograph',
    description: 'JPG or PNG image, up to 10 MB',
    accepts: ['.jpg', '.jpeg', '.png'],
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxBytes: 10 * 1024 * 1024,
    demoItemId: 'demo-ev-img',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-info">
        <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="7" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 14l4-4 3 3 2-2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'audio',
    label: 'Audio recording',
    description: 'MP3 audio file, up to 25 MB',
    accepts: ['.mp3'],
    mimeTypes: ['audio/mpeg'],
    maxBytes: 25 * 1024 * 1024,
    demoItemId: 'demo-ev-audio',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-success">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 8v4M9.5 6v8M12 8v4M14.5 9v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'video',
    label: 'Video',
    description: 'MP4 video file, up to 100 MB',
    accepts: ['.mp4'],
    mimeTypes: ['video/mp4'],
    maxBytes: 100 * 1024 * 1024,
    demoItemId: 'demo-ev-video',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-warning">
        <rect x="2" y="5" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M14 8l4-2v8l-4-2V8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'link',
    label: 'Reference link',
    description: 'HTTPS URL reference only — not downloaded',
    accepts: [],
    mimeTypes: ['link'],
    maxBytes: 0,
    demoItemId: 'demo-ev-link',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-2">
        <path d="M8 12l-2 2a3 3 0 000-4.243l2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8l2-2a3 3 0 010 4.243l-2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 11l2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

function getTypeKey(mimeType: string): EvidenceTypeConfig['key'] | null {
  for (const t of EvidenceTypes) {
    if (t.mimeTypes.includes(mimeType)) return t.key;
  }
  return null;
}

function getItemForType(evidence: EvidenceItem[], key: EvidenceTypeConfig['key']): EvidenceItem | undefined {
  const config = EvidenceTypes.find((t) => t.key === key)!;
  return evidence.find((e) => config.mimeTypes.includes(e.type));
}

// ─── Link form ────────────────────────────────────────────────────────────────

function LinkForm({ onAdd, onCancel }: { onAdd: (item: EvidenceItem) => void; onCancel: () => void }) {
  const [url, setUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkProof, setLinkProof] = useState('');
  const [linkDateAccessed, setLinkDateAccessed] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!url.trim().startsWith('https://')) { setError('Only HTTPS URLs are accepted.'); return; }
    if (!linkTitle.trim()) { setError('Please provide a short title for this link.'); return; }
    onAdd({
      id: makeId(),
      name: linkTitle.trim(),
      size: 0,
      type: 'link',
      scanState: 'idle',
      findings: [],
      url: url.trim(),
      linkTitle: linkTitle.trim(),
      linkProof: linkProof.trim(),
      linkDateAccessed: linkDateAccessed.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-3">
      <TextInput label="HTTPS URL" value={url} onChange={setUrl} placeholder="https://gov.example/document" required />
      <TextInput label="Short title" value={linkTitle} onChange={setLinkTitle} placeholder="e.g. Government Tender Notice" required />
      <TextInput label="What this link shows (optional)" type="textarea" value={linkProof} onChange={setLinkProof} placeholder="Briefly describe the relevance" rows={2} />
      <TextInput label="Date accessed (optional)" value={linkDateAccessed} onChange={setLinkDateAccessed} placeholder="e.g. 2026-04-14" />
      {error && <p className="text-[13px] text-error">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">Add link</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Single evidence card ─────────────────────────────────────────────────────

interface EvidenceCardProps {
  config: EvidenceTypeConfig;
  item: EvidenceItem | undefined;
  onAdd: (item: EvidenceItem) => void;
  onRemove: () => void;
  onUpdate: (id: string, patch: Partial<EvidenceItem>) => void;
}

function EvidenceCard({ config, item, onAdd, onRemove, onUpdate }: EvidenceCardProps) {
  const { toast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const demoItem = DEMO_EVIDENCE_ITEMS.find((d) => d.id === config.demoItemId);
  const hasItem = Boolean(item);

  function handleFile(file: File) {
    if (!config.mimeTypes.includes(file.type)) {
      toast('error', `${file.name}: unsupported type for ${config.label}.`);
      return;
    }
    if (file.size > config.maxBytes) {
      toast('error', `${file.name}: exceeds ${formatSize(config.maxBytes)} limit.`);
      return;
    }
    onAdd({
      id: makeId(),
      name: file.name,
      size: file.size,
      type: file.type,
      scanState: 'idle',
      findings: [],
      // Retain the local File so the reporter adapter can protect/encrypt it. In-memory only.
      file,
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (hasItem) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function loadDemo() {
    if (!demoItem) return;
    onAdd({ ...demoItem, scanState: 'idle' });
  }

  if (hasItem && item) {
    return (
      <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-rule bg-surface-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {config.icon}
            <div>
              <p className="text-[13px] font-semibold text-ink-1">{config.label}</p>
              <span className="text-[11px] font-medium text-success bg-success-bg px-1.5 py-0.5 rounded-full">1 of 1 added</span>
            </div>
          </div>
          <button type="button" onClick={onRemove} className="text-[12px] text-ink-muted hover:text-error transition-colors" title="Remove">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-ink-1 truncate">{item.name}</p>
            <div className="flex flex-wrap gap-2 mt-0.5 text-[11px] text-ink-muted">
              <span>{item.type === 'link' ? 'Reference link' : item.type}</span>
              {item.size > 0 && <span>{formatSize(item.size)}</span>}
              {item.isDemo && <span className="text-ember">Demo file</span>}
            </div>
            {item.url && <p className="text-[11px] text-ink-muted truncate mt-0.5">{item.url}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onRemove();
                if (config.key === 'link') setShowLinkForm(true);
                else fileInputRef.current?.click();
              }}
              className="text-[12px] text-ink-muted hover:text-ember border border-rule rounded-[6px] px-2.5 py-1 bg-canvas hover:border-ember transition-colors"
            >
              Replace
            </button>
          </div>
        </div>

        {/* Audio speaker toggle */}
        {config.key === 'audio' && (
          <div className="px-4 pb-3 border-t border-rule pt-3">
            <p className="text-[12px] font-semibold text-ink-1 mb-2">🎙️ Your voice in this recording</p>
            <p className="text-[11px] text-ink-muted mb-2 leading-relaxed">
              We will only anonymize your voice — the other speaker stays unchanged as evidence.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdate(item.id, { whistleblowerIsLouder: true })}
                className={`flex-1 text-[12px] font-medium rounded-[8px] px-3 py-2 border transition-colors ${
                  item.whistleblowerIsLouder !== false
                    ? 'bg-ember-soft border-ember text-ember'
                    : 'bg-canvas border-rule text-ink-2 hover:border-ember hover:text-ember'
                }`}
              >
                🔊 Louder speaker (closer to mic)
              </button>
              <button
                type="button"
                onClick={() => onUpdate(item.id, { whistleblowerIsLouder: false })}
                className={`flex-1 text-[12px] font-medium rounded-[8px] px-3 py-2 border transition-colors ${
                  item.whistleblowerIsLouder === false
                    ? 'bg-ember-soft border-ember text-ember'
                    : 'bg-canvas border-rule text-ink-2 hover:border-ember hover:text-ember'
                }`}
              >
                🔉 Quieter speaker (farther away)
              </button>
            </div>
          </div>
        )}

        {config.key !== 'link' && (
          <input
            ref={fileInputRef}
            type="file"
            accept={config.accepts.join(',')}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onRemove();
                handleFile(e.target.files[0]);
              }
              e.target.value = '';
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-rule bg-surface-2 flex items-center gap-2">
        {config.icon}
        <div>
          <p className="text-[13px] font-semibold text-ink-1">{config.label}</p>
          <p className="text-[11px] text-ink-muted">{config.description}</p>
        </div>
      </div>

      <div className="p-4">
        {config.key === 'link' ? (
          showLinkForm ? (
            <LinkForm onAdd={(linkItem) => { onAdd(linkItem); setShowLinkForm(false); }} onCancel={() => setShowLinkForm(false)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowLinkForm(true)}
                className="text-[13px] font-medium text-ember border border-ember/30 bg-ember-soft rounded-[8px] px-3 py-2 hover:bg-ember/15 transition-colors"
              >
                Add reference link
              </button>
              {demoItem && (
                <button
                  type="button"
                  onClick={loadDemo}
                  className="text-[12px] text-ink-2 border border-rule rounded-[8px] px-3 py-2 bg-canvas hover:border-ink-muted transition-colors"
                >
                  Use demo link
                </button>
              )}
            </div>
          )
        ) : (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              className="border-2 border-dashed border-rule hover:border-rule-strong rounded-[8px] p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors mb-3"
            >
              <p className="text-[13px] text-ink-2">Drop file or <span className="text-ember underline">choose file</span></p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[13px] font-medium text-ember border border-ember/30 bg-ember-soft rounded-[8px] px-3 py-2 hover:bg-ember/15 transition-colors"
              >
                Upload {config.label.toLowerCase()}
              </button>
              {demoItem && (
                <button
                  type="button"
                  onClick={loadDemo}
                  className="text-[12px] text-ink-2 border border-rule rounded-[8px] px-3 py-2 bg-canvas hover:border-ink-muted transition-colors"
                >
                  Use demo file
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={config.accepts.join(',')}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EvidencePage() {
  const { draft, addEvidence, removeEvidence, updateEvidence, updateDraft } = useDraft();
  const navigate = useNavigate();

  function getItem(key: EvidenceTypeConfig['key']): EvidenceItem | undefined {
    return getItemForType(draft.evidence, key);
  }

  function handleAdd(item: EvidenceItem) {
    const key = getTypeKey(item.type);
    if (key) {
      const existing = getItem(key);
      if (existing) removeEvidence(existing.id);
    }
    addEvidence(item);
  }

  function handleRemove(key: EvidenceTypeConfig['key']) {
    const existing = getItem(key);
    if (existing) removeEvidence(existing.id);
  }

  function loadAllDemo() {
    const videoItem = DEMO_EVIDENCE_ITEMS.find((d) => d.id === 'demo-ev-video');
    const linkItem = DEMO_EVIDENCE_ITEMS.find((d) => d.id === 'demo-ev-link');
    if (videoItem && !getItem('video')) addEvidence({ ...videoItem, scanState: 'idle' });
    if (linkItem && !getItem('link')) addEvidence({ ...linkItem, scanState: 'idle' });
    if (!draft.title.trim()) {
      updateDraft({
        title: DEMO_EXAMPLE_REPORT.title,
        category: DEMO_EXAMPLE_REPORT.category,
        description: DEMO_EXAMPLE_REPORT.description,
        incidentDate: DEMO_EXAMPLE_REPORT.incidentDate,
        location: DEMO_EXAMPLE_REPORT.location,
        involvedParties: DEMO_EXAMPLE_REPORT.involvedParties,
      });
    }
  }

  const totalAdded = EvidenceTypes.filter((t) => getItem(t.key)).length;
  const allAdded = totalAdded === EvidenceTypes.length;

  return (
    <main className="max-w-[720px] mx-auto px-5 md:px-8 py-8 pb-24 md:pb-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[24px] font-semibold text-ink-1">Attach evidence</h1>
          <p className="text-[14px] text-ink-2 mt-1 leading-relaxed">One item per evidence type. Maximum five items total.</p>
        </div>
        <button
          type="button"
          onClick={loadAllDemo}
          className="shrink-0 text-[12px] text-ink-2 border border-rule rounded-[8px] px-3 py-2 bg-canvas hover:border-ember hover:text-ember transition-colors"
        >
          Preload video + link
        </button>
      </div>

      {/* Evidence summary */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-surface border border-rule rounded-[10px]">
        <div className="text-[14px] font-medium text-ink-1 tabular-nums">
          Evidence added: <span className={allAdded ? 'text-success' : 'text-ember'}>{totalAdded} of 5</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {EvidenceTypes.map((t) => {
            const has = Boolean(getItem(t.key));
            return (
              <span key={t.key} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${has ? 'bg-success-bg text-success border-success/20' : 'bg-canvas text-ink-muted border-rule'}`}>
                {has ? '✓ ' : ''}{t.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {EvidenceTypes.map((config) => (
          <EvidenceCard
            key={config.key}
            config={config}
            item={getItem(config.key)}
            onAdd={handleAdd}
            onRemove={() => handleRemove(config.key)}
            onUpdate={updateEvidence}
          />
        ))}
      </div>

      <div className="flex gap-3 flex-wrap pt-2">
        <Button variant="secondary" onClick={() => navigate('/report/risk')}>
          Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/report/identity-protection')}
        >
          {totalAdded > 0 ? 'Scan Evidence for Identity Clues' : 'Continue without evidence'}
        </Button>
      </div>
    </main>
  );
}
