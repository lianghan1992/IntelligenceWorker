
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, UserIcon, 
    BrainIcon, ChevronDownIcon, PlayIcon, PencilIcon, StopIcon,
    ViewGridIcon, CheckCircleIcon
} from '../../../../components/icons';
import { marked } from 'marked';
import { GenStatus } from './index';

interface PlanChatAreaProps {
    messages: any[];
    isGenerating: boolean;
    onSendMessage: (text: string) => void;
    onStartResearch: () => void;
    onStop?: () => void;
    status: GenStatus;
}

// --- Helper: Robust Partial JSON Parser ---
// 尝试修复并解析不完整的 JSON 字符串（流式输出专用）
const tryParsePartialJson = (jsonStr: string) => {
    if (!jsonStr) return null;
    try {
        let cleanStr = jsonStr.trim();
        // 移除 markdown 代码块标记
        cleanStr = cleanStr.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');
        
        // 尝试直接解析
        return JSON.parse(cleanStr);
    } catch (e) {
        // 如果失败，尝试补全
        try {
            let cleanStr = jsonStr.trim().replace(/^```json/, '').replace(/^```/, '');
            // 补全数组
            if (cleanStr.startsWith('[') && !cleanStr.endsWith(']')) {
                // 如果结尾是逗号，去掉
                if (cleanStr.endsWith(',')) cleanStr = cleanStr.slice(0, -1);
                // 尝试补全对象结尾
                if (cleanStr.endsWith('}')) {
                    return JSON.parse(cleanStr + ']');
                } 
                // 尝试补全双引号和对象结尾
                if (cleanStr.match(/"[^"]*$/)) {
                    cleanStr += '"';
                }
                // 递归补全直到能解析（简化版：只补全最常见的层级）
                return JSON.parse(cleanStr + '}]');
            }
        } catch (e2) {
            return null;
        }
    }
    return null;
};

// --- Component: Plan Visualizer ---
const PlanWidget: React.FC<{ jsonContent: string; isStreaming: boolean }> = ({ jsonContent, isStreaming }) => {
    // 使用 useMemo 缓存解析结果，避免频繁重绘导致闪烁
    const planData = useMemo(() => {
        const parsed = tryParsePartialJson(jsonContent);
        return Array.isArray(parsed) ? parsed : null;
    }, [jsonContent]);

    if (!planData && isStreaming) {
        return (
            <div className="my-3 p-4 bg-white border border-indigo-100 rounded-xl shadow-sm animate-pulse">
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold">正在构建研究大纲结构...</span>
                </div>
                <div className="space-y-2">
                    <div className="h-4 bg-indigo-50 rounded w-3/4"></div>
                    <div className="h-4 bg-indigo-50 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!planData) return null;

    return (
        <div className="my-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="px-4 py-3 bg-white border-b border-slate-100 flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ViewGridIcon className="w-4 h-4 text-indigo-600" />
                    建议研究大纲
                </h4>
                {isStreaming && <span className="text-[10px] text-indigo-500 font-medium animate-pulse">生成中...</span>}
            </div>
            <div className="p-3 space-y-2">
                {planData.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-slate-800 truncate">
                                {item.title || '生成标题中...'}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {item.instruction || item.desc || '...'}
                            </div>
                        </div>
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex justify-center py-2">
                         <div className="flex gap-1">
                             <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay:'0s'}}></div>
                             <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                             <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Thinking Bubble Component ---
const ThinkingBubble: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
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
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                        <RefreshIcon className="w-3 h-3 animate-spin" />
                        研究进行中
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
                    
                    // --- Parsing Logic ---
                    let thinkContent = "";
                    let planContent = "";
                    let displayContent = msg.content;

                    // 1. Extract <think>
                    const thinkMatch = msg.content.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
                    if (thinkMatch) {
                        thinkContent = thinkMatch[1];
                        displayContent = displayContent.replace(thinkMatch[0], '');
                    }

                    // 2. Extract <plan>
                    const planMatch = msg.content.match(/<plan>([\s\S]*?)(?:<\/plan>|$)/i);
                    if (planMatch) {
                        planContent = planMatch[1];
                        displayContent = displayContent.replace(planMatch[0], '');
                    }

                    displayContent = displayContent.trim();

                    return (
                        <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1 ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                                {isUser ? <UserIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                            </div>
                            
                            <div className={`flex flex-col max-w-[90%] ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-4 rounded-2xl shadow-sm text-sm leading-relaxed w-full ${
                                    isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                }`}>
                                    {/* Thinking Block */}
                                    {!isUser && (thinkContent || (isGenerating && isLast && !planContent && !displayContent)) && (
                                        <ThinkingBubble 
                                            content={thinkContent} 
                                            isStreaming={isGenerating && isLast} 
                                        />
                                    )}

                                    {/* Plan Visualizer (The new Widget) */}
                                    {!isUser && (planContent || (isGenerating && isLast && !displayContent && !thinkContent)) && (
                                        <PlanWidget 
                                            jsonContent={planContent} 
                                            isStreaming={isGenerating && isLast}
                                        />
                                    )}

                                    {/* Main Text Content */}
                                    {displayContent && (
                                        <div className={`markdown-body ${isUser ? 'text-white' : ''}`}>
                                            <div dangerouslySetInnerHTML={{ __html: marked.parse(displayContent) as string }} />
                                        </div>
                                    )}

                                    {/* Fallback Loading Indicator */}
                                    {isGenerating && isLast && !displayContent && !thinkContent && !planContent && (
                                        <span className="animate-pulse flex items-center gap-1 text-slate-400 mt-2">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                        </span>
                                    )}
                                </div>

                                {/* Action Buttons (Only for last Assistant message if not generating) */}
                                {!isUser && isLast && !isGenerating && status === 'planning' && planContent && (
                                    <div className="mt-3 flex gap-3 animate-in fade-in slide-in-from-top-1 w-full justify-end">
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
                                            <PlayIcon className="w-3.5 h-3.5" /> 确认并开始研究
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
                    <div className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        {status === 'executing' ? (
                            <>
                                <RefreshIcon className="w-4 h-4 animate-spin text-indigo-500"/>
                                智能体正在自主执行...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-4 h-4 text-green-500"/>
                                任务已结束
                            </>
                        )}
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
