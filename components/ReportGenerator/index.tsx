
import React, { useState, useEffect, useRef } from 'react';
import { StratifyOutline } from '../../types';
import { 
    SparklesIcon, BrainIcon, ChevronDownIcon, ArrowRightIcon,
    RefreshIcon, TrashIcon, CheckIcon, DocumentTextIcon,
    HomeIcon
} from '../icons';
import { Step1Collect } from './Step1Collect';
import { Step2Outline } from './Step2Outline';
import { Step3Compose } from './Step3Compose';
import { Step4Finalize } from './Step4Finalize';
import { getPromptDetail } from '../../api/stratify';

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

const STORAGE_KEY = 'auto_insight_ppt_session_v2_root';

const DEFAULT_HISTORY: ChatMessage[] = [
    { role: 'assistant', content: '您好！我是您的报告架构师。请先在右侧上传或抓取参考资料，然后在下方输入您的报告主题或研究想法。' }
];

const DEFAULT_DATA: PPTData = {
    topic: '',
    referenceMaterials: '',
    outline: null,
    pages: []
};

// --- Pro-Editor Components ---

const MessageBubble: React.FC<{ msg: ChatMessage; isStreaming?: boolean }> = ({ msg, isStreaming }) => {
    const isUser = msg.role === 'user';
    const [showReasoning, setShowReasoning] = useState(true);
    
    if (msg.hidden) return null;

    if (isUser) {
        return (
            <div className="flex justify-end mb-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white border border-slate-200 px-4 py-3 rounded-md shadow-sm max-w-[90%] text-sm text-slate-800 leading-relaxed">
                    {msg.content}
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 mb-8 animate-in fade-in slide-in-from-bottom-2 group">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <SparklesIcon className="w-3.5 h-3.5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-2">
                    AI ARCHITECT
                    {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                </div>

                <div className="text-sm text-slate-700 leading-7 border-l-2 border-slate-100 pl-4 transition-colors hover:border-indigo-100">
                    {msg.reasoning && (
                        <div className="mb-3">
                            <button 
                                onClick={() => setShowReasoning(!showReasoning)}
                                className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 hover:text-indigo-600 transition-colors select-none mb-2"
                            >
                                <BrainIcon className={`w-3 h-3 ${isStreaming ? 'animate-pulse text-indigo-500' : ''}`} />
                                <span>{isStreaming ? '正在思考...' : '思考过程'}</span>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${showReasoning ? 'rotate-180' : ''}`} />
                            </button>
                            {showReasoning && (
                                <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-[11px] font-mono text-slate-500 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                                    {msg.reasoning}
                                    {isStreaming && !msg.content && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse" />}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="whitespace-pre-wrap markdown-body">
                        {msg.content}
                        {isStreaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-600 animate-pulse align-sub" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StepIndicator: React.FC<{ currentStage: PPTStage }> = ({ currentStage }) => {
    const steps: { id: PPTStage; label: string }[] = [
        { id: 'collect', label: '1. 灵感' },
        { id: 'outline', label: '2. 大纲' },
        { id: 'compose', label: '3. 创作' },
        { id: 'finalize', label: '4. 渲染' }
    ];
    
    const currentIndex = steps.findIndex(s => s.id === currentStage);

    return (
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {steps.map((step, idx) => {
                const isActive = idx === currentIndex;
                const isCompleted = idx < currentIndex;
                
                return (
                    <div 
                        key={step.id} 
                        className={`
                            px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 flex items-center gap-2
                            ${isActive 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : isCompleted ? 'text-slate-600' : 'text-slate-400'
                            }
                        `}
                    >
                        {isCompleted && <CheckIcon className="w-3 h-3" />}
                        <span>{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export const ReportGenerator: React.FC = () => {
    // --- State Initialization ---
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
                // Important: Reset transient "generating" flags on load
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
        
        const timer = setTimeout(() => setSaveStatus('saved'), 800);
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
        if (confirm('确定要清空当前任务并重新开始吗？')) {
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

        if (stage === 'collect') {
            try {
                setIsLlmActive(true);
                // 使用默认 Prompt ID, 这里假设了一个 ID, 实际应替换为真实有效的 Prompt ID
                const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600").catch(() => ({ content: "你是一个专业的报告生成助手，请根据用户提供的资料和主题生成大纲。" }));
                const materials = data.referenceMaterials;
                
                const initialHistory: ChatMessage[] = [
                    { role: 'system', content: prompt.content, hidden: true },
                    { role: 'user', content: `参考资料如下：\n${materials}`, hidden: true },
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
            setHistory(prev => [...prev, { role: 'user', content: userInput }]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
            {/* 1. Command Bar (Header) */}
            <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-800">AI 智能研报生成</h1>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            {saveStatus === 'saving' ? (
                                <RefreshIcon className="w-3 h-3 animate-spin" />
                            ) : (
                                <CheckIcon className="w-3 h-3 text-green-500" />
                            )}
                            {saveStatus === 'saving' ? 'Saving...' : 'Auto Saved'}
                        </div>
                    </div>
                </div>
                
                <StepIndicator currentStage={stage} />
                
                <button 
                    onClick={handleReset}
                    className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50 flex items-center gap-2"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                    重置
                </button>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* 2. AI Copilot (Left Sidebar) */}
                <aside className="w-[350px] flex flex-col border-r border-slate-200 bg-[#fbfcfd] z-20 flex-shrink-0">
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar" ref={chatScrollRef}>
                        {history.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                        {streamingMessage && <MessageBubble msg={streamingMessage} isStreaming={true} />}
                        {isLlmActive && !streamingMessage && (
                            <div className="flex gap-3 mb-6 animate-pulse opacity-60 pl-1">
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-75"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-150"></div>
                            </div>
                        )}
                        <div className="h-4"></div>
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="relative group">
                            <textarea 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder={stage === 'collect' ? "输入报告主题，开始生成..." : "输入反馈，调整当前内容..."}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none h-24 shadow-inner transition-all placeholder:text-slate-400"
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isLlmActive}
                                className="absolute right-2 bottom-2 p-1.5 bg-slate-900 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-slate-900 transition-colors shadow-sm"
                            >
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 text-center flex justify-between px-1">
                            <span>Shift + Enter 换行</span>
                            <span>{chatInput.length} chars</span>
                        </div>
                    </div>
                </aside>

                {/* 3. Canvas (Right Workspace) */}
                <main className="flex-1 bg-white relative overflow-hidden flex flex-col">
                    {/* Shadow gradient for depth */}
                    <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-slate-200/30 to-transparent pointer-events-none z-10"></div>
                    
                    <div className="flex-1 h-full overflow-hidden">
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
