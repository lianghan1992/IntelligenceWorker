
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, DocumentTextIcon, ArrowRightIcon, 
    RefreshIcon, CheckIcon, 
    ViewListIcon, PuzzleIcon, ChevronRightIcon, PlusIcon
} from '../icons'; // Removed ChatBubbleIcon
import { fetchJinaReader } from '../../api/intelligence';
import { getPromptDetail, streamChatCompletions } from '../../api/stratify';
import { PPTStage, ChatMessage, PPTData, PPTPageData } from './types';
import { Step2Outline as OutlineWidget } from './Step2Outline';

// Mock Icon if missing
const ChatIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>;

interface CopilotSidebarProps {
    stage: PPTStage;
    setStage: (s: PPTStage) => void;
    history: ChatMessage[];
    setHistory: (h: ChatMessage[]) => void;
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

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, stage]);

    // --- Handlers ---

    const handleSend = async () => {
        if (!input.trim() || isLlmActive) return;
        const userInput = input;
        setInput('');

        // 1. User Message
        const newHistory: ChatMessage[] = [...history, { role: 'user', content: userInput }];
        setHistory(newHistory);

        // 2. Logic Dispatcher
        if (stage === 'collect') {
            await runTopicAnalysis(userInput, newHistory);
        } else if (stage === 'outline') {
            // In outline stage, chat is usually for refining, but here we might just append context
            // For now, let's assume the outline widget handles structure, chat handles "regenerate" requests
            await runRefinement(userInput, newHistory);
        } else if (stage === 'compose' || stage === 'finalize') {
            await runRefinement(userInput, newHistory);
        }
    };

    const runTopicAnalysis = async (topic: string, currentHistory: ChatMessage[]) => {
        setIsLlmActive(true);
        setData(prev => ({ ...prev, topic }));
        
        try {
            const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600"); // Outline Prompt
            
            // Add system prompt if not present
            let requestMessages: ChatMessage[] = [...currentHistory];
            if (!requestMessages.find(m => m.role === 'system')) {
                requestMessages = [{ role: 'system' as const, content: prompt.content, hidden: true }, ...requestMessages];
            }

            let accumulatedText = '';
            // We use a temporary message for streaming
            setHistory([...currentHistory, { role: 'assistant' as const, content: '正在思考...' }]);

            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: requestMessages.map(m => ({ role: m.role, content: m.content })),
                stream: true
            }, (chunk) => {
                if (chunk.content) {
                    accumulatedText += chunk.content;
                    // Update last message
                    setHistory(prev => {
                        const copy = [...prev];
                        copy[copy.length - 1] = { role: 'assistant' as const, content: accumulatedText };
                        return copy;
                    });
                }
            }, () => {
                setIsLlmActive(false);
                // Try parse outline
                try {
                    // Simple extraction logic, robust one is in Step2Outline but we duplicate minimal logic here or rely on Step2Outline to parse the history later
                    // Ideally, we move to 'outline' stage and let Step2Outline parse the last message.
                    setStage('outline');
                } catch(e) {}
            });

        } catch (e) {
            setIsLlmActive(false);
            setHistory([...currentHistory, { role: 'assistant' as const, content: '抱歉，分析出错，请重试。' }]);
        }
    };

    const runRefinement = async (instruction: string, currentHistory: ChatMessage[]) => {
        // Generic refinement handler
        setIsLlmActive(true);
        // ... similar stream logic ...
        // Simplified for brevity: just echo for now unless it's a specific command
        setTimeout(() => {
            setIsLlmActive(false);
            setHistory([...currentHistory, { role: 'assistant' as const, content: `收到指令："${instruction}"。请在右侧直接操作或等待我实现更多控制功能。` }]);
        }, 1000);
    };

    // --- Renderers ---

    const renderPageList = () => (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
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
                        w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold
                        ${activePageIndex === idx ? 'bg-white text-indigo-600' : 'bg-slate-700 text-slate-300'}
                    `}>
                        {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${activePageIndex === idx ? 'text-white' : 'text-slate-300'}`}>
                            {page.title}
                        </div>
                        {page.isGenerating && <div className="text-[10px] text-indigo-300 animate-pulse mt-0.5">正在生成内容...</div>}
                    </div>
                    <ChevronRightIcon className={`w-4 h-4 ${activePageIndex === idx ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
                </div>
            ))}
             <button 
                onClick={() => setStage('finalize')}
                className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg"
            >
                <CheckIcon className="w-4 h-4" /> 完成并预览
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#0f172a]">
            {/* Header */}
            <div className="h-16 px-5 border-b border-slate-700/50 flex items-center justify-between bg-[#0f172a] shadow-sm z-10">
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
                
                {/* Mode 1: Chat Stream (Collect Stage) */}
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
                                        <button key={t} onClick={() => { setInput(t); /* auto send logic could go here */ }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 border border-slate-700 transition-colors">
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Mode 2: Outline Widget (Outline Stage) */}
                {stage === 'outline' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-5 py-3 bg-slate-800/30 border-b border-slate-700/50 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outline Editor</span>
                            <button onClick={() => setStage('collect')} className="text-xs text-indigo-400 hover:underline">返回修改主题</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar-dark">
                            <OutlineWidget 
                                topic={data.topic} 
                                history={history} 
                                onHistoryUpdate={setHistory}
                                onLlmStatusChange={setIsLlmActive} 
                                onStreamingUpdate={() => {}} 
                                onConfirm={(outline) => {
                                    setData(prev => ({ 
                                        ...prev, 
                                        outline,
                                        pages: outline.pages.map(p => ({ title: p.title, summary: p.content, content: '', isGenerating: false }))
                                    }));
                                    setStage('compose');
                                    setActivePageIndex(0);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Mode 3: Navigation Rail (Compose/Finalize Stage) */}
                {(stage === 'compose' || stage === 'finalize') && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                         <div className="px-5 py-4 bg-slate-800/30 border-b border-slate-700/50">
                            <h3 className="font-bold text-slate-200 text-sm truncate">{data.topic}</h3>
                            <p className="text-xs text-slate-500 mt-1">共 {data.pages.length} 页</p>
                        </div>
                        {renderPageList()}
                    </div>
                )}

                {/* Input Area (Always visible for instructions) */}
                {stage !== 'outline' && (
                    <div className="p-4 bg-[#0f172a] border-t border-slate-700/50 z-20">
                        <div className="relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder={stage === 'collect' ? "输入主题..." : "输入指令调整内容..."}
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
