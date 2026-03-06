import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface Props {
    messages: ChatMessage[];
    isConnected: boolean;
    onSendMessage: (msg: string) => void;
    hasActiveSession: boolean;
}

export const ChatWindow: React.FC<Props> = ({ messages, isConnected, onSendMessage, hasActiveSession }) => {
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !isConnected) return;
        onSendMessage(input.trim());
        setInput('');
    };

    if (!hasActiveSession) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl border border-gray-800">
                <p className="text-gray-500 font-mono">Select a target scenario to initiate connection...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden relative">
            <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center backdrop-blur-sm z-10">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Active Link</h2>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></div>
                    <span className={`text-xs font-mono ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isConnected ? 'ESTABLISHED' : 'DISCONNECTED'}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-gray-500 mb-1 px-1 uppercase tracking-widest font-mono">{msg.sender}</span>
                        <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' :
                                msg.sender === 'judge' ? 'bg-purple-950/40 text-purple-300 border border-purple-900/50 font-mono rounded-bl-none' :
                                    'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700/50'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-gray-950/50 border-t border-gray-800 flex gap-3 backdrop-blur-sm">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={!isConnected}
                    placeholder="Craft your prompt..."
                    className="flex-1 bg-gray-900 text-gray-100 rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all font-mono text-sm"
                />
                <button
                    type="submit"
                    disabled={!isConnected || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-colors uppercase tracking-widest text-xs"
                >
                    Transmit
                </button>
            </form>
        </div>
    );
};