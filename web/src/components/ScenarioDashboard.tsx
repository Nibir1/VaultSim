// Purpose: Dashboard with Registration Modal and Live Leaderboards
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-26

import React, { useState, useEffect } from 'react';
import { Scenario } from '../types';

interface Props {
    onSelect: (scenario: Scenario, playerName: string) => void;
    activeId: string | null;
}

// Ensure the HTTP URL is built correctly from the env var
const HTTP_URL = (import.meta.env.VITE_GATEWAY_WS_URL || 'ws://localhost:8080')
    .replace('ws://', 'http://')
    .replace('wss://', 'https://')
    .replace(/\/ws\/?$/, ''); // Safely strips /ws or /ws/ from the end

export const MOCK_SCENARIOS: Scenario[] = [
    {
        id: 'wandering_usb',
        title: 'The Found Item',
        description: 'Someone found an unfamiliar item. Ask questions to understand what happened next.',
        difficulty: 'Case 1',
        requiredClues: [
            "Does this involve any object or medium?", "Is there something that can store or transfer information?", "Where did this come from?", "Is any kind of information involved?", "Is there any protection or safeguard in place?", "Did it interact with any system?"
        ]
    },
    {
        id: 'fake_doctor_email',
        title: 'A Suspicious Message',
        description: 'An urgent communication appeared to come from a trusted source. Ask questions to reveal the details.',
        difficulty: 'Case 2',
        requiredClues: [
            "Does this involve any kind of communication?", "Did the message appear to come from a trusted or important source?", "Was there anything unusual about the sender?", "Did it include any links or actions to take?", "Did someone share or enter any sensitive information?", "Did this lead to unauthorized access to a system?"
        ]
    },
    {
        id: 'public_wifi_ehr',
        title: 'The Open Network Risk',
        description: 'A person worked remotely in an open environment. Explore the situation to uncover the outcome.',
        difficulty: 'Case 3',
        requiredClues: [
            "Did this involve any kind of connection?", "Was the connection from an untrusted or public source?", "Was any information involved?", "Could the information have been exposed or intercepted?", "Did anyone access it without permission?"
        ]
    }
];

export const ScenarioDashboard: React.FC<Props> = ({ onSelect, activeId }) => {
    const [pendingScenario, setPendingScenario] = useState<Scenario | null>(null);
    const [playerName, setPlayerName] = useState("");

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [viewingLeaderboardId, setViewingLeaderboardId] = useState<string>('wandering_usb');

    useEffect(() => {
        fetch(`${HTTP_URL}/api/leaderboard/${viewingLeaderboardId}`)
            .then(res => res.json())
            .then(data => setLeaderboard(data || []))
            .catch(err => console.error("Leaderboard fetch failed:", err));
    }, [viewingLeaderboardId, activeId]); // Refresh when a case is solved (activeId changes)

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        if (pendingScenario && playerName.trim()) {
            onSelect(pendingScenario, playerName.trim());
            setViewingLeaderboardId(pendingScenario.id);
            setPendingScenario(null);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Modal Overlay */}
            {pendingScenario && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-blue-500 shadow-2xl rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold text-white mb-2">Initialize Case</h3>
                        <p className="text-sm text-slate-400 mb-4">Enter your designation to begin the investigation.</p>
                        <form onSubmit={handleStart}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Investigator Name"
                                maxLength={20}
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 mb-4"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setPendingScenario(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={!playerName.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors">Start</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-700 flex-shrink-0">
                <h2 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-wider text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Active Cases
                </h2>
                <div className="space-y-4">
                    {MOCK_SCENARIOS.map(scen => (
                        <div
                            key={scen.id}
                            onClick={() => setPendingScenario(scen)}
                            onMouseEnter={() => setViewingLeaderboardId(scen.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 group ${activeId === scen.id ? 'bg-slate-800 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-950 border-slate-700 hover:border-slate-500'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-200 group-hover:text-blue-300 transition-colors">{scen.title}</h3>
                                <span className={`text-[10px] px-2 py-1 rounded font-mono ${scen.difficulty === 'Case 1' ? 'bg-green-900/50 text-green-400' : scen.difficulty === 'Case 2' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>{scen.difficulty}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Glowing Leaderboard */}
            <div className="bg-slate-900 p-6 rounded-xl shadow-2xl border border-yellow-600/30 flex-1 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-yellow-500 uppercase tracking-wider text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                    Top Investigators
                </h2>
                <div className="space-y-2">
                    {leaderboard.length === 0 ? (
                        <p className="text-xs text-slate-500 font-mono text-center mt-8">No solved cases yet.</p>
                    ) : (
                        leaderboard.map((entry: any, idx) => {
                            // FIX: Handle Go Protobuf JSON camelCasing
                            const name = entry.playerName || entry.player_name || "Anonymous";
                            const duration = entry.durationSeconds !== undefined ? entry.durationSeconds : entry.duration_seconds;

                            return (
                                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-950/50 border border-slate-800 text-sm">
                                    <span className="font-bold text-slate-300">
                                        <span className="text-yellow-600 mr-2">#{idx + 1}</span>
                                        {name}
                                    </span>
                                    <span className="font-mono text-emerald-400">
                                        {Math.floor(duration / 60)}m {duration % 60}s
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};