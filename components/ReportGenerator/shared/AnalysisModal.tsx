
import React, { useRef, useMemo, useEffect } from 'react';
import { BrainIcon, DocumentTextIcon, ViewListIcon, LightBulbIcon } from '../../icons';
import { extractThoughtAndJson } from '../utils';

export const AnalysisModal: React.FC<{
    isOpen: boolean;
    streamContent: string;
    reasoningContent?: string;
}> = ({ isOpen, streamContent, reasoningContent }) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const { thought: extractedThought } = useMemo(() => extractThoughtAndJson(streamContent), [streamContent]);
    const displayThought = reasoningContent || extractedThought;

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [displayThought, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-white/50 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x"></div>
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-200 rounded-full blur-[50px] opacity-30"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-200 rounded-full blur-[50px] opacity-30"></div>

                <div className="p-8 flex flex-col items-center text-center relative z-10">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center relative z-10 ring-4 ring-white shadow-lg">
                            <BrainIcon className="w-10 h-10 text-indigo-600 animate-pulse" />
                        </div>
                        <div className="absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-20 animate-ping-slow"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 border border-indigo-100 rounded-full animate-spin-slow">
                            <div className="absolute top-0 left-1/2 w-2 h-2 bg-purple-400 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                        </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-800 mb-2 tracking-tight">
                        正在解析您的意图
                    </h3>
                    <p className="text-slate-500 text-sm font-medium mb-8 max-w-xs mx-auto leading-relaxed">
                        AI 正在深度阅读您的输入，识别它是
                        <span className="text-indigo-600 font-bold mx-1">单纯的想法</span>、
                        <span className="text-purple-600 font-bold mx-1">结构化大纲</span>还是
                        <span className="text-pink-600 font-bold mx-1">完整内容</span>...
                    </p>

                    <div className="flex justify-center gap-4 mb-8 w-full">
                        <TypeBadge icon={LightBulbIcon} label="Idea" color="bg-indigo-50 text-indigo-600 border-indigo-100" active />
                        <TypeBadge icon={ViewListIcon} label="Outline" color="bg-purple-50 text-purple-600 border-purple-100" active />
                        <TypeBadge icon={DocumentTextIcon} label="Content" color="bg-pink-50 text-pink-600 border-pink-100" active />
                    </div>

                    <div className="w-full bg-slate-50 rounded-xl border border-slate-100 p-3 text-left overflow-hidden relative group">
                        <div className="h-16 overflow-y-auto custom-scrollbar px-1">
                            <p className="text-xs font-mono text-slate-500 leading-relaxed whitespace-pre-wrap break-all opacity-80">
                                {displayThought || "Initializing context window..."}
                                <span className="inline-block w-1.5 h-3 bg-indigo-400 ml-1 align-middle animate-pulse"></span>
                            </p>
                            <div ref={bottomRef} />
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .animate-spin-slow { animation: spin 8s linear infinite; }
                .animate-ping-slow { animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
                @keyframes spin { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }
            `}</style>
        </div>
    );
};

const TypeBadge: React.FC<{ icon: any, label: string, color: string, active?: boolean }> = ({ icon: Icon, label, color, active }) => (
    <div className={`flex flex-col items-center gap-2 p-3 rounded-xl border w-20 transition-all duration-500 ${active ? `${color} scale-100 opacity-100` : 'bg-slate-50 border-slate-100 text-slate-300 scale-95 opacity-50'}`}>
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
);
