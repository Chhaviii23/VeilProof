# VeilProof — Hackathon Decisions (ADR-lite)

## D-01 Framework preservation
The imported frontend is React 19 + Vite 8 + Tailwind v4. No migration. Edits are limited to
service/hook/type/auth/data bindings under `src/services`, `src/store`, `src/types`.

## D-02 Persistence adapter
PostgreSQL is the design target (SQLAlchemy 2.1 + psycopg 3, installed). This machine has **no
Postgres server and no running Docker daemon**, so the local demo uses
`DATABASE_URL=sqlite+pysqlite:///<path>` behind SQLAlchemy. Switching to Postgres is a connection-string
change only. This is an explicit adapter choice, **not** a silent fake; readiness reports the real
adapter. (Security/SAT: Postgres RLS/privileges remain a documented gap.)

## D-03 Proof backend
`PROOF_BACKEND=local_registry` is the default: an append-only, durable commitment registry table with
a real SHA-256 commitment, sequence, and timestamp. It is labelled a **local registry, not a
blockchain**. `PROOF_BACKEND=evm` reads a pinned contract address and RPC URL from config and is
**BLOCKED** (no Amoy RPC/signer). A Solidity contract + Hardhat deploy script are provided for when
credentials exist. No transaction hash is ever fabricated.

## D-04 Development key custody (explicit shortcut)
The key broker uses a locally generated **RSA-3072** wrapping key pair written to an ignored
`backend/keys/` directory (restricted). This is **not** production KMS custody and is documented as a
dev-only shortcut. Original and derivative use different AES-256-GCM DEKs.

## D-05 Bounded automated inspection (explicit shortcut)
Because no human original-preview bypass is permitted, an isolated worker unwraps the broker key for
job-bound versions only, authenticates the full GCM ciphertext, verifies type/size/pixel limits, and
records a safe result (no extracted plaintext, counts only). This is the documented
fictional-data trust boundary.

## D-06 Fixture provenance
Advanced-media name/face/voice/video protection uses allowlisted fixtures with
`provenance=controlled_fixture`. Real metadata minimization is implemented only for supported JPEG.
Unknown/unsupported inputs return `unavailable` and cannot be marked `Protected`.

## D-07 Staff identity
A test-only identity provider (`STAFF_AUTH_PROVIDER=local`) seeds distinct human principals with
password hashing and signed bearer sessions. It is impossible to enable in `RUN_PROFILE=production-like`.
Role and `human_principal_id` are separate; permissions are deny-by-default server-side.

## D-08 Three distinct principals
Requester, Privacy reviewer, and Oversight reviewer must be three distinct human principals
(account-based, not role-label-based). Same human under two accounts is rejected at decision time.

## D-09 First-open activation, 24h unused
An approved-unused grant expires 24h after approval if never opened. The first authorized Open sets
one authoritative start/expiry from database time; concurrent opens share it. A dev-only policy
(`DEMO_ACCESS_DURATION_SECONDS`) may shorten durations for rehearsal — never a client clock override.

## D-10 Tracking secret
Reporter generates the tracking secret client-side; the server stores only an HMAC-SHA256 verifier
peppered with a local secret file. The reference alone reveals nothing; the verifier is never a login
bearer beyond a short-lived tracking session.

## D-11 Documented gaps (NOT built)
No new frontend screens; no production KMS/Tor/threshold/legal integrations; no human original-view
bypass; no fake Amoy transactions; no pilot-approval claims.
