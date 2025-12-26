
import React, { useState, useEffect, useRef } from 'react';
import { StratifyScenario, StratifyOutline } from '../../../types';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentTextIcon, ViewGridIcon, 
    CheckCircleIcon, ChevronRightIcon, GlobeIcon, UserIcon, BrainIcon, ChevronDownIcon, ArrowRightIcon,
    RefreshIcon
} from '../../icons';
import { Step1Collect } from './Step1Collect';
import { Step2Outline } from './Step2Outline';
import { Step3Compose } from './Step3Compose';
import { Step4Finalize } from './Step4Finalize';
import { getPromptDetail } from '../../../api/stratify';

interface ScenarioWorkstationProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

export type PPTStage = 'collect' | 'outline' | 'compose' | 'finalize';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    hidden?: boolean; // 后台逻辑消息，对用户不可见
    reasoning?: string; // 思考流内容
}

export interface PPTData {
    topic: string;
    referenceMaterials: string;
    outline: StratifyOutline | null;
    pages: Array<{
        title: string;
        summary: string;
        content: string;
        isGenerating?: boolean;
    }>;
}

// --- 子组件：统一聊天消息气泡 ---
const MessageBubble: React.FC<{ msg: ChatMessage; isStreaming?: boolean }> = ({ msg, isStreaming }) => {
    const isUser = msg.role === 'user';
    const [showReasoning, setShowReasoning] = useState(true);
    if (msg.hidden) return null;

    return (
        <div className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                {isUser ? <UserIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
            </div>
            <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isUser ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                }`}>
                    {msg.role === 'assistant' && msg.reasoning && (
                        <div className="mb-3">
                            <button 
                                onClick={() => setShowReasoning(!showReasoning)}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors mb-2"
                            >
                                <BrainIcon className={`w-3 h-3 ${isStreaming ? 'animate-pulse' : ''}`} />
                                <span>深度思考中</span>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
                            </button>
                            {showReasoning && (
                                <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-[11px] font-mono text-slate-500 whitespace-pre-wrap mb-2 leading-relaxed">
                                    {msg.reasoning}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
            </div>
        </div>
    );
};

export const ScenarioWorkstation: React.FC<ScenarioWorkstationProps> = ({ scenario, onBack }) => {
    const [stage, setStage] = useState<PPTStage>('collect');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [data, setData] = useState<PPTData>({
        topic: '',
        referenceMaterials: '',
        outline: null,
        pages: []
    });
    const [chatInput, setChatInput] = useState('');
    const [isLlmActive, setIsLlmActive] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动聊天
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [history, isLlmActive]);

    // 处理 Step 1 的初始提交
    const handleInitWorkflow = async (topic: string, materials: string) => {
        const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
        const initialHistory: ChatMessage[] = [
            { role: 'system', content: prompt.content, hidden: true },
            { role: 'user', content: `参考资料如下：\n${materials}`, hidden: true },
            { role: 'user', content: topic, hidden: false } // 只有主题对用户可见
        ];
        setData(prev => ({ ...prev, topic, referenceMaterials: materials }));
        setHistory(initialHistory);
        setStage('outline');
    };

    const handleSendMessage = () => {
        if (!chatInput.trim() || isLlmActive) return;
        const msg: ChatMessage = { role: 'user', content: chatInput };
        setHistory(prev => [...prev, msg]);
        setChatInput('');
        // 这里会通过 useEffect 触发各个阶段的 LLM 调用
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <h1 className="text-base font-black text-slate-800 tracking-tight">{scenario.title}</h1>
                </div>
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                    {['collect', 'outline', 'compose', 'finalize'].map((s, idx) => (
                        <div key={s} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${stage === s ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                            {['灵感', '大纲', '创作', '渲染'][idx]}
                        </div>
                    ))}
                </div>
                <div className="w-20" />
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {stage === 'collect' ? (
                    <Step1Collect onNext={handleInitWorkflow} />
                ) : (
                    <>
                        {/* Persistent Chat Sidebar (1/3) */}
                        <aside className="w-1/3 flex flex-col bg-white border-r border-slate-200 shadow-xl z-20">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                <span className="font-bold text-slate-800 text-sm">AI 助手</span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={chatScrollRef}>
                                {history.map((msg, i) => (
                                    <MessageBubble key={i} msg={msg} />
                                ))}
                                {isLlmActive && (
                                    <div className="flex gap-3 mb-6 animate-pulse opacity-60">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            {/* Fix: Added missing RefreshIcon to imports to fix 'Cannot find name RefreshIcon' error */}
                                            <RefreshIcon className="w-4 h-4 animate-spin"/>
                                        </div>
                                        <div className="bg-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-500">
                                            AI 正在思考并创作中...
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 border-t border-slate-100 bg-white">
                                <div className="relative">
                                    <textarea 
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="输入修改建议，AI将重新规划..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 shadow-inner"
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isLlmActive}
                                        className="absolute right-2 bottom-2 p-2 bg-slate-900 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-all"
                                    >
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </aside>

                        {/* Workspace (2/3) */}
                        <main className="flex-1 bg-slate-50/50 overflow-hidden relative">
                            {stage === 'outline' && (
                                <Step2Outline 
                                    history={history}
                                    onHistoryUpdate={setHistory}
                                    onLlmStatusChange={setIsLlmActive}
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
                                    onFinish={() => setStage('finalize')}
                                />
                            )}
                            {stage === 'finalize' && (
                                <Step4Finalize 
                                    topic={data.topic}
                                    pages={data.pages}
                                    onBackToCompose={() => setStage('compose')}
                                />
                            )}
                        </main>
                    </>
                )}
            </div>
        </div>
    );
};
