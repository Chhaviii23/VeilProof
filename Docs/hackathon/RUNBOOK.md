# VeilProof — Runbook

## Prerequisites

- Python 3.11+ (venv at `backend/.venv`), Node 22.
- No PostgreSQL/Docker required for the local demo (SQLite adapter). See ENVIRONMENT.md.

## 1. Backend setup (once)

```bash
cd backend
.venv/Scripts/python.exe -m pip install -r requirements.txt   # already installed this run
cp .env.example .env                                          # optional; defaults work
```

Dev-only keys are generated automatically on first start into `backend/keys/` (ignored).
Ciphertext is written under `backend/storage/` (ignored). The DB file is `backend/veilproof_demo.db`
(ignored).

## 2. Apply migrations + seed (idempotent)

```bash
cd backend
.venv/Scripts/python.exe scripts/seed.py
```

## 3. Start processes

Terminal A — API (http://localhost:8000):
```bash
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

Terminal B — worker (proof anchoring / inspection / cleanup):
```bash
cd backend && .venv/Scripts/python.exe -m app.worker
```
The worker is optional for the reporter flow (inspection runs inline in `dev`/`demo` profiles), but
**required** for proofs to move from Pending to Confirmed.

Terminal C — frontend (port 8443):
```bash
cd frontend && npm run dev
```
Set the public API base for the frontend (non-secret) if it is not the default:
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

## 4. Health / readiness / smoke

```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/ready      # real dependency status; never fakes a missing DB
cd backend && .venv/Scripts/python.exe scripts/smoke.py
```

## 5. Verify the backend end-to-end without the UI

```bash
cd backend && .venv/Scripts/python.exe -m pytest tests -q
```

## 6. Reset scoped demo data

```bash
cd backend
.venv/Scripts/python.exe scripts/reset_demo.py                 # dry run
.venv/Scripts/python.exe scripts/reset_demo.py --apply         # seeded fixtures only
.venv/Scripts/python.exe scripts/reset_demo.py --include-submitted --apply  # also local submissions
```
Refuses to run under `RUN_PROFILE=production-like`. Never drops the schema or unrelated tables.

## 7. Local chain (optional, BLOCKED here)

See `backend/chain/README.md`. The default proof backend is the durable **local registry** (not a
blockchain). Amoy deployment requires `RPC_URL` + funded `RELAYER_KEY_FILE` and is not performed.

## 8. Shutdown / backup

- Stop processes with Ctrl-C. DB + ciphertext + keys are files; back up `backend/veilproof_demo.db`,
  `backend/storage/`, and `backend/keys/` together (ciphertext without keys is unrecoverable).

## Ports

| Service | Port |
| --- | --- |
| API | 8000 |
| Frontend (Vite) | 8443 |
| Postgres (if used) | 5432 |
