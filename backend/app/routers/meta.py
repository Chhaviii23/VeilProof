"""Non-secret public metadata: broker wrapping public key and proof/verification config."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Operator
from ..security.keys import broker_public_pem

router = APIRouter(tags=["meta"])


@router.get("/public/broker-key")
def broker_key(db: Session = Depends(get_db)) -> dict:
    s = get_settings()
    operator = db.scalars(select(Operator)).first()
    return {
        "key_id": s.key_broker_public_key_id,
        "wrap": "RSA-OAEP-256",
        "operator_id": operator.id if operator else None,
        "public_key_pem": broker_public_pem(),
    }


@router.get("/verify/config")
def verify_config() -> dict:
    s = get_settings()
    return {
        "proof_backend": s.proof_backend,
        "chain_id": s.chain_id if s.proof_backend == "evm" else None,
        "contract_address": s.commitment_contract_address if s.proof_backend == "evm" else None,
        "package_schema": "veilproof.proof_package.v1",
    }
