"""Test-only local staff identity provider (DECISIONS D-07).

Password hashing uses PBKDF2-HMAC-SHA256. Sessions are signed HS256 bearer tokens carrying a
`jti` that must exist and be unrevoked server-side. The provider is impossible to enable under
RUN_PROFILE=production-like (see Settings.validate_runtime).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
from dataclasses import dataclass

import jwt

from ..config import get_settings
from ..timeutil import utcnow
from .keys import session_secret

PBKDF2_ITERATIONS = 200_000
ROLES = {"privacy", "investigator", "oversight"}
ROLE_TYPES = {
    "privacy": "privacy-officer",
    "investigator": "case-investigator",
    "oversight": "oversight-officer",
}


class AuthError(Exception):
    pass


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return (
        f"pbkdf2_sha256${PBKDF2_ITERATIONS}$"
        f"{base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algo, iters, salt_b64, hash_b64 = encoded.split("$")
        if algo != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iters))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


@dataclass
class SessionClaims:
    membership_id: str
    human_principal_id: str
    role: str
    officer_code: str | None
    jti: str


def create_session_token(
    *, membership_id: str, human_principal_id: str, role: str, officer_code: str | None, jti: str
) -> str:
    s = get_settings()
    now = utcnow()
    claims = {
        "sub": membership_id,
        "hp": human_principal_id,
        "role": role,
        "officer": officer_code,
        "jti": jti,
        "iss": s.staff_auth_issuer,
        "aud": s.staff_auth_audience,
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + s.staff_session_ttl_seconds,
    }
    return jwt.encode(claims, session_secret(), algorithm="HS256")


def decode_session_token(token: str) -> SessionClaims:
    s = get_settings()
    try:
        claims = jwt.decode(
            token,
            session_secret(),
            algorithms=["HS256"],
            issuer=s.staff_auth_issuer,
            audience=s.staff_auth_audience,
        )
    except jwt.PyJWTError as exc:
        raise AuthError("invalid or expired session") from exc
    return SessionClaims(
        membership_id=claims["sub"],
        human_principal_id=claims["hp"],
        role=claims["role"],
        officer_code=claims.get("officer"),
        jti=claims["jti"],
    )


def role_type_of(role: str) -> str:
    return ROLE_TYPES.get(role, role)
