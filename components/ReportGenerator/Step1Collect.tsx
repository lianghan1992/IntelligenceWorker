
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, CheckIcon, ChevronRightIcon 
} from '../icons';
import { PPTStage, ChatMessage, PPTData } from './types';
import { Step2Outline as OutlineWidget } from './Step2Outline';

interface CopilotSidebarProps {
    stage: PPTStage;
    setStage: (s: PPTStage) => void;
    history: ChatMessage[];
    setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    data: PPTData;
    setData: React.Dispatch<React.SetStateAction<PPTData>>;
    isLlmActive: boolean;
    setIsLlmActive: (b: boolean) => void;
    activePageIndex: number;
    setActivePageIndex: (n: number) => void;
    onReset: () => void;
}

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
    stage, setStage, history, setHistory, data, setData, 
    isLlmActive, setIsLlmActive, activePageIndex, setActivePageIndex, onReset
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, stage]);

    // --- Handlers ---

    const handleSend = async () => {
        if (!input.trim() || isLlmActive) return;
        const userInput = input;
        setInput('');

        // 1. Add User Message
        setHistory(prev => [...prev, { role: 'user', content: userInput }]);

        // 2. State Transition Logic
        if (stage === 'collect') {
            // Set topic and move immediately to outline stage.
            // The OutlineWidget will handle the API call when it mounts.
            setData(prev => ({ ...prev, topic: userInput }));
            setStage('outline');
        } else {
            // For other stages, just treat as generic chat (simplified for now)
            setHistory(prev => [...prev, { role: 'assistant', content: '收到。目前处于生成阶段，请使用界面控件进行操作，或重置以开始新话题。' }]);
        }
    };

    // --- Renderers ---

    const renderPageList = () => (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Generation Queue</div>
            {data.pages.map((page, idx) => (
                <div 
                    key={idx}
                    onClick={() => setActivePageIndex(idx)}
                    className={`
                        group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                        ${activePageIndex === idx 
                            ? 'bg-indigo-600 border-indigo-500 shadow-md shadow-indigo-900/20' 
                            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 text-slate-400'
                        }
                    `}
                >
                    <div className={`
                        w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold
                        ${activePageIndex === idx ? 'bg-white text-indigo-600' : 'bg-slate-700 text-slate-300'}
                    `}>
                        {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${activePageIndex === idx ? 'text-white' : 'text-slate-300'}`}>
                            {page.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            {page.html ? (
                                <span className="text-[9px] text-green-400 flex items-center gap-1"><CheckIcon className="w-3 h-3"/> Ready</span>
                            ) : page.isGenerating ? (
                                <span className="text-[9px] text-indigo-300 animate-pulse flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> Generating...</span>
                            ) : (
                                <span className="text-[9px] text-slate-500">Waiting</span>
                            )}
                        </div>
                    </div>
                    <ChevronRightIcon className={`w-4 h-4 ${activePageIndex === idx ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
                </div>
            ))}
             <button 
                onClick={() => setStage('finalize')}
                className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg"
            >
                <CheckIcon className="w-4 h-4" /> 预览与导出
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#0f172a]">
            {/* Header */}
            <div className="h-16 px-5 border-b border-slate-700/50 flex items-center justify-between bg-[#0f172a] shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-slate-100 tracking-tight">AI Co-Pilot</span>
                </div>
                <button onClick={onReset} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                    重置
                </button>
            </div>

            {/* Dynamic Content Area */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                
                {/* Mode 1: Initial Collect (Chat) */}
                {stage === 'collect' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar-dark" ref={scrollRef}>
                        {history.filter(m => !m.hidden).map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`
                                    max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                                    ${msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                                    }
                                `}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                         {history.length === 0 && (
                            <div className="mt-20 text-center text-slate-500 px-6">
                                <SparklesIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">请输入您的研报主题，我将为您构建分析框架。</p>
                                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                    {['小米汽车 SU7 竞品分析', '固态电池技术趋势', '2024 新能源出海报告'].map(t => (
                                        <button key={t} onClick={() => { setInput(t); /* auto trigger not implemented to prompt user */ }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 border border-slate-700 transition-colors">
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Mode 2: Outline Editor (Sidebar Widget) */}
                {stage === 'outline' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-5 py-3 bg-slate-800/30 border-b border-slate-700/50 flex justify-between items-center flex-shrink-0">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outline Editor</span>
                            <button onClick={() => setStage('collect')} className="text-xs text-indigo-400 hover:underline">修改主题</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar-dark">
                            <OutlineWidget 
                                topic={data.topic} 
                                history={history} 
                                onHistoryUpdate={setHistory}
                                onLlmStatusChange={setIsLlmActive} 
                                onStreamingUpdate={() => {}} 
                                onConfirm={(outline) => {
                                    // Transition to compose
                                    setData(prev => ({ 
                                        ...prev, 
                                        outline,
                                        pages: outline.pages.map(p => ({ 
                                            title: p.title, 
                                            summary: p.content, 
                                            content: '', // Empty initially
                                            isGenerating: false 
                                        }))
                                    }));
                                    setStage('compose');
                                    setActivePageIndex(0);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Mode 3: Compose/Finalize (Nav Rail) */}
                {(stage === 'compose' || stage === 'finalize') && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                         <div className="px-5 py-4 bg-slate-800/30 border-b border-slate-700/50 flex-shrink-0">
                            <h3 className="font-bold text-slate-200 text-sm truncate">{data.topic}</h3>
                            <p className="text-xs text-slate-500 mt-1">共 {data.pages.length} 页</p>
                        </div>
                        {renderPageList()}
                    </div>
                )}

                {/* Input Area (Only visible in Collect Stage) */}
                {stage === 'collect' && (
                    <div className="p-4 bg-[#0f172a] border-t border-slate-700/50 z-20 flex-shrink-0">
                        <div className="relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="输入主题..."
                                className="w-full bg-slate-800 text-white placeholder:text-slate-500 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner"
                                disabled={isLlmActive}
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!input.trim() || isLlmActive}
                                className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-slate-700"
                            >
                                {isLlmActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
