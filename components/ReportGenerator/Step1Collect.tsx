
import React, { useState, useEffect, useRef } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, RefreshIcon, UserIcon, 
    BrainIcon, ChevronDownIcon, PlayIcon, StopIcon,
    DatabaseIcon, TrashIcon, PlusIcon
} from '../icons';
import { marked } from 'marked';
import { PPTStage, ChatMessage, PPTData, SharedGeneratorProps } from './types';
import { streamChatCompletions } from '../../api/stratify';
import { searchSemanticBatchGrouped } from '../../api/intelligence';
import { AGENTS } from '../../agentConfig';

// --- Exported Helper for Step3Compose ---
export const tryParsePartialJson = (jsonStr: string) => {
    if (!jsonStr) return null;
    try {
        let cleanStr = jsonStr.trim();
        cleanStr = cleanStr.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');
        return JSON.parse(cleanStr);
    } catch (e) {
        try {
            let cleanStr = jsonStr.trim().replace(/^```json/, '').replace(/^```/, '');
            if (cleanStr.startsWith('[') && !cleanStr.endsWith(']')) {
                if (cleanStr.endsWith(',')) cleanStr = cleanStr.slice(0, -1);
                if (cleanStr.endsWith('}')) return JSON.parse(cleanStr + ']');
                if (cleanStr.match(/"[^"]*$/)) cleanStr += '"';
                return JSON.parse(cleanStr + '}]');
            }
        } catch (e2) {
            return null;
        }
    }
    return null;
};

// --- Constants ---
const MODEL_ID = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free"; // Cost-effective model for chat

export const SEARCH_TOOL_DEF = {
    type: "function",
    function: {
        name: "search_knowledge_base",
        description: "搜索内部知识库和全网数据。当用户询问需要事实依据的问题时使用。",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "搜索关键词" }
            },
            required: ["query"]
        }
    }
};

interface CopilotSidebarProps extends SharedGeneratorProps {
    stage: PPTStage;
    setStage: (stage: PPTStage) => void;
    history: ChatMessage[];
    setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    data: PPTData;
    setData: React.Dispatch<React.SetStateAction<PPTData>>;
    isLlmActive: boolean;
    setIsLlmActive: (active: boolean) => void;
    activePageIndex: number;
    setActivePageIndex: (index: number) => void;
    onReset: () => void;
    statusBar?: React.ReactNode;
    sessionTitle: string;
    onTitleChange: (title: string) => void;
    onSwitchSession: (id: string) => void;
    onEnsureSession: () => Promise<string>;
    onToggleHistory: () => void;
}

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
                <span>思考过程 {isStreaming ? '...' : ''}</span>
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

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({ 
    stage, setStage, history, setHistory, data, setData, 
    isLlmActive, setIsLlmActive, activePageIndex, setActivePageIndex,
    onReset, statusBar, sessionTitle, onTitleChange, onSwitchSession, onEnsureSession, onToggleHistory,
    onRefreshSession, onHandleInsufficientBalance
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isLlmActive]);

    const handleSend = async () => {
        if (!input.trim() || isLlmActive) return;
        
        const userMsg: ChatMessage = { role: 'user', content: input };
        const newHistory = [...history, userMsg];
        setHistory(newHistory);
        setInput('');
        setIsLlmActive(true);
        
        if (!data.topic) {
            setData(prev => ({ ...prev, topic: input }));
        }

        abortRef.current = new AbortController();

        try {
            const activeSessionId = await onEnsureSession();
            
            const assistantMsgId = crypto.randomUUID(); // Temp ID for streaming updates
            // Add placeholder assistant message
            setHistory(prev => [...prev, { role: 'assistant', content: '', reasoning: '' }]);
            
            let accumulatedContent = '';
            let accumulatedReasoning = '';
            let toolCallsBuffer: any[] = [];
            
            const systemPrompt = `你是一个专业的行业研究员。
当前阶段：${stage}
已确定主题：${data.topic || '待定'}
参考资料摘要：${data.referenceMaterials ? '已包含' : '无'}

如果当前是 'collect' 阶段，请引导用户明确研究主题，或者根据用户输入的主题调用搜索工具收集信息。
当信息收集足够时，请生成一份报告大纲（JSON格式），包含 title 和 instruction 字段。

如果是 'outline' 阶段，请根据用户反馈调整大纲。
如果是 'compose' 阶段，请根据用户对当前页面的反馈进行修改或重写。
如果是 'finalize' 阶段，请辅助用户进行最后的润色。

请保持专业、客观。`;

            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...newHistory.map(m => ({ role: m.role, content: m.content }))
            ];

            await streamChatCompletions({
                model: MODEL_ID,
                messages: apiMessages,
                stream: true,
                enable_billing: true,
                tools: [SEARCH_TOOL_DEF],
                tool_choice: 'auto'
            }, async (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;
                
                // Tool Call Handling
                if (chunk.tool_calls) {
                    chunk.tool_calls.forEach((tc: any) => {
                        const idx = tc.index;
                        if (!toolCallsBuffer[idx]) {
                            toolCallsBuffer[idx] = { ...tc, function: { name: "", arguments: "" } };
                        } else {
                            if (tc.function?.name) toolCallsBuffer[idx].function.name += tc.function.name;
                            if (tc.function?.arguments) toolCallsBuffer[idx].function.arguments += tc.function.arguments;
                        }
                    });
                }

                // Update UI live
                setHistory(prev => {
                    const lastIdx = prev.length - 1;
                    const newH = [...prev];
                    newH[lastIdx] = { 
                        role: 'assistant', 
                        content: accumulatedContent, 
                        reasoning: accumulatedReasoning 
                    };
                    return newH;
                });
            }, async () => {
                // Done callback
                setIsLlmActive(false);
                if (onRefreshSession) onRefreshSession();
                
                // If tools were called, we need to execute them and loop back (simplified here: just execute search)
                if (toolCallsBuffer.length > 0) {
                     for (const tc of toolCallsBuffer) {
                         if (tc.function.name === 'search_knowledge_base') {
                             let query = '';
                             try {
                                 const args = JSON.parse(tc.function.arguments);
                                 query = args.query;
                             } catch(e) { console.error(e); }
                             
                             if (query) {
                                 setHistory(prev => [...prev, { role: 'assistant', content: `🔍 正在检索: ${query}...` }]);
                                 try {
                                     const res = await searchSemanticBatchGrouped({ query_texts: [query] });
                                     const resultText = JSON.stringify(res.results);
                                     
                                     // Add result to history context (hidden from UI usually, but here visible for debug)
                                     const toolMsg: ChatMessage = { role: 'system', content: `[Tool Result]: ${resultText}` };
                                     setHistory(prev => [...prev, toolMsg]);
                                     
                                     // Trigger LLM again with tool result (recursive call concept - simplified here to just notification)
                                     setHistory(prev => [...prev, { role: 'assistant', content: `已找到相关资料。请继续提问或指示我生成大纲。` }]);
                                 } catch(e) {
                                     setHistory(prev => [...prev, { role: 'system', content: `检索失败` }]);
                                 }
                             }
                         }
                     }
                }
                
                // Try to parse Outline if in collect stage
                if (stage === 'collect') {
                    const plan = tryParsePartialJson(accumulatedContent);
                    if (plan && Array.isArray(plan)) {
                        setData(prev => ({ 
                            ...prev, 
                            outline: { title: prev.topic, pages: plan.map((p: any) => ({ title: p.title, content: p.instruction })) } 
                        }));
                        setStage('outline');
                    }
                }

            }, (err) => {
                console.error(err);
                setIsLlmActive(false);
                if (err.message === 'INSUFFICIENT_BALANCE' && onHandleInsufficientBalance) {
                    onHandleInsufficientBalance();
                }
            }, activeSessionId, AGENTS.REPORT_GENERATOR, abortRef.current?.signal);

        } catch (e: any) {
            setIsLlmActive(false);
             if (e.name !== 'AbortError') {
                 alert(e.message || '发送失败');
             }
        }
    };

    const handleStop = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setIsLlmActive(false);
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <input 
                            value={sessionTitle}
                            onChange={(e) => onTitleChange(e.target.value)}
                            className="text-sm font-bold text-slate-800 bg-transparent outline-none w-full truncate placeholder:text-slate-400"
                            placeholder="未命名研报任务"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggleHistory} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="历史记录">
                        <DatabaseIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onReset} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="重置">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => {}} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="新建">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Status Bar */}
            {statusBar && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                    {statusBar}
                </div>
            )}

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/30" ref={scrollRef}>
                {history.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-60">
                         <SparklesIcon className="w-16 h-16 text-indigo-200" />
                         <p className="text-sm font-medium">嗨！我是您的研报助手。</p>
                         <p className="text-xs max-w-[200px] text-center">请告诉我您的研究主题，例如："2024年中国新能源汽车出海趋势分析"</p>
                    </div>
                )}
                
                {history.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isSystem = msg.role === 'system';
                    if (isSystem) return null; // Hide system prompts from UI

                    return (
                        <div key={idx} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1 ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                                {isUser ? <UserIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                            </div>
                            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm w-full ${
                                    isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                }`}>
                                    {!isUser && msg.reasoning && (
                                        <ThinkingBubble content={msg.reasoning} isStreaming={isLlmActive && idx === history.length - 1} />
                                    )}
                                    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isLlmActive && history[history.length - 1]?.role !== 'assistant' && (
                    <div className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                            <SparklesIcon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-slate-400">
                            正在思考中...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0 relative z-20">
                <div className="relative">
                    <textarea 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none h-14 custom-scrollbar shadow-inner transition-all"
                        placeholder={stage === 'collect' ? "输入研究主题..." : "输入修改意见..."}
                        disabled={isLlmActive}
                    />
                    {isLlmActive ? (
                        <button 
                            onClick={handleStop}
                            className="absolute right-2 top-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm animate-in fade-in zoom-in"
                        >
                            <StopIcon className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
