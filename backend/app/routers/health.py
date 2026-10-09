"""Health and readiness. Readiness reflects real dependency state; no credentials exposed."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..security.keys import broker_public_pem
from ..storage import get_storage

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    s = get_settings()
    return {"status": "ok", "app_env": s.app_env, "run_profile": s.run_profile}


@router.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict:
    s = get_settings()
    checks: dict[str, dict] = {}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = {"ok": True, "adapter": s.database_url.split(":", 1)[0]}
    except Exception as exc:
        checks["database"] = {"ok": False, "error": type(exc).__name__}

    try:
        storage = get_storage()
        probe = ".__ready_probe"
        try:
            storage.put(probe, b"ok")
        except FileExistsError:
            pass
        storage.delete(probe)
        checks["storage"] = {"ok": True, "backend": s.storage_backend}
    except Exception as exc:
        checks["storage"] = {"ok": False, "error": type(exc).__name__}

    try:
        have_key = bool(broker_public_pem())
        checks["key_broker"] = {"ok": have_key, "key_id": s.key_broker_public_key_id}
    except Exception as exc:
        checks["key_broker"] = {"ok": False, "error": type(exc).__name__}

    proof = {"ok": s.proof_backend == "local_registry", "backend": s.proof_backend}
    if s.proof_backend == "evm":
        proof["configured"] = bool(s.rpc_url and s.commitment_contract_address)
    checks["proof"] = proof
    checks["staff_auth"] = {"ok": True, "provider": s.staff_auth_provider}

    ready_ok = bool(checks["database"]["ok"] and checks["storage"]["ok"] and checks["key_broker"]["ok"])
    return {"status": "ready" if ready_ok else "degraded", "checks": checks}
