// Purpose: Main React layout and state orchestration
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06

import React, { useState } from 'react';
import { ScenarioDashboard } from './components/ScenarioDashboard';
import { ChatWindow } from './components/ChatWindow';
import { ScoreMeter } from './components/ScoreMeter';
import { useWebSocket } from './hooks/useWebSocket';

// Uses the .env value, ensuring a trailing slash to prevent Gin 301 redirects
let WS_URL = import.meta.env.VITE_GATEWAY_WS_URL || 'ws://localhost:8080/ws/';
if (!WS_URL.endsWith('/')) WS_URL += '/';

const App: React.FC = () => {
    const [activeSession, setActiveSession] = useState<string | null>(null);

    // The WebSocket hook is only active when a session is selected
    const { isConnected, messages, score, secretRevealed, sendMessage } = useWebSocket(WS_URL, activeSession);

    return (
        <div className="h-screen flex flex-col p-4 md:p-6 lg:p-8">
            <header className="mb-8 flex items-end justify-between border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white">Vault<span className="text-emerald-500">Sim</span></h1>
                    <p className="text-gray-500 text-sm mt-1 font-mono tracking-tight">Social Engineering Vector Simulator</p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">v1.0.0 // Event-Driven Polyglot Arc</p>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                <div className="lg:col-span-1 h-full">
                    <ScenarioDashboard
                        activeId={activeSession}
                        onSelect={(id) => setActiveSession(id)}
                    />
                </div>

                <div className="lg:col-span-2 h-full">
                    <ChatWindow
                        hasActiveSession={activeSession !== null}
                        messages={messages}
                        isConnected={isConnected}
                        onSendMessage={sendMessage}
                    />
                </div>

                <div className="lg:col-span-1 h-full">
                    <ScoreMeter
                        score={score}
                        secretRevealed={secretRevealed}
                    />
                </div>
            </main>
        </div>
    );
};

export default App;