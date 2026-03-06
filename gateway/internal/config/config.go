// gateway/internal/config/config.go

// Purpose: Centralized environment configuration loader for the Gateway
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06
// Dependencies: os, strconv

package config

import (
	"os"
	"strconv"
)

// AppConfig holds all environment-level configuration for the gateway
type AppConfig struct {
	Port         string
	Env          string
	JWTSecret    string
	RedisURL     string
	GRPCAddr     string
	RateLimitReq int
}

// LoadConfig reads environment variables and returns a populated AppConfig.
// Args: none
// Returns: *AppConfig populated with values or safe defaults.
// Raises: none (uses defaults if unset, but in production, missing JWT secret should ideally panic).
// Complexity: O(1)
func LoadConfig() *AppConfig {
	rateLimit, err := strconv.Atoi(getEnv("RATE_LIMIT_REQ", "10"))
	if err != nil {
		rateLimit = 10
	}

	return &AppConfig{
		Port:         getEnv("GATEWAY_PORT", "8080"),
		Env:          getEnv("GATEWAY_ENV", "development"),
		JWTSecret:    getEnv("JWT_SECRET", "super-secret-local-dev-key"),
		RedisURL:     getEnv("REDIS_HOST", "localhost") + ":" + getEnv("REDIS_PORT", "6379"),
		GRPCAddr:     getEnv("AI_SERVICE_HOST", "localhost") + ":" + getEnv("AI_SERVICE_PORT", "50051"),
		RateLimitReq: rateLimit,
	}
}

// getEnv retrieves a string environment variable or returns a fallback.
// Args: key (string), fallback (string)
// Returns: string
// Complexity: O(1)
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
