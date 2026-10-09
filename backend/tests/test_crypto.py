"""Object-envelope v1 and commitment v1 tests (P04A/P07A)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.security import crypto
from app.security.crypto import CryptoError

VECTOR_PATH = Path(__file__).resolve().parent / "vectors" / "object_envelope_v1.json"

OP = "11111111-1111-1111-1111-111111111111"
OBJ = "22222222-2222-2222-2222-222222222222"
VER = "33333333-3333-3333-3333-333333333333"


def test_round_trip():
    dek = bytes(range(32))
    nonce = bytes(range(12))
    pt = b"fictional evidence bytes"
    aad = crypto.build_aad(OP, OBJ, VER, crypto.KIND_ORIGINAL, len(pt))
    ct = crypto.seal(pt, dek, nonce, aad)
    assert crypto.open_sealed(ct, dek, nonce, aad) == pt


def test_wrong_key_and_tag_and_aad():
    dek = bytes(range(32))
    nonce = b"0" * 12
    pt = b"secret"
    aad = crypto.build_aad(OP, OBJ, VER, crypto.KIND_ORIGINAL, len(pt))
    ct = crypto.seal(pt, dek, nonce, aad)
    with pytest.raises(CryptoError):
        crypto.open_sealed(ct, bytes([1] * 32), nonce, aad)
    with pytest.raises(CryptoError):
        crypto.open_sealed(ct[:-1] + bytes([ct[-1] ^ 1]), dek, nonce, aad)
    bad_aad = crypto.build_aad(OP, OBJ, VER, crypto.KIND_DERIVATIVE, len(pt))
    with pytest.raises(CryptoError):
        crypto.open_sealed(ct, dek, nonce, bad_aad)


def test_independent_keys_differ():
    a = crypto.seal(b"same", crypto.new_dek(), crypto.new_nonce(), b"aad")
    b = crypto.seal(b"same", crypto.new_dek(), crypto.new_nonce(), b"aad")
    assert a != b


def test_aad_length_and_prefix():
    aad = crypto.build_aad(OP, OBJ, VER, 1, 1234)
    assert aad[: len(crypto.AAD_PREFIX)] == crypto.AAD_PREFIX
    assert len(aad) == len(crypto.AAD_PREFIX) + 16 + 16 + 16 + 1 + 8


def test_commitment_preimage_193_and_deterministic():
    args = dict(
        kind=1,
        salt=b"a" * 32,
        case_nonce=b"b" * 32,
        version_nonce=b"c" * 32,
        original_hash=b"d" * 32,
        protected_hash=b"e" * 32,
    )
    c1 = crypto.compute_commitment(**args)
    c2 = crypto.compute_commitment(**args)
    assert c1 == c2 and len(c1) == 32
    args2 = dict(args, salt=b"a" * 31 + b"z")
    assert crypto.compute_commitment(**args2) != c1


def test_golden_vector_matches_frozen_file():
    dek = bytes(range(32))
    nonce = bytes(range(12))
    pt = b"VEILPROOF_TEST_VECTOR_V1"
    aad = crypto.build_aad(OP, OBJ, VER, crypto.KIND_ORIGINAL, len(pt))
    ct = crypto.seal(pt, dek, nonce, aad)
    actual = {
        "plaintext": pt.decode(),
        "key_hex": dek.hex(),
        "nonce_hex": nonce.hex(),
        "aad_hex": aad.hex(),
        "ciphertext_hex": ct.hex(),
        "aad_op": OP,
        "aad_obj": OBJ,
        "aad_ver": VER,
        "aad_kind": crypto.KIND_ORIGINAL,
        "plaintext_length": len(pt),
    }
    if not VECTOR_PATH.exists():
        VECTOR_PATH.parent.mkdir(parents=True, exist_ok=True)
        VECTOR_PATH.write_text(json.dumps(actual, indent=2))
    frozen = json.loads(VECTOR_PATH.read_text())
    # The AES-GCM output for a fixed key/nonce/AAD is stable across implementations.
    assert frozen["ciphertext_hex"] == actual["ciphertext_hex"]
    assert frozen["aad_hex"] == actual["aad_hex"]
