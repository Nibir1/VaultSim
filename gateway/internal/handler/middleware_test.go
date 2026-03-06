// gateway/internal/handler/middleware_test.go

// Purpose: Unit tests for gateway security middleware and PII sanitization
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06
// Dependencies: testing

package handler

import (
	"testing"
)

// TestScrubPII validates that emails and phone numbers are correctly redacted
// Complexity: O(N) where N is the number of test cases
func TestScrubPII(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"No PII", "Hello, how are you?", "Hello, how are you?"},
		{"With Email", "My email is test@example.com", "My email is [REDACTED_EMAIL]"},
		{"With Phone", "Call me at 555-123-4567 please", "Call me at [REDACTED_PHONE] please"},
		{"Mixed PII", "Contact admin@corp.com or 800-555-1234", "Contact [REDACTED_EMAIL] or [REDACTED_PHONE]"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ScrubPII(tt.input)
			if result != tt.expected {
				t.Errorf("ScrubPII() = %v, want %v", result, tt.expected)
			}
		})
	}
}
