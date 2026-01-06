
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { 
    SparklesIcon, BrainIcon, ChevronDownIcon, ArrowRightIcon,
    RefreshIcon, TrashIcon, CheckIcon, DocumentTextIcon,
    HomeIcon, ChevronRightIcon
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

const STORAGE_KEY = 'auto_insight_pro_editor_v1';

const DEFAULT_HISTORY: ChatMessage[] = [
    { role: 'assistant', content: '您好。我是您的报告架构师。\n请在右侧上传资料，或直接在下方输入研究主题。' }
];

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
};

// --- Pro-Editor Components ---

// 1. Thinking Block (Collapsible Code-like block)
const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    if (!content) return null;

    return (
        <div className="my-2 rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors select-none"
            >
                <BrainIcon className={`w-3 h-3 ${isStreaming ? 'animate-pulse text-indigo-500' : ''}`} />
                <span>思维链 {isStreaming ? '生成中...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
                <div className="px-3 py-2 border-t border-slate-100">
                    <div className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-indigo-500 animate-pulse"></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. Message Item (User vs AI)
const MessageItem: React.FC<{ msg: ChatMessage; isStreaming?: boolean }> = ({ msg, isStreaming }) => {
    const isUser = msg.role === 'user';
    
    if (msg.hidden) return null;

    if (isUser) {
        return (
            <div className="flex justify-end mb-6 animate-in fade-in slide-in-from-bottom-1">
                <div className="bg-white border border-slate-200 px-4 py-3 rounded-md shadow-sm max-w-[90%] text-sm text-slate-800 leading-relaxed tracking-wide">
                    {msg.content}
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-3 mb-8 animate-in fade-in slide-in-from-bottom-1 group">
            <div className="flex-1 min-w-0">
                {/* Agent Label */}
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-4 h-4 rounded-sm bg-indigo-600 flex items-center justify-center">
                        <SparklesIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Architect</span>
                </div>

                {/* Content Container (Notion Style) */}
                <div className="pl-3 border-l-2 border-indigo-100 group-hover:border-indigo-200 transition-colors">
                    {msg.reasoning && (
                        <ThinkingBlock content={msg.reasoning} isStreaming={!!isStreaming} />
                    )}
                    <div className="text-sm text-slate-700 leading-7 markdown-body">
                        {msg.content}
                        {isStreaming && !msg.reasoning && <span className="inline-block w-1.5 h-4 ml-1 align-sub bg-indigo-600 animate-pulse"></span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 3. Step Progress Bar (Minimalist)
const StepProgress: React.FC<{ currentStage: PPTStage }> = ({ currentStage }) => {
    const steps: { id: PPTStage; label: string }[] = [
        { id: 'collect', label: '1. 灵感' },
        { id: 'outline', label: '2. 大纲' },
        { id: 'compose', label: '3. 创作' },
        { id: 'finalize', label: '4. 渲染' }
    ];
    
    const currentIndex = steps.findIndex(s => s.id === currentStage);

    return (
        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg">
            {steps.map((step, idx) => {
                const isActive = idx === currentIndex;
                const isPast = idx < currentIndex;
                
                return (
                    <div 
                        key={step.id} 
                        className={`
                            px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 flex items-center gap-1.5
                            ${isActive 
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                                : isPast ? 'text-slate-500' : 'text-slate-300'
                            }
                        `}
                    >
                        {isPast && <CheckIcon className="w-3 h-3" />}
                        <span>{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export const ReportGenerator: React.FC = () => {
    // --- State ---
    const [stage, setStage] = useState<PPTStage>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved).stage : 'collect';
        } catch { return 'collect'; }
    });

    const [history, setHistory] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved).history : DEFAULT_HISTORY;
        } catch { return DEFAULT_HISTORY; }
    });

    const [data, setData] = useState<PPTData>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsedData = JSON.parse(saved).data;
                // Reset transient states
                if (parsedData.pages) {
                    parsedData.pages = parsedData.pages.map((p: any) => ({ ...p, isGenerating: false }));
                }
                return parsedData;
            }
            return DEFAULT_DATA;
        } catch { return DEFAULT_DATA; }
    });

    const [chatInput, setChatInput] = useState('');
    const [isLlmActive, setIsLlmActive] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

    // --- Persistence ---
    useEffect(() => {
        setSaveStatus('saving');
        const stateToSave = { stage, history, data, chatInput };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        const timer = setTimeout(() => setSaveStatus('saved'), 600);
        return () => clearTimeout(timer);
    }, [stage, history, data, chatInput]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({
                top: chatScrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [history, streamingMessage]);

    const handleReset = () => {
        if (confirm('确定要重置当前任务吗？所有未保存的进度将丢失。')) {
            localStorage.removeItem(STORAGE_KEY);
            setStage('collect');
            setHistory(DEFAULT_HISTORY);
            setData(DEFAULT_DATA);
            setChatInput('');
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isLlmActive) return;
        const userInput = chatInput.trim();
        setChatInput('');

        // If in Collect stage, typing means setting the topic and moving to Outline
        if (stage === 'collect') {
            try {
                setIsLlmActive(true);
                // Placeholder for prompt fetching logic
                const promptContent = "你是一个专业的报告生成助手。请根据用户提供的资料和主题生成大纲JSON。";
                
                const initialHistory: ChatMessage[] = [
                    { role: 'system', content: promptContent, hidden: true },
                    { role: 'user', content: `参考资料如下：\n${data.referenceMaterials || '无'}`, hidden: true },
                    { role: 'user', content: userInput, hidden: false }
                ];
                
                setData(prev => ({ ...prev, topic: userInput }));
                setHistory(initialHistory);
                setStage('outline');
            } catch (e) {
                console.error(e);
            } finally {
                setIsLlmActive(false);
            }
        } else {
            // In other stages, it's just a chat message (for context adjustment or refinement)
            setHistory(prev => [...prev, { role: 'user', content: userInput }]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
            
            {/* 1. Command Bar (Header) - Ultra Slim */}
            <header className="h-14 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between z-30 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-sm">
                            <DocumentTextIcon className="w-3.5 h-3.5" />
                        </div>
                        <h1 className="text-sm font-bold text-slate-800 tracking-tight">Auto Insight <span className="text-slate-400 font-normal">| Pro Editor</span></h1>
                    </div>
                    
                    <div className="h-4 w-px bg-slate-200"></div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                        {saveStatus === 'saving' ? (
                            <RefreshIcon className="w-3 h-3 animate-spin text-slate-400" />
                        ) : (
                            <CheckIcon className="w-3 h-3 text-emerald-500" />
                        )}
                        <span>{saveStatus === 'saving' ? 'Saving...' : 'All changes saved'}</span>
                    </div>
                </div>
                
                <div className="absolute left-1/2 -translate-x-1/2">
                    <StepProgress currentStage={stage} />
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleReset}
                        className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-50"
                    >
                        重置任务
                    </button>
                    <button className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center gap-2">
                        导出 <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                    </button>
                </div>
            </header>

            {/* Main Layout: Split Panes */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* 2. AI Copilot (Left Sidebar) */}
                <aside className="w-[350px] flex flex-col border-r border-slate-200 bg-[#fbfcfd] z-20 flex-shrink-0">
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar" ref={chatScrollRef}>
                        {history.map((msg, i) => <MessageItem key={i} msg={msg} />)}
                        {streamingMessage && <MessageItem msg={streamingMessage} isStreaming={true} />}
                        {isLlmActive && !streamingMessage && (
                            <div className="flex gap-2 mb-6 pl-4 opacity-50">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        )}
                        <div className="h-8"></div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white">
                        <div className="relative group">
                            <textarea 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder={stage === 'collect' ? "输入报告主题，开始生成..." : "输入反馈调整当前内容..."}
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none h-24 shadow-inner transition-all placeholder:text-slate-400"
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isLlmActive}
                                className="absolute right-2 bottom-2 p-1.5 bg-white text-indigo-600 border border-slate-200 rounded-md hover:bg-indigo-600 hover:text-white hover:border-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="text-[10px] text-slate-300 mt-2 text-center flex justify-between px-1 font-medium">
                            <span>Markdown Supported</span>
                            <span>Shift + Enter for new line</span>
                        </div>
                    </div>
                </aside>

                {/* 3. Canvas (Right Workspace) */}
                <main className="flex-1 bg-gray-50/50 relative overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>
                    
                    <div className="flex-1 h-full overflow-hidden relative z-10">
                        {stage === 'collect' && (
                            <Step1Collect onUpdateMaterials={(m) => setData(prev => ({ ...prev, referenceMaterials: m }))} />
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
