
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { 
    SparklesIcon, BrainIcon, ChevronDownIcon, ArrowRightIcon,
    RefreshIcon, TrashIcon, CheckIcon, DocumentTextIcon,
    LayoutIcon, CommandIcon, PlusIcon, CloseIcon, ChevronRightIcon
} from '../icons';
import { Step1Collect } from './Step1Collect';
import { Step2Outline } from './Step2Outline';
import { Step3Compose } from './Step3Compose';
import { Step4Finalize } from './Step4Finalize';

export type PPTStage = 'collect' | 'outline' | 'compose' | 'finalize';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    hidden?: boolean;
    reasoning?: string;
}

export interface PPTPageData {
    title: string;
    summary: string;
    content: string;
    html?: string;
    isGenerating?: boolean;
}

export interface PPTData {
    topic: string;
    referenceMaterials: string;
    outline: StratifyOutline | null;
    pages: PPTPageData[];
}

const STORAGE_KEY = 'auto_insight_modern_studio_v3';

const DEFAULT_HISTORY: ChatMessage[] = [
    { role: 'assistant', content: '您好。我是您的报告架构师。我们可以先从确定一个研究主题开始。' }
];

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
};

// --- 精致的 AI 思考气泡 ---
const ThinkingBubble: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [expanded, setExpanded] = useState(true);
    if (!content) return null;
    return (
        <div className="mb-4 group">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors mb-2 select-none"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>AI 思维链</span>
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
                <div className="pl-3 border-l-2 border-indigo-100/50">
                    <div className="text-xs font-mono text-slate-500 leading-relaxed whitespace-pre-wrap italic">
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse"></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ReportGenerator: React.FC = () => {
    const [stage, setStage] = useState<PPTStage>('collect');
    const [history, setHistory] = useState<ChatMessage[]>(DEFAULT_HISTORY);
    const [data, setData] = useState<PPTData>(DEFAULT_DATA);
    
    const [chatInput, setChatInput] = useState('');
    const [isLlmActive, setIsLlmActive] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setStage(parsed.stage);
                setHistory(parsed.history);
                setData(parsed.data);
            } catch (e) { console.error("Restore failed", e); }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage, history, data }));
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [stage, history, data, streamingMessage]);

    const handleReset = () => {
        if (confirm('确定要重置当前任务吗？所有未保存的进度将丢失。')) {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        }
    };

    const handleSendMessage = () => {
        if (!chatInput.trim() || isLlmActive) return;
        const userInput = chatInput.trim();
        setChatInput('');
        setHistory(prev => [...prev, { role: 'user', content: userInput }]);
    };

    // --- 渲染逻辑 ---

    // 1. 全屏引导态 (灵感阶段)
    if (stage === 'collect') {
        return (
            <div className="h-full bg-[#fcfcfc] relative overflow-hidden flex flex-col">
                <Step1Collect 
                    onUpdateMaterials={(m) => setData(prev => ({ ...prev, referenceMaterials: m }))}
                    onStart={(topic) => {
                        setData(prev => ({ ...prev, topic }));
                        setStage('outline');
                        setHistory(prev => [
                            ...prev, 
                            { role: 'user', content: `我的研究主题是：${topic}\n\n参考资料：\n${data.referenceMaterials || '无'}` }
                        ]);
                    }}
                />
            </div>
        );
    }

    // 2. 分栏工作空间 (创作中)
    return (
        <div className="h-full flex flex-col bg-[#fcfcfc] overflow-hidden">
            {/* 顶栏 */}
            <header className="h-14 flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-100">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight">AI 协作空间</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className={stage === 'outline' ? 'text-indigo-600' : ''}>大纲</span>
                            <ChevronRightIcon className="w-2.5 h-2.5" />
                            <span className={stage === 'compose' ? 'text-indigo-600' : ''}>内容</span>
                            <ChevronRightIcon className="w-2.5 h-2.5" />
                            <span className={stage === 'finalize' ? 'text-indigo-600' : ''}>渲染</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleReset} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-red-500 transition-colors" title="重置任务">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-2 rounded-xl transition-all ${isSidebarOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'}`}
                    >
                        <LayoutIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* 左栏：对话助手 */}
                <aside 
                    className={`
                        bg-white border-r border-slate-200 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.2,1,0.2,1)]
                        ${isSidebarOpen ? 'w-[400px] translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 pointer-events-none'}
                    `}
                >
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6" ref={chatScrollRef}>
                        {history.map((msg, i) => (
                            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {msg.role === 'user' ? 'U' : <SparklesIcon className="w-4 h-4"/>}
                                </div>
                                <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm border ${msg.role === 'user' ? 'bg-slate-900 text-white border-slate-800 rounded-tr-sm' : 'bg-slate-50 border-slate-100 text-slate-700 rounded-tl-sm'}`}>
                                        {msg.reasoning && <ThinkingBubble content={msg.reasoning} isStreaming={false} />}
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest px-1">{msg.role}</span>
                                </div>
                            </div>
                        ))}
                        {streamingMessage && (
                            <div className="flex gap-4 animate-in fade-in">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <SparklesIcon className="w-4 h-4 animate-pulse"/>
                                </div>
                                <div className="max-w-[85%]">
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm text-sm">
                                        {streamingMessage.reasoning && <ThinkingBubble content={streamingMessage.reasoning} isStreaming={true} />}
                                        <div className="whitespace-pre-wrap text-slate-700">
                                            {streamingMessage.content}
                                            <span className="inline-block w-1 h-4 ml-1 bg-indigo-500 animate-pulse"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-5 border-t border-slate-100 bg-gray-50/50">
                        <div className="relative">
                            <textarea 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                placeholder="输入指令修改内容或提出要求..."
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 pr-12 text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none resize-none h-16 max-h-40 transition-all shadow-sm"
                                disabled={isLlmActive}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isLlmActive}
                                className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-30 transition-all active:scale-90"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* 右栏：画布 */}
                <main className={`flex-1 relative transition-colors duration-1000 ${stage === 'finalize' ? 'bg-[#0a0b0d]' : 'bg-[#fcfcfc]'}`}>
                    <div className="h-full relative z-10">
                        {stage === 'outline' && (
                            <Step2Outline 
                                history={history}
                                onHistoryUpdate={setHistory}
                                onLlmStatusChange={setIsLlmActive}
                                onStreamingUpdate={setStreamingMessage}
                                onConfirm={(outline) => {
                                    setData(prev => ({ 
                                        ...prev, 
                                        outline,
                                        pages: outline.pages.map(p => ({ title: p.title, summary: p.content, content: '', isGenerating: false }))
                                    }));
                                    setStage('compose');
                                }}
                            />
                        )}

                        {stage === 'compose' && (
                            <Step3Compose 
                                pages={data.pages}
                                history={history}
                                onUpdatePages={newPages => setData(prev => ({ ...prev, pages: newPages }))}
                                onHistoryUpdate={setHistory}
                                onLlmStatusChange={setIsLlmActive}
                                onStreamingUpdate={setStreamingMessage}
                                onFinish={() => setStage('finalize')}
                            />
                        )}

                        {stage === 'finalize' && (
                            <Step4Finalize 
                                topic={data.topic}
                                pages={data.pages}
                                onBackToCompose={() => setStage('compose')}
                                onUpdatePages={newPages => setData(prev => ({ ...prev, pages: newPages }))}
                                onLlmStatusChange={setIsLlmActive}
                                onStreamingUpdate={setStreamingMessage}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
