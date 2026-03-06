import React from 'react';
import { Scenario } from '../types';

interface Props {
    onSelect: (id: string) => void;
    activeId: string | null;
}

// Hardcoded for Phase 5. In production, this is fetched via REST from the DB.
const MOCK_SCENARIOS: Scenario[] = [
    { id: 'scen-1', title: 'The Finance Intern', description: 'Extract the database password from a nervous intern.', difficulty: 'Easy' },
    { id: 'scen-2', title: 'C-Suite Spear Phishing', description: 'Convince the CEO to authorize a wire transfer.', difficulty: 'Hard' }
];

export const ScenarioDashboard: React.FC<Props> = ({ onSelect, activeId }) => {
    return (
        <div className="bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-800 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-emerald-500 uppercase tracking-wider text-sm">Target Selection</h2>
            <div className="space-y-4">
                {MOCK_SCENARIOS.map(scen => (
                    <div
                        key={scen.id}
                        onClick={() => onSelect(scen.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 group ${activeId === scen.id ? 'bg-gray-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-200 group-hover:text-emerald-400 transition-colors">{scen.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded font-mono ${scen.difficulty === 'Easy' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                                }`}>{scen.difficulty}</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{scen.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};