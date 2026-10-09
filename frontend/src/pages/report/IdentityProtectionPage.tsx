import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useDraft } from '../../store/AppContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type ClueStatus = 'unchecked' | 'mine' | 'protect';

interface NameClue { id: string; name: string; source: string; }
interface FaceClue { id: string; label: string; source: string; }
interface SpeakerClue { id: string; label: string; timeRange: string; source: string; }

const NAMES: NameClue[] = [
  { id: 'name-rahul', name: 'Rahul Sharma', source: 'PWD_Payment_and_Inspection_Report.pdf' },
  { id: 'name-vikram', name: 'Vikram Singh', source: 'PWD_Payment_and_Inspection_Report.pdf' },
  { id: 'name-priya', name: 'Priya Nair', source: 'PWD_Payment_and_Inspection_Report.pdf' },
];

const FACES: FaceClue[] = [
  { id: 'face-1', label: 'Face 1', source: 'Steel_Grade_Site_Photo.jpg' },
  { id: 'face-2', label: 'Face 2', source: 'Steel_Grade_Site_Photo.jpg' },
  { id: 'face-3', label: 'Face 3', source: 'Steel_Grade_Site_Photo.jpg' },
];

const SPEAKERS: SpeakerClue[] = [
  { id: 'speaker-1', label: 'Speaker 1', timeRange: '00:04–00:18', source: 'Bribe_Discussion_Recording.mp3' },
  { id: 'speaker-2', label: 'Speaker 2', timeRange: '00:19–00:43', source: 'Bribe_Discussion_Recording.mp3' },
];

interface VideoClue { id: string; label: string; source: string; }

const VIDEO_CLUES: VideoClue[] = [
  { id: 'video-face', label: 'Visible face', source: 'Material_Removal_From_Site.mp4' },
  { id: 'video-plate', label: 'Vehicle registration number', source: 'Material_Removal_From_Site.mp4' },
  { id: 'video-location', label: 'Spoken location reference', source: 'Material_Removal_From_Site.mp4' },
];

const METADATA_FIELDS = [
  'GPS coordinates',
  'Device model',
  'Original filename',
  'PDF author information',
  'File creation details',
  'Editing software information',
];

const DEMO_INITIAL: Record<string, ClueStatus> = {
  'name-rahul': 'mine',
  'name-vikram': 'unchecked',
  'name-priya': 'unchecked',
  'face-1': 'unchecked',
  'face-2': 'mine',
  'face-3': 'unchecked',
  'speaker-1': 'mine',
  'speaker-2': 'unchecked',
  'video-face': 'unchecked',
  'video-plate': 'unchecked',
  'video-location': 'unchecked',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, source, open, onToggle }: { title: string; source: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors"
    >
      <div className="text-left">
        <p className="text-[14px] font-semibold text-ink-1">{title}</p>
        <p className="text-[12px] text-ink-muted mt-0.5">Source: {source}</p>
      </div>
      <svg
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ClueActionRow({
  id, label, status, onMine, onProtect,
}: { id: string; label: string; status: ClueStatus; onMine: () => void; onProtect: () => void }) {
  const isActive = status !== 'unchecked';
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-[8px] border transition-colors ${
        isActive ? 'bg-ember-soft border-ember/30' : 'bg-canvas border-rule'
      }`}
    >
      <div className={`w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-colors ${
        isActive ? 'border-ember bg-ember' : 'border-rule bg-surface'
      }`}>
        {isActive && (
          <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
            <path d="M1 3.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <p className={`flex-1 text-[14px] font-medium ${isActive ? 'text-ember' : 'text-ink-1'}`}>
        {label}
        {status === 'mine' && <span className="ml-1.5 text-[12px] text-ember font-normal">— identified as mine</span>}
        {status === 'protect' && <span className="ml-1.5 text-[12px] text-ember font-normal">— will be protected</span>}
      </p>
      <div className="flex gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onMine}
          className={`text-[12px] font-medium px-2.5 py-1 rounded-[5px] border transition-colors ${
            status === 'mine'
              ? 'bg-ember text-white border-ember'
              : 'text-ink-2 border-rule hover:border-ember hover:text-ember bg-surface'
          }`}
        >
          This is me
        </button>
        <button
          type="button"
          onClick={onProtect}
          className={`text-[12px] font-medium px-2.5 py-1 rounded-[5px] border transition-colors ${
            status === 'protect'
              ? 'bg-ember text-white border-ember'
              : 'text-ink-2 border-rule hover:border-ember hover:text-ember bg-surface'
          }`}
        >
          Protect
        </button>
      </div>
    </div>
  );
}

function FaceThumbnail({ id, label, status, onMine, onProtect }: { id: string; label: string; status: ClueStatus; onMine: () => void; onProtect: () => void }) {
  const isActive = status !== 'unchecked';
  const faceColors = ['bg-ink-muted/10', 'bg-ember-soft', 'bg-success-bg'];
  const colorIndex = id === 'face-1' ? 0 : id === 'face-2' ? 1 : 2;
  return (
    <div className={`border rounded-[10px] p-3 flex flex-col items-center gap-2 transition-colors ${
      isActive ? 'border-ember bg-ember-soft' : 'border-rule bg-canvas'
    }`}>
      <div className={`w-16 h-16 rounded-full ${faceColors[colorIndex]} flex items-center justify-center border-2 transition-colors ${
        isActive ? 'border-ember' : 'border-rule'
      }`}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className={isActive ? 'text-ember' : 'text-ink-muted'}>
          <circle cx="14" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 26c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className={`text-[12px] font-medium ${isActive ? 'text-ember' : 'text-ink-1'}`}>{label}</p>
      {status === 'mine' && <p className="text-[10px] text-ember">My face</p>}
      {status === 'protect' && <p className="text-[10px] text-ember">Protected</p>}
      <div className="flex gap-1 w-full">
        <button
          type="button"
          onClick={onMine}
          className={`flex-1 text-[10px] font-medium py-1 rounded-[4px] border transition-colors ${
            status === 'mine' ? 'bg-ember text-white border-ember' : 'text-ink-2 border-rule bg-surface hover:border-ember hover:text-ember'
          }`}
        >
          This is me
        </button>
        <button
          type="button"
          onClick={onProtect}
          className={`flex-1 text-[10px] font-medium py-1 rounded-[4px] border transition-colors ${
            status === 'protect' ? 'bg-ember text-white border-ember' : 'text-ink-2 border-rule bg-surface hover:border-ember hover:text-ember'
          }`}
        >
          Protect
        </button>
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const bars = [3, 8, 5, 12, 7, 14, 6, 10, 4, 11, 8, 5, 13, 7, 9, 4, 12, 6, 10, 8, 3, 11, 7, 5];
  return (
    <div className="flex items-center gap-[2px] h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}px` }}
          className={`w-[3px] rounded-full transition-colors ${active ? 'bg-ember' : 'bg-ink-muted/30'}`}
        />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function IdentityProtectionPage() {
  const { draft, updateDraft } = useDraft();
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState<Record<string, ClueStatus>>(
    draft.identityProtectionApplied ? {} : { ...DEMO_INITIAL }
  );
  const [openSections, setOpenSections] = useState({ names: true, faces: true, speakers: true, video: false });
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [protectAll, setProtectAll] = useState(false);

  function setClue(id: string, action: 'mine' | 'protect') {
    setStatuses((prev) => {
      const current = prev[id] ?? 'unchecked';
      const next: ClueStatus = current === action ? 'unchecked' : action;
      return { ...prev, [id]: next };
    });
    setProtectAll(false);
  }

  function handleProtectAll() {
    setProtectAll(true);
    const next: Record<string, ClueStatus> = {};
    [...NAMES, ...FACES, ...SPEAKERS, ...VIDEO_CLUES].forEach(({ id }) => {
      next[id] = statuses[id] === 'mine' ? 'mine' : 'protect';
    });
    setStatuses(next);
  }

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));
  }

  const ALL_CLUES = [...NAMES, ...FACES, ...SPEAKERS, ...VIDEO_CLUES];
  const myItems = ALL_CLUES.filter(({ id }) => statuses[id] === 'mine');
  const protectedCount = ALL_CLUES.filter(({ id }) => statuses[id] !== 'unchecked').length;
  const namesProtected = NAMES.filter(({ id }) => statuses[id] !== 'unchecked').length;
  const facesBlurred = FACES.filter(({ id }) => statuses[id] !== 'unchecked').length;
  const voicesMasked = SPEAKERS.filter(({ id }) => statuses[id] !== 'unchecked').length;
  const videoCluesProtected = VIDEO_CLUES.filter(({ id }) => statuses[id] !== 'unchecked').length;

  async function handleApply() {
    setApplying(true);
    await new Promise((r) => setTimeout(r, 1400));
    setApplied(true);
    updateDraft({
      identityProtectionApplied: true,
      identityProtectionResult: {
        namesProtected,
        facesBlurred,
        voicesMasked: voicesMasked + videoCluesProtected,
        metadataFieldsRemoved: METADATA_FIELDS.length,
      },
      evidence: draft.evidence.map((e) => ({
        ...e,
        scanState: e.scanState === 'idle' || e.scanState === 'found' ? 'sanitized' : e.scanState,
      })),
    });
    await new Promise((r) => setTimeout(r, 600));
    navigate('/report/review');
  }

  if (applying && !applied) {
    return (
      <main className="px-5 md:px-8 py-16 max-w-[640px] flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-ember-soft flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-ember animate-spin">
            <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 24" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-[20px] font-semibold text-ink-1 mb-2">Applying identity protection…</h2>
          <p className="text-[14px] text-ink-2">Generating protected copy. Sealed original remains unchanged.</p>
        </div>
        <div className="w-full max-w-[320px] flex flex-col gap-2 text-left mt-2">
          {['Removing selected names', 'Blurring selected faces', 'Masking selected voices', 'Stripping hidden metadata'].map((step, i) => (
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

  return (
    <main className="px-5 md:px-8 py-8 pb-24 md:pb-8">
      <div className="max-w-[680px]">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[26px] font-semibold text-ink-1 mb-2">Protect Your Identity</h1>
          <p className="text-[14px] text-ink-2 leading-relaxed">
            We found possible identity clues in your evidence. Only you can confirm which ones belong to you.
          </p>
        </div>

        {/* Scan summary card */}
        <div className="border border-rule rounded-[12px] bg-surface p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5l3 3 7-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-ink-1">Privacy scan complete</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: '3 names detected' },
              { label: '3 faces detected' },
              { label: '2 speakers detected' },
              { label: '3 video clues detected' },
              { label: 'Hidden file metadata found' },
            ].map(({ label }) => (
              <div key={label} className="text-[12px] text-ink-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ember shrink-0" />
                {label}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-ink-muted">
            Select your identity clues below, or protect every person appearing in the evidence.
          </p>
        </div>

        {/* Detected clue sections */}
        <div className="border border-rule rounded-[12px] bg-surface overflow-hidden mb-6">

          {/* Names */}
          <div className="border-b border-rule">
            <SectionHeader
              title="Names Detected"
              source={NAMES[0].source}
              open={openSections.names}
              onToggle={() => toggleSection('names')}
            />
            {openSections.names && (
              <div className="px-5 pb-5 flex flex-col gap-2">
                {NAMES.map((n) => (
                  <ClueActionRow
                    key={n.id}
                    id={n.id}
                    label={n.name}
                    status={statuses[n.id] ?? 'unchecked'}
                    onMine={() => setClue(n.id, 'mine')}
                    onProtect={() => setClue(n.id, 'protect')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Faces */}
          <div className="border-b border-rule">
            <SectionHeader
              title="Faces Detected"
              source={FACES[0].source}
              open={openSections.faces}
              onToggle={() => toggleSection('faces')}
            />
            {openSections.faces && (
              <div className="px-5 pb-5 grid grid-cols-3 gap-3">
                {FACES.map((f) => (
                  <FaceThumbnail
                    key={f.id}
                    id={f.id}
                    label={f.label}
                    status={statuses[f.id] ?? 'unchecked'}
                    onMine={() => setClue(f.id, 'mine')}
                    onProtect={() => setClue(f.id, 'protect')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Speakers */}
          <div className="border-b border-rule">
            <SectionHeader
              title="Speakers Detected"
              source={SPEAKERS[0].source}
              open={openSections.speakers}
              onToggle={() => toggleSection('speakers')}
            />
            {openSections.speakers && (
              <div className="px-5 pb-5 flex flex-col gap-3">
                {SPEAKERS.map((s) => {
                  const st = statuses[s.id] ?? 'unchecked';
                  const isActive = st !== 'unchecked';
                  return (
                    <div
                      key={s.id}
                      className={`border rounded-[10px] p-4 transition-colors ${
                        isActive ? 'border-ember bg-ember-soft' : 'border-rule bg-canvas'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          type="button"
                          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'border-ember bg-ember text-white' : 'border-rule bg-surface text-ink-muted hover:border-ember'
                          }`}
                          title={`Play ${s.label}`}
                        >
                          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                            <path d="M1 1l8 5-8 5V1z" fill="currentColor" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <p className={`text-[13px] font-medium ${isActive ? 'text-ember' : 'text-ink-1'}`}>
                            {s.label}
                            {st === 'mine' && <span className="ml-1.5 font-normal text-[12px]">— My voice</span>}
                            {st === 'protect' && <span className="ml-1.5 font-normal text-[12px]">— will be masked</span>}
                          </p>
                          <p className="text-[11px] text-ink-muted">{s.timeRange}</p>
                        </div>
                      </div>
                      <Waveform active={isActive} />
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setClue(s.id, 'mine')}
                          className={`text-[12px] font-medium px-3 py-1.5 rounded-[6px] border transition-colors ${
                            st === 'mine' ? 'bg-ember text-white border-ember' : 'text-ink-2 border-rule bg-surface hover:border-ember hover:text-ember'
                          }`}
                        >
                          This is me
                        </button>
                        <button
                          type="button"
                          onClick={() => setClue(s.id, 'protect')}
                          className={`text-[12px] font-medium px-3 py-1.5 rounded-[6px] border transition-colors ${
                            st === 'protect' ? 'bg-ember text-white border-ember' : 'text-ink-2 border-rule bg-surface hover:border-ember hover:text-ember'
                          }`}
                        >
                          Protect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Video */}
          <div>
            <SectionHeader
              title="Video Clues Detected"
              source={VIDEO_CLUES[0].source}
              open={openSections.video}
              onToggle={() => toggleSection('video')}
            />
            {openSections.video && (
              <div className="px-5 pb-5 flex flex-col gap-2">
                {VIDEO_CLUES.map((v) => (
                  <ClueActionRow
                    key={v.id}
                    id={v.id}
                    label={v.label}
                    status={statuses[v.id] ?? 'unchecked'}
                    onMine={() => setClue(v.id, 'mine')}
                    onProtect={() => setClue(v.id, 'protect')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Identity confirmation summary */}
        {myItems.length > 0 && (
          <div className="border border-ember/30 rounded-[12px] bg-ember-soft p-5 mb-6">
            <p className="text-[14px] font-semibold text-ink-1 mb-3">Your confirmed identity</p>
            <div className="flex flex-col gap-2 mb-3">
              {myItems.map(({ id }) => {
                const name = NAMES.find((n) => n.id === id)?.name;
                const face = FACES.find((f) => f.id === id)?.label;
                const speaker = SPEAKERS.find((s) => s.id === id)?.label;
                const videoClue = VIDEO_CLUES.find((v) => v.id === id)?.label;
                const label = name ? `${name} — My name` : face ? `${face} — My face` : speaker ? `${speaker} — My voice` : `${videoClue} — Protected`;
                return (
                  <div key={id} className="flex items-center gap-2 text-[13px] text-ink-1">
                    <div className="w-4 h-4 rounded-[3px] bg-ember flex items-center justify-center shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                        <path d="M1 3.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    {label}
                  </div>
                );
              })}
            </div>
            <p className="text-[12px] text-ink-muted">
              These clues will be removed or masked in the protected investigator copy. Investigators will not see which identity belongs to the reporter.
            </p>
          </div>
        )}

        {/* Protect All option */}
        <div className="border border-rule rounded-[12px] bg-surface p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[14px] font-semibold text-ink-1 mb-1">Protect All Identities</p>
              <p className="text-[12px] text-ink-muted leading-relaxed">
                Remove every detected name, blur every face and mask every speaker.
                {protectAll && <span className="text-success ml-1 font-medium">✓ All {ALL_CLUES.length} clues selected.</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={handleProtectAll}
              className={`shrink-0 text-[13px] font-medium px-4 py-2 rounded-[8px] border transition-colors ${
                protectAll
                  ? 'bg-ember text-white border-ember'
                  : 'border-rule text-ink-1 bg-canvas hover:border-ember hover:text-ember'
              }`}
            >
              {protectAll ? 'All protected' : 'Protect All'}
            </button>
          </div>
        </div>

        {/* Hidden metadata */}
        <div className="border border-rule rounded-[12px] bg-surface p-5 mb-6">
          <p className="text-[14px] font-semibold text-ink-1 mb-1">Hidden Metadata Removed Automatically</p>
          <p className="text-[12px] text-ink-muted mb-4">These fields are removed from all evidence files. No action needed.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {METADATA_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-2 text-[13px] text-ink-2">
                <div className="w-4 h-4 rounded-[3px] bg-success flex items-center justify-center shrink-0">
                  <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                    <path d="M1 3.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                {field}
              </div>
            ))}
          </div>
        </div>

        {/* Preview protected copy */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="text-[13px] font-medium text-ember hover:underline flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {showPreview ? 'Hide preview' : 'Preview protected copy'}
          </button>

          {showPreview && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-rule rounded-[10px] bg-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-rule bg-surface-2">
                  <p className="text-[12px] font-semibold text-ink-1">Original Evidence</p>
                  <p className="text-[11px] text-ink-muted">Encrypted and sealed without modification</p>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  {[
                    { label: 'Name', value: 'Rahul Sharma' },
                    { label: 'Face', value: 'Visible face in photo' },
                    { label: 'Voice', value: 'Original Speaker 1 audio' },
                    { label: 'Metadata', value: 'GPS, device, author, filename' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-ink-muted uppercase tracking-wide">{label}</p>
                      <p className="text-[13px] text-ink-1 font-mono">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-success/30 rounded-[10px] bg-success-bg/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-success/20 bg-success-bg/50">
                  <p className="text-[12px] font-semibold text-success">Protected Investigator Copy</p>
                  <p className="text-[11px] text-ink-muted">Identity clues removed before investigator access</p>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  {[
                    { label: 'Name', value: '[NAME PROTECTED]' },
                    { label: 'Face', value: 'Face 2 blurred' },
                    { label: 'Voice', value: 'Speaker 1 voice masked' },
                    { label: 'Metadata', value: 'All fields removed' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-ink-muted uppercase tracking-wide">{label}</p>
                      <p className="text-[13px] text-success font-mono">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary actions */}
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="primary"
            size="lg"
            onClick={handleApply}
            disabled={applying}
          >
            Apply Protection and Continue
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/report/evidence')}
            disabled={applying}
          >
            Back to Evidence
          </Button>
        </div>

        {protectedCount === 0 && (
          <p className="text-[12px] text-ink-muted mt-3">
            No clues selected — metadata will still be removed automatically. You can continue without selecting identity clues.
          </p>
        )}
      </div>
    </main>
  );
}
