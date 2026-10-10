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
const DEFAULT_API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api/v1'
  : 'https://veilproof-api.onrender.com/api/v1';
const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE}/analysis`;

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

  const resp = await fetch(`${API_BASE}/scan`, {
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

  const resp = await fetch(`${API_BASE}/sanitize`, {
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
