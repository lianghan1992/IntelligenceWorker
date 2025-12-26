
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

// --- 子组件：统一聊天消息气泡 ---
const MessageBubble: React.FC<{ msg: ChatMessage; isStreaming?: boolean }> = ({ msg, isStreaming }) => {
    const isUser = msg.role === 'user';
    const [showReasoning, setShowReasoning] = useState(true);
    const reasoningRef = useRef<HTMLDivElement>(null);
    
    // 自动滚动思考内容内部容器
    useEffect(() => {
        if (isStreaming && reasoningRef.current && showReasoning) {
            reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
        }
    }, [msg.reasoning, isStreaming, showReasoning]);

    if (msg.hidden) return null;

    return (
        <div className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-1`}>
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
                                <span>{isStreaming ? '正在深度思考...' : '思考过程'}</span>
                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
                            </button>
                            {showReasoning && (
                                <div 
                                    ref={reasoningRef}
                                    className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-[11px] font-mono text-slate-500 whitespace-pre-wrap mb-2 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar scroll-smooth"
                                >
                                    {msg.reasoning}
                                    {isStreaming && !msg.content && <span className="inline-block w-1 h-3 ml-1 bg-indigo-400 animate-pulse" />}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="whitespace-pre-wrap">
                        {msg.content}
                        {isStreaming && <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-600 animate-pulse align-middle" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ScenarioWorkstation: React.FC<ScenarioWorkstationProps> = ({ scenario, onBack }) => {
    const [stage, setStage] = useState<PPTStage>('collect');
    const [history, setHistory] = useState<ChatMessage[]>([
        { role: 'assistant', content: '您好！我是您的报告架构师。请先在右侧上传或抓取参考资料，然后在下方输入您的报告主题或研究想法。' }
    ]);
    const [data, setData] = useState<PPTData>({
        topic: '',
        referenceMaterials: '',
        outline: null,
        pages: []
    });
    const [chatInput, setChatInput] = useState('');
    const [isLlmActive, setIsLlmActive] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动主聊天容器
    useEffect(() => {
        if (chatScrollRef.current) {
            // 使用 requestAnimationFrame 确保在 DOM 更新后执行滚动
            const container = chatScrollRef.current;
            requestAnimationFrame(() => {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: isLlmActive ? 'auto' : 'smooth' // 流式输出时使用 auto 减少抖动，非输出时使用 smooth
                });
            });
        }
    }, [history, streamingMessage, isLlmActive]);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isLlmActive) return;
        const userInput = chatInput.trim();
        setChatInput('');

        if (stage === 'collect') {
            try {
                setIsLlmActive(true);
                const prompt = await getPromptDetail("38c86a22-ad69-4c4a-acd8-9c15b9e92600");
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
                {/* Persistent Chat Sidebar */}
                <aside className="w-1/3 flex flex-col bg-white border-r border-slate-200 shadow-xl z-20">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-slate-800 text-sm">AI 助手</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth" ref={chatScrollRef}>
                        {history.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                        {streamingMessage && <MessageBubble msg={streamingMessage} isStreaming={true} />}
                        {isLlmActive && !streamingMessage && (
                            <div className="flex gap-3 mb-6 animate-pulse opacity-60">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <RefreshIcon className="w-4 h-4 animate-spin"/>
                                </div>
                                <div className="bg-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-500">AI 正在处理中...</div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white">
                        <div className="relative">
                            <textarea 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder={stage === 'collect' ? "输入报告主题或想法..." : "输入修改建议，AI将重新规划..."}
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

                {/* Workspace */}
                <main className="flex-1 bg-slate-50/50 overflow-hidden relative">
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
                        />
                    )}
                </main>
            </div>
        </div>
    );
};
