// Purpose: Strict TypeScript interfaces mapping to backend gRPC protobufs
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06

export interface Scenario {
    id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'persona' | 'judge';
    text: string;
    timestamp: number;
}

export interface ChatResponsePayload {
    event_id: string;
    persona_reply: string;
    secret_revealed: boolean;
    score_delta: number;
    judge_explanation: string;
}