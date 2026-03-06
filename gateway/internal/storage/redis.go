// gateway/internal/storage/redis.go

// Purpose: Redis client initialization and rate-limiting logic
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06
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
