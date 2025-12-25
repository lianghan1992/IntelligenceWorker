
import React, { useEffect, useRef } from 'react';
import { BrainIcon, CloseIcon } from '../../icons';

interface ReasoningModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    status: string;
}

export const ReasoningModal: React.FC<ReasoningModalProps> = ({ isOpen, onClose, content, status }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-4 right-4 w-96 max-h-[80vh] z-50 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur border border-slate-200/60 ring-1 ring-black/5">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-white">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <BrainIcon className="w-4 h-4 animate-pulse" />
                    {status || "Thinking..."}
                </div>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 bg-slate-50 min-h-[200px] max-h-[500px] font-mono text-xs leading-relaxed text-slate-600 whitespace-pre-wrap break-words custom-scrollbar"
            >
                {content || <span className="text-slate-400 italic">等待思考流输出...</span>}
            </div>
        </div>
    );
};
