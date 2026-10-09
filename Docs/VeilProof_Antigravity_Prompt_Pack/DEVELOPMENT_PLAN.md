# VeilProof — End-to-End Hackathon Development Plan and Antigravity Prompts

**Version:** 1.0  
**Date:** 9 October 2026  
**Starting point:** The frontend already exists and has been imported.  
**Scope:** Backend, persistence, evidence processing, cryptography, controlled access, blockchain, existing-UI integration, tests, deployment preparation, and judge demonstration.  
**Excluded:** Frontend design, new screen generation, styling, component redesign, navigation redesign, or migration of the imported frontend to another framework.

## 1. What this plan delivers

Build a connected, fictional-data hackathon application in which a reporter submits a protected complaint, staff receive the same durable case, Privacy releases protected evidence and assigns an investigator, the investigator requests a specific original, Privacy recommends, Oversight independently approves, and server-enforced access expires or is revoked. The reporter tracks safe updates, while an independent verifier checks an integrity receipt.

The plan follows the existing PRD, Technical Architecture, and Security and Access documents, but implements a deliberately smaller **hackathon execution profile**. It does not attempt the complete production roadmap in one event.

The imported frontend repository is not present in this documentation workspace. Accordingly, Phase 0 tells Antigravity to discover its real framework, routes, fixtures, stores, and API seams. Do not assume that the imported code is Expo, Vite, Next.js, or connected to a backend until inspected.

**Integration is included; frontend construction is not.** Existing handlers, services, hooks, types, session logic, and data bindings may change to call the backend. Existing layout, styles, routes, and components remain intact. A missing screen is a documented integration gap with an API/test demonstration; these prompts do not authorize inventing a replacement frontend.

## 2. How to use the prompt pack

1. Open the actual imported application repository in Antigravity, not this documentation-only folder.
2. Make these reference documents available in that workspace: `VeilProof_PRD_v1.0.md`, `VeilProof_Technical_Architecture_v1.0.md`, and `VeilProof_Security_and_Access_v1.0.md`. Copy them to an ordinary `docs/reference/` folder if needed; leave any synced `sources/` files unchanged.
3. Paste **MASTER** once at the start. It establishes the working contract.
4. Paste the phase prompts sequentially: P00A, P00B, P01A, and so on. Finish each subphase's check before moving on.
5. At the start of a new Antigravity conversation, paste MASTER again, then R01 to resume from saved progress. Do not rerun migrations or replace completed code merely because conversation history is missing.
6. Use R02 for a failed check, R03 for missing external configuration, and R04 when time is short.

The prompts are plain chat prompts; they do not depend on a particular slash command or model. Antigravity supports agent work and workspace rules, but rule locations and activation depend on the installed surface/version. Keep MASTER available as a normal document and use the documented rules interface only if desired. [Antigravity agent documentation](https://www.antigravity.google/docs/agent/), [rules documentation](https://www.antigravity.google/docs/rules/)

Do not paste account passwords, database credentials, wallet keys, or backend secrets into chat. Put them in ignored local configuration or the selected platform's secret manager. Antigravity should report variable names and missing capabilities, never values.

## 3. Hackathon scope and explicit shortcuts

| Build for real | Controlled demonstration only | Defer |
| --- | --- | --- |
| PostgreSQL case/workflow persistence | Name/face/speaker selection against bundled fictional fixtures | Production anonymity gateway |
| Staff authentication and server permission checks | Advanced PDF/audio/video sanitization unless actually implemented | HSM/threshold custody |
| Real JPEG EXIF inspection and derivative verification | Fictional bridge case, threat classification, and officer roster | Government integrations |
| Client-side hashing/encryption for supported JPEGs | Fixture role switcher in local-only mode | Legal/compliance certification |
| Ciphertext storage and separate original/derivative versions | Media fixtures whose transformation provenance is explicitly fixture-based | Full multilingual release |
| Sequential independent decisions and timed grants | Fast expiry using short local-demo durations | Full forensic analysis/export |
| Public/internal update separation and audit | Fixture-only fallback for unavailable codecs, marked unavailable/simulated | Automated guilt/credibility assessment |
| Actual commitment/verification on local chain, then Amoy when configured | No fake successful Amoy transactions | Enterprise analytics and broad media pipelines |

Use one modular FastAPI backend, one PostgreSQL database, private object storage, and worker processes from the same codebase. Keep the key-use/gateway modules narrow and separate, but do not spend the hackathon orchestrating an unnecessary fleet of microservices.

For the fictional-data profile, local development wrapping keys may be generated into an ignored directory with restricted access. This is not production KMS custody. Narrow automated staging inspection may decrypt in a bounded worker to validate files; it never provides a human original-preview bypass. Record these as hackathon decisions without marking the source documents' pilot approvals complete.

**Two tracks must stay distinguishable:** real supported processing and allowlisted controlled fixtures. The server assigns provenance from its processing result or known fixture ID/hash; clients cannot self-label arbitrary files as successfully protected.

## 4. Before coding: dependencies and configuration

| Need | Local path | External path / responsibility |
| --- | --- | --- |
| Imported frontend | Existing repository and its installed package manager | User supplies repository if not available |
| Python/Node | Detect supported versions; pin dependencies | Do not replace working toolchains without reason |
| Database/auth/storage | Local Supabase where Docker is available | Supabase project if user already has one |
| Alternative local fallback | PostgreSQL + private local ciphertext adapter and test-only identity provider | Explicit adapter selection, never silent fake Supabase |
| Blockchain | Local Hardhat chain | Amoy RPC, funded testnet relayer, deployed contract |
| Signing/key material | Locally generated development secrets in ignored files | Platform secret manager for hosted demo |
| Hosting | Local launch always supported | Use configured provider; no paid resource creation without authorization |
| Media fixtures | Inspect existing bundle first | Use valid synthetic fictional assets if needed; do not substitute renamed text files |

Suggested variable names, adapted to existing configuration:

`APP_ENV`, `RUN_PROFILE`, `DATABASE_URL`, `STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STAFF_AUTH_ISSUER`, `STAFF_AUTH_AUDIENCE`, `TRACKING_PEPPER_FILE`, `KEY_BROKER_PRIVATE_KEY_FILE`, `KEY_BROKER_PUBLIC_KEY_ID`, `PROOF_BACKEND`, `CHAIN_ID`, `RPC_URL`, `RELAYER_KEY_FILE`, `COMMITMENT_CONTRACT_ADDRESS`, `ALLOWED_ORIGINS`, and the existing frontend's public API-base variable.

Do not expose any backend secret through a frontend environment prefix. A public API URL or publishable identity-provider configuration is different from a service key. Generate `.env.example` with names and harmless placeholders only.

Local Supabase setup is supported by its official tooling; availability still depends on the machine. [Supabase local development](https://supabase.com/docs/guides/local-development). Validate actual network configuration against [Polygon's documentation](https://docs.polygon.technology/pos/reference/rpc-endpoints); never invent a contract address or successful transaction.

## 5. Phase map, dependencies, and time management

This is a sequencing plan, not a guarantee that a new team can implement all security mechanisms in 24 hours. Time estimates depend heavily on imported-code quality and external setup. Reserve the final 20–25% of remaining time for integration, denial tests, and rehearsal.

| Phase | Subphases | Outcome | Depends on |
| --- | --- | --- | --- |
| 0 | A: audit; B: contracts/scope | Existing UI mapped to an agreed backend boundary | Imported repo |
| 1 | A: runtime; B: schema | Bootable backend and durable schema | Phase 0 |
| 2 | A: staff identity; B: fixtures | Independent staff principals and reproducible fictional data | Phase 1 |
| 3 | A: intake; B: tracking; C: audit/jobs | Accepted report → durable case → private status | Phases 1–2 |
| 4 | A: crypto; B: JPEG protection; C: ciphertext intake | Real supported evidence pipeline | Phases 1–3 |
| 5 | A: privacy release; B: assignment; C: updates/oversight | Complete ordinary investigation flow | Phases 2–4 |
| 6 | A: original request/reviews; B: gateway/expiry | Specific original opens only after independent decisions | Phases 4–5 |
| 7 | A: protocol/verifier; B: contract; C: relayer/Amoy | Actual independently checkable evidence commitment | Phases 3–4; 7C needs 7A/B |
| 8 | A: reporter bindings; B: staff bindings | Existing frontend connected without redesign | Corresponding backend phases |
| 9 | A: system tests; B: adversarial repair | Proven end-to-end happy and denied paths | Phases 3–8 |
| 10 | A: packaging/configuration; B: release smoke | Repeatable local/hosted judge environment | Phase 9 |
| 11 | A: rehearsal; B: handoff | Judge script, backup evidence, final capability inventory | Phase 10 |

Suggested use of a 24-hour window: 2 hours for Phase 0/setup; 4 for durable intake/auth; 4 for the real JPEG path; 4 for ordinary/original workflows; 3 for proof; 3 for bindings; 4 for tests/deployment/rehearsal. This is an aggressive planning envelope, not an engineering estimate. If it does not fit, retain the smaller truthful vertical slice described in Section 20; do not delete authorization tests to preserve a larger feature list.

## 6. MASTER — persistent working contract

Paste this first. The subphase prompts rely on it.

```text
You are implementing VeilProof's hackathon backend and connecting it to an EXISTING, already imported frontend. Do the requested implementation, not just an explanation. Execute only the current subphase and its necessary prerequisites; do not redesign the application or begin unrelated later phases.

Read applicable repository instructions and locate the PRD, Technical Architecture, Security and Access document, and hackathon plan by filename. Treat sources/ as read-only. Detect the actual frontend framework; do not migrate it to React Native, Expo, Next.js, or another stack simply because a reference document mentions it. Preserve existing layout, styles, routes, and components. Frontend edits are limited to existing service/hook/type/handler/auth/data bindings. Missing UI is a documented gap, not permission to build screens.

Use a modular FastAPI backend, PostgreSQL, private ciphertext storage, server-side staff authorization, separate original/derivative records, sequential Privacy and Oversight decisions, and a walletless proof worker. Reuse compatible existing backend code and configuration. Never replace working code just to match an imagined folder layout.

All hackathon inputs are fictional. Implement real JPEG metadata protection, hashing, encryption, durable cases, access control, and proof verification. Advanced media protection can use known fixtures with explicit provenance; never mark arbitrary uploads sanitized or confirmed by simulation. No fake transaction hashes, explorer links, passing test reports, or production-security claims.

Three distinct human principals are required for requester, Privacy review, and Oversight decision. Check permissions on the server. One-file grants never unlock other originals. Keep original DEKs out of investigator clients. Never expose tracking credentials, identity-selection mappings, keys, report bodies, or evidence in URLs/logs. Separate reporter-safe updates from internal notes.

For this fictional-data hackathon profile, document development-only local key custody and bounded automated inspection as explicit shortcuts. Do not mark pilot security approvals complete. Do not add a human original-view bypass. Do not implement production KMS, Tor, threshold cryptography, legal integrations, or new frontend screens.

Maintain docs/hackathon/PROGRESS.md, DECISIONS.md, FRONTEND_BINDINGS.md, ENVIRONMENT.md, and TEST_RESULTS.md. Record completed prompt IDs, actual commands/checks, failures, blockers, and next step. Never store secrets there. Inspect git state and preserve unrelated changes. Use reversible changes; no destructive database reset, force push, account change, paid resource creation, or public deployment without existing authorization. Local dev generation/testing is authorized by this task. Never ask me to paste secrets into chat.

At each subphase, implement the requested scope, run relevant checks, fix failures within scope, then summarize: changed behavior, files/modules touched, actual checks, remaining blockers, and next prompt ID. Tests not run are NOT RUN. Missing external credentials block only dependent live checks; complete local work and provide exact variable names/next steps. Do not silently substitute mocks for a live integration. Use the installed Antigravity permission/review controls; do not attempt to bypass them.
```

## 7. Phase 0 — inspect and establish contracts

### 0A. Repository audit and frontend preservation

**Depends on:** MASTER and imported repository.  
**Output:** Repository map, baseline build result, UI-to-service map, environment gaps.  
**Gate:** Antigravity can name actual files for each existing workflow; no guessed frontend architecture.

```text
PROMPT P00A — Audit the imported VeilProof repository. Apply MASTER.

Inspect repository instructions, git status, package manifests, routes, stores, fixtures, upload/receipt code, role switching, current API calls, tests, and any existing backend. Run the current frontend's documented baseline build/type check without changing layout or components. Record pre-existing failures separately.

Create docs/hackathon/REPO_AUDIT.md and FRONTEND_BINDINGS.md. For each reporter and staff flow, identify its actual route/file, handler, state source, mock data, expected request/response fields, and an appropriate integration seam. Cover details/risk, evidence, protection, submission/receipt, tracking, verification, privacy queue, assignment, cases/notes, original requests, oversight, audit, and countdown. Record absent screens as gaps; do not create them.

Identify whether frontend-only in-memory role changes or reset-on-refresh behavior currently exist. Check which evidence files are real playable/viewable fixtures and which are placeholders. Inventory secrets by variable name only. Create PROGRESS.md and ENVIRONMENT.md with readiness and missing dependencies. Do not install a new frontend or implement the backend yet. End with the exact adaptation strategy for this repository and the smallest first backend vertical slice.
```

### 0B. Freeze hackathon API contracts and decisions

**Depends on:** P00A.  
**Output:** DTOs/contract map, phase checklist, scope decisions.  
**Gate:** Backend and imported UI have one explicit mapping; demo and actual processing are distinguishable.

```text
PROMPT P00B — Define the implementation boundary from the actual audit. Apply MASTER.

Create docs/hackathon/API_CONTRACT.md and DECISIONS.md. Map existing frontend types to backend DTOs without changing UI design. Define separate case lifecycle, protection, release, proof, request, and grant states. Define safe reporter responses independently from staff DTOs. Specify endpoints for intake, ciphertext uploads, finalize, tracking, privacy releases, assignment, updates/notes, original requests/decisions, grant activation/content/revoke, audit, and proof packages.

Select one local persistence/auth/storage path based on installed tools and existing configuration. Prefer Supabase if already usable; otherwise document explicit local adapters rather than pretending to connect. Keep interfaces replaceable. Record hackathon-only defaults: fictional data, local development wrapping-key custody, automated job-scoped inspection, first-open grant activation, 24-hour unused approval, real JPEG path, allowlisted advanced-media fixtures, and no production-security claim. These do not approve a real pilot.

Define server-controlled processing provenance and proof provider fields. Distinguish fixture UI reset from durable backend persistence. Draft strict error shapes, idempotency rules, version binding, and no-secret logging policy. Mark unsupported UI fields/capabilities honestly. Update progress with a phase checklist and implementable module boundaries; avoid enterprise infrastructure work.
```

## 8. Phase 1 — backend foundation and database

### 1A. Runtime, configuration, and health

**Depends on:** P00B.  
**Output:** Runnable backend, validated settings, ignored secrets, health tests.  
**Gate:** Backend starts locally without frontend redesign; invalid configuration fails clearly.

```text
PROMPT P01A — Implement the backend runtime. Apply MASTER and P00B decisions.

Create or extend the existing FastAPI backend with pinned compatible dependencies, typed settings, modular routers/services/repositories, database session management, safe error handling, and request correlation IDs. Add health and readiness endpoints that expose no credentials. Readiness reports real dependency status; it must not report success for an unavailable database.

Add .env.example with placeholders, ignored local secret paths, origin allowlisting, upload/body limits, and logging filters that exclude credentials and report content. Preserve the imported frontend package manager and directory structure. Add reproducible local startup instructions and dependency checks for the selected database/storage/auth adapters.

Separate RUN_PROFILE and PROOF_BACKEND configuration. Production-like configuration must refuse demo role bypasses, fake proofs, or development secrets. Include meaningful settings, health, error-redaction, and startup tests. Run them and record exact results. Do not implement screens or create paid cloud resources. If external services are unavailable, complete a runnable local configuration and clearly report the blocked adapter.
```

### 1B. Migrations, constraints, and persistence

**Depends on:** P01A.  
**Output:** Versioned schema and repository layer.  
**Gate:** Migration works on a disposable database; invalid associations and duplicates are rejected.

```text
PROMPT P01B — Implement the durable domain schema and migrations. Apply MASTER.

Use the architecture as the entity baseline, scaled to one operator: staff memberships/human principals, intake sessions, complaints, tracking verifiers, upload objects, evidence items/immutable versions, inspection results, protected releases, assignments, request revisions, decisions, grants, internal notes, public updates, protection tasks, proofs/private proof inputs, audit, and outbox jobs. Merge tables only if security boundaries and history remain explicit.

Add foreign keys, operator/case consistency, unique reference/idempotency constraints, one active assignment, one active item per evidence category, exact-version grants, UTC timestamps, and optimistic revisions. Restrict runtime privileges and sensitive-schema exposure. If using Supabase, define and test RLS/privileges; never put a service key in the client. No original keys or plaintext tracking secrets in tables.

Create repositories/transaction boundaries and tests for duplicate constraints, cross-case associations, immutable completed versions, and rollback. Apply migration to an explicitly disposable local test database. Do not reset any existing database without authorization. Produce migration/run/rollback documentation and confirm persistence survives backend restart.
```

## 9. Phase 2 — staff identity and fictional fixtures

### 2A. Real staff authentication and permissions

**Depends on:** P01B.  
**Output:** Staff sessions, principal mapping, authorization tests.  
**Gate:** Changing a client role field cannot grant permission.

```text
PROMPT P02A — Implement staff authentication and server authorization. Apply MASTER.

Connect the selected auth provider. If Supabase is configured, validate its issuer/audience/signatures and current server membership; use invite/seeded accounts, not public staff registration. If unavailable, use an explicit test-only provider with separate seeded credentials, server sessions, password hashing, and no hardcoded universal role token. It must be impossible to enable that adapter in production-like configuration.

Model role and human_principal_id separately. Implement deny-by-default policies for Privacy, assigned Investigator, and scoped Oversight. Do not infer role from request fields or a frontend role switch. Add current-session checks, logout invalidation, permitted role/session projections, safe errors, and configurable session limits. Prefer same-origin secure cookie handling for web where compatible; document CSRF and native differences.

Test missing/expired token, tampered role, inactive membership, cross-case access, same human with two accounts, and logout. Implement backend separation now even if existing UI still uses mocks. Keep MFA readiness documented; do not describe an unimplemented provider capability as live.
```

### 2B. Seed repeatable data and valid assets

**Depends on:** P02A.  
**Output:** Non-destructive demo seed, fixture manifest, staff/roster setup.  
**Gate:** Seeding twice does not duplicate cases; files decode as their declared types.

```text
PROMPT P02B — Build reproducible fictional data and fixture inventory. Apply MASTER.

Create an idempotent seed for one fictional authority; distinct Privacy, Investigator, and Oversight human principals; ten fictional officers with expertise/workload/availability/conflicts; recommended ACO-04 and ineligible conflicted ACO-09. Add the three baseline sample cases. Reserve VP-2026-1048 for the canonical bridge walkthrough without colliding with new references.

Reuse valid existing PDF/image/audio/video assets where available. Add a generated fictional JPEG with known EXIF fields for the real processing test. Build a manifest of fixture IDs, hashes, MIME, supported operation, and actual versus simulated transformations. Do not create fake media by renaming text or generate accusations about real people. If audio/video assets/codecs are unavailable, record that gap and keep the core original-access demo on a supported JPEG.

Create a protected local-demo reset command scoped to demo-tagged rows and objects, with dry-run scope and environment refusal for production-like targets. Never delete an entire database or unrelated data. Staff credentials come from ignored configuration and must not be printed in logs/docs. Test repeat seeding, fixture hashes/types, conflict roster, and reset refusal outside the demo profile.
```

## 10. Phase 3 — durable submission, receipts, and jobs

### 3A. Complaint intake and acceptance

**Depends on:** Phases 1–2. Evidence is initially absent; add actual attachment binding in P04C.  
**Output:** Real no-evidence submission API and critical-risk queue entry.  
**Gate:** Duplicate requests create exactly one complaint.

```text
PROMPT P03A — Implement anonymous intake and idempotent complaint acceptance. Apply MASTER.

Implement create-intake, authorized intake status/recovery, and finalize endpoints for written complaints first. Validate title 10–120, description 50–5000, category, optional past incident date, and risk selections. No reporter identity/account fields. Generate opaque intake capabilities and case identifiers. No-immediate-risk must be exclusive with threat selections.

Prepare a local client-generated tracking secret contract, but process it only in a protected request and store a server-keyed verifier. Accept original secret transiently; never make the stored verifier a login bearer. Preserve a separate intake capability for response-loss recovery. Finalize transactionally creates complaint, safe public milestone, privacy queue state, Critical protection task when appropriate, audit, and outbox entries.

Require idempotency key plus matching command digest and intake authorization. Same key/digest returns the existing result; changed digest returns conflict. Accept a written report without evidence and never claim metadata was removed. Pending blockchain proof cannot block acceptance. Test validation, duplicate concurrent finalize, rollback, response recovery, cross-intake access, and Critical task creation. Leave a strict version-binding extension point for P04C.
```

### 3B. Tracking and private receipt contracts

**Depends on:** P03A.  
**Output:** Safe tracking session/API and versioned receipt data.  
**Gate:** A valid reference without the secret reveals nothing; internal data never enters the response.

```text
PROMPT P03B — Implement private reporter tracking and receipt contracts. Apply MASTER.

Create reference+secret authentication with constant-time verifier comparison, safe rate limits, generic failures, and a short-lived complaint-scoped session. Do not expose case existence through distinct errors. Implement safe tracking DTOs containing only permitted timeline, public status, protection/proof summaries, and update time. No staff names, internal notes, original-access details, or evidence previews.

Define versioned private tracking receipt data for local creation/download by the existing UI; the service never reissues a stored plaintext secret. Define a separate proof-package contract without tracking credentials, initially Pending until Phase 7. Explicitly support no-evidence submission without inventing a file proof. Lost intake/secret recovery must not become an email/support bypass.

Test wrong reference/secret, enumeration behavior, session expiry, internal-field serialization, explicit receipt parsing, and idempotent recovery without secret logging. Use canary secrets in tests to inspect errors/logs. Do not build receipt or tracking screens; provide typed contracts for their existing bindings.
```

### 3C. Durable audit, outbox, and notifications

**Depends on:** P03A/B.  
**Output:** Reliable worker loop and safe audit endpoints.  
**Gate:** Worker replay cannot duplicate business actions or public timeline events.

```text
PROMPT P03C — Implement the transactional audit and worker foundation. Apply MASTER.

Persist safe audit and outbox events atomically with domain changes. Provide scoped staff audit queries and safe notification records. Exclude reporter selections, tracking secrets, evidence, private proof inputs, and free-form complaint text from event payloads/logs. Detailed justifications stay in restricted records referenced by ID.

Build a small PostgreSQL-backed worker with leases, bounded retries/backoff, deduplication, safe failures, and a dead-letter state. Use queue locking only for job claiming; do not treat skipped rows as an authoritative permission decision. Include domain event IDs and aggregate revision. Staff polling should discover committed notifications without requiring WebSockets or a new UI.

Test crash/retry, duplicate delivery, audit rollback, unauthorized audit queries, and no duplicate public milestones. Add a clearly documented worker start/health command. Do not claim administrator-proof audit immutability or implement a complex external checkpoint service for the hackathon; record that limitation.
```

## 11. Phase 4 — actual supported evidence protection

### 4A. Shared crypto profile and test vectors

**Depends on:** P00B and working backend.  
**Output:** Headless crypto adapter and interoperable envelopes.  
**Gate:** Actual client-generated ciphertext decrypts in the approved worker; altered envelopes fail.

```text
PROMPT P04A — Implement crypto primitives and the envelope protocol, without frontend redesign. Apply MASTER.

Build a headless crypto adapter compatible with the imported frontend runtime. Implement CSPRNG, SHA-256 over exact bytes, per-version AES-256-GCM keys, 12-byte nonce, 16-byte tag, architecture-defined immutable AAD, and approved key wrapping to a development broker public key. Original and derivative use different keys. Keep private wrapping keys in ignored restricted local files, never client bundles or the workflow database.

Use vetted installed libraries and verify actual browser/native API support; do not migrate the frontend or write cryptographic primitives. Pin a concrete versioned wire format. If RSA-OAEP interoperability is unsupported, report the precise blocker instead of uploading a raw DEK to an improvised endpoint. Add server broker/worker helper boundaries; the public case API cannot return original keys.

Create fixed non-secret cross-language vectors and run round-trip tests between the actual frontend runtime and Python. Test wrong tag/key/AAD/version, truncation, wrong object binding, and independent original/derivative keys. No plaintext before authentication succeeds. Record memory/size limits and explicitly defer large-media streaming crypto.
```

### 4B. Real JPEG protection plus fixture provenance

**Depends on:** P04A and P02B.  
**Output:** Supported metadata scan/derivative; honest fixture adapter.  
**Gate:** Independent inspection confirms claimed seeded metadata removal; original remains byte-identical.

```text
PROMPT P04B — Implement the real JPEG Privacy Guardian pipeline. Apply MASTER.

Use a headless client service invoked later by the existing evidence handler. Read the seeded and arbitrary supported JPEG bytes, inspect supported EXIF fields, preserve exact original, normalize orientation appropriately, create a distinct metadata-minimized derivative, compute separate hashes, and return typed findings/protection results. Preview data stays local. Reinspect the derivative independently and preserve meaningful orientation/dimensions; do not claim lossless original transformation.

Do not upload reporter-to-clue relationships. Advanced name/face/voice/video protection uses only known allowlisted fixtures and returns processing provenance=controlled_fixture. Actual JPEG metadata success is not a claim that visible faces/names were removed. Unknown/failed/unsupported operations cannot return Protected. Fixture hashes and IDs are validated server-side later; no client-selected flag grants protection status.

Test seeded GPS/device/author cases where supported, metadata absence after processing, exact original preservation, malformed image, orientation, cancellation/replacement, and unsupported inputs. Do not add an ML service or change any screen. Document the exact supported field/format limits and what remains simulated.
```

### 4C. Ciphertext upload, inspection, and accepted evidence

**Depends on:** P03A, P04A/B.  
**Output:** Real encrypted storage bound to accepted cases.  
**Gate:** Stored objects contain ciphertext; unvalidated or foreign versions cannot be attached/released.

```text
PROMPT P04C — Implement ciphertext intake and controlled validation. Apply MASTER.

Add intake-scoped object reservation, header-authorized bounded ciphertext upload, completion/digest lock, and immutable version records. Use private configured storage; provide an explicit local ciphertext adapter for unavailable hosted storage. No original filenames in remote paths, public buckets, upserts, plaintext debug files, or bearer tokens in URLs.

Implement the documented fictional-data automated inspection worker: job-bound original/derivative IDs, short lease, restricted broker unwrap, authenticated plaintext verification, type/decode/resource checks, and safe inspection results. It must have no human original-preview endpoint. Check original/derivative hashes and server-derive provenance from actual processing or known fixture manifest. Label the development trust boundary honestly.

Extend finalize to bind only completed inspected versions belonging to its intake. Enforce one active item per category, no-evidence acceptance, quarantine behavior, and replacement/version rules. Accept HTTPS references as canonical records without fetching them. Add cleanup for expired unattached objects that cannot race accepted finalization. Test ciphertext-at-rest, tampered envelope, cross-intake object theft, failed scan, over-limit category, partial upload, and cleanup race.
```

## 12. Phase 5 — staff case workflow

### 5A. Privacy review and protected release

**Depends on:** Phase 4.  
**Output:** Privacy queue/actions and exact-version protected viewing.  
**Gate:** An investigator cannot retrieve an unreleased derivative or original.

```text
PROMPT P05A — Implement Privacy queue and protected-copy release. Apply MASTER.

Expose the accepted complaints to authorized Privacy staff with safe summaries, risk, evidence inventory, inspection/protection provenance, and proof state. Implement hold, reject/needs-correction, and release commands against exact immutable derivative versions. Proof Pending must not block privacy review. No raw reporter selection mapping or removed identity values in summaries.

Provide authorized protected previews through the evidence service, not public storage URLs. Investigator access remains denied until release AND valid assignment. A release does not unlock originals or future versions. If correction is unsupported, record a held task rather than pretending a reporter follow-up channel exists. Version correction must create new records.

Audit each decision and produce notifications through the outbox. Test unauthorized role, duplicate release, release of failed inspection, stale version, held evidence, and direct API original access. Keep API responses compatible with FRONTEND_BINDINGS.md; do not create or redesign the Privacy screen.
```

### 5B. Officer assignment and conflicts

**Depends on:** P05A and seeded roster.  
**Output:** Eligible roster and durable assignment/reassignment.  
**Gate:** ACO-09 cannot be assigned by manipulating the request.

```text
PROMPT P05B — Implement investigator selection and assignment. Apply MASTER.

Expose the ten fictional officers with stable IDs, expertise, jurisdiction, availability, current workload, conflict status, and transparent recommendation reasons. Support the existing UI's sort/filter options with explicit backend mappings. ACO-04 is the canonical eligible procurement choice; ACO-09 is conflicted and ineligible.

Assignment transaction rechecks eligibility/current state, records one active assignment, updates safe case status, creates audit and notification events, and makes the case visible only to the assigned investigator. Reassignment preserves history and invalidates prior investigator permissions/grants through an authorization epoch. If grant code is not implemented yet, create the revocation hook and test it when Phase 6 lands.

Test manipulated conflicted-officer requests, stale availability, concurrent assignment, role denial, no eligible officer, dashboard visibility, and cross-case queries. Counts derive from actual data. Do not hardcode separate staff dashboard datasets or silently assign a fallback officer.
```

### 5C. Investigation updates, risk tasks, and closure

**Depends on:** P05B, tracking projection.  
**Output:** Real investigation progress and separate Oversight actions.  
**Gate:** Reporter sees approved safe text, never the distinct internal note.

```text
PROMPT P05C — Implement investigation, reporter-safe updates, and Oversight lifecycle. Apply MASTER.

Add assigned-investigator case detail, permitted status changes, internal notes, preliminary findings, and explicit reporter-update publication. Use separate typed commands/projections for notes and public updates. No automatic guilt verdict. Enforce optimistic revisions and deduplicate retries. Update audit and safe reporter timeline transactionally.

Implement Critical protection tasks independent of proof/original approval. Privacy cannot close a case; investigator can recommend closure/escalation; Oversight independently approves closure/reopen with reason and safe outcome. Closed cases block new original requests and revoke active grants via the shared hook. Reopening never restores old grants. Public milestones differ from internal access states.

Test public/internal canary text separation, unauthorized changes, duplicate updates, Critical report without evidence, proof outage, closure denial for investigator, and reopening behavior. Use existing UI bindings only later; finish backend and test this flow via API now.
```

## 13. Phase 6 — original access and expiry

### 6A. Request revisions and independent reviews

**Depends on:** Phase 5.  
**Output:** Real sequential decisions and an inactive scoped grant.  
**Gate:** One review, self-review, or a stale request can never create an active permission.

```text
PROMPT P06A — Implement original-access request and review policies. Apply MASTER.

Only the assigned investigator may request one exact original version. Require purpose, protected-copy insufficiency, intended action, supported mode, duration, and urgency. Create immutable request revisions/digests. Privacy recommends/rejects/clarifies; recommendation alone grants nothing. Oversight independently approves/rejects/clarifies after a valid Privacy recommendation.

Require three distinct human principals across requester and reviewers, including alternate accounts. Validate conflicts, active memberships, current case/assignment, and exact revision. Scope expansion/file/purpose change invalidates prior decisions; narrowing is allowed only within approved capabilities. Forensic mode remains unavailable until actual tooling exists.

Create an Approved-unused grant bound to actor, session policy, case, version, request, mode, duration, and 24-hour unused deadline. Notification contains no capability/DEK. Test self-approval, same human with two accounts, reversed review order, changed revision, one-file scope, closed case, and concurrent final decisions. Do not make approval equivalent to opening the file.
```

### 6B. Restricted gateway, activation, and revocation

**Depends on:** P06A and crypto/storage path.  
**Output:** Working original viewing with authoritative expiry.  
**Gate:** Unauthorized reads fail at the API/gateway, not just the screen.

```text
PROMPT P06B — Implement the original-view gateway and timed grant enforcement. Apply MASTER.

First authorized Open atomically sets one start/expiry using server/database time. Concurrent opens share the same timer. Return only a session-bound viewer handle, never an original DEK or storage URL. Broker/gateway recheck current actor, role, assignment, case, exact version, request decisions, grant, mode, and expiry. Use the supported small JPEG renderer first; known fixture audio may be enabled only with valid media handling.

Authenticate the complete bounded encrypted object before plaintext output. Serve only the intended rendered/streamed representation; no unrestricted vault endpoint. Reject access immediately after authoritative expiry/revoke and bound continuing delivery checks to at most five seconds. End/revoke/logout/reassignment/closure invalidate active access. Background sweep is housekeeping, never permission enforcement. No viewer refresh or heartbeat extends a grant.

For local fictional-demo rehearsal support a server-approved short duration through a dev-only policy, not a client clock override or production bypass. Test two concurrent Opens, file-B substitution, stolen session handle, active revoke, server failure, session logout, closure/reassignment, and browser/client absence. Document that already displayed pixels/audio cannot be recalled.
```

## 14. Phase 7 — proof protocol, contract, and blockchain

### 7A. Canonical commitments and independent verifier

**Depends on:** Immutable versions from Phase 4.  
**Output:** Actual hashes/packages and a verifier runnable without case API.  
**Gate:** Changed bytes fail; offline verification never claims a checked anchor.

```text
PROMPT P07A — Implement the architecture's versioned proof protocol and independent verifier. Apply MASTER.

Freeze and document the fixed-width v1 file-pair preimage: 32-byte domain hash, 1-byte kind, and five 32-byte fields for salt, case nonce, version nonce, original hash, protected hash; total 193 bytes. Use CSPRNG private salts/nonces. Do not substitute ambiguous JSON concatenation or raw on-chain file hashes. Freeze canonical reference/submission record schemas before enabling their kinds; otherwise report those kinds unavailable rather than invent file proofs.

Implement Python/TypeScript cross-language golden vectors and strict private proof-package validation. Candidate bytes are hashed locally, the corresponding expected hash is checked, and the commitment is reproduced. State which candidate version was supplied; companion expected hash does not mean companion bytes were checked. No tracking secret in the package.

Build a standalone CLI/module that runs without the case database and supports an allowlisted chain/contract adapter. Offline mode reports local consistency only. Reject unsupported versions, malformed sizes, tampered values, and arbitrary package-provided RPC URLs. Test match, one-byte mismatch, wrong salt, wrong kind, invalid schema, and zero evidence behavior.
```

### 7B. Minimal contract and local chain

**Depends on:** P07A.  
**Output:** Tested deployed local commitment registry.  
**Gate:** Transaction/event checks are real and independently reproducible.

```text
PROMPT P07B — Implement and test the minimal commitment registry. Apply MASTER.

Use a compatible pinned Hardhat/Solidity toolchain and a small versioned non-upgradeable contract. Authorized relayer submits only opaque commitment and protocol version. Emit a stable event, record first anchoring, and define duplicate behavior clearly. Do not store filenames, case reference, content, category, raw hashes, identity, secret, or key. Admin changes affect future submitters, not historical proof interpretation.

Add tests for authorized/unauthorized anchor, duplicate submission, unsupported versions as applicable, event fields, first-record preservation, and signer/admin changes. Deploy to a local development chain and save actual chain ID, address, transaction, and ABI in environment-specific ignored/generated deployment output, with a shareable non-secret manifest where appropriate.

Connect the verifier to this actual local deployment. Verify a real seeded commitment and reject wrong contract/network/event data. Label local-chain output accurately. Do not create a fake Amoy address or explorer link. Prepare an Amoy deployment script that reads ignored credentials, but run public testnet deployment only when configured and authorized.
```

### 7C. Durable relayer and Amoy activation

**Depends on:** P03C, P07A/B; external Amoy credentials for live testnet.  
**Output:** Proof worker integrated with accepted reports.  
**Gate:** Chain failure preserves case; configured network matches receipt.

```text
PROMPT P07C — Implement proof submission/reconciliation and activate Amoy when available. Apply MASTER.

Create outbox-driven proof jobs for accepted immutable records. Proof worker receives opaque commitments, not files, keys, or tracking credentials. Persist logical proof identity, signer nonce/transaction attempts, broadcast result, receipt/event/block reference, and confirmation state. Serialize nonce allocation and reconcile uncertain broadcasts before replacing/retrying. Use bounded retry/backoff; duplicate work must not create a new complaint/version.

Integrate actual local-chain proofs first. Then, if funded Amoy signer/RPC and authorization exist, deploy/use the configured canonical contract, record the real chain ID/address/transaction, and run an independent verification. Do not expose signing keys. Configure confirmation/reorganization behavior and distinguish Broadcast from Confirmed. A failed or delayed proof remains Pending/Failed while the case is Accepted.

Complete private proof-package retrieval through the reporter's credentialed session without exposing a tracking secret. Test worker crash after broadcast, duplicate event/job, insufficient funds/RPC failure, wrong network, and confirmation update. If Amoy is blocked, finish all local work and report exact missing configuration; do not call the live path complete.
```

## 15. Phase 8 — wire the existing frontend, without building UI

This phase changes data behavior only. It is required to turn the already completed frontend into a connected application.

### 8A. Existing reporter handlers and services

**Depends on:** Phases 3–4 and 7; actual binding map.  
**Output:** Existing submission/receipt/tracking/verification flows use real services.  
**Gate:** No layout redesign; a uniquely edited report reaches backend unchanged.

```text
PROMPT P08A — Connect only the existing reporter data bindings. Apply MASTER and FRONTEND_BINDINGS.md.

Replace mock service calls in existing handlers/hooks/adapters for intake, risk, evidence selection, local JPEG protection, encryption/upload, finalize, receipt save/copy, tracking, and verification. Preserve markup, styles, component hierarchy, routes, and visible design. Add headless adapter/types or adjust existing bindings only. Do not introduce a new page or framework.

Keep draft values and local identity selections ephemeral; never send “this is me” mappings. Use server-derived operation/proof/provenance states in existing status fields. A fixture result must remain labelled simulated; if existing UI cannot express that truthfully, leave that capability disconnected and record the gap instead of claiming protection. Preserve duplicate-submit prevention but rely on backend idempotency. Handle response-loss recovery with the actual intake capability.

Existing receipt code must separate private tracking data from proof package. Tracking uses its safe API and no URL secrets. Browser refresh can lose unsaved local credentials but must not delete accepted backend cases. Run the current frontend build/type checks and a reporter API-backed smoke test with a unique title and real seeded JPEG. Report any missing UI fields/screens without generating them.
```

### 8B. Existing staff bindings and session separation

**Depends on:** Phase 5–6; P08A.  
**Output:** Imported staff workspaces reflect one shared backend.  
**Gate:** Role labels in the UI cannot manufacture backend identity.

```text
PROMPT P08B — Connect only existing staff data/auth/event bindings. Apply MASTER.

Wire current sign-in/session logic, Privacy queue/release, officer roster/assignment, assigned cases, notes/public updates, original requests, review queues, grant activation/viewer/countdown, revoke/end, audit, notifications, and closure to their real endpoints. Preserve every layout/style/route. Use polling or the existing supported mechanism to refresh committed data; notifications are hints, not permissions.

In the backend-backed profile, switching a role label cannot grant a new identity. If the imported demo switcher exists, use it only for an explicit dev-only sign-in to distinct seeded principals; never ship shared admin tokens or expose seed secrets in a hosted client. If provider login cannot be mapped safely without new UI, use existing sign-in plus a documented manual switch and report the limitation.

Derive countdown from server timestamps; viewer denial closes existing content state. Clear stale case/viewer responses on session change. Reassignment/logout/closure must revoke server access. Test reporter submission appearing in Privacy, release then assignment to ACO-04, protected review, separate safe/internal updates, and sequential original decisions. Check build and inspect diff to ensure no visual redesign.
```

## 16. Phase 9 — integration and security verification

### 9A. Complete system walkthrough

**Depends on:** Phase 8.  
**Output:** Automated/API and existing-browser walkthrough results.  
**Gate:** Report → investigation → receipt verification works across actual sessions.

```text
PROMPT P09A — Run the full hackathon end-to-end flow and repair integration defects. Apply MASTER.

Create an end-to-end test against the actual configured local stack: submit uniquely edited fictional bridge report with Critical risk and real supported JPEG; preserve original/protected hashes; receive credentials; verify durable backend state after restart; Privacy releases; ACO-04 is assigned; investigator reviews only released evidence; writes distinct internal and safe updates; reporter sees only safe text; request one original; Privacy recommends; Oversight approves; investigator opens; revoke/expire; verify audit; check real proof package match/mismatch.

Run browser checks on the imported UI where controls exist and API checks for documented UI gaps. Do not claim a hidden or absent UI journey works because an API test passed. Use separate staff principals/sessions and no test-only authorization bypass. Run both no-evidence and proof-outage recovery cases. Preserve useful screenshots/log summaries with no secrets.

Fix within-scope backend/binding failures, then rerun affected tests. Record actual environment/network, test IDs, pass/fail/not-run, evidence references, and remaining limitations in TEST_RESULTS.md. Do not fabricate a report or regenerate the frontend.
```

### 9B. Denial paths, concurrency, and secret checks

**Depends on:** P09A.  
**Output:** Security-focused regressions and repaired failures.  
**Gate:** Core protection claims are backed by negative tests.

```text
PROMPT P09B — Test and repair the high-impact security boundaries. Apply MASTER.

Cover reference-only/wrong-secret failures; reporter access to staff APIs; role tampering; unrelated-case reads; one principal under two accounts; single-review original access; changed request/file/version; grant reuse for file B; concurrent first opens; client-clock changes; revoke during delivery; logout/reassignment/closure; unavailable authoritative policy; malformed ciphertext/GCM/AAD; inspection job scope; public/internal note leak; identity-selection mapping; duplicate finalize and proof jobs; staging cleanup racing acceptance; and configured storage permissions.

Use canary secrets to inspect URLs, response bodies, error output, logs, generated client bundles, and caches. Verify no original DEK reaches an investigator client and no arbitrary file can self-declare controlled-fixture provenance. Check source/env files are ignored appropriately. Do not run destructive tests against non-disposable services or scan unrelated systems.

Fix critical/high boundary failures before cosmetic issues. Record passed, failed, and NOT RUN separately. If a capability cannot be secured within scope, disable it and update the truthful capability inventory instead of weakening authorization. Map results to relevant PRD AT and Security SAT IDs.
```

## 17. Phase 10 — runnable release and deployment

### 10A. Package the local judge environment

**Depends on:** Phase 9.  
**Output:** Reproducible startup, reset, seed, checks, configuration guide.  
**Gate:** Fresh setup or documented clean-room check reaches a healthy demo.

```text
PROMPT P10A — Package a reproducible local hackathon release. Apply MASTER.

Create startup and readiness scripts suited to the actual OS/repository, database migration commands, seed/reset commands scoped to fictional data, API/worker/key-broker launch configuration, and local-chain instructions. Use existing tooling rather than replacing it. Document ports, process order, frontend API base/proxy, dependencies, private key generation, storage selection, and secret variable names without values.

Provide a smoke command that checks actual DB, API, worker, ciphertext storage, configured auth, and chain provider. Report optional/unavailable dependencies separately. Add shutdown/backup steps and avoid deleting user data. Verify no development private key or credentials enter tracked output. Preserve existing frontend build/deploy settings.

Create docs/hackathon/RUNBOOK.md and CAPABILITY_MATRIX.md listing each function as actual, controlled fixture, unavailable, or deferred. Record local-chain versus Amoy explicitly. Test startup from documented steps using a disposable environment where available. If clean-room verification cannot run, list exactly what was tested and what remains unverified.
```

### 10B. Hosted demo preparation and authorized release

**Depends on:** P10A and user-selected/configured hosting.  
**Output:** Deployment configuration plus live smoke result if authorized.  
**Gate:** Hosted environment does not silently expose demo admin/key shortcuts.

```text
PROMPT P10B — Prepare and, where already authorized, deploy the hackathon backend. Apply MASTER.

Inspect existing hosting and frontend settings first. Prepare provider-compatible API/worker configuration, secret-variable inventory, private storage/database setup, TLS/origin/cookie policy, migrations, health checks, and rollback instructions. Preserve the existing frontend hosting/build; only set its existing API configuration or proxy. Do not choose a paid provider, purchase resources, expose local secrets, or publish without authorization.

A hosted demo still uses fictional data. Disable universal role bypasses, local private-key endpoints, arbitrary reset, simulated clocks, and shared seeded credentials in client bundles. Distinct staff login must work; reset is an authenticated operator action or offline command, not a public endpoint. State any development key-custody limitation clearly. Local fallback remains runnable.

If provider/project/auth details or approval are missing, complete all deployment files and exact steps, then report the specific blocker. If deployed, run fresh acceptance/denial/proof smoke checks against the actual URL, inspect secret exposure and mixed-content/CORS/session behavior, and record URL/commit/network/version. A prepared config is not a successful deployment.
```

## 18. Phase 11 — judge demonstration and handoff

### 11A. Rehearse the demonstration and failure fallback

**Depends on:** Phase 10.  
**Output:** Timed judge script and verified backup materials.  
**Gate:** Demonstration tells the truth about actual and simulated operations.

```text
PROMPT P11A — Create and rehearse a concise judge demonstration using the existing UI. Apply MASTER.

Prepare a 5–7 minute script: introduce the fictional Indian bridge corruption/retaliation problem; submit an edited report; show real JPEG metadata findings and derivative verification; show encrypted original versus protected copy; receive receipt; Privacy releases and assigns ACO-04; investigator posts safe/internal updates; reporter sees only the safe update; demonstrate two independent review stages for one original; open then revoke/expire; show matching versus changed-file verification and actual audit/proof network.

Use valid MP3 fixtures for the original-access story only if genuinely playable and supported; otherwise demonstrate the same policy with the real supported JPEG and state why. Advanced name/face/voice masking must be called controlled-fixture behavior. A local-chain receipt must be described as local, not Amoy.

Rehearse actual controls and record timing/failures. Create DEMO_SCRIPT.md, JUDGE_QA.md, and FAILURE_FALLBACK.md: offline/local startup, pending proof, slow network, role login, reset, and missing hosted service. Save only non-sensitive screenshots/recordings from fictional tests if tooling permits. Clearly distinguish recorded past live evidence from a current live run. Fix blocking integration defects without changing design.
```

### 11B. Final completion audit and handoff

**Depends on:** P11A.  
**Output:** Accurate handoff with no hidden blockers.  
**Gate:** Another teammate can launch, test, reset, and explain the build.

```text
PROMPT P11B — Perform the final hackathon readiness audit. Apply MASTER.

Review git diff, tracked files, startup scripts, environment examples, test results, capability inventory, actual deployment/proof manifests, and frontend preservation. Confirm persistent reports do not reset on refresh; role changes do not bypass auth; same-principal approvals fail; keys/secrets are not bundled; pending proof does not lose cases; protected/original versions differ appropriately; invalid files are not marked protected; public/internal data remain separate.

Run the final relevant build and smoke checks once. Create HANDOFF.md with exact start/test/reset steps, implemented modules, dependencies, configured network/contract, real versus simulated functions, remaining gaps, tested environment, known risks, and next improvements. Reference actual file paths/commands discovered in this repo. Do not list tests as passed unless run successfully.

Update PROGRESS.md with completed subphases and unresolved blockers. State whether the local demo, hosted demo, and Amoy integration are each ready, partial, or blocked. Preserve unrelated user work and do not push, publish, or overwrite a release without authorization. End with a concise runnable handoff rather than an unsupported “production ready” claim.
```

## 19. Recovery and continuation prompts

### R01. Resume in a fresh Antigravity conversation

```text
PROMPT R01 — Resume VeilProof development under MASTER.

Read applicable repo instructions, docs/hackathon/PROGRESS.md, DECISIONS.md, FRONTEND_BINDINGS.md, ENVIRONMENT.md, TEST_RESULTS.md, and current git state. Determine the last genuinely completed subphase and the next unfinished one from actual code/results, not optimistic notes. Do not recreate the project, redo migrations, reset data, or overwrite the existing frontend.

Validate only the minimum current health needed to continue. Identify the next prompt ID and implement its scope using the saved contracts. If an unresolved failure blocks it, diagnose and repair that failure first. Preserve local secrets and unrelated changes. Finish with actual checks and a precise next step.
```

### R02. Diagnose a failed phase without a rewrite

```text
PROMPT R02 — Repair the current failed VeilProof subphase under MASTER.

Read the current error, TEST_RESULTS.md, recent diff, API contract, and relevant logs with secrets redacted. Reproduce the smallest failing path. Identify whether the cause is code, configuration, schema, authorization, fixture validity, unavailable dependency, or a frontend binding mismatch.

Fix the root cause with the smallest compatible change. Do not delete tests, disable security, replace the frontend, reset a non-disposable database, switch to fake success, or reinstall the entire project as a first response. Add a regression test where the failure affects a meaningful boundary. Run the failing check and directly affected checks. Record what changed, evidence of the result, and what still blocks progress.
```

### R03. Missing credentials or unavailable external services

```text
PROMPT R03 — Continue useful VeilProof work despite missing external services, under MASTER.

List missing variable names/capabilities without printing values. Separate local implementation/testing from hosted database/auth/storage, RPC, funded signer, contract deployment, and public hosting. Complete independent code, validation, migrations, local adapters, tests, and deployment scripts.

Use an explicitly configured local provider where supported; record it in responses/receipts/capability inventory. Never silently simulate an external success. Do not invent accounts, addresses, keys, transaction hashes, or approvals. Provide exact non-secret setup steps for the chosen provider and identify the single next external action needed. Keep the blocker visible while continuing the next independent subphase.
```

### R04. Time-box to a smaller truthful hackathon build

```text
PROMPT R04 — Reduce remaining VeilProof scope to the working hackathon core under MASTER.

Inspect actual completed code, failing tests, missing dependencies, and time remaining if provided. Prioritize: existing frontend unchanged; persistent complaint; distinct staff principals; real JPEG protection/encryption; safe tracking; Privacy release and eligible assignment; independent original reviews; exact-file server grant/revoke; real local-chain receipt verification; one complete walkthrough and denial tests.

Defer arbitrary PDF/audio/video processing, custom access durations, complex real-time delivery, full-text search, enterprise key custody, and production integrations. Defer Amoy only if externally blocked, and label local-chain mode honestly. Do not remove access checks, leak keys, merge requester/reviewers, fake sanitization, or skip testing the claims retained.

Produce a short ordered remaining-task list and execute the next smallest blocking task. Update CAPABILITY_MATRIX.md and the judge script so omitted features cannot be mistaken for working ones. Report the minimum path that is genuinely demonstrable and the features still incomplete.
```

## 20. Minimum successful submission and contingency rules

If time is limited, the minimum convincing build is **one report, one real JPEG, three independent staff principals, one original-access request, one real verification receipt, and one complete public/private update cycle** through the imported UI.

Keep these checks even in the smallest build:

- Edited reporter data appears in the real staff case.
- Original bytes survive unchanged; supported metadata is absent from the derivative.
- Reference alone cannot access tracking.
- Internal notes and identity-selection mappings are absent from reporter/staff-inappropriate payloads.
- One approval is insufficient; same human under two accounts cannot satisfy both stages.
- Grant applies to one version and stops new delivery on revoke/expiry.
- One-byte candidate change fails verification.
- Retrying finalize/proof does not create a second complaint.
- Existing frontend design remains intact.
- Real versus fixture, local versus Amoy, and implemented versus unavailable are explicit.

Do not spend the final hour adding new capabilities. Use it for the known walkthrough, configuration backup, secret inspection, startup verification, and explaining limitations.

## 21. Expected implementation handoff

The Antigravity run should leave real application code in the actual repository plus:

```text
docs/hackathon/
  REPO_AUDIT.md
  FRONTEND_BINDINGS.md
  API_CONTRACT.md
  DECISIONS.md
  ENVIRONMENT.md
  PROGRESS.md
  TEST_RESULTS.md
  RUNBOOK.md
  CAPABILITY_MATRIX.md
  DEMO_SCRIPT.md
  JUDGE_QA.md
  FAILURE_FALLBACK.md
  HANDOFF.md
```

Files may be consolidated where the repository already has equivalent documentation, but the information must remain easy to find. Tests, migrations, contract manifests, fixture hashes, startup scripts, and protocol vectors belong beside the actual code they validate. Credentials do not belong in this handoff.

## 22. Reference documents and evidence boundary

- [Product Requirements](D:/.codex/.chatgpt-projects/g-p-6ac7d025dd78819197e1a0de2c25aeac/VeilProof_PRD_v1.0.md)
- [Technical Architecture](D:/.codex/.chatgpt-projects/g-p-6ac7d025dd78819197e1a0de2c25aeac/VeilProof_Technical_Architecture_v1.0.md)
- [Security and Access](D:/.codex/.chatgpt-projects/g-p-6ac7d025dd78819197e1a0de2c25aeac/VeilProof_Security_and_Access_v1.0.md)
- [Project Context](D:/.codex/.chatgpt-projects/g-p-6ac7d025dd78819197e1a0de2c25aeac/VEILPROOF_PROJECT_CONTEXT.md)

The file paths above are this documentation workspace's current locations. In Antigravity, resolve reference documents by their actual imported workspace paths; do not assume the old C: paths embedded in earlier drafts exist.

This document supplies the plan and prompts. It does not claim that the application repository was inspected, code implemented, credentials configured, tests passed, or a backend deployed during preparation of this prompt pack.
