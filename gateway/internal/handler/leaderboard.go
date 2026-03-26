// gateway/internal/handler/leaderboard.go

package handler

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"vaultsim/gateway/internal/rpc"
	pb "vaultsim/gateway/internal/rpc/pb"

	"github.com/gin-gonic/gin"
)

// GetLeaderboard fetches the top fastest completion times for a given scenario
func GetLeaderboard(aiClient *rpc.AIClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		scenarioID := c.Param("scenario_id")
		if scenarioID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "scenario_id is required"})
			return
		}

		limitStr := c.DefaultQuery("limit", "10")
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			limit = 10
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		req := &pb.LeaderboardRequest{
			ScenarioId: scenarioID,
			Limit:      int32(limit),
		}

		resp, err := aiClient.Engine.GetLeaderboard(ctx, req)
		if err != nil {
			log.Printf("gRPC GetLeaderboard failed for %s: %v", scenarioID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard data"})
			return
		}

		// FIX: Explicitly map the Protobuf structs to a standard map to completely
		// bypass Go's automatic omitempty and camelCase serialization quirks.
		entries := []map[string]interface{}{}
		for _, e := range resp.Entries {
			entries = append(entries, map[string]interface{}{
				"player_name":      e.PlayerName,
				"duration_seconds": e.DurationSeconds,
			})
		}

		// Return the cleanly mapped array
		c.JSON(http.StatusOK, entries)
	}
}
