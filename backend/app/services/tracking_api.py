"""Reporter tracking: reference+secret session, safe projection, proof package."""

from __future__ import annotations

from datetime import timedelta

import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..errors import UnauthorizedError
from ..security import tracking
from ..security.keys import session_secret
from ..timeutil import iso, utcnow
from .views import build_tracking_status

TRACKING_AUDIENCE = "veilproof-tracking"


def create_tracking_session(db: Session, case_reference: str, secret: str):
    credential = db.scalars(
        select(models.TrackingCredential)
        .join(models.Complaint, models.Complaint.id == models.TrackingCredential.complaint_id)
        .where(models.Complaint.reference == case_reference)
    ).first()
    # Uniform failure: never reveal whether the reference exists.
    if credential is None or credential.revoked:
        raise UnauthorizedError("invalid credentials")
    if not tracking.constant_time_match(secret, credential.verifier):
        raise UnauthorizedError("invalid credentials")
    s = get_settings()
    now = utcnow()
    expires = now + timedelta(seconds=s.tracking_session_ttl_seconds)
    token = jwt.encode(
        {
            "scope": "tracking",
            "cid": credential.complaint_id,
            "iss": s.staff_auth_issuer,
            "aud": TRACKING_AUDIENCE,
            "iat": int(now.timestamp()),
            "exp": int(expires.timestamp()),
        },
        session_secret(),
        algorithm="HS256",
    )
    return token, expires


def decode_tracking_session(token: str) -> str:
    s = get_settings()
    try:
        claims = jwt.decode(
            token, session_secret(), algorithms=["HS256"],
            audience=TRACKING_AUDIENCE, issuer=s.staff_auth_issuer,
        )
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("invalid tracking session") from exc
    if claims.get("scope") != "tracking":
        raise UnauthorizedError("invalid tracking session")
    return claims["cid"]


def status(db: Session, complaint_id: str):
    complaint = db.get(models.Complaint, complaint_id)
    if complaint is None:
        raise UnauthorizedError("invalid tracking session")
    return build_tracking_status(db, complaint)


def proof_package(db: Session, complaint_id: str):
    from .proofs import build_package

    package = build_package(db, complaint_id)
    return package
