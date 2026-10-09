#!/usr/bin/env bash
# Start the durable outbox/proof worker (from backend/).
set -euo pipefail
cd "$(dirname "$0")/.."
exec .venv/Scripts/python.exe -m app.worker
