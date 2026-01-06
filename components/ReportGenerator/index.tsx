
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { 
    SparklesIcon, BrainIcon, ChevronDownIcon, ArrowRightIcon,
    RefreshIcon, TrashIcon, CheckIcon, DocumentTextIcon,
    HomeIcon, ChevronRightIcon, LayoutIcon, CommandIcon
} from '../icons';
import { Step1Collect } from './Step1Collect';
import { Step2Outline } from './Step2Outline';
import { Step3Compose } from './Step3Compose';
import { Step4Finalize } from './Step4Finalize';
import { getPromptDetail } from '../../api/stratify';

// --- Types ---
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

const STORAGE_KEY = 'auto_insight_pro_editor_v2';

const DEFAULT_HISTORY: ChatMessage[] = [
    { role: 'assistant', content: '您好。我是您的报告架构师。\n请在右侧上传资料，或直接在下方输入研究主题。' }
];

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
};

// --- Modern Components ---

const ThinkingBubble: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [expanded, setExpanded] = useState(true);
    if (!content) return null;
    
    return (
        <div className="my-3 mx-1">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors mb-2 select-none"
            >
                <BrainIcon className={`w-3 h-3 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>AI Thinking Process</span>
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
                <div className="pl-3 border-l-2 border-indigo-100 ml-1.5">
                    <div className="text-xs font-mono text-slate-500 leading-relaxed whitespace-pre-wrap">
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse"></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

const ChatBubble: React.FC<{ msg: ChatMessage; isStreaming?: boolean }> = ({ msg, isStreaming }) => {
    const isUser = msg.role === 'user';
    if (msg.hidden) return null;

    return (
        <div className={`flex flex-col gap-1 mb-6 animate-in fade-in slide-in-from-bottom-2 ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-6 ${
                isUser 
                    ? 'bg-slate-900 text-white rounded-br-sm' 
                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
            }`}>
                {msg.reasoning && <ThinkingBubble content={msg.reasoning} isStreaming={!!isStreaming} />}
                <div className="whitespace-pre-wrap">
                    {msg.content}
                    {isStreaming && !msg.reasoning && <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-indigo-500 animate-pulse"></span>}
                </div>
            </div>
            <span className="text-[10px] text-slate-300 font-medium px-1">
                {isUser ? 'YOU' : 'AI ARCHITECT'}
            </span>
        </div>
    );
};

// Minimalist Progress Indicator
const StageIndicator: React.FC<{ current: PPTStage }> = ({ current }) => {
    const stages: {id: PPTStage, label: string}[] = [
        { id: 'collect', label: '灵感' },
        { id: 'outline', label: '大纲' },
        { id: 'compose', label: '撰写' },
        { id: 'finalize', label: '渲染' }
    ];
    const currIdx = stages.findIndex(s => s.id === current);

    return (
        <div className="flex items-center gap-1 bg-slate-100/80 backdrop-blur-sm p-1 rounded-full border border-slate-200/50">
            {stages.map((s, idx) => {
                const active = idx === currIdx;
                const past = idx < currIdx;
                return (
                    <div 
                        key={s.id}
                        className={`
                            px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center gap-1.5
                            ${active ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : past ? 'text-slate-500' : 'text-slate-300'}
                        `}
                    >
                        {past && <CheckIcon className="w-3 h-3" />}
                        {s.label}
                    </div>
                )
            })}
        </div>
    );
};

export const ReportGenerator: React.FC = () => {
    // --- State ---
    const [stage, setStage] = useState<PPTStage>('collect');
    const [history, setHistory] = useState<ChatMessage[]>(DEFAULT_HISTORY);
    const [data, setData] = useState<PPTData>(DEFAULT_DATA);
    
    // UI State
    const [chatInput, setChatInput] = useState('');
    const [isLlmActive, setIsLlmActive] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setStage(parsed.stage);
                setHistory(parsed.history);
                // Reset generating states
                const safeData = parsed.data;
                if (safeData.pages) safeData.pages.forEach((p: any) => p.isGenerating = false);
                setData(safeData);
            } catch (e) { console.error("Load failed", e); }
        }
    }, []);

    // Persistence
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage, history, data }));
    }, [stage, history, data]);

    // Auto-scroll
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [history, streamingMessage]);

    const handleReset = () => {
        if (confirm('确定要重置当前任务吗？所有进度将丢失。')) {
            localStorage.removeItem(STORAGE_KEY);
            setStage('collect');
            setHistory(DEFAULT_HISTORY);
            setData(DEFAULT_DATA);
            setChatInput('');
        }
    };

    const handleSendMessage = () => {
        if (!chatInput.trim() || isLlmActive) return;
        const userInput = chatInput.trim();
        setChatInput('');

        // Logic for "Collect" stage input is handled inside Step1Collect mostly, 
        // but if user types here in other stages, we treat it as context/instruction.
        if (stage === 'collect') {
             // If user types in sidebar during collect (rare), maybe treat as topic?
             // Better to let Step1Collect handle the main "Start".
        } else {
            setHistory(prev => [...prev, { role: 'user', content: userInput }]);
            // Here you would typically trigger an LLM response to handle the user instruction
            // For now, we just append user message. The specific step components listen to history changes.
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#fcfcfc] text-slate-900 font-sans overflow-hidden">
            
            {/* 1. Ultra-Slim Navbar */}
            <header className="h-12 flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 flex items-center justify-between z-40 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 tracking-tight">AI 报告工坊</span>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                    <StageIndicator current={stage} />
                </div>

                <div className="flex items-center gap-2">
                     <button 
                        onClick={handleReset}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        title="重置"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="切换助手侧边栏"
                    >
                        <LayoutIcon className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* 2. Main Workspace (Split View) */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Left: AI Copilot Sidebar */}
                <aside 
                    className={`
                        flex-shrink-0 flex flex-col border-r border-slate-200 bg-slate-50/50 z-20 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
                        ${isSidebarOpen ? 'w-[360px] translate-x-0' : 'w-0 -translate-x-4 opacity-0 overflow-hidden'}
                    `}
                >
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={chatScrollRef}>
                        {history.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
                        {streamingMessage && <ChatBubble msg={streamingMessage} isStreaming={true} />}
                    </div>

                    <div className="p-4 border-t border-slate-200/60 bg-white">
                        <div className="relative">
                            <textarea
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                placeholder="输入指令调整内容..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none h-14 max-h-32 transition-all placeholder:text-slate-400"
                                disabled={isLlmActive || stage === 'collect'} // In collect stage, main input is center
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isLlmActive || stage === 'collect'}
                                className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-sm active:scale-90"
                            >
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right: The Canvas (Context-Aware) */}
                <main className={`flex-1 relative flex flex-col min-w-0 transition-all duration-300 ${stage === 'finalize' ? 'bg-[#121212]' : 'bg-white'}`}>
                    {/* Background Pattern */}
                    {stage !== 'finalize' && (
                        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>
                    )}
                    
                    <div className="flex-1 overflow-hidden relative z-10">
                        {stage === 'collect' && (
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
                        )}

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
                                    setIsSidebarOpen(true); // Ensure chat is open for drafting
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
                                onFinish={() => {
                                    setStage('finalize');
                                    setIsSidebarOpen(false); // Auto-hide sidebar for immersive view
                                }}
                            />
                        )}

                        {stage === 'finalize' && (
                            <Step4Finalize 
                                topic={data.topic}
                                pages={data.pages}
                                onBackToCompose={() => {
                                    setStage('compose');
                                    setIsSidebarOpen(true);
                                }}
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
