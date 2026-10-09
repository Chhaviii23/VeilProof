"""Development-only local key custody (DECISIONS D-04).

Generates and loads a tracking-verifier pepper, a session-signing secret, and an RSA-3072
broker key pair into an ignored directory with restricted permissions. This is NOT production
KMS custody; it is the documented fictional-data shortcut.
"""

from __future__ import annotations

import os
import stat
from functools import lru_cache
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from ..config import get_settings


def _restrict(path: Path) -> None:
    try:
        os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        pass


def load_or_create_bytes(path: Path, length: int = 32) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    data = os.urandom(length)
    path.write_bytes(data)
    _restrict(path)
    return data


@lru_cache
def tracking_pepper() -> bytes:
    s = get_settings()
    return load_or_create_bytes(Path(s.tracking_pepper_file), 32)


@lru_cache
def session_secret() -> bytes:
    s = get_settings()
    return load_or_create_bytes(Path(s.staff_session_secret_file), 32)


@lru_cache
def broker_private_key() -> rsa.RSAPrivateKey:
    s = get_settings()
    path = Path(s.key_broker_private_key_file)
    if path.exists():
        return serialization.load_pem_private_key(path.read_bytes(), password=None)
    path.parent.mkdir(parents=True, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    _restrict(path)
    public_path = Path(s.key_broker_public_key_file)
    public_path.write_bytes(
        key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )
    return key


@lru_cache
def broker_public_key() -> rsa.RSAPublicKey:
    s = get_settings()
    path = Path(s.key_broker_public_key_file)
    if path.exists():
        return serialization.load_pem_public_key(path.read_bytes())
    return broker_private_key().public_key()


def broker_public_pem() -> str:
    return broker_public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")


@lru_cache
def relayer_key_exists() -> bool:
    s = get_settings()
    return bool(s.relayer_key_file and Path(s.relayer_key_file).exists())
