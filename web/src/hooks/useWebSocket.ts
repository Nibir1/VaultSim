// Purpose: Resilient WebSocket hook for bi-directional streaming and Gamified State management
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-26

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ChatResponsePayload, GameStatus } from '../types';

export const useWebSocket = (url: string, sessionId: string | null, scenarioId: string | null, playerName: string | null) => {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const [cluesUncovered, setCluesUncovered] = useState<string[]>([]);
    const [gameStatus, setGameStatus] = useState<GameStatus>('IN_PROGRESS');

    const wsRef = useRef<WebSocket | null>(null);

    // FIX: Automatically scrub the game state clean whenever the session changes or closes
    useEffect(() => {
        setMessages([]);
        setCluesUncovered([]);
        setGameStatus('IN_PROGRESS');
    }, [sessionId]);

    const connect = useCallback(() => {
        if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(`${url}?user_id=local_user_${Math.floor(Math.random() * 1000)}`);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
            try {
                const data: ChatResponsePayload = JSON.parse(event.data);

                if (data.persona_reply) {
                    setMessages(prev => [...prev, {
                        id: `${data.event_id}-p`,
                        sender: 'persona',
                        text: data.persona_reply,
                        timestamp: Date.now()
                    }]);
                }

                if (data.judge_explanation) {
                    setMessages(prev => [...prev, {
                        id: `${data.event_id}-j`,
                        sender: 'judge',
                        text: `[JUDGE ALERTS]: ${data.judge_explanation}`,
                        timestamp: Date.now()
                    }]);
                }

                if (data.clues_uncovered && Array.isArray(data.clues_uncovered)) {
                    setCluesUncovered(data.clues_uncovered);
                }

                // Map Protobuf integer Enums to our React Strings
                if (data.game_status !== undefined) {
                    const statusMap: Record<number, GameStatus> = {
                        0: 'IN_PROGRESS',
                        1: 'VICTORY',
                        2: 'DEFEAT'
                    };

                    const mappedStatus = typeof data.game_status === 'number'
                        ? statusMap[data.game_status]
                        : data.game_status;

                    setGameStatus(mappedStatus as GameStatus);
                }

            } catch (err) {
                console.error("Failed to parse WebSocket message:", err);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
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
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !sessionId || !scenarioId || !playerName) return;

        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            sender: 'user',
            text,
            timestamp: Date.now()
        }]);

        wsRef.current.send(JSON.stringify({
            session_id: sessionId,
            scenario_id: scenarioId,
            player_name: playerName,
            message: text
        }));
    };

    return { isConnected, messages, cluesUncovered, gameStatus, sendMessage };
};