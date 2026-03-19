// gateway/internal/handler/websocket.go

// Purpose: Robust WebSocket handler with gRPC session validation and state management
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19

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

type ChatMessage struct {
	SessionID  string `json:"session_id"`
	ScenarioID string `json:"scenario_id"`
	Message    string `json:"message"`
}

// HandleWebSocket upgrades connection and ensures DB session exists before chat loops
func HandleWebSocket(c *gin.Context, aiClient *rpc.AIClient, redisStore *storage.RedisStore, rateLimit int) {
	userID := c.MustGet("user_id").(string)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket for user %s: %v", userID, err)
		return
	}
	defer conn.Close()

	// Track initialized sessions to avoid redundant DB/Redis hits
	initializedSessions := make(map[string]bool)

	for {
		var msg ChatMessage
		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("WebSocket closed or read error for user %s: %v", userID, err)
			break
		}

		ctx := context.Background()

		// 1. Enforce Rate Limit
		if err := redisStore.CheckRateLimit(ctx, userID, rateLimit, time.Minute); err != nil {
			conn.WriteJSON(gin.H{"error": "Rate limit exceeded. Slow down."})
			continue
		}

		// 2. CRITICAL FIX: Ensure Session exists in Postgres via ValidateSession
		// This prevents the 'NoneType' error on the Python side
		if !initializedSessions[msg.SessionID] {
			valCtx, valCancel := context.WithTimeout(ctx, 5*time.Second)
			valResp, valErr := aiClient.Engine.ValidateSession(valCtx, &pb.SessionRequest{
				SessionId:  msg.SessionID,
				ScenarioId: msg.ScenarioID,
				UserId:     userID,
			})
			valCancel()

			if valErr != nil || !valResp.IsValid {
				log.Printf("Session validation failed for %s: %v", msg.SessionID, valErr)
				conn.WriteJSON(gin.H{"error": "Failed to initialize game session"})
				continue
			}

			// 3. Initialize Redis Turn Counter
			if err := redisStore.InitGameSession(ctx, msg.SessionID); err != nil {
				log.Printf("Failed to init Redis for session %s: %v", msg.SessionID, err)
			}
			initializedSessions[msg.SessionID] = true
		}

		// 4. Atomic Turn Increment
		turnCount, err := redisStore.IncrementTurnCount(ctx, msg.SessionID)
		if err != nil {
			log.Printf("Redis increment error: %v", err)
			conn.WriteJSON(gin.H{"error": "State sync error"})
			continue
		}

		// 5. Send to AI Service
		sanitizedMsg := ScrubPII(msg.Message)
		req := &pb.ChatRequest{
			SessionId:  msg.SessionID,
			UserId:     userID,
			Message:    sanitizedMsg,
			Timestamp:  time.Now().Unix(),
			TurnCount:  turnCount,
			ScenarioId: msg.ScenarioID,
		}

		grpcCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
		stream, err := aiClient.Engine.ProcessChatEvent(grpcCtx, req)
		if err != nil {
			log.Printf("gRPC Call failed: %v", err)
			conn.WriteJSON(gin.H{"error": "AI service unavailable"})
			cancel()
			continue
		}

		// 6. Stream chunks back to React
		for {
			resp, err := stream.Recv()
			if err == io.EOF {
				break
			}
			if err != nil {
				log.Printf("gRPC stream error: %v", err)
				break
			}
			if err := conn.WriteJSON(resp); err != nil {
				break
			}
		}
		cancel()
	}
}
