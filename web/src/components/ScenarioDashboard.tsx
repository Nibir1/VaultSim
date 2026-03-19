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
        title: 'The Wandering USB Stick',
        description: 'A nurse found a mysterious USB drive in the parking lot. Interrogate them to find out what happened next.',
        difficulty: 'Easy',
        requiredClues: [
            "Does this involve a physical device?",
            "Was it a USB stick?",
            "Was it found somewhere?",
            "Did it contain sensitive patient information?",
            "Was the USB encrypted?",
            "Did someone plug it into a hospital computer?"
        ]
    },
    {
        id: 'fake_doctor_email',
        title: 'The Fake Doctor\'s Email',
        description: 'Staff received an urgent email from the Chief Medical Officer. Uncover the details of the phishing breach.',
        difficulty: 'Medium',
        requiredClues: [
            "Was this an email issue?",
            "Did the email pretend to be someone important?",
            "Was the email address suspicious?",
            "Was there a link involved?",
            "Did someone enter their login credentials?",
            "Did attackers gain access to hospital systems?"
        ]
    },
    {
        id: 'public_wifi_ehr',
        title: 'The Public Wi-Fi EHR Breach',
        description: 'An attending doctor was working remotely from a café. Investigate the unauthorized EHR access.',
        difficulty: 'Hard',
        requiredClues: [
            "Did this involve Wi-Fi?",
            "Was it a public or open network?",
            "Was sensitive data accessed over Wi-Fi?",
            "Could someone intercept the connection?",
            "Was unauthorized access detected?"
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
                            <span className={`text-xs px-2 py-1 rounded font-mono ${scen.difficulty === 'Easy' ? 'bg-green-900/50 text-green-400' :
                                    scen.difficulty === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
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