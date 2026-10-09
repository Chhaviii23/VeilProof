# VeilProof — Test Results

Environment: Windows, Git Bash. Backend Python 3.11 (`backend/.venv`), Node 22.17.0.
All backend tests use an isolated temp SQLite DB + temp secrets/storage (never the dev DB).

## Commands actually run and their results

| # | Command | Result |
| --- | --- | --- |
| 1 | `cd frontend && npm run build` | PASS (vite build, 77 modules) |
| 2 | `cd frontend && npx tsc --noEmit` | PASS (exit 0) |
| 3 | `cd frontend && node src/services/__vectors__/check-vectors.mjs` | PASS — Web Crypto reproduces the Python-frozen envelope v1 vector byte-for-byte |
| 4 | `cd backend && .venv/Scripts/python.exe -m pytest tests -q` | PASS — **46 passed** |
| 5 | `cd backend && .venv/Scripts/python.exe scripts/smoke.py` | PASS — database, migrations, storage, key broker, seed, staff auth all ok |
| 6 | `cd backend && .venv/Scripts/python.exe scripts/reset_demo.py` (dry run) | PASS — prints scope, deletes nothing without `--apply` |
| 7 | `cd backend && .venv/Scripts/python.exe scripts/gen_fixture_jpeg.py` | PASS — writes a valid fictional JPEG with EXIF |
| 8 | `cd backend && .venv/Scripts/python.exe e2e_api_test.py` | PASS — simulated end-to-end user-to-staff flow via API (no-evidence case) completes successfully |
| 9 | `r02_check.py` (R02 health check) | PASS — **14 steps**: intake → finalize → priv.officer login → cases visible → privacy queue → assign ACO-04 → investigator login → case visible → detail → internal note → public update → tracking status (`under_investigation`) |

## Coverage by area (backend pytest, 46 tests)

| Area | Tests |
| --- | --- |
| Crypto envelope / AAD / commitment vector | `test_crypto.py` (6) |
| Real JPEG inspect + derivative + malformed/non-JPEG | `test_jpeg.py` (4) |
| Intake, idempotency, no-evidence, cross-intake theft, capability | `test_intake.py` (6) |
| Tracking confidentiality + uniform failures | `test_tracking.py` (3) |
| Staff auth, token tamper, logout, dual accounts | `test_staff_auth.py` (6) |
| Privacy release, assignment, ACO-09 denial, full original-access, self-review, forensic-unavailable | `test_workflow.py` (5) |
| Proof commitment, one-byte mismatch, tamper, unknown field, retry dedupe | `test_proofs.py` (6) |
| Denial boundaries, ciphertext-at-rest, tamper inspection, canary, audit chain | `test_security.py` (7) |
| End-to-end + durability + no-evidence + proof outage | `test_e2e.py` (3) |

## Verified behaviors (evidence)

- Original JPEG bytes are preserved; the derivative has **zero** EXIF/GPS findings and identical
  dimensions; SHA-256 differs. (`test_jpeg.py`)
- Stored objects do **not** begin with the JPEG SOI marker and match their ciphertext digest
  (ciphertext at rest). Tampering a stored byte → object quarantined. (`test_security.py`)
- Reference alone / wrong secret → uniform 401 with identical message. (`test_tracking.py`)
- Client-supplied role headers do not grant permission. (`test_staff_auth.py`)
- One approval is insufficient; self-review and same-principal Oversight are denied.
  (`test_workflow.py`)
- A grant binds one version; viewer content is denied after end/revoke; no endpoint serves an
  original by id. (`test_workflow.py`, `test_security.py`)
- One-byte candidate change fails verification; a tampered commitment fails; unknown package fields
  are rejected. (`test_proofs.py`)
- Proof retries do not create a second logical proof identity. (`test_proofs.py`)
- Audit events form a linked per-case hash chain. (`test_security.py`)
- Case survives a fresh DB session (restart durability). (`test_e2e.py`)

## NOT RUN (explicit)

- **PostgreSQL backend** — no server/Docker on this machine. Tests ran on the documented SQLite adapter.
- **Amoy deployment / live chain** — no RPC URL, funded signer, or authorized deployment. BLOCKED.
- **Hosted API Deployment (P10B)** — Deployment preparation is completed (`Dockerfile`, `docker-compose.yml`, `DEPLOYMENT.md`), but execution is BLOCKED because no hosting provider, domain, or private Postgres/Supabase instance is authorized or available.
- **Supabase storage/auth** — not configured.
- **Browser walkthrough of the imported UI** — Attempted using the automated browser subagent but FAILED due to `UNAVAILABLE (code 503): No capacity available for model gemini-3-flash on the server`. Verified the documented UI gaps via the API script (`e2e_api_test.py`) instead.
- **Advanced-media (PDF/audio/video) sanitization** — not implemented; not tested.
- **RLS / database privilege isolation** — SQLite adapter has no RLS; documented gap.

## Recorded frontend baseline

`npm run build` passed **before** any edit (73 modules) and after the bindings were added (77
modules). No layout, route, or component redesign was performed.
