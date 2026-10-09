"""PostgreSQL-backed transactional outbox worker (P03C).

Leases, bounded retries with backoff, deduplication via logical identity, and a dead-letter state.
`FOR UPDATE SKIP LOCKED` is used where the dialect supports it; SQLite falls back to a plain claim.
"""

from __future__ import annotations

import os
import time
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal
from .models import JobAttempt, OutboxEvent, UploadObject
from .timeutil import utcnow

WORKER_ID = f"worker-{os.getpid()}-{int(time.time())}"


def _claim(db: Session, limit: int) -> list[OutboxEvent]:
    s = get_settings()
    now = utcnow()
    stmt = (
        select(OutboxEvent)
        .where(OutboxEvent.state.in_(("pending", "leased")))
        .where((OutboxEvent.next_attempt_at.is_(None)) | (OutboxEvent.next_attempt_at <= now))
        .order_by(OutboxEvent.created_at.asc())
        .limit(limit)
    )
    try:
        stmt = stmt.with_for_update(skip_locked=True)
    except Exception:  # pragma: no cover - dialect without skip locked
        pass
    events = list(db.scalars(stmt).all())
    claimed: list[OutboxEvent] = []
    for ev in events:
        if ev.state == "leased" and ev.lease_until and ev.lease_until > now:
            continue
        ev.state = "leased"
        ev.locked_by = WORKER_ID
        ev.lease_until = now + timedelta(seconds=s.worker_lease_seconds)
        claimed.append(ev)
    db.flush()
    return claimed


def handle_event(db: Session, event: OutboxEvent) -> str:
    et = event.event_type
    payload = event.payload or {}
    if et == "InspectObject":
        from .services.inspection import inspect_object

        inspect_object(db, payload["object_id"])
        return "ok"
    if et == "CreateFilePairProof":
        from .services.proofs import create_file_pair_proof

        create_file_pair_proof(db, payload["complaint_id"], payload["item_id"])
        return "ok"
    if et == "AnchorProof":
        from .services.proofs import anchor_proof

        anchor_proof(db, payload["proof_id"])
        return "ok"
    if et == "CleanupExpiredObjects":
        _cleanup_expired(db)
        return "ok"
    # Informational events (ComplaintAccepted, notifications, etc.) are delivered as no-ops.
    return "ok"


def _cleanup_expired(db: Session) -> None:
    """Remove expired unattached staging objects only; never touches attached evidence."""
    from .storage import get_storage

    now = utcnow()
    storage = get_storage()
    objs = db.scalars(
        select(UploadObject).where(
            UploadObject.attached.is_(False),
            UploadObject.expires_at <= now,
        )
    ).all()
    for obj in objs:
        try:
            storage.delete(obj.storage_path)
        except Exception:
            pass
        db.delete(obj)


def _record_attempt(db: Session, event: OutboxEvent, code: str) -> None:
    db.add(JobAttempt(outbox_event_id=event.id, attempt=event.attempts, result_code=code))


def process_batch(db: Session, limit: int = 10) -> int:
    s = get_settings()
    claimed = _claim(db, limit)
    processed = 0
    for ev in claimed:
        ev.attempts += 1
        try:
            code = handle_event(db, ev)
            ev.state = "delivered"
            ev.delivered_at = utcnow()
            ev.last_error = None
            _record_attempt(db, ev, code)
            processed += 1
        except Exception as exc:  # keep the case safe; retry with backoff
            ev.last_error = type(exc).__name__
            _record_attempt(db, ev, "error")
            if ev.attempts >= s.max_job_attempts:
                ev.state = "dead"
            else:
                ev.state = "pending"
                backoff = min(60, 2 ** ev.attempts)
                ev.next_attempt_at = utcnow() + timedelta(seconds=backoff)
        db.flush()
    db.commit()
    return processed


def run_forever(interval: float = 2.0) -> None:
    print(f"[worker] {WORKER_ID} started", flush=True)
    while True:
        db = SessionLocal()
        try:
            processed = process_batch(db, 20)
        except Exception as exc:  # pragma: no cover
            print(f"[worker] batch error: {type(exc).__name__}", flush=True)
            processed = 0
        finally:
            db.close()
        if processed == 0:
            time.sleep(interval)


if __name__ == "__main__":
    run_forever()
