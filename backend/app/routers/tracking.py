"""Reporter tracking endpoints. Credentials never appear in URLs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import (
    ProofPackageResponse,
    TrackingSessionRequest,
    TrackingSessionResponse,
    TrackingStatusResponse,
)
from ..services import tracking_api
from ..timeutil import iso

router = APIRouter(prefix="/tracking", tags=["tracking"])


def _session_cid(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        from ..errors import UnauthorizedError

        raise UnauthorizedError("missing credentials")
    return tracking_api.decode_tracking_session(authorization.split(" ", 1)[1].strip())


@router.post("/sessions", response_model=TrackingSessionResponse)
def create_session(body: TrackingSessionRequest, db: Session = Depends(get_db)):
    token, expires = tracking_api.create_tracking_session(db, body.case_reference, body.tracking_secret)
    return TrackingSessionResponse(session_token=token, expires_at=iso(expires))


@router.get("/status", response_model=TrackingStatusResponse)
def status(cid: str = Depends(_session_cid), db: Session = Depends(get_db)):
    return tracking_api.status(db, cid)


@router.post("/proof-package", response_model=ProofPackageResponse)
def proof_package(cid: str = Depends(_session_cid), db: Session = Depends(get_db)):
    package = tracking_api.proof_package(db, cid)
    return ProofPackageResponse(package=package or {})
