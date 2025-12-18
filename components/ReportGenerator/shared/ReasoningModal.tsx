
import React, { useEffect, useRef } from 'react';
import { BrainIcon, CloseIcon } from '../../icons';

export const ReasoningModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    content: string;
    status?: string;
}> = ({ isOpen, onClose, content, status = "AI 正在深度思考..." }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [content, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-300 ring-1 ring-white/10 relative">
                <div className="px-5 py-4 border-b border-slate-800 bg-[#1e293b] flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                             <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-50 animate-pulse"></div>
                             <BrainIcon className="w-5 h-5 text-indigo-400 relative z-10" />
                        </div>
                        <h3 className="font-bold text-slate-100 text-sm tracking-wide">
                            {status}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 p-6 font-mono text-sm text-slate-300 overflow-y-auto custom-scrollbar-dark leading-relaxed bg-[#0f172a]">
                    <div className="whitespace-pre-wrap break-words min-h-full">
                        {content || <span className="opacity-50 italic">等待思维流...</span>}
                        <span className="typing-cursor ml-1"></span>
                    </div>
                    <div ref={bottomRef} className="h-10 w-full" />
                </div>
            </div>
            <style>{`
                .typing-cursor::after { content: ''; display: inline-block; width: 6px; height: 1.2em; background-color: #6366f1; margin-left: 2px; vertical-align: text-bottom; animation: blink 1s step-end infinite; }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            `}</style>
        </div>
    );
};
