"""Anonymous intake endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import intake_capability
from ..errors import PayloadTooLargeError, ValidationFailure
from ..schemas import (
    FinalizeRequest,
    FinalizeResponse,
    IntakeCreateResponse,
    IntakeStateResponse,
    ObjectCompleteRequest,
    ObjectReserveRequest,
    ObjectReserveResponse,
)
from ..services import intake as intake_svc

router = APIRouter(prefix="/intakes", tags=["intake"])


@router.post("", response_model=IntakeCreateResponse)
def create_intake(db: Session = Depends(get_db)):
    return intake_svc.create_intake(db)


@router.get("/{intake_id}/state", response_model=IntakeStateResponse)
def intake_state(
    intake_id: str, capability: str = Depends(intake_capability), db: Session = Depends(get_db)
):
    session = intake_svc.authenticate_intake(db, intake_id, capability)
    return intake_svc.intake_state(db, session)


@router.post("/{intake_id}/objects", response_model=ObjectReserveResponse)
def reserve_object(
    intake_id: str,
    body: ObjectReserveRequest,
    capability: str = Depends(intake_capability),
    db: Session = Depends(get_db),
):
    session = intake_svc.authenticate_intake(db, intake_id, capability)
    return intake_svc.reserve_object(db, session, body)


@router.put("/{intake_id}/objects/{object_id}/content")
async def upload_content(
    intake_id: str,
    object_id: str,
    request: Request,
    capability: str = Depends(intake_capability),
    db: Session = Depends(get_db),
):
    session = intake_svc.authenticate_intake(db, intake_id, capability)
    s = get_settings()
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        # AES-GCM appends a 16-byte authentication tag to the plaintext.
        if len(data) > s.max_upload_bytes + 16:
            raise PayloadTooLargeError("ciphertext exceeds limit")
    if not data:
        raise ValidationFailure("empty ciphertext")
    obj = intake_svc.store_content(db, session, object_id, bytes(data))
    return {"object_id": obj.id, "state": obj.state, "ciphertext_digest": obj.ciphertext_digest}


@router.post("/{intake_id}/objects/{object_id}/complete")
def complete_object(
    intake_id: str,
    object_id: str,
    body: ObjectCompleteRequest,
    capability: str = Depends(intake_capability),
    db: Session = Depends(get_db),
):
    session = intake_svc.authenticate_intake(db, intake_id, capability)
    obj = intake_svc.complete_object(db, session, object_id, body)
    return {"object_id": obj.id, "state": obj.state, "inspection": obj.inspection_detail}


@router.post("/{intake_id}/finalize", response_model=FinalizeResponse)
def finalize(
    intake_id: str,
    body: FinalizeRequest,
    idempotency_key: str = Header(alias="Idempotency-Key"),
    capability: str = Depends(intake_capability),
    db: Session = Depends(get_db),
):
    session = intake_svc.authenticate_intake(db, intake_id, capability)
    result = intake_svc.finalize(db, session, body, idempotency_key)
    result.intake_capability = capability
    return result
