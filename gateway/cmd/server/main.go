// gateway/cmd/server/main.go

// Purpose: Entry point for the Go API Gateway
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-26
// Dependencies: gin, log, gateway internal packages

package main

import (
	"log"
	"net/http"

	"vaultsim/gateway/internal/config"
	"vaultsim/gateway/internal/handler"
	"vaultsim/gateway/internal/rpc"
	"vaultsim/gateway/internal/storage"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware allows our React frontend (port 4500) to fetch data from Go (port 8080)
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// In production, replace "*" with your exact frontend domain (e.g., "https://vaultsim.com")
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

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

	// FIX: Apply CORS Middleware to the entire router so React can fetch safely
	r.Use(CORSMiddleware())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "gateway"})
	})

	// Public API Routes (Leaderboard)
	apiGroup := r.Group("/api")
	apiGroup.GET("/leaderboard/:scenario_id", handler.GetLeaderboard(aiClient))

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
