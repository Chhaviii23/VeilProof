/**
 * VeilProof API service for mobile app.
 * Talks to the same backend as the web frontend.
 */

// Change this to your backend URL.
// On a real device, use your computer's local IP (e.g. http://192.168.x.x:8000)
// In development with Expo Go on same Wi-Fi, use your machine's local IP.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type ReportCategory =
  | 'corruption'
  | 'financial_misconduct'
  | 'workplace_misconduct'
  | 'safety_concern'
  | 'other';

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  corruption: 'Corruption',
  financial_misconduct: 'Financial misconduct',
  workplace_misconduct: 'Workplace misconduct',
  safety_concern: 'Safety concern',
  other: 'Other',
};

export const RISK_LABELS: Record<string, string> = {
  no_risk: 'No immediate risk',
  workplace_retaliation: 'Workplace retaliation',
  job_threat: 'Job termination threat',
  physical_threat: 'Physical threat',
  family_threat: 'Family threat',
  public_safety: 'Public safety danger',
};

async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; token?: string; capability?: string; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.token) headers['Authorization'] = `Bearer ${options.token}`;
  if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (options?.capability) headers['X-Intake-Capability'] = options.capability;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = JSON.parse(text)?.safe_message ?? JSON.parse(text)?.detail ?? msg; } catch {}
    throw new Error(msg);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export interface IntakeSession {
  intake_id: string;
  capability: string;
  expires_at: string;
}

export interface SubmitReceiptResponse {
  case_id: string;
  case_reference: string;
  accepted_at: string;
  attachment_count: number;
  proof_status: string;
  priority: string;
}

export interface TrackStatusResponse {
  case_reference: string;
  status: string;
  priority: string;
  protection_summary: {
    evidence_count: number;
    metadata_fields_removed: number;
    provenance: string;
  };
  proof_summary: {
    proof_status: string;
    provider: string | null;
    tx_ref: string | null;
    network: string | null;
  };
  public_updates: { id: string; status: string; text: string; added_at: string }[];
  updated_at: string;
}

export interface VerifyResponse {
  schema_ok: boolean;
  original_match: boolean | null;
  protected_match: boolean | null;
  commitment_match: boolean;
  supplied_scope: string;
  anchor: Record<string, unknown>;
}

export const api = {
  createIntake: () => request<IntakeSession>('POST', '/intakes'),

  finalizeReport: (intakeId: string, capability: string, idempotencyKey: string, body: {
    title: string;
    description: string;
    category: ReportCategory;
    incident_date?: string;
    location?: string;
    involved_parties?: string;
    risk_factors: string[];
    no_immediate_risk: boolean;
    tracking_secret: string;
    objects: unknown[];
  }) => request<SubmitReceiptResponse>('POST', `/intakes/${intakeId}/finalize`, {
    body,
    capability,
    idempotencyKey,
  }),

  trackSession: (case_reference: string, tracking_secret: string) =>
    request<{ session_token: string; expires_at: string }>('POST', '/tracking/sessions', {
      body: { case_reference, tracking_secret },
    }),

  trackStatus: (token: string) =>
    request<TrackStatusResponse>('GET', '/tracking/status', { token }),

  verifyProof: (pkg: unknown) =>
    request<VerifyResponse>('POST', '/verify/proof', { body: { package: pkg, candidates: {} } }),

  proofPackage: (token: string) =>
    request<{ package: unknown }>('GET', '/tracking/proof-package', { token }),
};
