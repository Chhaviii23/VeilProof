# VeilProof — Failure Fallback

| Failure during demo | Fallback |
| --- | --- |
| Frontend dev server down | Restart `npm run dev`; the backend API + `pytest` can demonstrate the flow headlessly |
| API won't start | Check `backend/.env`, run `scripts/smoke.py`; readiness reports the real failing dependency |
| Proof stuck Pending | Worker not running or slow — restart `python -m app.worker`; state honestly remains Pending |
| Chain/Amoy unavailable | Use the local registry; state it is local, not Amoy |
| Slow network | Use the local stack only; proofs are queued and never block acceptance |
| Wrong/absent staff login | Use seeded accounts (see below); verify `scripts/seed.py` ran |
| Need a clean slate | `.venv/Scripts/python.exe scripts/reset_demo.py --apply` (dry-run first) |
| Broken evidence fixture | Regenerate: `.venv/Scripts/python.exe scripts/gen_fixture_jpeg.py` |
| Lost receipt in browser | Re-track with the case reference + private secret; the backend case is durable |

## Seeded demo accounts (documented demo shortcut — fictional)

| Username | Password | Role |
| --- | --- | --- |
| `arjun.mehta` | `demo-inv` | Investigator (ACO-04) |
| `priya.nair` | `demo-priv` | Privacy |
| `meera.rao` | `demo-over` | Oversight |

These are local dev credentials, never hosted. Distinct principals are enforced server-side.

## Backup materials

Store before the demo: the SQLite DB file, `backend/storage/`, `backend/keys/`, and a screenshot set
(non-sensitive, fictional only). A recorded past run must be labelled as recorded, not live.
