# VeilProof — Judge Demonstration Script (5–7 min)

All data is fictional. **Local registry ≠ blockchain.** Advanced-media masking is a controlled
fixture concept unless stated otherwise.

## 0. Setup (before judges arrive)
Start API (8000), worker, and frontend (8443); run `scripts/smoke.py`; confirm `/api/v1/ready`.

## 1. The problem (30s)
A fictional public bridge project: alleged corruption and retaliation. A reporter needs to submit
evidence without an account, and investigators must not receive the reporter's identity.

## 2. Reporter submission (90s) — REAL
1. Home → “Submit a protected report”. Enter title/description; choose Corruptions; add a JPEG.
2. Evidence page: show the **real metadata findings** read from the JPEG (GPS + device + date).
3. Risk: select “Physical threat” → Critical.
4. Review → Submit. Narrate the four real stages: local metadata minimization, AES-256-GCM
   encryption, ciphertext upload, acceptance.
5. Receipt: show the case reference and the private tracking secret (kept local). Show proof status
   as **Pending** initially — it is real, not a fake hash.

## 3. Staff workflow (2 min) — REAL
1. Sign in as Privacy (`priya.nair`). Open the privacy queue → the new critical case.
2. Release the protected copy; assign **ACO-04**.
3. Sign in as Investigator (`arjun.mehta`). Open the case; show the released protected copy loads,
   and that the sealed original does **not**.
4. Add an internal note (internal) and a reporter-safe update (public).
5. As reporter (Track page) show only the safe update — never the internal note.

## 4. Original access, two independent decisions (2 min) — REAL
1. Investigator requests the **exact** original with purpose, insufficiency reason, mode, duration.
2. Privacy recommends → status becomes “awaiting Oversight”; nothing opens yet.
3. Oversight (`meera.rao`) independently approves.
4. Investigator Activate → viewer returns the real original JPEG; countdown runs from **server time**.
5. Revoke (Privacy) → further delivery denied immediately.
6. Attempt to open a different file with the same grant → denied (one-version scope).

## 5. Verification receipt (1 min) — REAL
1. Verify page: run verification with the package + candidate file → original/protected match.
2. Flip one byte of the candidate → verification fails.
3. State the anchor mode: **local registry** (real, durable) — Amoy is BLOCKED in this environment.

## 6. Honest limitations (30s)
- No PostgreSQL here (SQLite adapter); no Amoy (no RPC/signer); PDF/audio/video are not sanitized.
- Dev-only key custody; automated inspection is a bounded shortcut; no human original bypass.
