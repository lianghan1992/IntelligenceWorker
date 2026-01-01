
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions } from '../../api/stratify';
import { searchSemanticSegments } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, PuzzleIcon, RefreshIcon, CheckCircleIcon } from '../icons';
import { InfoItem } from '../../types';

// Add type declaration for marked
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
    toolCallId?: string;
    citations?: InfoItem[];
    timestamp?: number;
}

// Default Model Configuration - Updated to Nex-AGI variant
const MODEL_ID = "openrouter@nex-agi/deepseek-v3.1-nex-n1:free";

// Define standard tools for the model
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

const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    if (!content) return null;
    return (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100/50 transition-colors"
            >
                <BrainIcon className={`w-3 h-3 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>深度思考链 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                    <div className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
};

const CitationCard: React.FC<{ item: InfoItem; index: number; onClick: () => void }> = ({ item, index, onClick }) => (
    <div 
        onClick={onClick}
        className="group relative flex gap-3 p-3 bg-white border border-indigo-50 rounded-xl cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-200"
    >
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold font-mono mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            {index}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate mb-1 group-hover:text-indigo-700 transition-colors">
                {item.title}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1.5">
                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-500">
                    {item.source_name}
                </span>
                <span>•</span>
                <span className={item.similarity && item.similarity > 0.8 ? 'text-green-600 font-medium' : ''}>
                    相似度 {((item.similarity || 0) * 100).toFixed(0)}%
                </span>
            </div>
            <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100">
                {item.content}
            </p>
        </div>
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRightIcon className="w-3 h-3 text-indigo-400" />
        </div>
    </div>
);

export const AIChatPanel: React.FC<{ 
    className?: string; 
    onReferenceClick?: (article: InfoItem) => void;
}> = ({ className, onReferenceClick }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: 'init', 
            role: 'assistant', 
            content: '我是您的 AI 情报副驾驶。您可以问我关于汽车行业的任何问题，我会实时检索知识库为您解答。', 
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

    // Agentic RAG Logic
    const handleSend = async () => {
        if (!input.trim() || isStreaming || isSearching) return;
        
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsStreaming(true);

        const currentHistory = [...messages, userMsg];

        // 1. Pass: Ask LLM (with native tools)
        const systemPrompt = `You are Auto Insight Copilot, an expert in the automotive industry.
You have access to a tool to search for real-time intelligence.
Always search the database if the user asks for specific data, news, or technical parameters.
Use Chinese for your responses.`;

        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let nativeToolCall: any = null;
        let manualJsonDetected = false;

        try {
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...currentHistory.map(m => ({ role: m.role, content: m.content }))
                ],
                tools: TOOLS,
                stream: true,
                temperature: 0.2
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;
                
                // Handle native tool_calls from stream
                if (chunk.tool_calls) {
                    if (!nativeToolCall) nativeToolCall = { id: '', name: '', arguments: '' };
                    const call = chunk.tool_calls[0];
                    if (call.id) nativeToolCall.id = call.id;
                    if (call.function?.name) nativeToolCall.name = call.function.name;
                    if (call.function?.arguments) nativeToolCall.arguments += call.function.arguments;
                }

                // Aesthetic Check: Hide streaming text if it looks like manual JSON (fallback)
                if (accumulatedContent.trimStart().startsWith('{')) {
                     manualJsonDetected = true;
                     updateLastMessage("", accumulatedReasoning);
                } else {
                     updateLastMessage(accumulatedContent, accumulatedReasoning);
                }
            });

            // 2. Decision Phase
            let finalToolQuery = '';
            
            // Check native tool call first
            if (nativeToolCall && nativeToolCall.name === 'search_knowledge_base') {
                try {
                    const args = JSON.parse(nativeToolCall.arguments);
                    finalToolQuery = args.query;
                } catch (e) {
                    console.error("Failed to parse native tool args:", e);
                }
            }
            
            // Fallback: Check manual JSON detection (some models are better at this)
            if (!finalToolQuery) {
                const jsonMatch = accumulatedContent.match(/\{.*"tool":\s*"search_knowledge_base".*"\}/s);
                if (jsonMatch) {
                    try {
                        const toolObj = JSON.parse(jsonMatch[0]);
                        finalToolQuery = toolObj.query;
                    } catch (e) { /* Ignore */ }
                }
            }

            // 3. Execution Phase
            if (finalToolQuery) {
                setIsStreaming(false);
                setIsSearching(true);

                // Perform Search
                const searchRes = await searchSemanticSegments({
                    query_text: finalToolQuery,
                    page: 1,
                    page_size: 5,
                    similarity_threshold: 0.25
                });

                setIsSearching(false);
                setIsStreaming(true);

                const context = searchRes.items?.map((item, idx) => 
                    `[${idx+1}] Title: ${item.title}\nSource: ${item.source_name}\nDate: ${item.publish_date}\nContent: ${item.content}`
                ).join('\n\n') || "未找到相关情报。";

                // Inject Context
                const toolResponseMsg = {
                    role: 'system',
                    content: `检索结果 (Query: "${finalToolQuery}"):\n${context}\n\n请根据以上检索到的事实回答用户。如果检索结果中包含数据，请务必准确引用。使用 [1], [2] 标注来源。`
                };

                const citations = searchRes.items || [];
                accumulatedContent = '';
                // accumulatedReasoning = ''; // We can keep first reasoning or clear it. Let's keep for full context.

                // Second LLM Pass
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
                    updateLastMessage(accumulatedContent, accumulatedReasoning, citations);
                });
            } else if (manualJsonDetected && !accumulatedContent) {
                // If it looked like JSON but we failed to parse or execute, show what we have
                updateLastMessage(accumulatedContent, accumulatedReasoning);
            }

        } catch (error) {
            console.error(error);
            updateLastMessage(accumulatedContent + "\n\n*[系统错误: AI 引擎连接中断]*", accumulatedReasoning);
        } finally {
            setIsStreaming(false);
            setIsSearching(false);
        }
    };

    const updateLastMessage = (content: string, reasoning: string, citations?: InfoItem[]) => {
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
                return [...prev.slice(0, -1), { ...last, content, reasoning, citations: citations || last.citations }];
            } else {
                return [...prev, { id: crypto.randomUUID(), role: 'assistant', content, reasoning, citations, timestamp: Date.now() }];
            }
        });
    };

    const renderMessageContent = (content: string) => {
        if (!content) return null;
        if (window.marked && typeof window.marked.parse === 'function') {
            return (
                <div 
                    className="prose prose-sm max-w-none 
                        prose-p:my-1.5 prose-p:leading-relaxed 
                        prose-headings:font-bold prose-headings:text-slate-800 prose-headings:my-2 prose-headings:text-xs
                        prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5
                        prose-strong:font-bold prose-strong:text-slate-900
                        prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                        text-slate-700"
                    dangerouslySetInnerHTML={{ __html: window.marked.parse(content) }} 
                />
            );
        }
        return <div className="whitespace-pre-wrap">{content}</div>;
    };

    return (
        <div className={`flex flex-col h-full bg-white border-l border-slate-200 shadow-xl ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white/80 backdrop-blur z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-sm">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">AI 情报副驾驶</h3>
                        <p className="text-[10px] text-slate-400 font-mono">DeepSeek V3.1 Nex-N1</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSearching && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/30 scroll-smooth">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1 ${isUser ? 'bg-slate-800 text-white' : 'bg-white text-indigo-600 border border-slate-100'}`}>
                                {isUser ? <UserIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
                            </div>
                            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    isUser 
                                        ? 'bg-slate-800 text-white rounded-tr-sm' 
                                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                                }`}>
                                    {msg.reasoning && <ThinkingBlock content={msg.reasoning} isStreaming={isStreaming && idx === messages.length - 1} />}
                                    {renderMessageContent(msg.content)}
                                </div>
                                
                                {/* Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-3 w-full space-y-2 animate-in fade-in slide-in-from-top-1 px-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                           <PuzzleIcon className="w-3 h-3" /> 参考来源
                                        </div>
                                        {msg.citations.map((cite, index) => (
                                            <CitationCard 
                                                key={cite.id} 
                                                item={cite} 
                                                index={index + 1}
                                                onClick={() => onReferenceClick && onReferenceClick(cite)} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isSearching && (
                    <div className="flex items-center gap-3 animate-pulse px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <PuzzleIcon className="w-4 h-4 text-indigo-600 animate-spin" />
                        </div>
                        <span className="text-xs font-bold text-indigo-600">正在深入检索情报知识库...</span>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 relative z-20">
                <div className="relative bg-slate-50 border border-slate-200 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="输入问题，AI 将自动调用工具检索..."
                        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none h-14 max-h-32 custom-scrollbar placeholder:text-slate-400"
                        disabled={isStreaming || isSearching}
                    />
                    <div className="flex justify-between items-center px-2 pb-2">
                        <div className="flex gap-1 px-2">
                           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">RAG Engine Enabled</span>
                        </div>
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming || isSearching}
                            className={`p-2 rounded-xl transition-all ${
                                input.trim() && !isStreaming && !isSearching
                                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div className="text-[10px] text-center text-slate-400 mt-2">
                    内容由 Nex-N1 实时生成。支持长文本理解与复杂推理。
                </div>
            </div>
        </div>
    );
};
