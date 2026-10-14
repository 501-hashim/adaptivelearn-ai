FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

# Run migrations and start uvicorn
CMD ["sh", "-c", "alembic upgrade head && python app/db/seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
