"""Smoke check: DB, storage, key broker, proof backend, seeded auth, and (optional) worker.

Run from backend/:  .venv/Scripts/python.exe scripts/smoke.py
Reports each dependency as ok / unavailable / not configured. Never prints secrets.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.db import SessionLocal, engine  # noqa: E402
from app.migrations import run_migrations  # noqa: E402
from app.models import Operator, StaffMembership  # noqa: E402
from app.security import auth  # noqa: E402
from app.security.keys import broker_public_pem  # noqa: E402
from app.services.seed import seed_all  # noqa: E402
from app.storage import get_storage  # noqa: E402


def main() -> int:
    s = get_settings()
    results: list[tuple[str, str]] = []

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        results.append(("database", f"ok ({s.database_url.split(':', 1)[0]})"))
    except Exception as exc:
        results.append(("database", f"FAIL ({type(exc).__name__})"))

    try:
        run_migrations(engine)
        results.append(("migrations", "ok"))
    except Exception as exc:
        results.append(("migrations", f"FAIL ({type(exc).__name__})"))

    try:
        st = get_storage()
        st.put(".__smoke", b"1")
        st.delete(".__smoke")
        results.append(("ciphertext_storage", f"ok ({s.storage_backend})"))
    except Exception as exc:
        results.append(("ciphertext_storage", f"FAIL ({type(exc).__name__})"))

    try:
        results.append(("key_broker", f"ok ({s.key_broker_public_key_id}, {len(broker_public_pem())} bytes)"))
    except Exception as exc:
        results.append(("key_broker", f"FAIL ({type(exc).__name__})"))

    results.append(("proof_backend", s.proof_backend + (" (BLOCKED: needs RPC_URL/contract)" if s.proof_backend == "evm" else "")))

    db = SessionLocal()
    try:
        seed_all(db)
        db.commit()
        op = db.scalars(select(Operator)).first()
        staff = db.scalars(select(StaffMembership)).all()
        results.append(("seed", f"ok (operator={'yes' if op else 'no'}, staff={len(staff)})"))
        # verify a seeded login hashes correctly (no plaintext printed)
        arjun = next((m for m in staff if m.auth_subject == "arjun.mehta"), None)
        results.append(("staff_auth", "ok" if arjun and auth.verify_password("demo-inv", arjun.password_hash) else "FAIL"))
    except Exception as exc:
        results.append(("seed", f"FAIL ({type(exc).__name__})"))
    finally:
        db.close()

    print("VeilProof smoke report")
    print("=" * 40)
    ok = True
    for name, status in results:
        print(f"  {name:22} {status}")
        if status.startswith("FAIL"):
            ok = False
    print("=" * 40)
    print("result:", "PASS" if ok else "PROBLEMS FOUND")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
