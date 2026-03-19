// Purpose: Main React layout, gamified state orchestration, and Victory Modal
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19

import React, { useState } from 'react';
import { ScenarioDashboard } from './components/ScenarioDashboard';
import { ChatWindow } from './components/ChatWindow';
import { DetectiveChecklist } from './components/DetectiveChecklist';
import { useWebSocket } from './hooks/useWebSocket';
import { Scenario } from './types';

// Uses the .env value, ensuring a trailing slash to prevent Gin 301 redirects
let WS_URL = import.meta.env.VITE_GATEWAY_WS_URL || 'ws://localhost:8080/ws/';
if (!WS_URL.endsWith('/')) WS_URL += '/';

const App: React.FC = () => {
    const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // The WebSocket hook is only active when a session and scenario are selected
    const {
        isConnected,
        messages,
        cluesUncovered,
        gameStatus,
        sendMessage
    } = useWebSocket(WS_URL, sessionId, activeScenario?.id || null);

    // Generate a fresh session ID whenever the user clicks a new case
    const handleScenarioSelect = (scenario: Scenario) => {
        setActiveScenario(scenario);
        setSessionId(crypto.randomUUID());
    };

    return (
        <div className="h-screen flex flex-col p-4 md:p-6 lg:p-8 bg-slate-950 text-slate-200">
            {/* Victory Modal Overlay */}
            {gameStatus === 'VICTORY' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)] rounded-2xl p-8 max-w-lg text-center transform animate-[scale-in_0.3s_ease-out]">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-900/50 mb-6">
                            <svg className="h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Case Solved!</h2>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                            Excellent work, Investigator. You successfully uncovered all the facts of the breach.
                            Remember: Never trust unverified devices or links in a clinical environment.
                        </p>
                        <button
                            onClick={() => {
                                setActiveScenario(null);
                                setSessionId(null);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-colors w-full tracking-wide"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}

            <header className="mb-8 flex items-end justify-between border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white">Vault<span className="text-blue-500">Sim</span></h1>
                    <p className="text-slate-400 text-sm mt-1 font-mono tracking-tight">Healthcare Security Investigator</p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">v2.0.0 // Gamified Clinical Arc</p>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                <div className="lg:col-span-1 h-full">
                    <ScenarioDashboard
                        activeId={activeScenario?.id || null}
                        onSelect={handleScenarioSelect}
                    />
                </div>

                <div className="lg:col-span-2 h-full relative">
                    {/* Disable the chat window visually if they won, forcing them to use the modal */}
                    <div className={gameStatus === 'VICTORY' ? 'opacity-50 pointer-events-none transition-opacity duration-1000 h-full' : 'h-full'}>
                        <ChatWindow
                            hasActiveSession={activeScenario !== null}
                            messages={messages}
                            isConnected={isConnected}
                            onSendMessage={sendMessage}
                        />
                    </div>
                </div>

                <div className="lg:col-span-1 h-full">
                    {activeScenario ? (
                        <DetectiveChecklist
                            requiredClues={activeScenario.requiredClues}
                            cluesUncovered={cluesUncovered}
                            gameStatus={gameStatus}
                        />
                    ) : (
                        // Empty state before a case is selected
                        <div className="bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-800 h-full flex items-center justify-center text-center">
                            <p className="text-slate-600 font-mono text-sm uppercase tracking-widest">Select a case<br />to view checklist</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;