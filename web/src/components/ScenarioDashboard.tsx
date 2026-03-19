// Purpose: Clinical Investigator Dashboard for selecting Healthcare Security scenarios
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-19

import React from 'react';
import { Scenario } from '../types';

interface Props {
    onSelect: (scenario: Scenario) => void;
    activeId: string | null;
}

// Hardcoded for the MVP. In production, this is fetched via REST from the Postgres DB.
export const MOCK_SCENARIOS: Scenario[] = [
    {
        id: 'wandering_usb',
        title: 'The Found Item',
        description: 'Someone found an unfamiliar item. Ask questions to understand what happened next.',
        difficulty: 'Case 1',
        requiredClues: [
            "Does this involve any object or medium?",
            "Is there something that can store or transfer information?",
            "Where did this come from?",
            "Is any kind of information involved?",
            "Is there any protection or safeguard in place?",
            "Did it interact with any system?"
        ]
    },
    {
        id: 'fake_doctor_email',
        title: 'A Suspicious Message',
        description: 'An urgent communication appeared to come from a trusted source. Ask questions to reveal the details.',
        difficulty: 'Case 2',
        requiredClues: [
            "Does this involve any kind of communication?",
            "Did the message appear to come from a trusted or important source?",
            "Was there anything unusual about the sender?",
            "Did it include any links or actions to take?",
            "Did someone share or enter any sensitive information?",
            "Did this lead to unauthorized access to a system?"
        ]
    },
    {
        id: 'public_wifi_ehr',
        title: 'The Open Network Risk',
        description: 'A person worked remotely in an open environment. Explore the situation to uncover the outcome.',
        difficulty: 'Case 3',
        requiredClues: [
            "Did this involve any kind of connection?",
            "Was the connection from an untrusted or public source?",
            "Was any information involved?",
            "Could the information have been exposed or intercepted?",
            "Did anyone access it without permission?"
        ]
    }
];

export const ScenarioDashboard: React.FC<Props> = ({ onSelect, activeId }) => {
    return (
        <div className="bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-700 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-wider text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Active Cases
            </h2>
            <div className="space-y-4">
                {MOCK_SCENARIOS.map(scen => (
                    <div
                        key={scen.id}
                        // Note: We now pass the entire scenario object back up so the main App knows the required clues
                        onClick={() => onSelect(scen)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 group ${activeId === scen.id
                            ? 'bg-slate-800 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                            : 'bg-slate-950 border-slate-700 hover:border-slate-500'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-200 group-hover:text-blue-300 transition-colors">{scen.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded font-mono ${scen.difficulty === 'Case 1' ? 'bg-green-900/50 text-green-400' :
                                scen.difficulty === 'Case 2' ? 'bg-yellow-900/50 text-yellow-400' :
                                    'bg-red-900/50 text-red-400'
                                }`}>{scen.difficulty}</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{scen.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};