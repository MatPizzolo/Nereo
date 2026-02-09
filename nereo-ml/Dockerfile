# ── Nereo ML Service (FastAPI) ─────────────────────────
FROM python:3.12-slim AS base
LABEL org.opencontainers.image.source="https://github.com/nereo-ar/ml"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

RUN adduser --disabled-password --uid 1000 nereo
USER nereo

EXPOSE 8081
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8081"]
