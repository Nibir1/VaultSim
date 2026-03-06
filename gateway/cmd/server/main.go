// gateway/cmd/server/main.go

// Purpose: Entry point for the Go API Gateway
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06
// Dependencies: gin, log, gateway internal packages

package main

import (
	"log"

	"vaultsim/gateway/internal/config"
	"vaultsim/gateway/internal/handler"
	"vaultsim/gateway/internal/rpc"
	"vaultsim/gateway/internal/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Redis Storage
	redisStore, err := storage.NewRedisStore(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Fatal: Failed to initialize Redis: %v", err)
	}

	// 3. Initialize gRPC Client
	aiClient, err := rpc.NewAIClient(cfg.GRPCAddr)
	if err != nil {
		log.Fatalf("Fatal: Failed to initialize gRPC client: %v", err)
	}
	defer aiClient.Close()

	// 4. Setup Gin Router
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "gateway"})
	})

	// WebSocket Route (Protected by AuthMiddleware)
	wsGroup := r.Group("/ws")
	wsGroup.Use(handler.AuthMiddleware(cfg.JWTSecret))
	wsGroup.GET("/", func(c *gin.Context) {
		handler.HandleWebSocket(c, aiClient, redisStore, cfg.RateLimitReq)
	})

	// 5. Start Server
	log.Printf("Starting VaultSim Go Gateway on port %s...", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
