/**
 * Privacy Guardian — local analysis service.
 *
 * Communicates with the VeilProof backend's /api/v1/analysis/* endpoints.
 * All detection runs server-side using OpenCV, Tesseract, and Pillow.
 * Raw evidence is sent to the local server only — never to external APIs.
 *
 * Privacy guarantees:
 *   - No raw file bytes, OCR text, face crops, or metadata are forwarded to
 *     external AI APIs, analytics systems, or crash reporters.
 *   - Object URLs created from File objects are explicitly revoked after use.
 *   - Detection manifests are held in React state only; not written to
 *     localStorage, cookies, or any persistent browser storage.
 */

export type AnalysisState =
  | 'waiting'
  | 'analyzing'
  | 'review_required'
  | 'unsupported'
  | 'failed'
  | 'partially_analyzed';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FaceCandidate {
  id: string;
  bbox: BoundingBox;
  confidence_pct: number;
  source_file: string;
  frame_index: number | null;
  page_index: number | null;
}

export interface TextCandidate {
  id: string;
  text: string;
  category: 'name_pattern' | 'phone' | 'email' | 'address' | 'id_pattern' | 'raw';
  bbox: BoundingBox;
  confidence_pct: number;
  source_file: string;
  page_index: number | null;
}

export interface MetadataCandidate {
  id: string;
  field: string;
  value: string;
  is_sensitive: boolean;
  source_file: string;
}

export interface AnalysisManifest {
  file_name: string;
  file_category: string;
  state: AnalysisState;
  image_width: number | null;
  image_height: number | null;
  faces: FaceCandidate[];
  texts: TextCandidate[];
  metadata: MetadataCandidate[];
  voices?: { id: string; start: number; end: number }[];
  notes: string[];
}

/** Infer category from MIME type and file extension. */
export function inferCategory(file: File): string {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'document';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) {
    return 'audio';
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return 'video';
  }
  return 'unknown';
}

// Keep localhost on the Vite proxy, but make the deployed build self-sufficient
// if Vercel's public environment variable is missing or was not included in a
// deployment. This value is public API routing only; it contains no secret.
// Browser requests use the same-origin path in production. Vercel proxies
// /api/v1 to Render, avoiding browser/extension blocks on direct cross-origin
// uploads while keeping localhost on the Vite proxy.
const API_BASE = `${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (import.meta.env.VITE_API_BASE_URL ?? '/api/v1')
  : '/api/v1'}/analysis`;

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const API_ROOT = API_BASE.slice(0, API_BASE.lastIndexOf('/analysis'));

async function fetchWithWakeRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === 4) return response;
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    } catch (error) {
      lastError = error;
      if (attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

async function wakeBackend(): Promise<void> {
  // Render free instances can return 502 while booting. Wake the service
  // before sending the multipart upload so the upload is not the wake request.
  const response = await fetchWithWakeRetry(`${API_ROOT}/health`, { method: 'GET' });
  if (!response.ok) throw new Error(`Backend unavailable: HTTP ${response.status}`);
}

/**
 * Send a file to the backend for local identity-clue analysis.
 *
 * @param file - The raw File object from the reporter's upload.
 * @returns AnalysisManifest with candidates for review.
 *
 * Throws on network errors or server-side failures (HTTP 4xx/5xx).
 */
export async function scanFile(file: File): Promise<AnalysisManifest> {
  const category = inferCategory(file);
  if (category === 'unknown') {
    return {
      file_name: file.name,
      file_category: 'unknown',
      state: 'unsupported',
      image_width: null,
      image_height: null,
      faces: [],
      texts: [],
      metadata: [],
      notes: [
        `File type "${file.type || file.name.split('.').pop()}" is not supported for automated analysis.`,
        'The original file is preserved unchanged.',
      ],
    };
  }

  const form = new FormData();
  form.append('file', file);
  form.append('category', category);

  await wakeBackend();
  const resp = await fetchWithWakeRetry(`${API_BASE}/scan`, {
    method: 'POST',
    body: form,
  });

  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse error
    }
    throw new Error(`Scan failed: ${detail}`);
  }

  return resp.json() as Promise<AnalysisManifest>;
}

/**
 * Request a sanitized derivative from the backend.
 *
 * @param file - The original File object.
 * @returns Blob of the protected derivative.
 *
 * The original file is never modified.
 */
export interface ProtectionPlan {
  regions: (BoundingBox & { page_index?: number | null })[];
  terms: string[];
  audio: 'mute' | 'intervals' | 'keep';
  intervals: { start: number; end: number }[];
  protect_video: boolean;
}

export async function sanitizeFile(file: File, plan: ProtectionPlan): Promise<{ blob: Blob; receipt: string; warnings: string[] }> {
  const category = inferCategory(file);

  const form = new FormData();
  form.append('file', file);
  form.append('category', category);
  form.append('plan', JSON.stringify(plan));

  const resp = await fetchWithWakeRetry(`${API_BASE}/sanitize`, {
    method: 'POST',
    body: form,
  });

  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      if (body.detail?.message) {
        detail = body.detail.message;
      } else if (typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(`Sanitize failed: ${detail}`);
  }

  const warnings: string[] = [];
  const warning = resp.headers.get('X-VeilProof-Warning');
  if (warning) warnings.push(warning);

  const blob = await resp.blob();
  const receipt = resp.headers.get('X-VeilProof-Receipt');
  if (!receipt) throw new Error('Protected copy receipt is missing.');
  return { blob, receipt, warnings };
}
