# VeilProof — Frontend Bindings Map

The imported frontend is React + Vite + Tailwind v4. This file records the existing seams the
backend binds to. **No layout/route/component redesign is authorized.** Missing screens are gaps.

## Status legend

- `BOUND` — existing handler/service now calls the backend through a headless adapter.
- `GAP` — capability exists in the backend/API but no existing UI surface expresses it.
- `LOCAL` — intentionally client-local (drafts, pre-submit preview, dev-only).
- `UNCHANGED` — no change needed.

## Reporter

| Capability | Existing surface | Backend endpoint | Status |
| --- | --- | --- | --- |
| Create intake | `SubmittingPage` (submit) | `POST /api/v1/intakes` | BOUND |
| Finalize report | `ReviewPage` / `SubmittingPage` | `POST /api/v1/intakes/{id}/finalize` | BOUND |
| Idempotency | `draft.idempotencyKey` | `Idempotency-Key` header | BOUND |
| Tracking status | `TrackPage` → `TrackStatusPage` | `POST /tracking/sessions` + `GET /tracking/status` | BOUND |
| Proof package | `ReceiptPage` / `VerifyPage` | `POST /tracking/proof-package`, `POST /verify/proof` | BOUND |
| JPEG local protection | `EvidencePage` (card scan state) | local adapter (`src/services/crypto`) | BOUND (real EXIF) |
| Evidence upload | `EvidencePage` | `POST /intakes/{id}/objects` … | BOUND for small JPEG |
| Identity selections | `IdentityProtectionPage` | never sent | LOCAL |
| Draft / preview | wizard | never sent | LOCAL |

## Staff

> Wiring status: **fully wired to the backend**. The staff surfaces receive authoritative data via `staffData.ts` (polling) and `AppContext` sync actions. Mutation wrappers post directly to the API and trigger re-syncs.

| Capability | Existing surface | Backend endpoint | Status |
| --- | --- | --- | --- |
| Sign-in | `SignInPage` | `POST /api/v1/staff/sessions` | BOUND |
| Cases list | `CasesPage` | `GET /api/v1/staff/cases` | BOUND |
| Case detail | `CaseDetailPage` | `GET /api/v1/staff/cases/{id}` | BOUND |
| Privacy queue | `PrivacyQueuePage` | `GET /api/v1/staff/privacy/queue` | BOUND |
| Release derivative | `CasePrivacyReviewPage` | `POST /staff/cases/{id}/releases` | BOUND |
| Assign officer | `CasePrivacyReviewPage` | `GET /staff/officers` + `POST /staff/cases/{id}/assignments` | BOUND |
| Original request | `ApprovalsPage` | `POST /staff/cases/{id}/access-requests` | BOUND |
| Privacy decision | `CasePrivacyReviewPage` | `POST /staff/cases/{case_id}/access-requests/{request_id}/privacy-decisions` | BOUND |
| Oversight decision | `OversightApprovalsPage` | `POST /staff/cases/{case_id}/access-requests/{request_id}/oversight-decisions` | BOUND |
| Grant open/viewer | `EvidenceViewerPage` | `POST /staff/grants/{id}/activate` + `POST /staff/viewer/content` | BOUND |
| Revoke / end | `EvidenceViewerPage` | `POST /staff/grants/{id}/revoke` / `/end` | BOUND |
| Public/internal updates | `CaseDetailPage` | `POST /staff/cases/{id}/public-updates` + `/internal-notes` | BOUND |
| Closure | `OversightClosuresPage` | `POST /staff/cases/{id}/closure-recommendations` + `/closure-decisions` | BOUND |
| Audit | `AuditPage` | `GET /staff/cases/{id}/audit` | BOUND |
| Notifications | `NotificationBell` | `GET /staff/notifications` (poll) | BOUND |
| Proof-package/derivative download UI | — | — | GAP (no existing screen) |

## Rules honored

- Server-derived provenance/proof/operation states feed existing status fields; a controlled-fixture
  result stays labelled simulated.
- One-file grants bind an exact version; opening file B is denied.
- No original DEK, tracking secret, report body, identity mapping, or key is placed in a URL or log.
- Duplicate-submit prevention remains, but backend idempotency is authoritative.
