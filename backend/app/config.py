"""Typed application settings.

Pydantic-settings loads from environment and an optional `backend/.env`. No secret
defaults are committed; dev-only secret *files* are generated on first run.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    run_profile: str = "demo"  # dev | demo | production-like

    database_url: str = f"sqlite+pysqlite:///{ (BACKEND_DIR / 'veilproof_demo.db').as_posix() }"

    storage_backend: str = "local"
    storage_local_dir: str = str(BACKEND_DIR / "storage")

    allowed_origins: str = "http://localhost:8443,http://127.0.0.1:8443,http://localhost:5173"

    # Dev-only secret material (ignored directory).
    secrets_dir: str = str(BACKEND_DIR / "keys")
    tracking_pepper_file: str = str(BACKEND_DIR / "keys" / "tracking_pepper.bin")
    key_broker_private_key_file: str = str(BACKEND_DIR / "keys" / "broker_private.pem")
    key_broker_public_key_file: str = str(BACKEND_DIR / "keys" / "broker_public.pem")
    key_broker_public_key_id: str = "dev-broker-1"
    staff_session_secret_file: str = str(BACKEND_DIR / "keys" / "session_secret.bin")

    staff_auth_provider: str = "local"  # local | supabase
    staff_auth_issuer: str = "veilproof-local"
    staff_auth_audience: str = "veilproof-staff"
    staff_session_ttl_seconds: int = 8 * 3600

    proof_backend: str = "local_registry"  # local_registry | evm
    chain_id: int = 80002
    rpc_url: str | None = None
    relayer_key_file: str | None = None
    commitment_contract_address: str | None = None

    demo_reset_enabled: bool = True
    demo_access_duration_seconds: int = 0  # 0 = disabled; >0 dev-only override

    max_upload_bytes: int = 10 * 1024 * 1024
    max_image_pixels: int = 40_000_000
    intake_ttl_seconds: int = 24 * 3600
    tracking_session_ttl_seconds: int = 30 * 60
    unused_grant_ttl_seconds: int = 24 * 3600
    worker_lease_seconds: int = 60
    max_job_attempts: int = 5

    @field_validator("run_profile")
    @classmethod
    def _validate_profile(cls, v: str) -> str:
        allowed = {"dev", "demo", "production-like"}
        if v not in allowed:
            raise ValueError(f"RUN_PROFILE must be one of {sorted(allowed)}")
        return v

    @property
    def is_production_like(self) -> bool:
        return self.run_profile == "production-like"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def secrets_path(self) -> Path:
        return Path(self.secrets_dir)

    def validate_runtime(self) -> list[str]:
        """Return a list of fatal configuration problems (empty == OK)."""
        problems: list[str] = []
        if self.is_production_like:
            if self.staff_auth_provider != "supabase" and self.staff_auth_provider != "oidc":
                problems.append(
                    "production-like profile refuses the local test-only staff auth provider"
                )
            if self.proof_backend == "local_registry":
                problems.append(
                    "production-like profile refuses the local_registry proof backend"
                )
            if self.demo_reset_enabled:
                problems.append("production-like profile refuses DEMO_RESET_ENABLED")
            if self.demo_access_duration_seconds:
                problems.append("production-like profile refuses demo access-duration override")
        if self.storage_backend not in {"local", "supabase"}:
            problems.append(f"unknown STORAGE_BACKEND={self.storage_backend!r}")
        if self.proof_backend not in {"local_registry", "evm"}:
            problems.append(f"unknown PROOF_BACKEND={self.proof_backend!r}")
        if self.proof_backend == "evm" and not self.rpc_url:
            problems.append("PROOF_BACKEND=evm requires RPC_URL")
        return problems


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    os.makedirs(settings.secrets_path, exist_ok=True)
    return settings
