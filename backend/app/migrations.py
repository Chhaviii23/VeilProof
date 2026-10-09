"""Lightweight versioned migration runner.

Migrations are ordered, idempotent functions recorded in `schema_migrations`. Version 1 is the
baseline `create_all`; later versions apply incremental DDL. This is intentionally simple and
portable across SQLite and PostgreSQL; a production deployment would move to Alembic.
"""

from __future__ import annotations

from collections.abc import Callable

from sqlalchemy import Engine, text

from .db import Base
from . import models  # noqa: F401  (ensure models are registered)


def _baseline(engine: Engine) -> None:
    Base.metadata.create_all(engine)


def _add_indexes(engine: Engine) -> None:
    """v2: additional queue/queue-lookup indexes that are cheap and portable."""
    stmts = [
        "CREATE INDEX IF NOT EXISTS ix_outbox_pending ON outbox_events (state, next_attempt_at)",
        "CREATE INDEX IF NOT EXISTS ix_grant_requester ON access_grants (requester_principal_id, state, expires_at)",
        "CREATE INDEX IF NOT EXISTS ix_request_state ON access_requests (complaint_id, state)",
        "CREATE INDEX IF NOT EXISTS ix_proof_identity ON proof_records (logical_identity)",
        "CREATE INDEX IF NOT EXISTS ix_audit_case_seq ON audit_events (complaint_id, sequence)",
    ]
    with engine.begin() as conn:
        for stmt in stmts:
            conn.execute(text(stmt))


MIGRATIONS: list[tuple[int, str, Callable[[Engine], None]]] = [
    (1, "baseline_schema", _baseline),
    (2, "queue_indexes", _add_indexes),
]

LATEST_VERSION = max(v for v, _, _ in MIGRATIONS)


def run_migrations(engine: Engine) -> int:
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                "version INTEGER PRIMARY KEY, name VARCHAR(120) NOT NULL, "
                "applied_at TIMESTAMP NOT NULL)"
            )
        )
    applied: set[int] = set()
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT version FROM schema_migrations")).fetchall()
        applied = {row[0] for row in rows}

    for version, name, fn in sorted(MIGRATIONS, key=lambda m: m[0]):
        if version in applied:
            continue
        fn(engine)
        with engine.begin() as conn:
            conn.execute(
                text(
                    "INSERT INTO schema_migrations (version, name, applied_at) "
                    "VALUES (:v, :n, CURRENT_TIMESTAMP)"
                ),
                {"v": version, "n": name},
            )
    return LATEST_VERSION
