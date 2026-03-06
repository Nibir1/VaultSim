# ai_service/src/main.py

# Purpose: Bootstraps the gRPC server and FastAPI health probes.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06
# Dependencies: fastapi, grpc, asyncio

import sys
from pathlib import Path

# [WORKAROUND] Add src/api to sys.path to fix the Python gRPC compiler absolute import bug
sys.path.insert(0, str(Path(__file__).parent / "api"))

import asyncio
import logging
from concurrent import futures
import grpc
from fastapi import FastAPI
import uvicorn

from src.core.config import settings
import src.api.game_pb2_grpc as game_pb2_grpc
from src.api.grpc_server import DualAgentService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI for health checks (required by AWS ALB/Target Groups)
app = FastAPI(title="VaultSim AI Microservice")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai_service"}

async def serve_grpc():
    """Starts the asynchronous gRPC server."""
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    game_pb2_grpc.add_DualAgentEngineServicer_to_server(DualAgentService(), server)
    
    addr = f"[::]:{settings.ai_service_port}"
    server.add_insecure_port(addr)
    logger.info(f"gRPC Server starting on {addr}")
    
    await server.start()
    await server.wait_for_termination()

async def serve_fastapi():
    """Starts the FastAPI HTTP server for health probes."""
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()

async def main():
    """Runs both servers concurrently."""
    await asyncio.gather(
        serve_grpc(),
        serve_fastapi()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("AI Service shutting down gracefully.")