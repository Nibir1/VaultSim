#!/bin/bash
# Purpose: Initialize VaultSim dependencies inside existing repo
# Usage: Place in vaultsim/ root, then run ./setup.sh
# Date: 2026-03-07

set -e  # Exit on any error

echo "VaultSim Setup Starting..."
echo "Working directory: $(pwd)"

# Verify we're in the right place
if [ ! -d ".git" ]; then
    echo "Warning: No .git directory found. Ensure you're running this from the vaultsim repo root."
fi

# Check for python3.11
if ! command -v python3.11 &> /dev/null; then
    echo "Error: python3.11 not found. Please install Python 3.11 first."
    exit 1
fi

# Check for Go
if ! command -v go &> /dev/null; then
    echo "Error: Go not found. Please install Go first: https://go.dev/dl/"
    exit 1
fi

# 1. Create .venv using python3.11
echo "Creating Python virtual environment with python3.11..."
python3.11 -m venv .venv
echo "Virtual environment created at: $(pwd)/.venv"

# Activate the virtual environment
source .venv/bin/activate
echo "Virtual environment activated: $VIRTUAL_ENV"

# 2. Create directory structure
echo "Ensuring directory structure..."
mkdir -p {.github/workflows,infra,proto,gateway/cmd/server,gateway/internal/{config,handler,rpc,storage},ai_service/src/{agents,api,core,db},ai_service/tests,web/src/{components,hooks,pages,types}}

# 3. Initialize Go (Gateway)
echo "Setting up Go module..."
cd gateway
if [ ! -f "go.mod" ]; then
    go mod init vaultsim/gateway
fi
go get github.com/gin-gonic/gin@latest
go get google.golang.org/grpc@latest
go get github.com/jackc/pgx/v5@latest
go mod tidy
cd ..

# 4. Initialize Python (AI Service) using active venv
echo "Installing Python dependencies..."
cd ai_service
pip install --upgrade pip
pip install fastapi pydantic langchain langchain-openai sqlalchemy
pip install pytest
cd ..

# 5. Check for Node.js and initialize Web
echo "Checking for Node.js..."

if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo ""
    echo "Node.js/npm not found!"
    echo ""
    echo "To complete the setup, please install Node.js:"
    echo "   brew install node"
    echo ""
    echo "Or download from: https://nodejs.org/"
    echo ""
    echo "After installing Node.js, run the following manually:"
    echo "   cd web"
    echo "   npm init -y"
    echo "   npm install react@^18.3.0 react-dom@^18.3.0"
    echo "   npm install --save-dev typescript@^5.6.0 vite@^5.4.0 tailwindcss@^4.0.0"
    echo ""
    echo "Go and Python setup completed successfully!"
    echo "Web setup skipped - waiting for Node.js installation"
    exit 0
fi

echo "Node.js found: $(node --version)"
echo "npm found: $(npm --version)"

# Initialize Node/React (Web)
echo "Setting up Node.js project..."
cd web

# Initialize if no package.json exists
if [ ! -f "package.json" ]; then
    npm init -y
fi

# Install React dependencies
npm install react@^18.3.0 react-dom@^18.3.0
npm install --save-dev typescript@^5.6.0 vite@^5.4.0 tailwindcss@^4.0.0

cd ..

echo ""
echo "VaultSim setup complete!"
echo "Summary:"
echo "  - Python venv: $(pwd)/.venv"
echo "  - Go module: gateway/go.mod"
echo "  - Node packages: web/package.json"
echo ""
echo "Next steps:"
echo "  1. Activate venv when needed: source .venv/bin/activate"
echo "  2. Run Go gateway: cd gateway && go run cmd/server/main.go"
echo "  3. Run AI service: cd ai_service && python src/main.py"
echo "  4. Run frontend: cd web && npm run dev"