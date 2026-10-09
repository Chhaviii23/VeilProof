# VeilProof

A local reporting and evidence-review application. The complete file-protection workflow is in `frontend/`, backed by `backend/`. `mobile/` provides native text reporting, tracking and verification, with a link to the full browser workflow for attachments.

## Start locally (Windows PowerShell)

Prerequisites: Python 3.11+, Node 22+, FFmpeg on PATH, and Tesseract OCR (English). Default Windows Tesseract installation is detected; `TESSERACT_CMD` can specify another location. Python dependencies are in `backend/requirements.txt`.

Install dependencies once from the repository root:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
npm --prefix frontend ci
npm --prefix mobile ci
```

The backend works with local defaults without an `.env` file. For overrides, copy `backend/.env.example` to `backend/.env` only if you do not already have one. Keep existing configuration and keys when updating an installation.

Run these in separate terminals from the repository root:

```powershell
# API; startup applies migrations and loads the existing demo seed idempotently.
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
# Required for pending integrity proofs and queued maintenance jobs.
cd backend
.\.venv\Scripts\python.exe -m app.worker
```

```powershell
cd frontend
npm run dev
```

Open http://localhost:8443. API documentation is at http://localhost:8000/api/docs. If the API is hosted separately, set `VITE_API_BASE_URL` (including `/api/v1`) and configure backend `ALLOWED_ORIGINS`.

## Working flow

1. Enter report details and risks; attach actual evidence (one item per category, up to five).
2. Detect local identity clues. For each name, face or sound interval, select reporter, whistleblower, another person to protect, or keep visible.
3. Generate protected copies, inspect/play them, and download them if needed. Metadata is removed regardless of individual choices. Add missed identifiers/regions or audio intervals where necessary.
4. Confirm each copy has been inspected. Submission encrypts originals and **the exact reviewed copies**. A signed, expiring receipt binds both file hashes; substitutions are rejected. Choices and preview files remain in browser memory.
5. The Privacy Officer opens the protected copies before release and assigns an investigator. Investigators cannot open unreleased copies. Original access retains the separate Privacy → Oversight approval workflow.
6. Use the private tracking secret to follow updates and download integrity proofs. The worker advances proofs; the default local registry is not a public blockchain.

Detection does not identify people. The reporter supplies that relationship. Automated detection can miss faces, handwriting, non-English names and spoken identifiers; inspecting the result remains essential. Report prose and reference links need a separate manual identity review.

## Supported protection and limits

| Media | Current behavior |
| --- | --- |
| Still images | Local face/OCR candidates; selected regions covered with solid redaction; metadata removed. Animated images are rejected. |
| PDF | Text-layer names and rendered-page face/OCR candidates; selected redactions; rebuilt raster-only PDF with no original text layer, attachments or metadata. Up to 100 pages. |
| Audio | Non-silent intervals are candidates for listening, not speaker identification. Mute all or selected intervals, including spoken names; timing is preserved. No transcription or automatic speaker recognition. |
| Video | Sampled visual detection, followed by optional **whole-frame concealment** and audio removal. Selective moving-person tracking is not implemented. Full concealment removes visual evidence from the copy; originals remain sealed. |
| Reference links | Stored as references; not automatically fetched or sanitized. |

FFmpeg/OCR failures are errors, not successful protection. Protected-copy receipts expire after 24 hours; regenerate a copy if its receipt expires. Reloading the browser loses the in-memory draft and selected files.

The native app no longer simulates protection or silently drops attachments. It submits text only; attachments use web reporting. Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL` before `npm start` in `mobile/`. On a phone, use a reachable host address, not localhost. Native and browser drafts are separate.

## Verification

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

```powershell
cd frontend
npm run typecheck
npm run build
npm run test:crypto
```

```powershell
cd mobile
npm run lint
npm run typecheck
npm run build:web
```

The regression suite covers protected output, exact-copy submission, access controls, approvals, tracking, proofs and encryption. On restricted Windows environments, FastAPI's in-process test client still needs permission to create a loopback socket.

Validation for this update: 65 backend tests passed; frontend typecheck, production build and encryption vectors passed; mobile lint, typecheck and web export passed. Chrome browser checks at desktop and 390-pixel widths completed fictional PDF detection, selective protection, submission, and Privacy Officer preview with identical protected-file hashes and no browser runtime errors. Native device behavior was not tested.

## Deployment boundary

This repository still defaults to **demo staff credentials, local keys, SQLite and fictional seed cases**. It is not a production-hardened whistleblower service. Real sensitive deployment needs production authentication, managed key custody, HTTPS, operational privacy controls and a dependency security review. The mobile dependency installation reported security advisories; builds passing does not resolve those advisories. No production deployment or real-device native test was performed as part of this update.

Historical specifications and architecture notes are under `Docs/`; some older demo documents describe earlier capabilities. This README describes the current protection flow.
