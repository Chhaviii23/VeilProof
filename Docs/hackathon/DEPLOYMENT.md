# VeilProof Deployment Plan (P10B)

This document contains the required deployment steps, configuration parameters, and exact deployment steps for hosting the VeilProof backend.

**BLOCKER**: A hosted deployment has NOT been executed. The environment lacks authorized provider details, a funded host, and a provisioned PostgreSQL/Supabase instance. The backend is currently configured for local SQLite.

## Secret-Variable Inventory

The following environment variables MUST be provided to the production environment. These must **never** be checked into source control.

| Variable | Description |
| --- | --- |
| `ENVIRONMENT` | Must be `production`. |
| `DATABASE_URL` | Connection string to the production database (e.g., PostgreSQL URL). If deploying with SQLite (not recommended for multi-node), it points to the persistent volume. |
| `STAFF_SESSION_SECRET` | 32+ byte cryptographically secure random string. Used for signing JWT staff tokens. |
| `KEY_BROKER_KEY` | 32+ byte hex-encoded AES key used for wrapping/unwrapping envelope DEKs. Essential for data access. |
| `STAFF_CORS_ORIGINS` | Comma-separated list of allowed origins (e.g., `https://veilproof.demo.com`). Must exactly match the frontend's deployment URL to prevent CORS errors. |

## Private Storage / Database Setup

1. **Database**: Provision a PostgreSQL instance. The `DATABASE_URL` must use TLS (`sslmode=require`).
2. **Storage**: Evidence files and keys are stored on the filesystem. The deployment requires a persistent, private block-storage volume mounted at `/app/storage`. 
   - **Important**: This storage volume must NOT be publicly accessible via HTTP. The API explicitly handles fetching and authorization.

## TLS, Origin, and Cookie Policy

- **TLS**: Terminate TLS at the provider load balancer. The application relies on external TLS to protect the bearer tokens and tracking secrets in transit.
- **CORS**: Ensure `STAFF_CORS_ORIGINS` matches the production frontend URL. Requests with missing or non-matching origins are blocked.
- **Cookies**: VeilProof API currently relies on Authorization Bearer headers for token transmission, meaning CSRF via cookies is less of a concern. If cookies are added later, `Secure` and `HttpOnly` flags must be enforced.

## Health Checks

- The application provides a health check endpoint at `/api/v1/intakes` (with an empty payload resulting in a 422, proving API liveness) or standard root-level liveness probes.
- In production, set the provider's HTTP health check to target `/docs` or implement a dedicated `/health` endpoint. The current configuration relies on standard fastAPI liveness.

## Migrations

1. Ensure the database is running and accessible.
2. The `scripts/smoke.py` script automatically runs `db.create_all()`. For a true production environment, run Alembic migrations (if added to the project later) or execute a controlled table creation script via the provider's release phase (e.g., `release_command: python scripts/smoke.py`).

## Rollback Instructions

If a deployment introduces regressions:
1. Revert to the previous Docker container image tag.
2. Restoring the database: If a migration was destructive (not applicable for the current append-only schema design), restore from the most recent point-in-time recovery backup.
3. Verify the `KEY_BROKER_KEY` has not been altered or rotated improperly, as this would result in a complete loss of access to previously encrypted payloads.

## Deployment Execution Steps (When Unblocked)

1. Build the Docker image:
   ```bash
   cd backend
   docker build -t veilproof-backend:latest .
   ```
2. Provision the environment variables listed above in the provider's Secrets manager.
3. Deploy the container.
4. Update the Frontend: Set the frontend's `.env.production` (or `VITE_API_BASE_URL` depending on the build tool) to point to the new backend origin (e.g., `https://api.veilproof.com`). Rebuild the frontend.
5. Execute smoke tests (`scripts/smoke.py`) against the production URL to verify connectivity.
