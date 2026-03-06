# ai_service/Dockerfile

# Purpose: Production multi-stage build for Python 3.11 AI Service via uv
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

# Stage 1: Build
FROM python:3.11.9-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
# Create a virtual environment and install production dependencies
RUN uv venv /app/.venv
RUN uv pip install -r pyproject.toml

# Stage 2: Production Runtime
FROM python:3.11.9-slim-bookworm
WORKDIR /app

# Install PostgreSQL runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*

# Copy the built virtual environment from the builder
COPY --from=builder /app/.venv /app/.venv

# Copy application source code
COPY src /app/src

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

EXPOSE 8000 50051

RUN useradd -m vaultuser
USER vaultuser

CMD ["python", "-m", "src.main"]