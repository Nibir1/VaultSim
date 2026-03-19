# Purpose: Unified Developer Experience & DevOps interface
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-19

.PHONY: up down proto clean dev seed test-go test-ai test aws-check tf-init tf-plan tf-deploy tf-destroy build-docker

# Load environment variables (Automatically exports to Terraform as TF_VAR_ if named correctly)
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# ==========================================
# LOCAL DATA STORES (Postgres & Redis)
# ==========================================

up:
	@echo "Starting local infrastructure (Postgres, Redis)..."
	docker-compose up -d
	@echo "Infrastructure is up and running."

down:
	@echo "Stopping local infrastructure..."
	docker-compose down -v
	@echo "Infrastructure removed."

# ==========================================
# GPRC & PROTOBUFS
# ==========================================

proto:
	@echo "Compiling Protobufs..."
	@mkdir -p gateway/internal/rpc/pb
	# Generate Go code strictly into the gateway module
	protoc -I=proto --go_out=gateway/internal/rpc/pb --go_opt=paths=source_relative \
	       --go-grpc_out=gateway/internal/rpc/pb --go-grpc_opt=paths=source_relative \
	       game.proto
	# Generate Python code
	cd ai_service && uv run python -m grpc_tools.protoc -I../proto --python_out=src/api/ --grpc_python_out=src/api/ ../proto/game.proto
	@echo "Protobuf compilation complete."

clean:
	@echo "Cleaning up generated files..."
	rm -rf gateway/internal/rpc/pb/*.pb.go
	rm -f ai_service/src/api/*_pb2*.py
	@echo "Clean complete."

# ==========================================
# DATABASE SETUP & SEEDING
# ==========================================

seed:
	@echo "Seeding the database with Gamified Healthcare Scenarios..."
	cd ai_service && uv run python -m src.db.seed
	@echo "Database seeding complete."

# ==========================================
# LOCAL DEVELOPMENT (Single Command Run)
# ==========================================

# Runs the databases, Go, Python, and React all in one terminal
dev: up
	@echo "Starting VaultSim Enterprise Stack..."
	@echo "Press CTRL+C to stop all services gracefully."
	@trap 'echo "Shutting down services..."; kill 0' SIGINT; \
	(cd gateway && go run cmd/server/main.go) & \
	(cd ai_service && uv run python -m src.main) & \
	(cd web && npm run dev) & \
	wait

# ==========================================
# TESTING
# ==========================================

test-go:
	@echo "Running Go Gateway Tests..."
	cd gateway && go test -v ./...

test-ai:
	@echo "Running Python AI Service Tests..."
	cd ai_service && uv run pytest tests/

test: test-go test-ai
	@echo "All tests passed successfully."

# ==========================================
# DOCKER BUILD
# ==========================================

build-docker:
	@echo "Building production Docker images..."
	docker build -t vaultsim-gateway -f gateway/Dockerfile ./gateway
	docker build -t vaultsim-ai-service -f ai_service/Dockerfile ./ai_service
	docker build -t vaultsim-web -f web/Dockerfile ./web
	@echo "Docker images built successfully."

# ==========================================
# AWS & TERRAFORM DEPLOYMENT
# ==========================================

# Verifies your AWS CLI is authenticated before running infrastructure commands
aws-check:
	@echo "Verifying AWS credentials..."
	@aws sts get-caller-identity > /dev/null || (echo "AWS CLI not authenticated. Run 'aws configure' first." && exit 1)
	@echo "AWS authentication successful."

tf-init: aws-check
	@echo "Initializing Terraform..."
	cd infra && terraform init

tf-plan: tf-init
	@echo "Planning Terraform changes..."
	cd infra && terraform plan

tf-deploy: tf-init
	@echo "Deploying infrastructure to AWS..."
	cd infra && terraform apply -auto-approve
	@echo "Deployment complete."

tf-destroy: aws-check
	@echo "Destroying AWS infrastructure to save costs..."
	cd infra && terraform destroy -auto-approve
	@echo "AWS Infrastructure successfully destroyed."