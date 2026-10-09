# VeilProof — Handoff

## What this is

A working fictional-data hackathon backend for VeilProof, connected to the **existing** imported
frontend (React 19 + Vite 8). Frontend layout/routes/components are preserved; only service/hook/type
bindings changed.

## Start / test / reset

```bash
# 1) seed (idempotent)
cd backend && .venv/Scripts/python.exe scripts/seed.py

# 2) API
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --port 8000

# 3) worker (proof anchoring) — optional for the UI, required for Confirmed proofs
cd backend && .venv/Scripts/python.exe -m app.worker

# 4) frontend
cd frontend && npm run dev        # http://localhost:8443
# optional: VITE_API_BASE_URL=http://localhost:8000/api/v1

# checks
cd backend && .venv/Scripts/python.exe -m pytest tests -q      # 46 passed
cd backend && .venv/Scripts/python.exe scripts/smoke.py        # PASS
cd frontend && npm run build && npx tsc --noEmit               # PASS
cd frontend && node src/services/__vectors__/check-vectors.mjs # OK (cross-language crypto)

# reset (scoped, dry-run by default)
cd backend && .venv/Scripts/python.exe scripts/reset_demo.py [--apply]
```

## Implemented modules (actual paths)

```
backend/app/
  main.py config.py db.py models.py migrations.py schemas.py errors.py deps.py
  storage.py worker.py
  security/  crypto.py keys.py tracking.py auth.py acl.py
  services/  intake.py inspection.py jpeg.py proofs.py audit.py views.py
             workflow.py access.py tracking_api.py roster.py seed.py
  routers/   health.py intake.py tracking.py verify.py staff.py meta.py
  chain/     contracts/CommitmentRegistry.sol  hardhat.config.js  scripts/deploy.js
  scripts/   seed.py reset_demo.py smoke.py gen_fixture_jpeg.py run_api.sh run_worker.sh
  tests/     46 tests + helpers + frozen crypto vector
frontend/src/services/  api.ts crypto.ts jpegProtect.ts reporter.ts __vectors__/check-vectors.mjs
```

## Configured network / proof

- `PROOF_BACKEND=local_registry` — durable append-only commitment table. **Not a blockchain.**
- Amoy/EVM: **BLOCKED** — no RPC URL, funded signer, or authorized deployment. Contract + deploy
  script prepared. No address or tx hash invented.

## Real vs simulated vs unavailable

- **Real:** JPEG EXIF/GPS inspection + metadata-minimized derivative, AES-256-GCM envelope,
  RSA-OAEP DEK wrapping, ciphertext storage, durable cases, staff auth/ACL, three-principal
  independence, sequential original access, grant activation/expiry/revoke, reporter tracking,
  public/internal separation, audit hash chain + outbox worker, commitment v1, local verifier.
- **Controlled fixture:** advanced name/face/voice masking (no real implementation).
- **Unavailable:** PDF/audio/video sanitization (recorded as skipped, never Protected); forensic mode.
- **Deferred/blocked:** PostgreSQL (SQLite adapter here), Supabase, RLS, Amoy, hosted deploy.

## Dependencies & environment

Python 3.11 venv (`backend/.venv`) + `backend/requirements.txt`; Node 22. No Postgres/Docker needed
for the local demo. See ENVIRONMENT.md for variable names.

## Remaining gaps / risks

- Staff **data pages** (case list, privacy queue rendering, oversight queues, audit page) are still
  fixture-backed in the store; the API client methods exist (see FRONTEND_BINDINGS.md). The reporter
  submission, staff sign-in, evidence file retention, and tracking session are wired to the backend.
- No automated browser test; UI wiring verified by build + typecheck + backend API tests.
- Dev-only key custody and bounded automated inspection are documented shortcuts, not pilot approvals.
- SQLite (no RLS) for local demo; Postgres RLS remains to be enabled.

## Tested environment

Windows, Git Bash, Python 3.11, Node 22.17.0, SQLite adapter, local registry proof backend.
