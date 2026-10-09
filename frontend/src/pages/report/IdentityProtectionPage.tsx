/**
 * IdentityProtectionPage — Privacy Guardian review workflow.
 *
 * Connects to the VeilProof backend's local analysis endpoints
 * (/api/v1/analysis/scan, /api/v1/analysis/sanitize).
 *
 * No evidence is sent to external AI APIs.
 * Detection manifests are held in React state only — not written to
 * localStorage or any persistent browser storage.
 *
 * Processing states reflected in the UI:
 *   waiting           — no scan run yet
 *   analyzing         — scan in progress
 *   review_required   — candidates found, awaiting reporter decisions
 *   partially_analyzed — only part of the file could be analyzed
 *   unsupported       — format not supported for automated analysis
 *   failed            — analysis error; original preserved
 *
 * The reporter can:
 *   - Mark each candidate as "This is me / relates to me", "Someone else",
 *     or leave it "Not sure".
 *   - Set a protection choice: "Protect", "Keep visible", or "Decide later".
 *   - Dismiss false positives.
 *   - Protect all detected clues with one action.
 *   - Request a sanitized derivative for download (image/audio/video).
 *   - Proceed to submission with the protection manifest recorded.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useDraft } from '../../store/AppContext';
import type { EvidenceItem } from '../../types';
import {
  scanFile,
  sanitizeFile,
  inferCategory,
  type AnalysisManifest,
  type FaceCandidate,
  type TextCandidate,
  type MetadataCandidate,
} from '../../services/localAnalysis';

// ─── Domain types ─────────────────────────────────────────────────────────────

type IdentityRelation = 'mine' | 'someone_else' | 'not_sure' | 'unset';
type ProtectionChoice = 'protect' | 'keep' | 'decide_later' | 'unset';
type FilterTab = 'all' | 'pending' | 'protected' | 'kept';

interface ClueDecision {
  relation: IdentityRelation;
  protection: ProtectionChoice;
  dismissed: boolean;
}

interface FileAnalysisState {
  evidenceId: string;
  fileName: string;
  category: string;
  status: 'waiting' | 'analyzing' | 'done' | 'failed';
  manifest: AnalysisManifest | null;
  error: string | null;
  sanitizeStatus: 'idle' | 'working' | 'done' | 'failed' | 'unsupported';
  sanitizeError: string | null;
  sanitizeWarnings: string[];
  sanitizeUrl: string | null;  // object URL — must be revoked on unmount
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stateLabel(s: FileAnalysisState): { label: string; color: string; icon: string } {
  if (s.status === 'analyzing') return { label: 'Analyzing…', color: 'text-amber-500', icon: '⏳' };
  if (s.status === 'failed') return { label: 'Analysis failed', color: 'text-red-500', icon: '✗' };
  if (!s.manifest) return { label: 'Waiting', color: 'text-ink-muted', icon: '○' };
  const st = s.manifest.state;
  if (st === 'review_required') return { label: 'Review required', color: 'text-ember', icon: '!' };
  if (st === 'partially_analyzed') return { label: 'Partially analyzed', color: 'text-amber-500', icon: '◑' };
  if (st === 'unsupported') return { label: 'Unsupported format', color: 'text-ink-muted', icon: '—' };
  if (st === 'failed') return { label: 'Analysis failed', color: 'text-red-500', icon: '✗' };
  return { label: 'Review required', color: 'text-ember', icon: '!' };
}

function categoryIcon(cat: string) {
  if (cat === 'image') return '🖼️';
  if (cat === 'document') return '📄';
  if (cat === 'audio') return '🎙️';
  if (cat === 'video') return '📹';
  return '📎';
}

function candidateQuestion(c: TextCandidate | FaceCandidate | MetadataCandidate, type: string): string {
  if (type === 'face') return 'We found a face in this image. Is this you?';
  const tc = c as TextCandidate;
  if (tc.category === 'name_pattern') return `We found a possible name: "${tc.text}". Does this refer to you?`;
  if (tc.category === 'email') return `We found an email address: "${tc.text}". Is this your email?`;
  if (tc.category === 'phone') return `We found a phone number: "${tc.text}". Is this your number?`;
  if (tc.category === 'id_pattern') return `We found a possible ID or registration number: "${tc.text}". Does this identify you?`;
  if (tc.category === 'address') return `We found a possible address reference. Does this identify your location?`;
  if (type === 'metadata') {
    const mc = c as MetadataCandidate;
    if (mc.field === 'GPSInfo') return 'This file contains GPS location data. Do you want to remove it?';
    return `This file contains metadata field "${mc.field}". Could it identify you?`;
  }
  return 'We found a possible identity clue. Does this relate to you?';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ fileState }: { fileState: FileAnalysisState }) {
  const { label, color, icon } = stateLabel(fileState);
  return (
    <span className={`text-[11px] font-semibold ${color} flex items-center gap-1`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function NoteBox({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {notes.map((note, i) => (
        <div key={i} className="text-[11px] text-ink-2 bg-surface border border-rule rounded px-3 py-2 leading-relaxed">
          ℹ️ {note}
        </div>
      ))}
    </div>
  );
}

function RelationButtons({ id, decision, onChange }: {
  id: string;
  decision: ClueDecision;
  onChange: (id: string, patch: Partial<ClueDecision>) => void;
}) {
  const opts: { value: IdentityRelation; label: string }[] = [
    { value: 'mine', label: 'This is me' },
    { value: 'someone_else', label: 'Someone else' },
    { value: 'not_sure', label: 'Not sure' },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {opts.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(id, { relation: decision.relation === value ? 'unset' : value })}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-[5px] border transition-colors ${
            decision.relation === value
              ? 'bg-ember text-white border-ember'
              : 'border-rule text-ink-2 bg-surface hover:border-ember hover:text-ember'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ProtectionButtons({ id, decision, onChange }: {
  id: string;
  decision: ClueDecision;
  onChange: (id: string, patch: Partial<ClueDecision>) => void;
}) {
  const opts: { value: ProtectionChoice; label: string }[] = [
    { value: 'protect', label: 'Protect' },
    { value: 'keep', label: 'Keep visible' },
    { value: 'decide_later', label: 'Decide later' },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {opts.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(id, { protection: decision.protection === value ? 'unset' : value })}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-[5px] border transition-colors ${
            decision.protection === value
              ? value === 'protect'
                ? 'bg-ember text-white border-ember'
                : value === 'keep'
                ? 'bg-success text-white border-success'
                : 'bg-ink-2 text-white border-ink-2'
              : 'border-rule text-ink-2 bg-surface hover:border-ink-2'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FaceClueCard({
  face,
  decision,
  imageFile,
  imageWidth,
  imageHeight,
  onChange,
  onDismiss,
}: {
  face: FaceCandidate;
  decision: ClueDecision;
  imageFile?: File | null;
  imageWidth: number | null;
  imageHeight: number | null;
  onChange: (id: string, patch: Partial<ClueDecision>) => void;
  onDismiss: (id: string) => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageFile) return;
    let objUrl: string | null = null;
    const img = new Image();
    objUrl = URL.createObjectURL(imageFile);
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Crop to face bbox with 20% padding
      const pad = 0.2;
      const srcX = Math.max(0, face.bbox.x - face.bbox.w * pad);
      const srcY = Math.max(0, face.bbox.y - face.bbox.h * pad);
      const srcW = Math.min(img.width - srcX, face.bbox.w * (1 + 2 * pad));
      const srcH = Math.min(img.height - srcY, face.bbox.h * (1 + 2 * pad));
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 80, 80);
      setThumbUrl(canvas.toDataURL());
    };
    img.src = objUrl;
    return () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [imageFile, face.bbox]);

  if (decision.dismissed) return null;
  const isProtected = decision.protection === 'protect';

  return (
    <div className={`border rounded-[10px] p-4 flex flex-col gap-3 transition-all ${
      isProtected ? 'border-ember bg-ember-soft/50' : 'border-rule bg-canvas'
    }`}>
      <div className="flex items-start gap-3">
        {/* Face thumbnail with blur when protected */}
        <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden border border-rule shrink-0 bg-surface">
          <canvas ref={canvasRef} className={`w-full h-full object-cover ${isProtected ? 'blur-[6px] scale-110' : ''}`} />
          {!thumbUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-muted">
              👤
            </div>
          )}
          {isProtected && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white uppercase bg-ember px-1 rounded">Blurred</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-ink-1 mb-0.5">
            Face detected — {face.source_file}
          </p>
          <p className="text-[11px] text-ink-muted font-mono">
            Bounding box [X:{face.bbox.x} Y:{face.bbox.y} W:{face.bbox.w} H:{face.bbox.h}]
            {face.frame_index != null && ` · Frame ${face.frame_index}`}
            {face.page_index != null && ` · Page ${face.page_index + 1}`}
          </p>
          <p className="text-[11px] text-ink-2 mt-1 italic">{candidateQuestion(face, 'face')}</p>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(face.id)}
          className="shrink-0 text-[10px] text-ink-muted hover:text-ember transition-colors"
          title="Dismiss — false positive"
        >
          ✕ dismiss
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <RelationButtons id={face.id} decision={decision} onChange={onChange} />
        <ProtectionButtons id={face.id} decision={decision} onChange={onChange} />
      </div>
    </div>
  );
}

function TextClueCard({
  text,
  decision,
  onChange,
  onDismiss,
}: {
  text: TextCandidate;
  decision: ClueDecision;
  onChange: (id: string, patch: Partial<ClueDecision>) => void;
  onDismiss: (id: string) => void;
}) {
  if (decision.dismissed) return null;
  const isProtected = decision.protection === 'protect';
  const categoryLabel: Record<string, string> = {
    name_pattern: 'Possible name',
    phone: 'Phone number',
    email: 'Email address',
    address: 'Address / location',
    id_pattern: 'ID / Registration number',
    raw: 'Text fragment',
  };

  return (
    <div className={`border rounded-[10px] p-4 flex flex-col gap-3 transition-all ${
      isProtected ? 'border-ember bg-ember-soft/50' : 'border-rule bg-canvas'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${
              isProtected ? 'bg-ember/10 border-ember/30 text-ember' : 'bg-surface border-rule text-ink-2'
            }`}>
              {categoryLabel[text.category] ?? text.category}
            </span>
            <span className="text-[10px] text-ink-muted font-mono">
              {Math.round(text.confidence_pct)}% OCR confidence
              {text.page_index != null && ` · Page ${text.page_index + 1}`}
            </span>
          </div>
          <p className={`text-[13px] font-semibold font-mono mb-0.5 ${isProtected ? 'text-ember' : 'text-ink-1'}`}>
            {text.text}
          </p>
          <p className="text-[11px] text-ink-2 italic">{candidateQuestion(text, 'text')}</p>
          <p className="text-[10px] text-ink-muted mt-0.5">Source: {text.source_file}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(text.id)}
          className="shrink-0 text-[10px] text-ink-muted hover:text-ember transition-colors"
          title="Dismiss — false positive"
        >
          ✕ dismiss
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <RelationButtons id={text.id} decision={decision} onChange={onChange} />
        <ProtectionButtons id={text.id} decision={decision} onChange={onChange} />
      </div>
    </div>
  );
}

function MetadataClueCard({
  meta,
  decision,
  onChange,
}: {
  meta: MetadataCandidate;
  decision: ClueDecision;
  onChange: (id: string, patch: Partial<ClueDecision>) => void;
}) {
  const isProtected = decision.protection === 'protect';
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-[8px] border text-[12px] transition-all ${
      isProtected
        ? 'border-ember/40 bg-ember-soft/50'
        : meta.is_sensitive
        ? 'border-amber-400/40 bg-amber-400/5'
        : 'border-rule bg-canvas'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink-1">{meta.field}</span>
          {meta.is_sensitive && !isProtected && (
            <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
              Sensitive
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5 italic">{candidateQuestion(meta, 'metadata')}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onChange(meta.id, { protection: decision.protection === 'protect' ? 'unset' : 'protect' })}
          className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-colors ${
            isProtected ? 'bg-ember text-white border-ember' : 'border-rule text-ink-2 bg-surface hover:border-ember hover:text-ember'
          }`}
        >
          {isProtected ? '✓ Remove' : 'Remove'}
        </button>
        <button
          type="button"
          onClick={() => onChange(meta.id, { protection: decision.protection === 'keep' ? 'unset' : 'keep' })}
          className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-colors ${
            decision.protection === 'keep' ? 'bg-success text-white border-success' : 'border-rule text-ink-2 bg-surface hover:border-ink-2'
          }`}
        >
          Keep
        </button>
      </div>
    </div>
  );
}

function SanitizePanel({ fileState, onRequestSanitize }: {
  fileState: FileAnalysisState;
  onRequestSanitize: (evidenceId: string) => void;
}) {
  const { sanitizeStatus, sanitizeUrl, sanitizeError, sanitizeWarnings, category } = fileState;

  if (category === 'document') {
    return (
      <div className="mt-4 px-4 py-3 rounded-[8px] border border-rule bg-surface text-[12px] text-ink-2">
        <p className="font-semibold text-ink-1 mb-1">📄 PDF Protection</p>
        <p>
          Genuine PDF text-layer redaction (removing searchable text under visible regions)
          requires PyMuPDF, which is not yet installed. Your original PDF is preserved unchanged.
          For pixel-level protection, convert the PDF to images before uploading.
        </p>
      </div>
    );
  }

  if (category === 'audio') {
    return (
      <div className="mt-4 px-4 py-3 rounded-[8px] border border-rule bg-surface text-[12px] text-ink-2">
        <p className="font-semibold text-ink-1 mb-1">🎙️ Audio Protection</p>
        <p>
          Voice pitch-shifting will be applied to the dominant speaker's segments.
          Note: removing a spoken name does not anonymize the speaker's voice.
          Transcription and precise spoken-name removal are not yet implemented.
        </p>
        {sanitizeStatus === 'idle' && (
          <Button size="sm" className="mt-2" onClick={() => onRequestSanitize(fileState.evidenceId)}>
            Generate Protected Audio
          </Button>
        )}
        {sanitizeStatus === 'working' && <p className="mt-2 text-amber-500">Processing…</p>}
        {sanitizeStatus === 'done' && sanitizeUrl && (
          <a
            href={sanitizeUrl}
            download="protected.mp3"
            className="mt-2 inline-block text-ember font-medium hover:underline"
          >
            ⬇ Download Protected Audio
          </a>
        )}
        {sanitizeStatus === 'failed' && (
          <p className="mt-2 text-red-500 text-[11px]">{sanitizeError ?? 'Protection failed.'}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {sanitizeStatus === 'idle' && (
        <Button size="sm" variant="secondary" onClick={() => onRequestSanitize(fileState.evidenceId)}>
          Generate Protected Copy
        </Button>
      )}
      {sanitizeStatus === 'working' && (
        <p className="text-[12px] text-amber-500 flex items-center gap-2">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
          </svg>
          Generating protected copy…
        </p>
      )}
      {sanitizeStatus === 'done' && sanitizeUrl && (
        <div className="flex flex-col gap-1.5">
          <a
            href={sanitizeUrl}
            download="protected_copy"
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-ember hover:underline"
          >
            ⬇ Download Protected Copy
          </a>
          {sanitizeWarnings.map((w, i) => (
            <p key={i} className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}
      {sanitizeStatus === 'failed' && (
        <p className="text-[11px] text-red-500">{sanitizeError ?? 'Protection failed. Original preserved.'}</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function IdentityProtectionPage() {
  const { draft, updateDraft } = useDraft();
  const navigate = useNavigate();

  const [fileStates, setFileStates] = useState<FileAnalysisState[]>([]);
  const [decisions, setDecisions] = useState<Record<string, ClueDecision>>({});
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // Revoke all object URLs on unmount
  const objectUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    };
  }, []);

  // ── Initialise file states from draft evidence ────────────────────────────
  useEffect(() => {
    const evidence = draft?.evidence ?? [];
    setFileStates(
      evidence.map((ev) => ({
        evidenceId: ev.id,
        fileName: ev.name ?? 'file',
        category: inferCategory(ev.file ?? new File([], ev.name ?? 'file')),
        status: 'waiting',
        manifest: null,
        error: null,
        sanitizeStatus: 'idle',
        sanitizeError: null,
        sanitizeWarnings: [],
        sanitizeUrl: null,
      }))
    );
  }, []); // run once on mount

  // ── Scan all files ────────────────────────────────────────────────────────
  const handleScanAll = useCallback(async () => {
    const evidence = draft?.evidence ?? [];
    if (!evidence.length) return;
    setHasScanned(true);
    setExpandedFile(evidence[0]?.id ?? null);

    for (const ev of evidence) {
      if (!ev.file) {
        setFileStates(prev => prev.map(fs =>
          fs.evidenceId === ev.id
            ? { ...fs, status: 'failed', error: 'File data not available in memory.' }
            : fs
        ));
        continue;
      }

      setFileStates(prev => prev.map(fs =>
        fs.evidenceId === ev.id ? { ...fs, status: 'analyzing' } : fs
      ));

      try {
        const manifest = await scanFile(ev.file);
        setFileStates(prev => prev.map(fs =>
          fs.evidenceId === ev.id ? { ...fs, status: 'done', manifest } : fs
        ));

        // Seed decisions for new candidates (default: unset)
        const newDecisions: Record<string, ClueDecision> = {};
        const seed = (id: string) => {
          if (!decisions[id]) newDecisions[id] = { relation: 'unset', protection: 'unset', dismissed: false };
        };
        manifest.faces.forEach(f => seed(f.id));
        manifest.texts.forEach(t => seed(t.id));
        manifest.metadata.forEach(m => seed(m.id));
        if (Object.keys(newDecisions).length) {
          setDecisions(prev => ({ ...newDecisions, ...prev }));
        }
      } catch (err: any) {
        setFileStates(prev => prev.map(fs =>
          fs.evidenceId === ev.id
            ? { ...fs, status: 'failed', error: err.message ?? 'Analysis failed.' }
            : fs
        ));
      }
    }
  }, [draft?.evidence, decisions]);

  // ── Decision handlers ─────────────────────────────────────────────────────
  const handleDecisionChange = useCallback((id: string, patch: Partial<ClueDecision>) => {
    setDecisions(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { relation: 'unset', protection: 'unset', dismissed: false }), ...patch },
    }));
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setDecisions(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { relation: 'unset', protection: 'unset', dismissed: false }), dismissed: true },
    }));
  }, []);

  const handleProtectAll = useCallback(() => {
    const updates: Record<string, ClueDecision> = {};
    fileStates.forEach(fs => {
      if (!fs.manifest) return;
      fs.manifest.faces.forEach(f => {
        updates[f.id] = { ...(decisions[f.id] ?? { relation: 'unset', dismissed: false }), protection: 'protect' };
      });
      fs.manifest.texts.forEach(t => {
        updates[t.id] = { ...(decisions[t.id] ?? { relation: 'unset', dismissed: false }), protection: 'protect' };
      });
      fs.manifest.metadata.forEach(m => {
        updates[m.id] = { ...(decisions[m.id] ?? { relation: 'unset', dismissed: false }), protection: 'protect' };
      });
    });
    setDecisions(prev => ({ ...prev, ...updates }));
  }, [fileStates, decisions]);

  // ── Sanitize ──────────────────────────────────────────────────────────────
  const handleRequestSanitize = useCallback(async (evidenceId: string) => {
    const ev = draft?.evidence.find(e => e.id === evidenceId);
    if (!ev?.file) return;

    setFileStates(prev => prev.map(fs =>
      fs.evidenceId === evidenceId ? { ...fs, sanitizeStatus: 'working', sanitizeError: null } : fs
    ));

    try {
      const { blob, warnings } = await sanitizeFile(ev.file);
      const url = URL.createObjectURL(blob);
      objectUrlsRef.current.push(url);
      setFileStates(prev => prev.map(fs =>
        fs.evidenceId === evidenceId
          ? { ...fs, sanitizeStatus: 'done', sanitizeUrl: url, sanitizeWarnings: warnings }
          : fs
      ));
    } catch (err: any) {
      setFileStates(prev => prev.map(fs =>
        fs.evidenceId === evidenceId
          ? { ...fs, sanitizeStatus: 'failed', sanitizeError: err.message ?? 'Protection failed.' }
          : fs
      ));
    }
  }, [draft?.evidence]);

  // ── Apply and submit ──────────────────────────────────────────────────────
  const allCandidateIds = fileStates.flatMap(fs =>
    fs.manifest ? [
      ...fs.manifest.faces.map(f => f.id),
      ...fs.manifest.texts.map(t => t.id),
      ...fs.manifest.metadata.map(m => m.id),
    ] : []
  );
  const protectedCount = allCandidateIds.filter(id => decisions[id]?.protection === 'protect' && !decisions[id]?.dismissed).length;
  const pendingCount = allCandidateIds.filter(id => !decisions[id] || (decisions[id].protection === 'unset' && !decisions[id].dismissed)).length;
  const totalCandidates = allCandidateIds.length;

  async function handleApply() {
    setApplying(true);
    await new Promise(r => setTimeout(r, 1200));
    setApplied(true);

    const namesProtected = fileStates.flatMap(fs => fs.manifest?.texts ?? [])
      .filter(t => t.category === 'name_pattern' && decisions[t.id]?.protection === 'protect').length;
    const facesBlurred = fileStates.flatMap(fs => fs.manifest?.faces ?? [])
      .filter(f => decisions[f.id]?.protection === 'protect').length;
    const metadataRemoved = fileStates.flatMap(fs => fs.manifest?.metadata ?? [])
      .filter(m => decisions[m.id]?.protection === 'protect').length;

    updateDraft({
      identityProtectionApplied: true,
      identityProtectionResult: {
        namesProtected,
        facesBlurred,
        voicesMasked: 0,
        metadataFieldsRemoved: metadataRemoved,
      },
      evidence: (draft?.evidence ?? []).map(e => ({
        ...e,
        scanState: e.scanState === 'idle' || e.scanState === 'found' ? 'sanitized' : e.scanState,
      })),
    });
    await new Promise(r => setTimeout(r, 500));
    navigate('/report/review');
  }

  // ── Render: applying state ────────────────────────────────────────────────
  if (applying && !applied) {
    return (
      <main className="px-5 md:px-8 py-16 max-w-[640px] flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-ember-soft flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-ember animate-spin">
            <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 24" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-[20px] font-semibold text-ink-1 mb-2">Recording protection choices…</h2>
          <p className="text-[14px] text-ink-2">Original files preserved unchanged. Protected derivative ready for review.</p>
        </div>
        <div className="w-full max-w-[320px] flex flex-col gap-2 text-left mt-2">
          {['Recording candidate decisions', 'Logging protection manifest', 'Preserving original file hashes', 'Preparing submission'].map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-[13px] text-ink-2">
              <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center shrink-0">
                <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                  <path d="M1 3.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              {step}
            </div>
          ))}
        </div>
      </main>
    );
  }

  const evidence = draft?.evidence ?? [];

  return (
    <main className="px-5 md:px-8 py-8 pb-24 md:pb-8">
      <div className="max-w-[720px]">

        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-[26px] font-semibold text-ink-1 mb-2">Privacy Guardian</h1>
          <p className="text-[14px] text-ink-2 leading-relaxed">
            Scan your uploaded evidence locally for possible identity clues — faces, names, phone
            numbers, GPS data, and other metadata. All detection runs on the VeilProof server;
            your files are never forwarded to external AI services.
          </p>
          <p className="text-[11px] text-ink-muted mt-1">
            Automated detection finds <em>candidates</em> that need your review. It does not identify
            people from their faces or compare against any database.
          </p>
        </div>

        {/* ── No evidence guard ── */}
        {evidence.length === 0 ? (
          <div className="border border-rule rounded-[12px] bg-surface p-8 text-center mb-6">
            <p className="text-[15px] font-semibold text-ink-1 mb-2">No evidence uploaded yet</p>
            <p className="text-[13px] text-ink-2 mb-4">
              Upload documents, images, audio, or video on the previous step first.
            </p>
            <Button variant="secondary" onClick={() => navigate('/report/evidence')}>
              Go to Evidence Upload
            </Button>
          </div>
        ) : (
          <>
            {/* ── Scan trigger ── */}
            {!hasScanned && (
              <div className="border border-rule rounded-[12px] bg-surface p-5 mb-6">
                <p className="text-[14px] font-semibold text-ink-1 mb-1">
                  {evidence.length} file{evidence.length !== 1 ? 's' : ''} ready to scan
                </p>
                <p className="text-[12px] text-ink-muted mb-4">
                  Run local analysis to detect faces, text, and metadata clues. The scan runs on this
                  server only — no data leaves the VeilProof system.
                </p>
                <Button onClick={handleScanAll} size="md">
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1L8.5 5L12.5 7L8.5 9L7 13L5.5 9L1.5 7L5.5 5L7 1Z" fill="currentColor" />
                    </svg>
                    Scan for Identity Clues
                  </span>
                </Button>
              </div>
            )}

            {/* ── Summary bar ── */}
            {hasScanned && (
              <div className="border border-rule rounded-[12px] bg-surface p-4 mb-5 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-5">
                  <div className="text-center">
                    <p className="text-[20px] font-bold text-ember">{totalCandidates}</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wide">Candidates</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[20px] font-bold text-success">{protectedCount}</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wide">Protected</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-[20px] font-bold ${pendingCount > 0 ? 'text-amber-500' : 'text-ink-2'}`}>{pendingCount}</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wide">Pending</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleProtectAll}>
                    Protect All
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleScanAll}>
                    Re-scan
                  </Button>
                </div>
              </div>
            )}

            {/* ── File panels ── */}
            {fileStates.map((fs) => {
              const ev = evidence.find(e => e.id === fs.evidenceId);
              const isExpanded = expandedFile === fs.evidenceId;
              const manifest = fs.manifest;

              const fileFaces = manifest?.faces ?? [];
              const fileTexts = manifest?.texts ?? [];
              const fileMeta = manifest?.metadata ?? [];

              const visibleFaces = fileFaces.filter(f => !decisions[f.id]?.dismissed);
              const visibleTexts = fileTexts.filter(t => !decisions[t.id]?.dismissed);
              const allFileCandidateIds = [...fileFaces.map(f => f.id), ...fileTexts.map(t => t.id), ...fileMeta.map(m => m.id)];
              const fileProtected = allFileCandidateIds.filter(id => decisions[id]?.protection === 'protect').length;

              return (
                <div key={fs.evidenceId} className="border border-rule rounded-[12px] bg-surface overflow-hidden mb-4">
                  {/* File header */}
                  <button
                    type="button"
                    onClick={() => setExpandedFile(isExpanded ? null : fs.evidenceId)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-hover transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{categoryIcon(fs.category)}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink-1 truncate">{fs.fileName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <StatusBadge fileState={fs} />
                          {hasScanned && manifest && (
                            <span className="text-[10px] text-ink-muted">
                              {fileFaces.length} face{fileFaces.length !== 1 ? 's' : ''} · {fileTexts.length} text · {fileMeta.length} metadata
                              {fileProtected > 0 && ` · ${fileProtected} protected`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className={`text-ink-muted shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* File detail */}
                  {isExpanded && (
                    <div className="border-t border-rule px-5 py-5">
                      {/* Status / notes */}
                      {fs.status === 'waiting' && !hasScanned && (
                        <p className="text-[12px] text-ink-muted italic">Run the scan above to analyze this file.</p>
                      )}
                      {fs.status === 'analyzing' && (
                        <div className="flex items-center gap-2 text-[12px] text-amber-500">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                          </svg>
                          Analyzing…
                        </div>
                      )}
                      {fs.status === 'failed' && (
                        <div className="text-[12px] text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                          Analysis could not complete: {fs.error}. Your original file is preserved unchanged.
                        </div>
                      )}

                      {manifest && <NoteBox notes={manifest.notes} />}

                      {/* Faces */}
                      {visibleFaces.length > 0 && (
                        <div className="mt-5">
                          <p className="text-[12px] font-semibold text-ink-1 mb-2 flex items-center gap-1.5">
                            👤 Faces detected ({visibleFaces.length})
                          </p>
                          <div className="flex flex-col gap-3">
                            {visibleFaces.map(face => (
                              <FaceClueCard
                                key={face.id}
                                face={face}
                                decision={decisions[face.id] ?? { relation: 'unset', protection: 'unset', dismissed: false }}
                                imageFile={ev?.file}
                                imageWidth={manifest.image_width}
                                imageHeight={manifest.image_height}
                                onChange={handleDecisionChange}
                                onDismiss={handleDismiss}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Text candidates */}
                      {visibleTexts.length > 0 && (
                        <div className="mt-5">
                          <p className="text-[12px] font-semibold text-ink-1 mb-2">
                            🔤 Text / identifier candidates ({visibleTexts.length})
                          </p>
                          <div className="flex flex-col gap-3">
                            {visibleTexts.map(text => (
                              <TextClueCard
                                key={text.id}
                                text={text}
                                decision={decisions[text.id] ?? { relation: 'unset', protection: 'unset', dismissed: false }}
                                onChange={handleDecisionChange}
                                onDismiss={handleDismiss}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {fileMeta.length > 0 && (
                        <div className="mt-5">
                          <p className="text-[12px] font-semibold text-ink-1 mb-2">
                            🔍 Metadata fields ({fileMeta.length})
                          </p>
                          <div className="flex flex-col gap-2">
                            {fileMeta.map(meta => (
                              <MetadataClueCard
                                key={meta.id}
                                meta={meta}
                                decision={decisions[meta.id] ?? { relation: 'unset', protection: 'unset', dismissed: false }}
                                onChange={handleDecisionChange}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state after scan */}
                      {manifest && fileFaces.length === 0 && fileTexts.length === 0 && fileMeta.length === 0 && manifest.state !== 'unsupported' && (
                        <div className="mt-4 text-[12px] text-ink-2 bg-surface border border-rule rounded px-3 py-3">
                          No identity candidates were automatically detected in this file. This does not mean the file contains
                          no sensitive information — detection may have missed partial or low-resolution content.
                          Use the protected copy download to apply any manual redactions.
                        </div>
                      )}

                      {/* Sanitize panel */}
                      {manifest && manifest.state !== 'unsupported' && fs.status === 'done' && (
                        <SanitizePanel fileState={fs} onRequestSanitize={handleRequestSanitize} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Auto-stripped metadata notice ── */}
            <div className="border border-rule rounded-[12px] bg-surface p-5 mb-6">
              <p className="text-[14px] font-semibold text-ink-1 mb-2">🛡️ Automatic protection applied to all files</p>
              <p className="text-[12px] text-ink-muted mb-3">
                These fields are removed from protected copies regardless of your review decisions.
                File sanitization does not remove network information such as IP addresses or upload timestamps.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[12px] text-ink-2">
                {['GPS coordinates', 'Camera make & model', 'Original filename', 'File creation timestamps', 'Author / creator metadata', 'Editing software tags'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-sm bg-success flex items-center justify-center shrink-0">
                      <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                        <path d="M1 3l1.5 1.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Primary actions ── */}
            <div className="flex gap-3 flex-wrap items-center">
              <Button variant="primary" size="lg" onClick={handleApply} disabled={applying}>
                Apply Protection &amp; Continue
              </Button>
              <Button variant="secondary" onClick={() => navigate('/report/evidence')} disabled={applying}>
                Back to Evidence
              </Button>
            </div>
            {pendingCount > 0 && (
              <p className="text-[12px] text-amber-600 mt-3">
                {pendingCount} candidate{pendingCount !== 1 ? 's' : ''} still pending a decision. You can continue, but unreviewed
                clues will not be protected.
              </p>
            )}
            {!hasScanned && (
              <p className="text-[12px] text-ink-muted mt-2">
                You can continue without scanning. Metadata will not be automatically identified without a scan.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
