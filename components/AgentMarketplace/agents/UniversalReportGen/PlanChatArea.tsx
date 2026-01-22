
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, UserIcon, 
    BrainIcon, ChevronDownIcon, PlayIcon, PencilIcon, StopIcon
} from '../../../../components/icons';
import { marked } from 'marked';
import { GenStatus } from './index';

interface PlanChatAreaProps {
    messages: any[];
    isGenerating: boolean;
    onSendMessage: (text: string) => void;
    onStartResearch: () => void;
    onStop?: () => void; // New Prop
    status: GenStatus;
}

// --- Thinking Bubble Component ---
const ThinkingBubble: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    // Auto-scroll logic inside thinking bubble if needed
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if(isStreaming && isExpanded && ref.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
        }
    }, [content, isStreaming, isExpanded]);

    if (!content) return null;

    return (
        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100/50 transition-colors select-none"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>深度思考过程 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div 
                    ref={ref}
                    className="px-4 pb-3 max-h-48 overflow-y-auto custom-scrollbar text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap italic"
                >
                    {content}
                </div>
            )}
        </div>
    );
};

export const PlanChatArea: React.FC<PlanChatAreaProps> = ({ 
    messages, isGenerating, onSendMessage, onStartResearch, onStop, status 
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isGenerating]);

    const handleSend = () => {
        if (!input.trim() || isGenerating) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10 flex-shrink-0 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <SparklesIcon className="w-6 h-6 text-indigo-600"/> 深度研究规划
                </h3>
                {status === 'executing' && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full animate-pulse">
                        正在研究中...
                    </span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 pb-20">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                            <SparklesIcon className="w-10 h-10 text-indigo-400" />
                        </div>
                        <p className="text-sm font-medium">请输入研究主题，开始深度探索</p>
                    </div>
                )}
                
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isLast = idx === messages.length - 1;
                    
                    // Parse <think> tag
                    let thinkContent = "";
                    let displayContent = msg.content;
                    const thinkMatch = msg.content.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
                    if (thinkMatch) {
                        thinkContent = thinkMatch[1];
                        displayContent = msg.content.replace(thinkMatch[0], '').trim();
                    }

                    return (
                        <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1 ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                                {isUser ? <UserIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                            </div>
                            
                            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                    isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                }`}>
                                    {/* Thinking Block */}
                                    {!isUser && (thinkContent || (isGenerating && isLast && !displayContent)) && (
                                        <ThinkingBubble 
                                            content={thinkContent} 
                                            isStreaming={isGenerating && isLast} 
                                        />
                                    )}

                                    {/* Main Content */}
                                    <div className={`markdown-body ${isUser ? 'text-white' : ''}`}>
                                        {displayContent ? (
                                            <div dangerouslySetInnerHTML={{ __html: marked.parse(displayContent) as string }} />
                                        ) : (
                                            isGenerating && isLast && <span className="animate-pulse">...</span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons (Only for last Assistant message if not generating) */}
                                {!isUser && isLast && !isGenerating && status === 'planning' && (
                                    <div className="mt-3 flex gap-3 animate-in fade-in slide-in-from-top-1">
                                        <button 
                                            onClick={() => document.getElementById('chat-input')?.focus()}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5" /> 修改方案
                                        </button>
                                        <button 
                                            onClick={onStartResearch}
                                            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95"
                                        >
                                            <PlayIcon className="w-3.5 h-3.5" /> 开始研究
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            {status === 'planning' ? (
                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="relative">
                        <textarea 
                            id="chat-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={messages.length === 0 ? "输入研究主题 (如: 2024年智能驾驶行业趋势)..." : "输入修改意见..."}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none h-14 custom-scrollbar shadow-inner transition-all"
                            disabled={isGenerating}
                        />
                        {isGenerating && onStop ? (
                            <button 
                                onClick={onStop}
                                className="absolute right-2 top-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm animate-in fade-in zoom-in"
                                title="停止生成"
                            >
                                <StopIcon className="w-4 h-4" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSend}
                                disabled={!input.trim() || isGenerating}
                                className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {isGenerating ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            Model: Xiaomi Mimo v2 Flash (Free)
                        </span>
                    </div>
                </div>
            ) : (
                /* Execution Status Bar */
                <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center">
                    <div className="text-sm font-bold text-slate-600">
                        {status === 'executing' ? "智能体正在自主执行..." : "任务已结束"}
                    </div>
                    {status === 'executing' && onStop && (
                        <button 
                            onClick={onStop}
                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-red-100"
                        >
                            <StopIcon className="w-3.5 h-3.5" /> 停止任务
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
