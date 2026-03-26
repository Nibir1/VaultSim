// Purpose: Main React layout, gamified state orchestration, and Victory Modal
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-26

import React, { useState, useEffect } from 'react';
import { ScenarioDashboard } from './components/ScenarioDashboard';
import { ChatWindow } from './components/ChatWindow';
import { DetectiveChecklist } from './components/DetectiveChecklist';
import { useWebSocket } from './hooks/useWebSocket';
import { Scenario } from './types';

let WS_URL = import.meta.env.VITE_GATEWAY_WS_URL || 'ws://localhost:8080/ws/';
if (!WS_URL.endsWith('/')) WS_URL += '/';

const App: React.FC = () => {
    const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [finalTime, setFinalTime] = useState<number | null>(null);

    const {
        isConnected,
        messages,
        cluesUncovered,
        gameStatus,
        sendMessage
    } = useWebSocket(WS_URL, sessionId, activeScenario?.id || null, playerName);

    const handleScenarioSelect = (scenario: Scenario, name: string) => {
        setActiveScenario(scenario);
        setPlayerName(name);
        setSessionId(crypto.randomUUID());
        setStartTime(Date.now());
        setFinalTime(null);
    };

    // Calculate final time when victory is achieved AND Auto-Scroll
    useEffect(() => {
        if (gameStatus === 'VICTORY') {
            if (startTime && !finalTime) {
                setFinalTime(Math.floor((Date.now() - startTime) / 1000));
            }
            // POLISH: Smoothly glide the user back to the top of the dashboard
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [gameStatus, startTime, finalTime]);

    return (
        <div className="h-screen flex flex-col p-4 md:p-6 lg:p-8 bg-slate-950 text-slate-200">
            {/* Victory Modal Overlay - POLISH: Changed 'absolute' to 'fixed' to lock it to the viewport */}
            {gameStatus === 'VICTORY' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)] rounded-2xl p-8 max-w-lg text-center transform animate-[scale-in_0.3s_ease-out]">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-900/50 mb-6">
                            <svg className="h-12 w-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Case Solved!</h2>

                        {/* Display final time */}
                        {finalTime !== null && (
                            <p className="text-emerald-400 font-mono text-xl mb-4 font-bold bg-emerald-950/50 inline-block px-4 py-2 rounded border border-emerald-800">
                                Time: {Math.floor(finalTime / 60)}m {finalTime % 60}s
                            </p>
                        )}

                        <p className="text-slate-400 mb-6 leading-relaxed">
                            Excellent work, {playerName}. You successfully uncovered all the facts of the breach. Your record has been logged to the global leaderboard.
                        </p>
                        <button
                            onClick={() => {
                                setActiveScenario(null);
                                setSessionId(null);
                                // Scroll to top again just in case, ensuring a clean slate
                                window.scrollTo({ top: 0, behavior: 'instant' });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-colors w-full tracking-wide"
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
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">v2.1.0 // Competitive Arc</p>
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
                            startTime={startTime}
                        />
                    ) : (
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