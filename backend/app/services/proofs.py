"""Versioned proof protocol and independent verifier (P07A/P07B).

Commitment v1 is a fixed 193-byte preimage. Salts/nonces are private. The local registry is an
append-only durable table (NOT a blockchain). The EVM adapter is configuration-gated and blocked
on this machine (no RPC/signer). No transaction hash is ever fabricated.
"""

from __future__ import annotations

import os

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..errors import ValidationFailure
from ..security.crypto import (
    KIND_DERIVATIVE,
    b64u_decode,
    b64u_encode,
    compute_commitment,
    sha256_hex,
)
from ..timeutil import iso, utcnow

KIND_FILE_PAIR = 1
PROOF_VERSION = 1
SCHEMA_FIELDS = {
    "schema",
    "kind",
    "proof_version",
    "salt",
    "case_nonce",
    "version_nonce",
    "original_sha256",
    "protected_sha256",
    "commitment",
    "provider",
    "chain_id",
    "contract_address",
    "tx_ref",
    "block_ref",
    "event_index",
    "scope",
}


def create_file_pair_proof(db: Session, complaint_id: str, item_id: str) -> models.ProofRecord | None:
    item = db.get(models.EvidenceItem, item_id)
    if item is None:
        return None
    versions = db.scalars(
        select(models.EvidenceVersion).where(models.EvidenceVersion.item_id == item_id)
    ).all()
    original = next((v for v in versions if v.kind == "original"), None)
    derivative = next((v for v in versions if v.kind == "derivative"), None)
    if original is None or derivative is None:
        # Cannot invent a file proof without both committed versions.
        return None

    logical_identity = f"file-pair:{original.id}"
    existing = db.scalars(
        select(models.ProofRecord).where(models.ProofRecord.logical_identity == logical_identity)
    ).first()
    if existing:
        return existing

    salt = os.urandom(32)
    case_nonce = os.urandom(32)
    version_nonce = os.urandom(32)
    original_hash = bytes.fromhex(original.plaintext_sha256)
    protected_hash = bytes.fromhex(derivative.plaintext_sha256)
    commitment = compute_commitment(
        kind=KIND_FILE_PAIR,
        salt=salt,
        case_nonce=case_nonce,
        version_nonce=version_nonce,
        original_hash=original_hash,
        protected_hash=protected_hash,
    )
    rec = models.ProofRecord(
        complaint_id=complaint_id,
        evidence_version_id=original.id,
        logical_identity=logical_identity,
        kind=KIND_FILE_PAIR,
        commitment=commitment.hex(),
        proof_version=PROOF_VERSION,
        provider=get_settings().proof_backend,
        state="pending",
    )
    db.add(rec)
    db.flush()
    db.add(
        models.ProofPrivateInput(
            proof_record_id=rec.id,
            material={
                "salt": b64u_encode(salt),
                "case_nonce": b64u_encode(case_nonce),
                "version_nonce": b64u_encode(version_nonce),
                "original_sha256": original.plaintext_sha256,
                "protected_sha256": derivative.plaintext_sha256,
                "case_reference": db.get(models.Complaint, complaint_id).reference if db.get(models.Complaint, complaint_id) else None,
                "item_label": item.display_label,
            },
        )
    )
    from . import audit as audit_svc

    audit_svc.enqueue(
        db,
        aggregate_type="proof_record",
        aggregate_id=rec.id,
        event_type="AnchorProof",
        payload={"proof_id": rec.id},
    )
    db.flush()
    return rec


def anchor_proof(db: Session, proof_id: str) -> models.ProofRecord | None:
    rec = db.get(models.ProofRecord, proof_id)
    if rec is None:
        return None
    if rec.state == "confirmed":
        return rec
    s = get_settings()
    rec.attempts += 1
    if rec.provider == "local_registry":
        existing = db.scalars(
            select(models.LocalCommitment).where(models.LocalCommitment.commitment == rec.commitment)
        ).first()
        if existing is None:
            seq = int(db.scalar(select(func.coalesce(func.max(models.LocalCommitment.sequence), 0))) or 0) + 1
            tx_ref = f"local-registry-{seq}"
            db.add(
                models.LocalCommitment(
                    commitment=rec.commitment, sequence=seq, tx_ref=tx_ref
                )
            )
            block_ref = f"seq-{seq}"
            event_index = 0
        else:
            tx_ref = existing.tx_ref
            block_ref = f"seq-{existing.sequence}"
            event_index = 0
        rec.tx_ref = tx_ref
        rec.block_ref = block_ref
        rec.event_index = event_index
        rec.state = "confirmed"
        rec.confirmed_at = utcnow()
        rec.last_error = None
        from . import audit as audit_svc

        audit_svc.append_audit(
            db,
            complaint_id=rec.complaint_id,
            event_type="proof_confirmed",
            detail=f"Local registry commitment anchored ({tx_ref})",
        )
        db.flush()
        return rec
    # EVM backend not available locally.
    rec.state = "pending"
    rec.last_error = "evm proof backend unavailable (no RPC_URL/contract configured)"
    db.flush()
    return rec


def proof_summary(db: Session, complaint_id: str) -> dict:
    recs = db.scalars(
        select(models.ProofRecord).where(models.ProofRecord.complaint_id == complaint_id)
    ).all()
    if not recs:
        return {"proof_status": "pending", "provider": None, "tx_ref": None, "network": None}
    confirmed = [r for r in recs if r.state == "confirmed"]
    if confirmed:
        s = get_settings()
        provider = confirmed[0].provider
        network = "local registry" if provider == "local_registry" else f"chain {s.chain_id}"
        return {
            "proof_status": "confirmed",
            "provider": provider,
            "tx_ref": confirmed[0].tx_ref,
            "network": network,
        }
    if all(r.state == "failed" for r in recs):
        return {"proof_status": "failed", "provider": recs[0].provider, "tx_ref": None, "network": None}
    return {"proof_status": "pending", "provider": recs[0].provider, "tx_ref": None, "network": None}


def build_package(db: Session, complaint_id: str) -> dict | None:
    rec = db.scalars(
        select(models.ProofRecord)
        .where(models.ProofRecord.complaint_id == complaint_id)
        .order_by(models.ProofRecord.created_at.desc())
        .limit(1)
    ).first()
    if rec is None:
        return None
    priv = db.scalars(
        select(models.ProofPrivateInput).where(models.ProofPrivateInput.proof_record_id == rec.id)
    ).first()
    if priv is None:
        return None
    s = get_settings()
    m = priv.material
    return {
        "schema": "veilproof.proof_package.v1",
        "kind": rec.kind,
        "proof_version": rec.proof_version,
        "salt": m.get("salt"),
        "case_nonce": m.get("case_nonce"),
        "version_nonce": m.get("version_nonce"),
        "original_sha256": m.get("original_sha256"),
        "protected_sha256": m.get("protected_sha256"),
        "commitment": rec.commitment,
        "provider": rec.provider,
        "chain_id": s.chain_id if rec.provider == "evm" else None,
        "contract_address": s.commitment_contract_address if rec.provider == "evm" else None,
        "tx_ref": rec.tx_ref,
        "block_ref": rec.block_ref,
        "event_index": rec.event_index,
        "scope": "file-pair",
    }


def verify_package(db: Session | None, package: object, candidates: dict) -> dict:
    if not isinstance(package, dict):
        raise ValidationFailure("package must be an object")
    unknown = set(package.keys()) - SCHEMA_FIELDS
    if unknown:
        raise ValidationFailure(f"unknown package fields: {sorted(unknown)}")
    if package.get("schema") != "veilproof.proof_package.v1":
        raise ValidationFailure("unsupported package schema")
    try:
        salt = b64u_decode(package["salt"])
        case_nonce = b64u_decode(package["case_nonce"])
        version_nonce = b64u_decode(package["version_nonce"])
        original_hash = bytes.fromhex(package["original_sha256"])
        protected_hash = bytes.fromhex(package["protected_sha256"])
        kind = int(package["kind"])
    except Exception as exc:
        raise ValidationFailure("malformed package") from exc
    for name, blob in (("salt", salt), ("case_nonce", case_nonce), ("version_nonce", version_nonce),
                       ("original_sha256", original_hash), ("protected_sha256", protected_hash)):
        if len(blob) != 32:
            raise ValidationFailure(f"{name} must be 32 bytes")
    recomputed = compute_commitment(
        kind=kind,
        salt=salt,
        case_nonce=case_nonce,
        version_nonce=version_nonce,
        original_hash=original_hash,
        protected_hash=protected_hash,
    ).hex()
    commitment_match = recomputed == package.get("commitment")

    orig_candidate = candidates.get("original_sha256")
    prot_candidate = candidates.get("protected_sha256")
    original_match = None if not orig_candidate else (orig_candidate == package["original_sha256"])
    protected_match = None if not prot_candidate else (prot_candidate == package["protected_sha256"])

    anchor = {"checked": False, "ok": None, "provider": package.get("provider")}
    if db is not None and package.get("provider") == "local_registry":
        row = db.scalars(
            select(models.LocalCommitment).where(
                models.LocalCommitment.commitment == package.get("commitment")
            )
        ).first()
        anchor = {
            "checked": True,
            "ok": bool(row),
            "provider": "local_registry",
            "tx_ref": row.tx_ref if row else None,
            "anchored_at": iso(row.anchored_at) if row else None,
        }
    elif package.get("provider") == "evm":
        anchor = {"checked": False, "ok": None, "provider": "evm", "reason": "rpc not configured"}

    claimed = "original+protected" if (orig_candidate and prot_candidate) else (
        "original" if orig_candidate else ("protected" if prot_candidate else "none")
    )
    return {
        "schema_ok": True,
        "original_match": original_match,
        "protected_match": protected_match,
        "commitment_match": commitment_match,
        "supplied_scope": claimed,
        "anchor": anchor,
    }
