"""Object-envelope v1 and commitment-v1 primitives.

Wire format is frozen so the browser (Web Crypto) and Python agree. AES-256-GCM output is
`ciphertext||tag` on both sides; the AAD is the architecture's fixed 61-byte canonical prefix.
"""

from __future__ import annotations

import base64
import hashlib
import os
import struct
import uuid

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

AAD_PREFIX = b"VEILPROOF_OBJECT_V1\x00"
COMMIT_DOMAIN_TAG = b"VEILPROOF_COMMITMENT_V1"

KIND_ORIGINAL = 0x01
KIND_DERIVATIVE = 0x02
KIND_COMPLAINT_PAYLOAD = 0x03
KIND_INTERNAL_NOTE = 0x04
KIND_PROOF_INPUTS = 0x05

KIND_NAMES = {
    KIND_ORIGINAL: "original",
    KIND_DERIVATIVE: "derivative",
    KIND_COMPLAINT_PAYLOAD: "complaint_payload",
    KIND_INTERNAL_NOTE: "internal_note",
    KIND_PROOF_INPUTS: "proof_inputs",
}


class CryptoError(Exception):
    """Authentication/validation failure. Never carries plaintext or key material."""


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def b64u_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64u_decode(value: str) -> bytes:
    pad = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + pad)


def _uuid_bytes(value: str) -> bytes:
    try:
        return uuid.UUID(value).bytes
    except (ValueError, AttributeError) as exc:  # pragma: no cover - defensive
        raise CryptoError("invalid object identity") from exc


def build_aad(
    operator_id: str,
    object_id: str,
    version_id: str,
    kind: int,
    plaintext_length: int,
) -> bytes:
    return (
        AAD_PREFIX
        + _uuid_bytes(operator_id)
        + _uuid_bytes(object_id)
        + _uuid_bytes(version_id)
        + struct.pack(">B", kind)
        + struct.pack(">Q", plaintext_length)
    )


def new_dek() -> bytes:
    return AESGCM.generate_key(bit_length=256)


def new_nonce() -> bytes:
    return os.urandom(12)


def seal(plaintext: bytes, dek: bytes, nonce: bytes, aad: bytes) -> bytes:
    return AESGCM(dek).encrypt(nonce, plaintext, aad)


def open_sealed(ciphertext: bytes, dek: bytes, nonce: bytes, aad: bytes) -> bytes:
    try:
        return AESGCM(dek).decrypt(nonce, ciphertext, aad)
    except Exception as exc:  # InvalidTag and friends
        raise CryptoError("ciphertext failed authentication") from exc


def wrap_dek(dek: bytes, public_key: rsa.RSAPublicKey | None = None) -> bytes:
    from .keys import broker_public_key

    pub = public_key or broker_public_key()
    return pub.encrypt(
        dek,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )


def unwrap_dek(wrapped: bytes, private_key: rsa.RSAPrivateKey | None = None) -> bytes:
    from .keys import broker_private_key

    priv = private_key or broker_private_key()
    try:
        return priv.decrypt(
            wrapped,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
    except Exception as exc:
        raise CryptoError("DEK unwrap failed") from exc


def make_envelope(
    *,
    key_id: str,
    nonce: bytes,
    wrapped_dek: bytes,
    operator_id: str,
    object_id: str,
    version_id: str,
    kind: int,
    plaintext_length: int,
    ciphertext: bytes,
) -> dict:
    return {
        "v": 1,
        "alg": "A256GCM",
        "wrap": "RSA-OAEP-256",
        "key_id": key_id,
        "nonce": b64u_encode(nonce),
        "wrapped_dek": b64u_encode(wrapped_dek),
        "aad": {
            "op": operator_id,
            "obj": object_id,
            "ver": version_id,
            "kind": kind,
            "plen": plaintext_length,
        },
        "ct_len": len(ciphertext),
        "ct_sha256": sha256_hex(ciphertext),
    }


def envelope_aad(envelope: dict) -> bytes:
    aad = envelope.get("aad") or {}
    return build_aad(
        aad["op"], aad["obj"], aad["ver"], int(aad["kind"]), int(aad["plen"])
    )


def open_envelope(envelope: dict, ciphertext: bytes) -> bytes:
    """Authenticate and decrypt an envelope's ciphertext with the broker key."""
    if envelope.get("v") != 1:
        raise CryptoError("unsupported envelope version")
    if envelope.get("ct_len") != len(ciphertext):
        raise CryptoError("ciphertext length mismatch")
    if envelope.get("ct_sha256") != sha256_hex(ciphertext):
        raise CryptoError("ciphertext digest mismatch")
    nonce = b64u_decode(envelope["nonce"])
    wrapped = b64u_decode(envelope["wrapped_dek"])
    dek = unwrap_dek(wrapped)
    plaintext = open_sealed(ciphertext, dek, nonce, envelope_aad(envelope))
    if len(plaintext) != int(envelope["aad"]["plen"]):
        raise CryptoError("plaintext length mismatch")
    return plaintext


def commit_domain() -> bytes:
    return hashlib.sha256(COMMIT_DOMAIN_TAG).digest()


def compute_commitment(
    *,
    kind: int,
    salt: bytes,
    case_nonce: bytes,
    version_nonce: bytes,
    original_hash: bytes,
    protected_hash: bytes,
) -> bytes:
    preimage = (
        commit_domain()
        + struct.pack(">B", kind)
        + salt
        + case_nonce
        + version_nonce
        + original_hash
        + protected_hash
    )
    assert len(preimage) == 193, "commitment preimage must be 193 bytes"
    return hashlib.sha256(preimage).digest()
