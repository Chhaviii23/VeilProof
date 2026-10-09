"""Apply migrations and run the idempotent seed. Safe to run repeatedly."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal, engine  # noqa: E402
from app.migrations import run_migrations  # noqa: E402
from app.services.seed import seed_all  # noqa: E402


def main() -> None:
    version = run_migrations(engine)
    db = SessionLocal()
    try:
        summary = seed_all(db)
        db.commit()
    finally:
        db.close()
    print(f"migrations v{version}; seed cases_created={summary['cases_created']}")


if __name__ == "__main__":
    main()
