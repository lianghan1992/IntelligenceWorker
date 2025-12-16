
import React, { useEffect, useRef } from 'react';
import { BrainIcon, CloseIcon } from '../../icons';

export const ReasoningModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    content: string;
    status?: string;
}> = ({ isOpen, onClose, content, status = "AI 正在深度思考..." }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when content updates
    useEffect(() => {
        if (isOpen && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [content, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-300 ring-1 ring-white/10 relative">
                {/* Header */}
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
                
                {/* Content */}
                <div className="flex-1 p-6 font-mono text-sm text-slate-300 overflow-y-auto custom-scrollbar-dark leading-relaxed bg-[#0f172a]">
                    <div className="whitespace-pre-wrap">
                        {content || <span className="opacity-50 italic">等待思维流...</span>}
                        <span className="typing-cursor ml-1"></span>
                    </div>
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
};
