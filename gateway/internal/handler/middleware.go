// gateway/internal/handler/middleware.go

// Purpose: Security middleware for JWT validation and PII sanitization
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06
// Dependencies: gin, regexp, strings

package handler

import (
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

var (
	// Regex for basic PII: Emails and common phone number patterns
	emailRegex = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	phoneRegex = regexp.MustCompile(`\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`)
)

// ScrubPII removes sensitive strings from user input before sending to LLM.
// Args: input (string)
// Returns: sanitized string
// Complexity: O(n) based on string length
func ScrubPII(input string) string {
	sanitized := emailRegex.ReplaceAllString(input, "[REDACTED_EMAIL]")
	sanitized = phoneRegex.ReplaceAllString(sanitized, "[REDACTED_PHONE]")
	// In a real enterprise app, we would use an ML-based NER model here.
	return strings.TrimSpace(sanitized)
}

// AuthMiddleware validates the presence of a user_id (Mocking JWT for now to allow local dev).
// Args: secret (string) for future JWT parsing
// Returns: gin.HandlerFunc
// Complexity: O(1)
func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Mock JWT Validation: Extract user_id from query params for testing Phase 2 easily
		userID := c.Query("user_id")
		if userID == "" {
			c.JSON(401, gin.H{"error": "Unauthorized: missing user_id"})
			c.Abort()
			return
		}

		// Set validated claims into context
		c.Set("user_id", userID)
		c.Next()
	}
}
