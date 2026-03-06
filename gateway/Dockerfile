# gateway/Dockerfile

# Purpose: Production multi-stage build for the Go 1.23 API Gateway
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

# Stage 1: Build
FROM golang:1.25-alpine AS builder
WORKDIR /app
# Install git for downloading dependencies
RUN apk add --no-cache git

# Copy dependency locks first to cache them
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire gateway source code
COPY . .

# Build the binary statically
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /vaultsim-gateway ./cmd/server

# Stage 2: Production Runtime
FROM alpine:3.19
WORKDIR /app

# Add CA certificates for secure external communication (e.g., if needed later)
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /vaultsim-gateway /app/vaultsim-gateway

# Expose Gateway Port
EXPOSE 8080

# Run as non-root user for security
RUN adduser -D vaultuser
USER vaultuser

CMD ["/app/vaultsim-gateway"]