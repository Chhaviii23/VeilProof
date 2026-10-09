"""Reporter tracking capabilities and server-keyed verifiers (DECISIONS D-10).

The reporter's plaintext tracking secret is never stored. Only an HMAC-SHA256 verifier,
peppered with a local secret, is persisted. Comparison is constant-time.
"""

from __future__ import annotations

import hashlib
import hmac
import os

from .keys import tracking_pepper

PEPPER_VERSION = "v1"


def generate_capability(nbytes: int = 32) -> str:
    from .crypto import b64u_encode

    return b64u_encode(os.urandom(nbytes))


def verifier_for(secret: str) -> str:
    return hmac.new(tracking_pepper(), secret.encode("utf-8"), hashlib.sha256).hexdigest()


def constant_time_match(secret: str, verifier: str) -> bool:
    return hmac.compare_digest(verifier_for(secret), verifier)


def command_digest(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
