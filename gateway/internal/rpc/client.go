// gateway/internal/rpc/client.go

// Purpose: gRPC client bridging the Gateway to the Python AI microservice
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06
// Dependencies: google.golang.org/grpc, context, time, log, vaultsim/gateway/internal/rpc/pb

package rpc

import (
	"context"
	"fmt"
	"log"
	"time"

	pb "vaultsim/gateway/internal/rpc/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// AIClient wraps the gRPC connection
type AIClient struct {
	Engine pb.DualAgentEngineClient
	conn   *grpc.ClientConn
}

// NewAIClient establishes a gRPC connection with retries and timeout.
// Args: target (string) address of the Python service
// Returns: *AIClient, error on total failure
// Complexity: O(retries)
func NewAIClient(target string) (*AIClient, error) {
	var conn *grpc.ClientConn
	var err error

	// Retry loop for connection resilience
	for i := 0; i < 3; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		conn, err = grpc.DialContext(
			ctx,
			target,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithBlock(), // Wait for connection to establish
		)
		cancel()

		if err == nil {
			log.Printf("Successfully connected to AI service at %s", target)
			return &AIClient{
				Engine: pb.NewDualAgentEngineClient(conn),
				conn:   conn,
			}, nil
		}
		log.Printf("Attempt %d: Failed to connect to AI service: %v. Retrying in 2 seconds...", i+1, err)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("failed to connect to AI service after 3 attempts: %w", err)
}

// Close gracefully shuts down the gRPC connection.
// Args: none
// Returns: error
// Complexity: O(1)
func (c *AIClient) Close() error {
	return c.conn.Close()
}
