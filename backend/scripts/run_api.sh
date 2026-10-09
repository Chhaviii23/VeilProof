#!/usr/bin/env bash
# Start the VeilProof API (from backend/). Port defaults to 8000.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8000}"
exec .venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
