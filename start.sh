#!/usr/bin/env bash
cd backend
echo "=== Ensuring database migrations & seed data are present ==="
python -m alembic upgrade head || true
python app/db/seed.py || true
echo "=== Starting Uvicorn ==="
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
