// Purpose: Resilient WebSocket hook for bi-directional streaming and Gamified State management
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ChatResponsePayload, GameStatus } from '../types';

export const useWebSocket = (url: string, sessionId: string | null, scenarioId: string | null) => {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // New Detective Game State
    const [cluesUncovered, setCluesUncovered] = useState<string[]>([]);
    const [gameStatus, setGameStatus] = useState<GameStatus>('IN_PROGRESS');

    const wsRef = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;

        // We pass a mock user_id to satisfy the Go JWT middleware (Replace with real Auth in Prod)
        const ws = new WebSocket(`${url}?user_id=local_user_${Math.floor(Math.random() * 1000)}`);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
            try {
                const data: ChatResponsePayload = JSON.parse(event.data);

                // 1. Handle Persona Reply Stream (Chunk 1)
                if (data.persona_reply) {
                    setMessages(prev => [...prev, {
                        id: `${data.event_id}-p`,
                        sender: 'persona',
                        text: data.persona_reply,
                        timestamp: Date.now()
                    }]);
                }

                // 2. Handle Asynchronous Judge Evaluation Stream (Chunk 2)
                if (data.judge_explanation) {
                    setMessages(prev => [...prev, {
                        id: `${data.event_id}-j`,
                        sender: 'judge',
                        text: `[JUDGE ALERTS]: ${data.judge_explanation}`,
                        timestamp: Date.now()
                    }]);
                }

                // 3. Update Detective Game State
                if (data.clues_uncovered && Array.isArray(data.clues_uncovered)) {
                    setCluesUncovered(data.clues_uncovered); // React will trigger UI re-renders for newly glowing checkboxes
                }

                if (data.game_status) {
                    setGameStatus(data.game_status);
                }

            } catch (err) {
                console.error("Failed to parse WebSocket message:", err);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            // Exponential backoff could be implemented here; standard 3s used for simplicity
            setTimeout(connect, 3000);
        };
    }, [url, sessionId]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const sendMessage = (text: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !sessionId || !scenarioId) return;

        // Optimistically add user message to UI
        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            sender: 'user',
            text,
            timestamp: Date.now()
        }]);

        // Included scenario_id so the Go Gateway can pass it to the Python AI via gRPC
        wsRef.current.send(JSON.stringify({
            session_id: sessionId,
            scenario_id: scenarioId,
            message: text
        }));
    };

    return { isConnected, messages, cluesUncovered, gameStatus, sendMessage };
};