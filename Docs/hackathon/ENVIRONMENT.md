# VeilProof — Environment & Configuration

No secret values appear here — variable **names** only.

## Required / supported variables

| Variable | Meaning | Local demo default |
| --- | --- | --- |
| `APP_ENV` | environment label | `development` |
| `RUN_PROFILE` | `dev` \| `demo` \| `production-like` | `demo` |
| `DATABASE_URL` | SQLAlchemy DSN | `sqlite+pysqlite:///./veilproof_demo.db` |
| `STORAGE_BACKEND` | `local` \| `supabase` | `local` |
| `STORAGE_LOCAL_DIR` | private ciphertext dir | `backend/storage` (ignored) |
| `ALLOWED_ORIGINS` | CSV of CORS origins | `http://localhost:8443,http://127.0.0.1:8443` |
| `TRACKING_PEPPER_FILE` | HMAC pepper file (ignored) | `backend/keys/tracking_pepper.bin` |
| `KEY_BROKER_PRIVATE_KEY_FILE` | RSA-3072 private wrapping key (ignored) | `backend/keys/broker_private.pem` |
| `KEY_BROKER_PUBLIC_KEY_FILE` | RSA-3072 public wrapping key | `backend/keys/broker_public.pem` |
| `KEY_BROKER_PUBLIC_KEY_ID` | versioned key id | `dev-broker-1` |
| `STAFF_AUTH_PROVIDER` | `local` \| `supabase` | `local` |
| `STAFF_AUTH_ISSUER` / `STAFF_AUTH_AUDIENCE` | token issuer/audience | `veilproof-local` |
| `STAFF_SESSION_SECRET_FILE` | session signing secret (ignored) | `backend/keys/session_secret.bin` |
| `STAFF_SESSION_TTL_SECONDS` | session lifetime | `28800` |
| `PROOF_BACKEND` | `local_registry` \| `evm` | `local_registry` |
| `CHAIN_ID` | expected chain id for `evm` | `80002` |
| `RPC_URL` | Amoy RPC (only when configured) | *unset* |
| `RELAYER_KEY_FILE` | relayer signing key (ignored) | *unset* |
| `COMMITMENT_CONTRACT_ADDRESS` | deployed registry address | *unset* |
| `DEMO_RESET_ENABLED` | allow scoped demo reset | `true` (dev) |
| `DEMO_ACCESS_DURATION_SECONDS` | dev-only grant duration override | `0` (disabled) |
| `MAX_UPLOAD_BYTES` | ciphertext upload ceiling | `10485760` |
| `MAX_IMAGE_PIXELS` | decode bomb guard | `40000000` |

## Files that must be ignored

`backend/keys/`, `backend/storage/`, `backend/*.db`, `.env`, `backend/.env`.

## External blockers (this machine)

- No PostgreSQL server / Docker daemon → SQLite local adapter (D-02).
- No Supabase project → local ciphertext adapter.
- No Amoy RPC / funded signer / contract → `evm` proof path BLOCKED; `local_registry` used.
