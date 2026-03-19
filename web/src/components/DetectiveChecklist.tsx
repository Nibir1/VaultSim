// Purpose: Dynamic UI component that visualizes discovered clues from the Judge stream
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19

import React from 'react';
import { GameStatus } from '../types';

interface Props {
    requiredClues: string[];
    cluesUncovered: string[];
    gameStatus: GameStatus;
}

export const DetectiveChecklist: React.FC<Props> = ({ requiredClues, cluesUncovered, gameStatus }) => {
    // Calculate progress percentage for the top UI bar
    const progressPercentage = requiredClues.length > 0
        ? Math.round((cluesUncovered.length / requiredClues.length) * 100)
        : 0;

    return (
        <div className="bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-700 h-full flex flex-col justify-start relative overflow-hidden">

            {/* Dynamic Progress Bar (Grows as clues are found) */}
            <div
                className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000 ease-in-out"
                style={{ width: `${progressPercentage}%` }}
            ></div>

            <h2 className="text-xl font-bold mb-6 text-blue-400 uppercase tracking-wider text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                Investigation Checklist
            </h2>

            {/* Scrollable Checklist */}
            <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                {requiredClues.map((clue, index) => {
                    const isDiscovered = cluesUncovered.includes(clue);

                    return (
                        <div
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-500 ${isDiscovered
                                    ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                    : 'bg-slate-950/50 border-slate-800'
                                }`}
                        >
                            <div className="mt-0.5 flex-shrink-0">
                                {isDiscovered ? (
                                    <svg className="w-5 h-5 text-emerald-400 animate-[bounce_0.5s_ease-in-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>
                                )}
                            </div>
                            <p className={`text-sm font-medium transition-colors duration-300 ${isDiscovered ? 'text-emerald-300' : 'text-slate-500'
                                }`}>
                                {clue}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Status Indicator */}
            <div className={`mt-4 p-4 rounded-lg border transition-colors duration-500 ${gameStatus === 'VICTORY' ? 'bg-emerald-950/40 border-emerald-900/60' : 'bg-slate-950 border-slate-800'
                }`}>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Case Status</span>
                    <span>{progressPercentage}%</span>
                </p>
                {gameStatus === 'VICTORY' ? (
                    <div className="text-emerald-400 font-bold tracking-widest animate-pulse flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        CASE SOLVED
                    </div>
                ) : (
                    <div className="text-blue-400 font-bold tracking-widest flex items-center gap-2">
                        <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        INVESTIGATING...
                    </div>
                )}
            </div>
        </div>
    );
};