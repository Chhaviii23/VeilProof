import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useDraft } from '../../store/AppContext';
import type { EvidenceItem } from '../../types';
import { scanFile, sanitizeFile, inferCategory, type AnalysisManifest, type ProtectionPlan } from '../../services/localAnalysis';

type Decision = 'pending' | 'reporter' | 'whistleblower' | 'other_protect' | 'keep';
const options: [Decision, string][] = [
  ['pending', 'Choose whose identity this is'], ['reporter', 'Reporter — protect'],
  ['whistleblower', 'Whistleblower — protect'], ['other_protect', 'Other / unsure — protect'],
  ['keep', 'Other / false positive — keep'],
];
const needsProtection = (d?: Decision) => !!d && d !== 'pending' && d !== 'keep';
function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const value = URL.createObjectURL(blob); setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return url;
}
function Media({ url, category }: { url: string; category: string }) {
  if (!url) return null;
  if (category === 'image') return <img src={url} alt="Evidence preview" className="max-h-96 max-w-full object-contain" />;
  if (category === 'audio') return <audio controls src={url} className="w-full" />;
  if (category === 'video') return <video controls src={url} className="max-h-96 w-full" />;
  return <iframe title="PDF evidence preview" src={url} className="w-full h-96" />;
}
function RegionPreview({ url, box }: { url: string; box: { x: number; y: number; w: number; h: number } }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const target = canvas.current;
      if (!target) return;
      const scale = Math.min(1, 240 / box.w, 140 / box.h);
      target.width = Math.max(1, Math.round(box.w * scale));
      target.height = Math.max(1, Math.round(box.h * scale));
      target.getContext('2d')?.drawImage(image, box.x, box.y, box.w, box.h, 0, 0, target.width, target.height);
    };
    image.src = url;
    return () => { image.onload = null; };
  }, [url, box]);
  return <canvas ref={canvas} aria-label="Detected identity region" className="border border-rule rounded" />;
}
function FileReview({ item, onChange }: { item: EvidenceItem; onChange: (patch: Partial<EvidenceItem>) => void }) {
  const [manifest, setManifest] = useState<AnalysisManifest | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState('');
  const [audio, setAudio] = useState<'mute' | 'intervals' | 'keep'>('mute');
  const [video, setVideo] = useState(true);
  const [manualTimes, setManualTimes] = useState('');
  const [manualRegions, setManualRegions] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const originalUrl = useBlobUrl(item.file);
  const protectedUrl = useBlobUrl(item.protectedBlob);
  const category = item.file ? inferCategory(item.file) : 'unknown';
  const candidates = manifest ? [
    ...manifest.faces.map((f, i) => ({ ...f, label: `Face ${i + 1}${f.page_index !== null ? ` · page ${f.page_index + 1}` : ''}${f.frame_index !== null ? ` · frame ${f.frame_index}` : ''}` })),
    ...manifest.texts.map(t => ({ ...t, label: t.text })),
    ...(manifest.voices ?? []).map(v => ({ ...v, label: `Possible speech ${v.start.toFixed(1)}–${v.end.toFixed(1)} seconds` })),
  ] : [];
  const pending = candidates.some(c => !decisions[c.id] || decisions[c.id] === 'pending');
  function invalidate() {
    setReviewed(false);
    onChange({ protectedBlob: undefined, protectionReceipt: undefined, scanState: 'found' });
  }
  async function scan() {
    if (!item.file) return;
    invalidate(); setBusy(true); setError(''); setDecisions({});
    try {
      const result = await scanFile(item.file); setManifest(result);
      if (result.state === 'failed' || result.state === 'unsupported') throw new Error(result.notes.join(' '));
    } catch (e) { setError(e instanceof Error ? e.message : 'Scan failed'); }
    finally { setBusy(false); }
  }
  async function generate() {
    if (!item.file || !manifest || pending) return;
    setBusy(true); setError('');
    try {
      const selectedFaces = manifest.faces.filter(f => needsProtection(decisions[f.id]));
      const selectedTexts = manifest.texts.filter(t => needsProtection(decisions[t.id]));
      const regions = [...selectedFaces, ...selectedTexts].filter(c => c.bbox.w > 0 && c.bbox.h > 0)
        .map(c => ({ ...c.bbox, page_index: c.page_index }));
      for (const line of manualRegions.split('\n').filter(l => l.trim())) {
        const nums = line.split(',').map(s => Number(s.trim()));
        if (nums.length !== (category === 'document' ? 5 : 4) || nums.some(n => !Number.isInteger(n) || n < 0)) throw new Error('Enter x,y,width,height (and page number for PDF) for each region.');
        const [x, y, w, h, page] = nums;
        regions.push({ x, y, w, h, page_index: category === 'document' ? page - 1 : null });
      }
      const intervals = (manifest.voices ?? []).filter(v => needsProtection(decisions[v.id])).map(v => ({ start: v.start, end: v.end }));
      for (const line of manualTimes.split('\n').filter(l => l.trim())) {
        const parts = line.split(',').map(s => Number(s.trim()));
        if (parts.length !== 2 || parts.some(n => !Number.isFinite(n))) throw new Error('Enter start,end in seconds for each interval.');
        intervals.push({ start: parts[0], end: parts[1] });
      }
      const plan: ProtectionPlan = { regions: category === 'video' ? [] : regions,
        terms: [...new Set([...selectedTexts.filter(t => !t.bbox.w).map(t => t.text), ...terms.split('\n').map(t => t.trim()).filter(Boolean)])],
        audio, intervals, protect_video: video };
      if (category === 'audio' && audio === 'keep' && intervals.length) throw new Error('Choose mute selected intervals or mute all to protect selected voices.');
      if (category === 'video' && !video && (selectedFaces.length || selectedTexts.length)) throw new Error('Conceal video visuals to protect selected faces or text.');
      const result = await sanitizeFile(item.file, plan);
      onChange({ protectedBlob: result.blob, protectionReceipt: result.receipt, scanState: 'sanitized' });
      setReviewed(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Protection failed'); }
    finally { setBusy(false); }
  }
  const ext = { image: 'jpg', document: 'pdf', audio: 'mp3', video: 'mp4' }[category] ?? 'bin';
  return <section className="border border-rule rounded-xl bg-surface p-5 space-y-4">
    <h2 className="font-semibold text-ink-1 break-all">{item.name}</h2>
    {!item.file ? <p className="text-error">Reselect this file on the Evidence step.</p> : <>
      <details><summary className="cursor-pointer text-sm text-ink-2">Inspect original</summary><Media url={originalUrl} category={category} /></details>
      <Button variant="secondary" disabled={busy} onClick={scan}>{busy ? 'Processing…' : manifest ? 'Scan again' : 'Detect identity clues'}</Button>
      {manifest && <>
        <p className="text-sm text-ink-2">Are these names, faces or sound intervals yours or the whistleblower’s? Choose what to protect.</p>
        <details><summary className="text-xs text-ink-muted cursor-pointer">Detection coverage</summary>{manifest.notes.map((n, i) => <p key={i} className="text-xs text-ink-2 mt-2">{n}</p>)}</details>
        {!!candidates.length && <Button variant="secondary" size="sm" disabled={busy} onClick={() => { invalidate(); setDecisions(Object.fromEntries(candidates.map(c => [c.id, 'other_protect']))); }}>Protect all candidates</Button>}
        {candidates.map(c => <div key={c.id} className="border-b border-rule pb-3 space-y-2">
          <p className="text-sm break-words">{c.label}</p>
          {category === 'image' && 'bbox' in c && c.bbox.w > 0 && <RegionPreview url={originalUrl} box={c.bbox} />}
          {'bbox' in c && c.bbox.w > 0 && <p className="text-xs text-ink-muted">Region: {c.bbox.x}, {c.bbox.y}, {c.bbox.w} × {c.bbox.h}</p>}
          <select aria-label={`Protection for ${c.label}`} disabled={busy} className="w-full bg-canvas border border-rule rounded p-2 text-sm" value={decisions[c.id] ?? 'pending'} onChange={e => { invalidate(); setDecisions(d => ({ ...d, [c.id]: e.target.value as Decision })); }}>
            {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>)}
        {!candidates.length && <p className="text-sm text-ink-2">No candidates found. Check the original for missed identifiers.</p>}
        {(category === 'image' || category === 'document') && <details><summary className="text-sm cursor-pointer">Add missed identifiers or regions</summary>
          <label className="block text-sm mt-3">Names or identifiers, one per line<textarea aria-label="Additional identifiers" disabled={busy} className="w-full bg-canvas border border-rule p-2" value={terms} onChange={e => { invalidate(); setTerms(e.target.value); }} /></label>
          <label className="block text-sm mt-3">Regions: x,y,width,height{category === 'document' ? ',page (1-based; coordinates at 150% scale)' : ' in original pixels'}<textarea aria-label="Additional redaction regions" disabled={busy} className="w-full bg-canvas border border-rule p-2" value={manualRegions} onChange={e => { invalidate(); setManualRegions(e.target.value); }} /></label>
        </details>}
        {(category === 'audio' || category === 'video') && <div className="space-y-3">
          <label className="block text-sm">Does the audio expose a reporter or whistleblower?
            <select aria-label="Audio protection" disabled={busy} className="w-full bg-canvas border border-rule p-2 mt-1" value={audio} onChange={e => { invalidate(); setAudio(e.target.value as typeof audio); }}>
              <option value="mute">Yes / unsure — mute all audio</option>
              {category === 'audio' && <option value="intervals">Mute selected intervals (voices and spoken names)</option>}
              <option value="keep">No — keep audio unchanged</option>
            </select>
          </label>
          {audio === 'intervals' && <label className="block text-sm">Additional intervals: start,end in seconds, one per line<textarea aria-label="Additional audio intervals" disabled={busy} className="w-full bg-canvas border border-rule p-2" value={manualTimes} onChange={e => { invalidate(); setManualTimes(e.target.value); }} /></label>}
          <p className="text-xs text-ink-muted">Sound detection does not identify speakers or transcribe names. Listen to the recording; muting removes both voice and words in selected intervals.</p>
          {category === 'video' && <label className="flex gap-2 text-sm"><input type="checkbox" checked={video} disabled={busy} onChange={e => { invalidate(); setVideo(e.target.checked); }} />Conceal all video frames. Moving-person tracking is unavailable; this removes the visual evidence from the protected copy.</label>}
        </div>}
        <Button disabled={busy || pending || manifest.state === 'failed' || manifest.state === 'unsupported'} onClick={generate}>Generate protected copy</Button>
        {pending && <p className="text-xs text-amber-600">Review every candidate before generating.</p>}
      </>}
      {protectedUrl && <div className="space-y-3 border-t border-rule pt-4">
        <p className="font-semibold text-sm">Protected copy used for submission</p>
        <Media url={protectedUrl} category={category} />
        <a href={protectedUrl} download={`protected.${ext}`} className="text-ember underline text-sm">Download protected copy</a>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed || item.protectedReviewed} onChange={e => {
          setReviewed(e.target.checked);
          onChange({ protectedReviewed: e.target.checked });
        }} />I inspected this copy and it conceals the identities I need to protect.</label>
      </div>}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </>}
  </section>;
}
export function IdentityProtectionPage() {
  const { draft, updateDraft, updateEvidence } = useDraft();
  const navigate = useNavigate();
  const files = draft.evidence.filter(e => e.type !== 'link');
  const ready = files.every(e => e.protectedBlob && e.protectionReceipt && e.protectedReviewed);
  return <main className="max-w-3xl px-5 md:px-8 py-8 space-y-5">
    <h1 className="text-2xl font-semibold">Protect identities</h1>
    <p className="text-sm text-ink-2">Detect clues, tell us whose identity needs protection, and inspect the protected copies. Originals stay sealed; investigators receive copies only after privacy review. Detection runs on this server.</p>
    <p className="text-xs text-ink-muted">Metadata is removed automatically. Review report text and reference links separately for names or other identity clues.</p>
    {files.map(item => <FileReview key={item.id} item={item} onChange={patch => updateEvidence(item.id, { ...patch, ...('protectedBlob' in patch ? { protectedReviewed: false } : {}) })} />)}
    {!files.length && <p className="text-sm text-ink-2">No attached files require protection. Review any reference links before continuing.</p>}
    <div className="flex gap-3"><Button variant="secondary" onClick={() => navigate('/report/evidence')}>Back</Button>
      <Button disabled={!ready} onClick={() => { updateDraft({ identityProtectionApplied: true }); navigate('/report/review'); }}>Continue to review</Button></div>
  </main>;
}
