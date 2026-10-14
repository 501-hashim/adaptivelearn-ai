#!/usr/bin/env bash
set -e

echo "=== Installing Python dependencies ==="
pip install -r backend/requirements.txt

echo "=== Applying database migrations ==="
cd backend
python -m alembic upgrade head

echo "=== Seeding curriculum data ==="
python app/db/seed.py
echo "=== Build finished successfully ==="
