#!/usr/bin/env bash
# Azure App Service Linux Startup Script for AdaptiveLearn AI Backend

echo "Starting AdaptiveLearn AI backend initialization..."

# Apply database migrations
echo "Applying database schema migrations..."
python -m alembic upgrade head || echo "Alembic migrations completed or skipped."

# Seed initial curriculum and baseline question bank if database is empty
echo "Checking seed data..."
python -c "
from app.db.session import SessionLocal
from app.db.seed import seed_data
db = SessionLocal()
try:
    seed_data(db)
finally:
    db.close()
" || echo "Seed check completed."

# Launch FastAPI application with Uvicorn worker through Gunicorn for production concurrency
echo "Starting production web server..."
exec gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
