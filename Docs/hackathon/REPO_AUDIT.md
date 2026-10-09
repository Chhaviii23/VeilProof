# VeilProof — Repository Audit (P00A)

Audit date: 2026-10-09. Scope: the imported frontend repository plus the empty `backend/` stub.

## 1. Repository map

| Path | Role | Notes |
| --- | --- | --- |
| `frontend/` | Imported application | React + Vite + Tailwind v4 (Figma Make export). **Not** React Native / Expo / Next.js. |
| `backend/` | Backend stub | Contained only `.venv/` before this work. No application code existed. |
| `Docs/VeilProof_Antigravity_Prompt_Pack/` | Planning material | `prompts/`, `references/` (PRD, Technical Architecture, Security & Access, Project Context), `DEVELOPMENT_PLAN.md`. Read-only. |
| `Docs/hackathon/` | This handoff | Created by this run. |

## 2. Detected frontend framework (no migration)

- **React 19** + **react-dom 19**
- **Vite 8** build, `@vitejs/plugin-react`
- **react-router-dom 7** for routing
- **Tailwind CSS v4** via `@tailwindcss/vite`
- TypeScript 5.7, strict; `@` alias → `src`
- Package manager: npm/pnpm present; `.mise.toml` pins node 22 + pnpm 10.34.3
- Dev server default port `8443`
- v1 baseline build: **passes** (`npm run build`) — see PROGRESS.md.

No framework migration is performed. Layout, routes, components, and styles are preserved.

## 3. State and data architecture (as imported)

- Single `AppContext` (`src/store/AppContext.tsx`) uses `useReducer`; **all state is in-memory and resets on browser refresh.**
- `src/services/mockService.ts` is an empty stub; no network layer exists.
- `src/services/fixtures.ts` holds seed cases, demo investigators, 10 fictional ACO officers, demo evidence cards, and receipt fixtures.
- No backend URL, no fetch/axios calls, no auth token handling exist yet.
- Local JPEG/EXIF handling does **not** exist in the frontend yet (the demo cards carry pre-baked findings).

## 4. Routes → workflow map (integration seams)

| Flow | Route(s) | Component | State source | Integration seam |
| --- | --- | --- | --- | --- |
| Report details | `/report/details` | `pages/report/DetailsPage.tsx` | `useDraft` | draft → intake create |
| Risk assessment | `/report/risk` | `pages/report/RiskPage.tsx` | `useDraft` | riskFactors → intake |
| Evidence | `/report/evidence` | `pages/report/EvidencePage.tsx` | `useDraft` | evidence → upload/finalize |
| Identity protection | `/report/identity-protection` | `pages/report/IdentityProtectionPage.tsx` | `useDraft` | local demo only |
| Review & submit | `/report/review` | `pages/report/ReviewPage.tsx` | `useDraft` | finalize |
| Submitting | `/report/submitting` | `pages/report/SubmittingPage.tsx` | local | finalize polling |
| Receipt | `/report/receipt` | `pages/report/ReceiptPage.tsx` | `state.receipt` | receipt + proof package |
| Tracking | `/track`, `/track/status` | `pages/public/TrackPage.tsx`, `TrackStatusPage.tsx` | `useTrackComplaint` (local secret map) | tracking API |
| Verify | `/verify` | `pages/public/VerifyPage.tsx` | `DEMO_RECEIPT_FIXTURE` | proof verify API |
| Staff sign-in | `/investigator/sign-in` | `pages/investigator/SignInPage.tsx` | `DEMO_CREDENTIALS` (fixtures) | staff auth |
| Cases | `/investigator/cases`, `/:caseId` | `CasesPage`, `CaseDetailPage` | `state.cases` | staff cases API |
| Evidence viewer | `/investigator/cases/:caseId/evidence/:evidenceId[/:mode]` | `EvidenceViewerPage` | `state.cases` | protected / original gateway |
| Approvals (request) | `/investigator/cases/:caseId/approvals` | `ApprovalsPage` | draft | access request |
| Approval queue | `/investigator/approvals` | `ApprovalQueuePage` | `state.cases` | grants |
| Privacy queue | `/privacy-officer/queue` | `PrivacyQueuePage` | `state.cases` | privacy queue |
| Privacy review | `/privacy-officer/cases/:caseId/review` | `CasePrivacyReviewPage` | `state.cases` | release / assign / decisions |
| Oversight approvals | `/oversight/approvals` | `OversightApprovalsPage` | `state.cases` | oversight decision |
| Oversight closures | `/oversight/closures` | `OversightClosuresPage` | `state.cases` | closure decision |
| Audit | `/investigator/cases/:caseId/audit` | `AuditPage` | `state.cases[].auditTrail` | audit API |
| Account | `/investigator/account` | `AccountPage` | session | session info |
| Demo controls | `/demo` | `DemoPage` | `state.demoRole`, `demoSettings` | dev-only reset/role |

`StaffGuard` gates the whole staff workspace on `state.investigatorSession`.

## 5. Demo-only behaviors found

- **Role switcher** (`DemoPage` + `state.demoRole`) changes only a label; no identity.
- **Reset** (`RESET_DEMO`) restores fixtures — a UI reset, not durable persistence.
- `demoSettings` simulate slow submission, submission failure, pending/failed proof.
- `DEMO_CREDENTIALS` in `fixtures.ts` are **plaintext demo logins** (documented demo shortcut).
- Tracking secrets live client-side in `state.trackingSecrets` (`VP-SEED-*`).

These are recorded as demo shortcuts, not production authentication.

## 6. Asset / fixture inventory

- **No real media files** ship in the frontend bundle; evidence is metadata-only cards.
- `DEMO_EVIDENCE_ITEMS` and seed `EvidenceRecord`s reference filenames and sizes, not bytes.
- A **valid fictional JPEG with known EXIF** must be generated for the real processing path (P02B/P04B), since none exists.

## 7. Absent screens (documented gaps — NOT to be built)

- No protected-package download screen; no dedicated viewer-content component for raw bytes.
- No proof-package display separate from the receipt card (fields exist on `SubmissionReceipt`).
- No intake recovery screen (response-loss) beyond local receipt storage.
- No notification real-time channel (poll only).

## 8. Environment gaps

- No PostgreSQL server, no Docker daemon, no `psql`; `DATABASE_URL` defaults to a local SQLite adapter (explicit, documented).
- No Amoy RPC / funded signer / deployed contract.
- No Supabase project configured.
- Python venv had only Pillow/SQLAlchemy/psycopg/pytest/uvicorn; FastAPI/pydantic/cryptography/PyJWT added this run.

## 9. Smallest first backend vertical slice

`health/readiness` → durable schema → staff auth → anonymous intake (written report, no evidence) with idempotent finalize → private tracking. Evidence encryption and JPEG processing follow once the case spine is durable.
