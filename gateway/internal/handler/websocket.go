// gateway/internal/handler/websocket.go

// Purpose: WebSocket handler bridging React clients to the gRPC AI Service
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06
// Dependencies: gin, gorilla/websocket, context, time, io, vaultsim/gateway/internal/rpc/pb

package handler

import (
	"context"
	"io"
	"log"
	"net/http"
	"time"

	"vaultsim/gateway/internal/rpc"
	pb "vaultsim/gateway/internal/rpc/pb"
	"vaultsim/gateway/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local dev
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// ChatMessage represents the JSON payload from the frontend
type ChatMessage struct {
	SessionID string `json:"session_id"`
	Message   string `json:"message"`
}

// HandleWebSocket upgrades the HTTP connection and enters the message loop.
// Args: c (*gin.Context), aiClient (*rpc.AIClient), redisStore (*storage.RedisStore), rateLimit (int)
// Returns: none (hijacks connection)
// Raises: Logs errors and closes connection on failure
// Complexity: O(N) per session messages
func HandleWebSocket(c *gin.Context, aiClient *rpc.AIClient, redisStore *storage.RedisStore, rateLimit int) {
	userID := c.MustGet("user_id").(string)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket for user %s: %v", userID, err)
		return
	}
	defer conn.Close()

	for {
		// 1. Read message from React Client
		var msg ChatMessage
		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("WebSocket connection closed or read error for user %s: %v", userID, err)
			break
		}

		// 2. Enforce Rate Limit via Redis (e.g., max X requests per minute)
		ctx := context.Background()
		if err := redisStore.CheckRateLimit(ctx, userID, rateLimit, time.Minute); err != nil {
			conn.WriteJSON(gin.H{"error": "Rate limit exceeded. Slow down."})
			continue
		}

		// 3. Scrub PII
		sanitizedMsg := ScrubPII(msg.Message)

		// 4. Send to Python gRPC Service
		req := &pb.ChatRequest{
			SessionId: msg.SessionID,
			UserId:    userID,
			Message:   sanitizedMsg,
			Timestamp: time.Now().Unix(),
		}

		grpcCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		stream, err := aiClient.Engine.ProcessChatEvent(grpcCtx, req)
		if err != nil {
			log.Printf("gRPC Call failed: %v", err)
			conn.WriteJSON(gin.H{"error": "AI service unavailable"})
			cancel()
			continue
		}

		// 5. Stream the chunked response back to WebSocket
		for {
			resp, err := stream.Recv()
			if err == io.EOF {
				break // End of stream
			}
			if err != nil {
				log.Printf("Error reading from gRPC stream: %v", err)
				conn.WriteJSON(gin.H{"error": "Stream interrupted"})
				break
			}

			// Forward the response chunk to the frontend
			if writeErr := conn.WriteJSON(resp); writeErr != nil {
				log.Printf("Failed to write to WebSocket: %v", writeErr)
				break
			}
		}
		cancel()
	}
}
