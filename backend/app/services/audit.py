"""Transactional audit and outbox helpers (P03C).

Audit rows form a per-case hash chain. Outbox events carry only opaque IDs and safe routing data.
"""

from __future__ import annotations

import hashlib

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AuditEvent, Notification, OutboxEvent
from ..timeutil import iso, utcnow


def _canonical(
    complaint_id: str, sequence: int, event_type: str, actor_principal_id, actor_role,
    scope, purpose, detail, created_iso: str,
) -> str:
    return "|".join(
        [
            complaint_id,
            str(sequence),
            event_type,
            actor_principal_id or "",
            actor_role or "",
            scope or "",
            purpose or "",
            detail or "",
            created_iso,
        ]
    )


def append_audit(
    db: Session,
    *,
    complaint_id: str,
    event_type: str,
    actor_principal_id: str | None = None,
    actor_role: str | None = None,
    scope: str | None = None,
    purpose: str | None = None,
    detail: str | None = None,
    request_id: str | None = None,
) -> AuditEvent:
    last = db.scalars(
        select(AuditEvent)
        .where(AuditEvent.complaint_id == complaint_id)
        .order_by(AuditEvent.sequence.desc())
        .limit(1)
    ).first()
    sequence = (last.sequence + 1) if last else 1
    prev_hash = last.event_hash if last else None
    created = utcnow()
    canonical = _canonical(
        complaint_id, sequence, event_type, actor_principal_id, actor_role,
        scope, purpose, detail, iso(created) or "",
    )
    event_hash = hashlib.sha256(((prev_hash or "") + canonical).encode("utf-8")).hexdigest()
    event = AuditEvent(
        complaint_id=complaint_id,
        sequence=sequence,
        actor_principal_id=actor_principal_id,
        actor_role=actor_role,
        event_type=event_type,
        scope=scope,
        purpose=purpose,
        detail=detail,
        request_id=request_id,
        prev_hash=prev_hash,
        event_hash=event_hash,
        created_at=created,
    )
    db.add(event)
    return event


def enqueue(
    db: Session,
    *,
    aggregate_type: str,
    aggregate_id: str,
    event_type: str,
    payload: dict | None = None,
    revision: int = 0,
) -> OutboxEvent:
    event = OutboxEvent(
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        event_type=event_type,
        payload=payload or {},
        revision=revision,
        next_attempt_at=utcnow(),
    )
    db.add(event)
    return event


def notify(
    db: Session,
    *,
    role_type: str,
    complaint_id: str,
    title: str,
    body: str,
    link: str,
    tone: str = "info",
    officer_code: str | None = None,
) -> Notification:
    n = Notification(
        role_type=role_type,
        complaint_id=complaint_id,
        title=title,
        body=body,
        link=link,
        tone=tone,
        officer_code=officer_code,
    )
    db.add(n)
    return n


def audit_count(db: Session, complaint_id: str) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(AuditEvent).where(
                AuditEvent.complaint_id == complaint_id
            )
        )
        or 0
    )
