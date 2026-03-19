// Purpose: Strict TypeScript interfaces mapping to backend gRPC protobufs (Healthcare Detective Edition)
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19

// Enum mapping for the new Game State
export type GameStatus = 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT';

export interface Scenario {
    id: string;
    title: string;
    description: string;
    difficulty: 'Case 1' | 'Case 2' | 'Case 3';
    // Added to render the empty UI checkboxes before they are discovered
    requiredClues: string[];
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'persona' | 'judge';
    text: string;
    timestamp: number;
}

// Maps exactly to our updated game.proto ChatResponse message
export interface ChatResponsePayload {
    event_id: string;
    persona_reply: string;
    game_status: GameStatus;         // Replaced secret_revealed
    clues_uncovered: string[];       // Replaced score_delta
    judge_explanation: string;
    turn_count: number;              // Driven by the Go Gateway's Redis state
}