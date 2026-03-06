# Purpose: Unified Developer Experience interface
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

.PHONY: up down proto clean

# Load environment variables
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# Spin up local data stores
up:
	@echo "Starting local infrastructure (Postgres, Redis)..."
	docker-compose up -d
	@echo "Infrastructure is up and running."

# Tear down local data stores
down:
	@echo "Stopping local infrastructure..."
	docker-compose down -v
	@echo "Infrastructure removed."

# Compile Protobufs for Go and Python
proto:
	@echo "Compiling Protobufs..."
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       proto/game.proto
	cd ai_service && uv run python -m grpc_tools.protoc -I../proto --python_out=src/api/ --grpc_python_out=src/api/ ../proto/game.proto
	@echo "Protobuf compilation complete."

# Clean compiled files
clean:
	@echo "Cleaning up generated files..."
	rm -f proto/*.pb.go
	rm -f ai_service/src/api/*_pb2*.py
	@echo "Clean complete."