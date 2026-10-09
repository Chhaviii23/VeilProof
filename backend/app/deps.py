"""FastAPI auth dependencies."""

from __future__ import annotations

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .errors import UnauthorizedError
from .models import StaffMembership, StaffSession
from .security import auth
from .timeutil import as_utc, utcnow


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("missing credentials")
    return authorization.split(" ", 1)[1].strip()


def current_membership(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> StaffMembership:
    token = _bearer(authorization)
    claims = auth.decode_session_token(token)
    session = db.scalars(select(StaffSession).where(StaffSession.jti == claims.jti)).first()
    if session is None or session.revoked:
        raise UnauthorizedError("session revoked")
    if as_utc(session.expires_at) <= utcnow():
        raise UnauthorizedError("session expired")
    membership = db.get(StaffMembership, claims.membership_id)
    if membership is None or not membership.active:
        raise UnauthorizedError("membership inactive")
    return membership


def intake_capability(
    x_intake_capability: str | None = Header(default=None),
) -> str:
    if not x_intake_capability:
        raise UnauthorizedError("missing intake capability")
    return x_intake_capability


def request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")
