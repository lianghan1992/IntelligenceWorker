
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions } from '../../api/stratify';
import { searchSemanticSegments } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, RefreshIcon, CheckCircleIcon, SearchIcon, GlobeIcon } from '../icons';
import { InfoItem } from '../../types';

declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    reasoning?: string;
    searchQuery?: string; 
    retrievedItems?: InfoItem[];
    citations?: InfoItem[];
    timestamp?: number;
}

const MODEL_ID = "openrouter@nex-agi/deepseek-v3.1-nex-n1:free";

const TOOLS = [
    {
        type: "function",
        function: {
            name: "search_knowledge_base",
            description: "Search the automotive intelligence database for real-time data, news, technical parameters, and specific industry facts.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search keywords or specific factual question to look up in the database."
                    }
                },
                required: ["query"]
            }
        }
    }
];

// --- 思考链组件 ---
const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    if (!content) return null;
    return (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100/50 transition-colors border-b border-slate-100"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse text-indigo-500' : ''}`} />
                <span>思维链推理 {isStreaming ? '正在生成...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-4 py-3">
                    <div className="text-[11px] font-mono text-slate-500 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar italic opacity-80">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 显式检索片段展示组件 ---
const RetrievedIntelligence: React.FC<{ query: string; items: InfoItem[]; isSearching: boolean; onClick: (item: InfoItem) => void }> = ({ query, items, isSearching, onClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    // 如果没有查询词且不处于搜索状态，则不渲染
    if (!query && !isSearching) return null;

    const itemCount = items ? items.length : 0;

    return (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden animate-in fade-in slide-in-from-top-2 shadow-sm ring-1 ring-blue-100">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-blue-800 bg-blue-100/50 hover:bg-blue-100 transition-colors"
            >
                {isSearching ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <GlobeIcon className="w-3.5 h-3.5" />}
                <span>
                    {isSearching ? `正在联网检索: "${query}"...` : `已完成检索: "${query}"`}
                </span>
                {!isSearching && itemCount > 0 && (
                    <span className="ml-1 bg-blue-200/50 px-1.5 py-0.5 rounded-full text-[9px] text-blue-800">{itemCount} 源</span>
                )}
                <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-2 space-y-2 bg-white/60 border-t border-blue-100/50">
                    {isSearching && itemCount === 0 && (
                        <div className="py-4 flex flex-col items-center justify-center text-blue-400 gap-2">
                             <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-wider">正在查询知识库...</span>
                        </div>
                    )}
                    {items.map((item, idx) => (
                        <div 
                            key={item.id || idx} 
                            onClick={() => onClick(item)}
                            className="p-3 bg-white border border-blue-100 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="flex-shrink-0 w-4 h-4 rounded bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center font-mono">
                                    {idx + 1}
                                </span>
                                <span className="text-[11px] font-bold text-slate-800 truncate flex-1 group-hover:text-blue-700">{item.title}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{(item.similarity ? item.similarity * 100 : 0).toFixed(0)}%</span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed pl-6 group-hover:text-slate-700 italic">
                                {item.content}
                            </p>
                        </div>
                    ))}
                    {!isSearching && itemCount === 0 && (
                        <div className="py-3 text-center text-xs text-slate-400 italic">未发现强关联的情报片段。</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const AIChatPanel: React.FC<{ 
    className?: string; 
    onReferenceClick?: (article: InfoItem) => void;
}> = ({ className, onReferenceClick }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: 'init', 
            role: 'assistant', 
            content: '我是您的 **AI 情报副驾驶**。我可以为您深入分析汽车行业动态，支持实时检索、数据校验与长文本总结。', 
            timestamp: Date.now() 
        }
    ]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming, isSearching]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming || isSearching) return;
        
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsStreaming(true);

        const currentHistory = [...messages, userMsg];
        const systemPrompt = `You are Auto Insight Copilot, an expert in the automotive industry.
Always search the knowledge base if the user asks for specific data, news, or technical parameters.
CRITICAL: Use Markdown for your final response. Use bold text, tables, and lists to make the report look professional.
Use Chinese for your responses.`;

        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let nativeToolCall: any = null;

        try {
            // 第一阶段：生成决策与工具调用
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...currentHistory.map(m => ({ role: m.role, content: m.content }))
                ],
                tools: TOOLS,
                stream: true,
                temperature: 0.1
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;
                
                if (chunk.tool_calls) {
                    if (!nativeToolCall) nativeToolCall = { name: '', arguments: '' };
                    const call = chunk.tool_calls[0];
                    if (call.function?.name) nativeToolCall.name = call.function.name;
                    if (call.function?.arguments) nativeToolCall.arguments += call.function.arguments;
                }

                // 检查是否在内容中“手写”了 JSON 工具请求（容错处理）
                // 某些模型会输出 ```json { ... } ```
                const contentTrimmed = accumulatedContent.trimStart();
                const isJsonStart = contentTrimmed.startsWith('{') || contentTrimmed.startsWith('```json');

                // 如果看起来像是在尝试调用工具，则不更新 content 到 UI，只更新 reasoning
                if (isJsonStart) {
                     updateLastAssistantMessage("", accumulatedReasoning);
                } else {
                     updateLastAssistantMessage(accumulatedContent, accumulatedReasoning);
                }
            });

            // 第二阶段：提取搜索词并执行检索
            let finalToolQuery = '';
            
            // 1. 尝试从原生工具调用中提取
            if (nativeToolCall?.name === 'search_knowledge_base') {
                try {
                    const args = JSON.parse(nativeToolCall.arguments);
                    finalToolQuery = args.query;
                } catch (e) { /* ignore */ }
            }
            
            // 2. 尝试从文本内容的 JSON 块中提取 (容错)
            if (!finalToolQuery) {
                // 匹配 { "tool": ... "query": "..." } 或 { "query": "..." }
                const jsonMatch = accumulatedContent.match(/\{.*"query":\s*"(.*?)".*\}/s);
                if (jsonMatch) finalToolQuery = jsonMatch[1];
            }

            if (finalToolQuery) {
                setIsStreaming(false);
                setIsSearching(true);
                // 立即更新 UI，展示“正在检索”状态
                // 注意：这里我们传递 finalToolQuery 到 searchQuery 字段，RetrievedIntelligence 组件会因此显示 loading 态
                updateLastAssistantMessage("", accumulatedReasoning, finalToolQuery);

                const searchRes = await searchSemanticSegments({
                    query_text: finalToolQuery,
                    page: 1,
                    page_size: 6,
                    similarity_threshold: 0.15
                });

                setIsSearching(false);
                setIsStreaming(true);

                const citations = searchRes.items || [];
                const context = citations.map((item, idx) => 
                    `[${idx+1}] 标题: ${item.title}\n内容: ${item.content}`
                ).join('\n\n') || "未找到相关内部情报片段。";

                const toolResponseMsg = {
                    role: 'system',
                    content: `### 检索到的关键事实库 (关键词: ${finalToolQuery}):\n${context}\n\n请基于以上检索事实，并结合你的专家知识，为用户提供一份结构化的 Markdown 分析报告。必须引用来源标注如 [1], [2]。`
                };

                accumulatedContent = '';
                // 第三阶段：生成最终 Markdown 报告
                await streamChatCompletions({
                    model: MODEL_ID,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...currentHistory.map(m => ({ role: m.role, content: m.content })),
                        toolResponseMsg
                    ],
                    stream: true
                }, (chunk) => {
                    if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                    if (chunk.content) accumulatedContent += chunk.content;
                    updateLastAssistantMessage(accumulatedContent, accumulatedReasoning, finalToolQuery, citations);
                });
            }

        } catch (error) {
            console.error(error);
            updateLastAssistantMessage(accumulatedContent + "\n\n> *⚠️ 引擎连接异常，请尝试刷新页面。*", accumulatedReasoning);
        } finally {
            setIsStreaming(false);
            setIsSearching(false);
        }
    };

    const updateLastAssistantMessage = (content: string, reasoning: string, searchQuery?: string, retrievedItems?: InfoItem[]) => {
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
                return [...prev.slice(0, -1), { 
                    ...last, 
                    content, 
                    reasoning, 
                    searchQuery: searchQuery || last.searchQuery,
                    retrievedItems: retrievedItems || last.retrievedItems,
                    citations: retrievedItems || last.citations 
                }];
            } else {
                return [...prev, { 
                    id: crypto.randomUUID(), 
                    role: 'assistant', 
                    content, 
                    reasoning, 
                    searchQuery, 
                    retrievedItems, 
                    citations: retrievedItems,
                    timestamp: Date.now() 
                }];
            }
        });
    };

    const renderMessageContent = (content: string, isUser: boolean) => {
        if (!content) return null;
        
        // 关键修复：针对用户气泡（深色背景）和助手气泡（浅色背景）使用不同的 Prose 样式
        // 用户：强制所有文本为白色/浅色
        // 助手：使用默认深色文本
        const proseClass = isUser 
            ? "prose prose-sm max-w-none text-white prose-p:text-white prose-headings:text-white prose-strong:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white prose-a:text-indigo-200 hover:prose-a:text-white prose-code:text-white prose-blockquote:text-white/80"
            : "prose prose-sm max-w-none text-slate-700 prose-p:text-slate-700 prose-headings:text-slate-900 prose-strong:text-indigo-700 prose-a:text-indigo-600 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50";

        if (window.marked && typeof window.marked.parse === 'function') {
            return (
                <div 
                    className={proseClass}
                    dangerouslySetInnerHTML={{ __html: window.marked.parse(content) }} 
                />
            );
        }
        return <div className={`whitespace-pre-wrap text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-700'}`}>{content}</div>;
    };

    return (
        <div className={`flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">AI Copilot</h3>
                        <p className="text-[10px] text-slate-400 font-mono">GROUNDED INTELLIGENCE</p>
                    </div>
                </div>
                {isSearching && (
                    <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-[10px] font-bold text-blue-600">检索中</span>
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar bg-slate-50/10 scroll-smooth">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isLastAssistant = !isUser && idx === messages.length - 1;

                    return (
                        <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md transform transition-transform hover:scale-110 ${
                                isUser ? 'bg-slate-900 text-white' : 'bg-white text-indigo-600 border border-slate-100'
                            }`}>
                                {isUser ? <UserIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}
                            </div>
                            
                            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-4 rounded-2xl shadow-sm border transition-all duration-300 ${
                                    isUser 
                                        ? 'bg-slate-900 border-slate-800 text-white rounded-tr-sm' 
                                        : 'bg-white border-slate-200 text-slate-800 rounded-tl-sm'
                                }`}>
                                    {/* Reasoning Block (Only Assistant) */}
                                    {msg.reasoning && <ThinkingBlock content={msg.reasoning} isStreaming={isStreaming && isLastAssistant} />}
                                    
                                    {/* Retrieval Process Block (Only Assistant) */}
                                    {!isUser && msg.searchQuery && (
                                        <RetrievedIntelligence 
                                            query={msg.searchQuery} 
                                            items={msg.retrievedItems || []} 
                                            isSearching={isSearching && isLastAssistant && (!msg.retrievedItems || msg.retrievedItems.length === 0)}
                                            onClick={(item) => onReferenceClick && onReferenceClick(item)}
                                        />
                                    )}

                                    {/* Message Content */}
                                    <div className="relative">
                                        {renderMessageContent(msg.content, isUser)}
                                        
                                        {/* Loading Dots for streaming assistant */}
                                        {!isUser && isStreaming && isLastAssistant && !msg.content && !isSearching && !msg.reasoning && (
                                            <div className="flex gap-1 items-center py-2 px-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'200ms'}}></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'400ms'}}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="mt-1.5 text-[9px] text-slate-300 font-mono tracking-widest px-1">
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white border-t border-slate-100 relative z-30">
                <div className="relative bg-slate-50 border border-slate-200 rounded-[24px] shadow-inner focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-400 focus-within:bg-white transition-all duration-300">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="在此询问任何关于汽车行业的问题..."
                        className="w-full bg-transparent px-5 py-4 text-sm focus:outline-none resize-none h-16 max-h-40 custom-scrollbar placeholder:text-slate-400 leading-relaxed font-medium"
                        disabled={isStreaming || isSearching}
                    />
                    <div className="flex justify-between items-center px-3 pb-3">
                        <div className="flex gap-1.5 px-2">
                           <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                               <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                               <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">AI Guard Ready</span>
                           </div>
                        </div>
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming || isSearching}
                            className={`p-2.5 rounded-2xl transition-all shadow-lg active:scale-90 ${
                                input.trim() && !isStreaming && !isSearching
                                    ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
