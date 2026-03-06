import React from 'react';

interface Props {
    score: number;
    secretRevealed: boolean;
}

export const ScoreMeter: React.FC<Props> = ({ score, secretRevealed }) => {
    return (
        <div className="bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-800 h-full flex flex-col justify-start relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>

            <h2 className="text-xl font-bold mb-6 text-emerald-500 uppercase tracking-wider text-sm">Mission Telemetry</h2>

            <div className="mb-8">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Extraction Score</p>
                <p className={`text-5xl font-mono font-light tracking-tighter ${score >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {score} <span className="text-lg text-gray-600">pts</span>
                </p>
            </div>

            <div className={`mt-auto p-4 rounded-lg border ${secretRevealed ? 'bg-red-950/30 border-red-900/50' : 'bg-gray-950 border-gray-800'
                }`}>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Target Status</p>
                {secretRevealed ? (
                    <div className="text-red-500 font-bold animate-pulse tracking-widest">BREACH DETECTED</div>
                ) : (
                    <div className="text-emerald-500 font-bold tracking-widest">SECURE</div>
                )}
            </div>
        </div>
    );
};