"""UTC time helpers. All persisted timestamps are UTC."""

from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt: datetime | None) -> datetime | None:
    """Normalize a possibly-naive datetime (as returned by SQLite) to aware UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def iso(dt: datetime | None) -> str | None:
    value = as_utc(dt)
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")


def is_past(dt: datetime | None) -> bool:
    value = as_utc(dt)
    if value is None:
        return False
    return value <= utcnow()


def epoch(dt: datetime | None) -> float | None:
    value = as_utc(dt)
    return value.timestamp() if value else None
