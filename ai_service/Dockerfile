# ai_service/Dockerfile

# Purpose: Production multi-stage build with Automated Seeding for Dockploy
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-19

# Stage 1: Build
FROM python:3.11.9-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
# Create a virtual environment and install production dependencies
RUN uv venv /app/.venv
# Ensure uv uses the venv for installation
RUN . /app/.venv/bin/activate && uv pip install -r pyproject.toml

# Stage 2: Production Runtime
FROM python:3.11.9-slim-bookworm
WORKDIR /app

# Install PostgreSQL runtime dependencies (libpq for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*

# Copy the built virtual environment from the builder
COPY --from=builder /app/.venv /app/.venv

# Copy application source code
COPY src /app/src

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
# Ensure Python doesn't buffer logs so they show up instantly in Dockploy logs
ENV PYTHONUNBUFFERED=1

EXPOSE 8000 50051

# Switch to a non-privileged user for security
RUN useradd -m vaultuser
RUN chown -R vaultuser:vaultuser /app
USER vaultuser

# AUTOMATED SEEDING LOGIC:
# We use a shell-form CMD to run the seed script BEFORE starting the main application.
# If seeding fails, the container will exit, alerting Dockploy to a deployment failure.
CMD python -m src.db.seed && python -m src.main