#!/bin/bash
# Purpose: Initialize VaultSim dependencies strictly adhering to architecture rules
# Usage: Place in vaultsim/ root, then run ./setup.sh
# Date: 2026-03-06

set -e  # Exit on any error

echo "VaultSim Enterprise Setup Starting..."
echo "Working directory: $(pwd)"

# 1. Verify system prerequisites (Go and Node)
if ! command -v go &> /dev/null; then
    echo "Error: Go not found. Please install Go 1.23+: https://go.dev/dl/"
    exit 1
fi

if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Error: Node.js/npm not found. Please install Node (e.g., brew install node)."
    exit 1
fi

# 2. Verify or Install `uv` (The modern Python package manager)
if ! command -v uv &> /dev/null; then
    echo "uv not found. Installing uv to enforce strict Python dependency locking..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# 3. Create exact directory structure
echo "Ensuring strict directory structure..."
mkdir -p {.github/workflows,infra,proto,gateway/cmd/server,gateway/internal/{config,handler,rpc,storage},ai_service/src/{agents,api,core,db},ai_service/tests,web/src/{components,hooks,pages,types}}

# 4. Initialize Go (Gateway) -> Generates go.mod and go.sum
echo "Setting up Go module (Gateway)..."
cd gateway
if [ ! -f "go.mod" ]; then
    go mod init vaultsim/gateway
fi
go get github.com/gin-gonic/gin@latest
go get google.golang.org/grpc@latest
go get github.com/jackc/pgx/v5@latest
go mod tidy
cd ..

# 5. Initialize Python (AI Service) via uv -> Generates pyproject.toml and uv.lock
echo "Setting up Python microservice via uv (Dual-Agent Engine)..."
cd ai_service
# Initialize the project and enforce Python 3.11.9
uv init --python 3.11.9 --no-workspace || true 
# Add production dependencies (This automatically generates uv.lock)
uv add fastapi pydantic langchain langchain-openai sqlalchemy
# Add development dependencies
uv add --dev pytest grpcio-tools
cd ..

# 6. Initialize Node/React (Web) -> Generates package.json and package-lock.json
echo "Setting up React frontend..."
cd web
if [ ! -f "package.json" ]; then
    npm init -y
fi
npm install react@^18.3.0 react-dom@^18.3.0
npm install --save-dev typescript@^5.6.0 vite@^5.4.0 tailwindcss@^4.0.0
cd ..

echo ""
echo "VaultSim setup complete! All strict architectural rules met."
echo "Generated Lock Files:"
echo "  - Python: ai_service/uv.lock"
echo "  - Go: gateway/go.mod & go.sum"
echo "  - Node: web/package-lock.json"
echo ""