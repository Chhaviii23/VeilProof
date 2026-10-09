# VeilProof — Hackathon API Contract (P00B)

Base path `/api/v1`. Strict Pydantic input models and output allowlists. Credentials travel in
`Authorization` headers or protected bodies; **never in URLs**.

## 1. Error shape

```json
{ "code": "conflict", "safe_message": "Request already finalized", "request_id": "...", "retryable": false, "field_errors": [] }
```

Status codes: 401 missing/expired creds; 403 denied context; 404 hidden existence; 409 state or
idempotency conflict; 413 size; 422 validation; 429 rate-limited; 503 authoritative dependency down.
Parser dumps, SQL text, object paths, and stack traces are never returned.

## 2. Lifecycle / state vocabularies

- **Complaint lifecycle:** `received_securely` → `privacy_review` → `assigned_for_investigation`
  → `under_investigation` → `additional_review_required` → `resolution_prepared` → `closed`.
- **Priority:** `standard` | `critical`.
- **Object/version:** `staging` → `complete` → `inspected` → `attached` (or `quarantined`).
- **Protection provenance:** `real` | `controlled_fixture` | `unavailable`.
- **Protected copy:** `pending_release` | `released` | `rejected` | `held`.
- **Sealed original:** `sealed` | `request_pending` | `privacy_approved` | `access_granted` | `expired` | `revoked` | `rejected` | `ended`.
- **Access request:** `privacy_review_pending` → `oversight_review_pending` → `approved` | `rejected`
  | `clarification_requested` | `expired` | `revoked` | `ended`.
- **Grant:** `approved_unused` → `active` → `expired` | `revoked` | `ended`.
- **Proof:** `pending` → `broadcast` → `confirmed` | `failed`.

## 3. Endpoints

### Intake (account-free)
| Method | Path | Body | Idempotency |
| --- | --- | --- | --- |
| POST | `/intakes` | `{operation}` | — |
| GET | `/intakes/{id}/state` | — (intake capability) | — |
| POST | `/intakes/{id}/objects` | `{kind,category,expected_size,expected_ciphertext_digest}` | — |
| PUT | `/intakes/{id}/objects/{objectId}/content` | raw ciphertext | — |
| POST | `/intakes/{id}/objects/{objectId}/complete` | `{ciphertext_digest}` | — |
| POST | `/intakes/{id}/finalize` | finalize command | `Idempotency-Key` + digest |

Finalize command: complaint details (title 10–120, description 50–5000, category, optional
incident_date/location/involved_parties), `risk_factors[]`, `tracking_ref` (`case_reference` is
server-generated), object bindings, `no_immediate_risk` exclusivity. Response returns
`{case_reference, accepted_at, attachment_count, proof_status, intake_capability}` — **never reissues
the reporter's tracking secret**.

### Tracking (reference + secret)
| POST | `/tracking/sessions` | `{case_reference, tracking_secret}` | → short-lived session token |
| GET | `/tracking/status` | Authorization: tracking session | safe projection only |
| POST | `/tracking/proof-package` | Authorization: tracking session | → private proof package |

### Verification (public, no case DB)
| POST | `/verify/proof` | `{package, candidates:{original_sha256?,protected_sha256?}}` | → local + (configured) anchor result |
| GET | `/verify/config` | — | network/contract allowlist (non-secret) |

### Staff (deny-by-default)
| POST | `/staff/sessions` | `{username,password}` → bearer session |
| GET | `/staff/me` | session info |
| DELETE | `/staff/sessions/current` | logout (invalidate jti) |
| GET | `/staff/cases` | authorized filtered list |
| GET | `/staff/cases/{id}` | case detail (role-scoped projection) |
| GET | `/staff/privacy/queue` | Privacy queue |
| POST | `/staff/cases/{id}/releases` | `{evidence_id, version_id}` |
| POST | `/staff/cases/{id}/holds` | hold derivative |
| GET | `/staff/officers` | eligible roster w/ reasons |
| POST | `/staff/cases/{id}/assignments` | `{officer_code}` |
| POST | `/staff/cases/{id}/public-updates` | `{status,text}` |
| POST | `/staff/cases/{id}/internal-notes` | `{text}` |
| POST | `/staff/cases/{id}/access-requests` | request revision |
| POST | `/staff/access-requests/{id}/privacy-decisions` | `{decision,notes}` |
| POST | `/staff/access-requests/{id}/oversight-decisions` | `{decision,notes,approved_duration_minutes?}` |
| POST | `/staff/grants/{id}/activate` | → viewer handle (no DEK/URL) |
| POST | `/staff/grants/{id}/end` | requester ends own grant |
| POST | `/staff/grants/{id}/revoke` | Privacy/Oversight revoke |
| POST | `/staff/viewer/content` | Authorization: viewer handle → bounded rendered JPEG |
| POST | `/staff/cases/{id}/closure-recommendations` | `{outcome,reporter_message}` |
| POST | `/staff/cases/{id}/closure-decisions` | `{decision:'approved'|'returned'|'reopen',reason?}` |
| GET | `/staff/cases/{id}/audit` | scoped safe audit |
| GET | `/staff/notifications` | committed staff notifications |
| GET | `/staff/evidence/{versionId}/protected` | released derivative bytes (Privacy/assigned) |

## 4. Provenance & proof fields

Server derives `provenance` (`real` for supported JPEG metadata minimization, `controlled_fixture`
for allowlisted advanced-media fixtures, `unavailable` otherwise). Clients cannot self-label.
Proof `provider` is `local_registry` or `evm`; `tx_ref` is a real local commit id / chain tx hash or
absent — never fabricated.

## 5. Idempotency & versioning

- Finalize: unique `(intake_session_id, idempotency_key)` + stored command digest; same key+digest
  returns the same result; changed digest → 409.
- Proof: unique logical identity per immutable version; retries create attempts, not new identities.
- Grants bind an exact evidence **version**; a new request revision (changed file/purpose/scope)
  invalidates prior decisions.
- Optimistic revisions on case edits (`If-Match`-style `expected_revision`).

## 6. No-secret logging policy

Request/response logging filters drop `Authorization`, `tracking_secret`, `password`, `token`,
`capability`, `key`, `dek`, and report-body fields. Tracking reference + secret are compared in
constant time and never logged.
