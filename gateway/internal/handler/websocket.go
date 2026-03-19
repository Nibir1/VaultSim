// gateway/internal/handler/websocket.go

// Purpose: WebSocket handler bridging React clients to the gRPC AI Service with State Management
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19
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

// ChatMessage represents the JSON payload from the React frontend
type ChatMessage struct {
	SessionID  string `json:"session_id"`
	ScenarioID string `json:"scenario_id"` // Added to pass the selected healthcare scenario to Python
	Message    string `json:"message"`
}

// HandleWebSocket upgrades the HTTP connection, manages Redis state, and enters the message loop.
// Args: c (*gin.Context), aiClient (*rpc.AIClient), redisStore (*storage.RedisStore), rateLimit (int)
// Returns: none (hijacks connection)
// Raises: Logs errors and closes connection on failure
// Complexity: O(1) State Tracking, O(N) per session messages
func HandleWebSocket(c *gin.Context, aiClient *rpc.AIClient, redisStore *storage.RedisStore, rateLimit int) {
	userID := c.MustGet("user_id").(string)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket for user %s: %v", userID, err)
		return
	}
	defer conn.Close()

	// Track which sessions have had their Redis TTL initialized during this connection
	initializedSessions := make(map[string]bool)

	for {
		// 1. Read message from React Client
		var msg ChatMessage
		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("WebSocket connection closed or read error for user %s: %v", userID, err)
			break
		}

		ctx := context.Background()

		// 2. Enforce Rate Limit via Redis
		if err := redisStore.CheckRateLimit(ctx, userID, rateLimit, time.Minute); err != nil {
			conn.WriteJSON(gin.H{"error": "Rate limit exceeded. Slow down."})
			continue
		}

		// 3. Initialize Game Session TTL if this is the first message for this session ID
		if !initializedSessions[msg.SessionID] {
			if err := redisStore.InitGameSession(ctx, msg.SessionID); err != nil {
				log.Printf("Failed to init game session: %v", err)
			}
			initializedSessions[msg.SessionID] = true
		}

		// 4. Atomically Increment the Turn Count
		turnCount, err := redisStore.IncrementTurnCount(ctx, msg.SessionID)
		if err != nil {
			log.Printf("Failed to increment turn count for session %s: %v", msg.SessionID, err)
			conn.WriteJSON(gin.H{"error": "Failed to update game state"})
			continue
		}

		// 5. Scrub PII (Assuming this is defined in your pii.go file)
		sanitizedMsg := ScrubPII(msg.Message)

		// 6. Send the payload and the new state to the Python gRPC Service
		req := &pb.ChatRequest{
			SessionId:  msg.SessionID,
			UserId:     userID,
			Message:    sanitizedMsg,
			Timestamp:  time.Now().Unix(),
			TurnCount:  turnCount,      // The newly incremented Pity Timer state
			ScenarioId: msg.ScenarioID, // e.g., "wandering_usb"
		}

		grpcCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		stream, err := aiClient.Engine.ProcessChatEvent(grpcCtx, req)
		if err != nil {
			log.Printf("gRPC Call failed: %v", err)
			conn.WriteJSON(gin.H{"error": "AI service unavailable"})
			cancel()
			continue
		}

		// 7. Stream the chunked response back to WebSocket
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

			// Forward the response chunk (now containing game_status and clues_uncovered) to the frontend
			if writeErr := conn.WriteJSON(resp); writeErr != nil {
				log.Printf("Failed to write to WebSocket: %v", writeErr)
				break
			}
		}
		cancel()
	}
}
