// Headless API client for the VeilProof backend.
// Base URL comes from VITE_API_BASE_URL (public, non-secret). Never place credentials in URLs.
// Production uses the Vercel same-origin proxy; localhost may use the Vite
// proxy or an explicitly configured local API URL.
const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1')
  : '/api/v1';
export interface ApiErrorShape {
  code: string;
  safe_message: string;
  request_id: string;
  retryable: boolean;
  field_errors: { field: string; message: string }[];
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;
  readonly retryable: boolean;
  readonly fieldErrors: { field: string; message: string }[];

  constructor(status: number, body: Partial<ApiErrorShape>) {
    super(body.safe_message ?? 'Request failed');
    this.status = status;
    this.code = body.code ?? 'error';
    this.requestId = body.request_id ?? '';
    this.retryable = body.retryable ?? false;
    this.fieldErrors = body.field_errors ?? [];
  }
}

type Json = Record<string, unknown>;

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string>; raw?: BodyInit } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  let body: BodyInit | undefined = options.raw;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  if (!res.ok) {
    let parsed: Json = {};
    try {
      parsed = (await res.json()) as Json;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, parsed as Partial<ApiErrorShape>);
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return (await res.json()) as T;
  return (await res.arrayBuffer()) as unknown as T;
}

export const api = {
  uploadPolicy: () => request<{ max_file_bytes: number; max_items: number }>('GET', '/public/upload-policy'),
  // Meta
  brokerKey: () =>
    request<{ key_id: string; wrap: string; operator_id: string; public_key_pem: string }>(
      'GET', '/public/broker-key',
    ),
  verifyConfig: () => request<Json>('GET', '/verify/config'),

  // Intake
  createIntake: () => request<{ intake_id: string; capability: string; expires_at: string }>('POST', '/intakes'),
  intakeState: (id: string, capability: string) =>
    request<Json>('GET', `/intakes/${id}/state`, { headers: { 'X-Intake-Capability': capability } }),
  reserveObject: (
    id: string,
    capability: string,
    body: { kind: 'original' | 'derivative'; category: string; expected_size: number },
  ) =>
    request<{ object_id: string; version_id: string; max_bytes: number; expires_at: string }>(
      'POST', `/intakes/${id}/objects`, { body, headers: { 'X-Intake-Capability': capability } },
    ),
  uploadContent: (id: string, objectId: string, capability: string, ciphertext: ArrayBuffer) =>
    request<Json>('PUT', `/intakes/${id}/objects/${objectId}/content`, {
      raw: ciphertext, headers: { 'X-Intake-Capability': capability },
    }),
  completeObject: (id: string, objectId: string, capability: string, body: Json) =>
    request<Json>('POST', `/intakes/${id}/objects/${objectId}/complete`, {
      body, headers: { 'X-Intake-Capability': capability },
    }),
  finalize: (id: string, capability: string, idempotencyKey: string, body: Json) =>
    request<{
      case_id: string; case_reference: string; accepted_at: string; attachment_count: number;
      proof_status: string; priority: string; evidence_ids?: string[];
    }>('POST', `/intakes/${id}/finalize`, {
      body,
      headers: { 'X-Intake-Capability': capability, 'Idempotency-Key': idempotencyKey },
    }),

  // Tracking
  createTrackingSession: (caseReference: string, trackingSecret: string) =>
    request<{ session_token: string; expires_at: string }>('POST', '/tracking/sessions', {
      body: { case_reference: caseReference, tracking_secret: trackingSecret },
    }),
  trackingStatus: (token: string) => request<Json>('GET', '/tracking/status', { headers: { Authorization: `Bearer ${token}` } }),
  proofPackage: (token: string) => request<{ package: Json }>('POST', '/tracking/proof-package', { headers: { Authorization: `Bearer ${token}` } }),

  // Verify
  verifyProof: (pkg: Json, candidates: { original_sha256?: string; protected_sha256?: string }) =>
    request<Json>('POST', '/verify/proof', { body: { package: pkg, candidates } }),

  // Staff
  staffLogin: (username: string, password: string) =>
    request<{ token: string; expires_at: string; investigator: unknown }>('POST', '/staff/sessions', {
      body: { username, password },
    }),
  staffMe: (token: string) => request<Json>('GET', '/staff/me', bearer(token)),
  staffLogout: (token: string) => request<Json>('DELETE', '/staff/sessions/current', bearer(token)),
  staffCases: (token: string) => request<unknown[]>('GET', '/staff/cases', bearer(token)),
  staffCase: (token: string, caseId: string) => request<Json>('GET', `/staff/cases/${caseId}`, bearer(token)),
  privacyQueue: (token: string) => request<unknown[]>('GET', '/staff/privacy/queue', bearer(token)),
  officers: (token: string) => request<unknown[]>('GET', '/staff/officers', bearer(token)),
  staffAction: (token: string, path: string, body?: unknown) =>
    request<Json>('POST', `/staff${path}`, { body, ...bearer(token) }),
  protectedContent: (token: string, versionId: string) =>
    request<ArrayBuffer>('GET', `/staff/evidence/${versionId}/protected`, bearer(token)),
  activateGrant: (token: string, grantId: string) =>
    request<{ handle: string; started_at: string | null; expires_at: string | null; mode: string; evidence_id: string }>('POST', `/staff/grants/${grantId}/activate`, bearer(token)),
  revokeGrant: (token: string, grantId: string) =>
    request<Json>('POST', `/staff/grants/${grantId}/revoke`, bearer(token)),
  viewerContent: (token: string, handle: string) =>
    request<ArrayBuffer>('POST', '/staff/viewer/content', { body: { handle }, ...bearer(token) }),
  notifications: (token: string) => request<unknown[]>('GET', '/staff/notifications', bearer(token)),
};

function bearer(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export { BASE as API_BASE };
