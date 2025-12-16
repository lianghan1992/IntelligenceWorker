
import React, { useRef, useMemo, useEffect } from 'react';
import { BrainIcon } from '../../icons';
import { extractThoughtAndJson } from '../utils';

export const AnalysisModal: React.FC<{
    isOpen: boolean;
    streamContent: string;
    reasoningContent?: string;
}> = ({ isOpen, streamContent, reasoningContent }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    
    // 实时提取思考过程
    const { thought: extractedThought } = useMemo(() => extractThoughtAndJson(streamContent), [streamContent]);
    const displayThought = reasoningContent || extractedThought;

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [displayThought, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-300 ring-1 ring-white/10">
                <div className="px-6 py-4 border-b border-slate-800 bg-[#1e293b] flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                         <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-50 animate-pulse"></div>
                         <BrainIcon className="w-8 h-8 text-indigo-400 relative z-10" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-100 tracking-wide text-lg flex items-center gap-2">
                            AI 深度意图识别
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">正在分析您的输入并规划最佳报告路径...</p>
                    </div>
                </div>
                
                <div ref={scrollRef} className="flex-1 p-6 font-mono text-sm text-green-400 overflow-y-auto bg-black/50 custom-scrollbar-dark leading-relaxed">
                    <div className="whitespace-pre-wrap">
                        <span className="text-slate-500 mr-2">$</span>
                        {displayThought ? displayThought : <span className="text-slate-500 animate-pulse">连接推理引擎中...</span>}
                        <span className="typing-cursor"></span>
                    </div>
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
};
