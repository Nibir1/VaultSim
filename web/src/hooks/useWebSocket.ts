// Purpose: Resilient WebSocket hook for bi-directional streaming and state management
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ChatResponsePayload } from '../types';

export const useWebSocket = (url: string, sessionId: string | null) => {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [score, setScore] = useState(0);
    const [secretRevealed, setSecretRevealed] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;

        // We pass a mock user_id to satisfy the Go JWT middleware
        const ws = new WebSocket(`${url}?user_id=local_user_${Math.floor(Math.random() * 1000)}`);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
            try {
                const data: ChatResponsePayload = JSON.parse(event.data);

                // 1. Handle Persona Reply Stream
                if (data.persona_reply) {
                    setMessages(prev => [...prev, {
                        id: `${data.event_id}-p`,
                        sender: 'persona',
                        text: data.persona_reply,
                        timestamp: Date.now()
                    }]);
                }

                // 2. Handle Asynchronous Judge Evaluation Stream
                if (data.judge_explanation) {
                    setMessages(prev => [...prev, {
                        id: `${data.event_id}-j`,
                        sender: 'judge',
                        text: `[JUDGE]: ${data.judge_explanation} (Score: ${data.score_delta > 0 ? '+' : ''}${data.score_delta || 0})`,
                        timestamp: Date.now()
                    }]);
                }

                // 3. Update Game State
                if (data.score_delta) setScore(s => s + data.score_delta);
                if (data.secret_revealed) setSecretRevealed(true);

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
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !sessionId) return;

        // Optimistically add user message to UI
        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            sender: 'user',
            text,
            timestamp: Date.now()
        }]);

        wsRef.current.send(JSON.stringify({ session_id: sessionId, message: text }));
    };

    return { isConnected, messages, score, secretRevealed, sendMessage };
};