// gateway/internal/storage/redis.go

// Purpose: Redis client initialization, rate-limiting, and game state tracking
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19
// Dependencies: context, github.com/redis/go-redis/v9, fmt, time

package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisStore wraps the Redis client
type RedisStore struct {
	client *redis.Client
}

// NewRedisStore initializes and tests the Redis connection.
// Args: addr (string) format "host:port"
// Returns: *RedisStore, error if connection fails
// Complexity: O(1)
func NewRedisStore(addr string) (*RedisStore, error) {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
		DB:   0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis at %s: %w", addr, err)
	}

	return &RedisStore{client: client}, nil
}

// CheckRateLimit enforces a maximum number of requests per window per user.
// Args: ctx (context.Context), userID (string), limit (int), window (time.Duration)
// Returns: error if limit is exceeded or redis fails.
// Complexity: O(1) network call
func (r *RedisStore) CheckRateLimit(ctx context.Context, userID string, limit int, window time.Duration) error {
	key := fmt.Sprintf("ratelimit:%s", userID)

	// Pipeline for atomic increment and expire
	pipe := r.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, window)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("redis pipeline execution failed: %w", err)
	}

	if incr.Val() > int64(limit) {
		return fmt.Errorf("rate limit exceeded for user %s: max %d requests per window", userID, limit)
	}

	return nil
}

// ==========================================
// GAME STATE TRACKING (Phase 3)
// ==========================================

// InitGameSession initializes the turn count for a new session.
// We set a 24-hour TTL to prevent Redis memory leaks from abandoned browser tabs.
// Complexity: O(1)
func (r *RedisStore) InitGameSession(ctx context.Context, sessionID string) error {
	key := fmt.Sprintf("turn:%s", sessionID)
	// Set initial turn count to 0 with a 24-hour expiration
	err := r.client.Set(ctx, key, 0, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to initialize session state in redis: %w", err)
	}
	return nil
}

// IncrementTurnCount atomically increments the turn count for a session and returns the new value.
// This prevents race conditions if a user spams the send button.
// Complexity: O(1)
func (r *RedisStore) IncrementTurnCount(ctx context.Context, sessionID string) (int32, error) {
	key := fmt.Sprintf("turn:%s", sessionID)

	val, err := r.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to increment turn count in redis: %w", err)
	}

	// Redis Incr returns an int64, our gRPC contract expects int32
	return int32(val), nil
}
