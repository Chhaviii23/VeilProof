"""Independent proof verification (runs without the case API)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import VerifyProofRequest, VerifyProofResponse
from ..services import proofs

router = APIRouter(prefix="/verify", tags=["verify"])


@router.post("/proof", response_model=VerifyProofResponse)
def verify(body: VerifyProofRequest, db: Session = Depends(get_db)):
    result = proofs.verify_package(db, body.package, body.candidates.model_dump())
    return VerifyProofResponse(**result)
