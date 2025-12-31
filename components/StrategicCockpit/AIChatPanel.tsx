
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions } from '../../api/stratify';
import { searchSemanticSegments } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, PuzzleIcon, RefreshIcon, CheckCircleIcon } from '../icons';
import { InfoItem } from '../../types';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    reasoning?: string;
    toolCallId?: string;
    citations?: InfoItem[];
    timestamp?: number;
}

// Default Model Configuration
const MODEL_ID = "openrouter@tngtech/deepseek-r1t2-chimera:free";

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
                    <div className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap break-words leading-relaxed">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
};

const CitationCard: React.FC<{ item: InfoItem; onClick: () => void }> = ({ item, onClick }) => (
    <div 
        onClick={onClick}
        className="mt-2 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors group"
    >
        <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-white rounded border border-indigo-100 text-indigo-600">
                <PuzzleIcon className="w-3 h-3" />
            </div>
            <span className="text-xs font-bold text-indigo-800 truncate flex-1">{item.title}</span>
            <span className="text-[9px] text-slate-400">{((item.similarity || 0) * 100).toFixed(0)}%</span>
        </div>
        <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100">
            {item.content}
        </p>
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
            content: '我是您的 AI 情报副驾驶。我可以检索知识库并回答关于汽车行业的复杂问题。', 
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

        // 1. First Pass: Ask LLM (with System Prompt to use JSON tool)
        // Note: Using a robust system prompt instead of native tools for broader compatibility with "free" models
        const systemPrompt = `You are Auto Insight Copilot, an expert in the automotive industry.
You have access to a vector database tool to search for real-time intelligence.
Rules:
1. If the user asks a question requiring specific data, news, or facts, you MUST search the database first.
2. To search, output ONLY this JSON format: {"tool": "search_knowledge_base", "query": "YOUR_SEARCH_KEYWORDS"}. Do not output anything else.
3. If no search is needed, answer directly.
4. Use Chinese.`;

        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let toolCallDetected = false;
        let toolQuery = '';

        try {
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...currentHistory.map(m => ({ role: m.role, content: m.content }))
                ],
                stream: true,
                temperature: 0.3 // Lower temp for tool calling precision
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;

                // Simple streaming detection for JSON
                if (!toolCallDetected && accumulatedContent.includes('{"tool":')) {
                    // It seems like a tool call, keep accumulating but don't show to user yet ideally.
                    // For now, we will show "Thinking..." status if we detect potential tool use pattern
                } else {
                     // Update UI for normal response
                     updateLastMessage(accumulatedContent, accumulatedReasoning);
                }
            });

            // Check if final output is a JSON tool call
            try {
                const jsonMatch = accumulatedContent.match(/\{.*"tool":\s*"search_knowledge_base".*"\}/s);
                if (jsonMatch) {
                    const toolObj = JSON.parse(jsonMatch[0]);
                    toolCallDetected = true;
                    toolQuery = toolObj.query;
                }
            } catch (e) {
                // Not a valid JSON, assume normal text response
            }

            // 2. If Tool Called: Execute Search & Second Pass
            if (toolCallDetected) {
                setIsStreaming(false); // Pause streaming UI
                setIsSearching(true);

                // Perform Search
                const searchRes = await searchSemanticSegments({
                    query_text: toolQuery,
                    page: 1,
                    page_size: 5, // Top 5 chunks
                    similarity_threshold: 0.3
                });

                setIsSearching(false);
                setIsStreaming(true);

                const context = searchRes.items?.map((item, idx) => 
                    `[${idx+1}] Title: ${item.title}\nSource: ${item.source_name}\nDate: ${item.publish_date}\nContent: ${item.content}`
                ).join('\n\n') || "No results found.";

                // Inject Context
                const contextMsg = {
                    role: 'system',
                    content: `Search Results for "${toolQuery}":\n${context}\n\nAnswer the user's question based on these results. Cite sources using [1], [2] notation.`
                };

                // Store references for UI
                const citations = searchRes.items || [];

                // Reset accumulators for second pass
                accumulatedContent = '';
                accumulatedReasoning = ''; // Keep previous reasoning? Maybe separate. Let's start fresh for answer generation.

                // Second LLM Call
                await streamChatCompletions({
                    model: MODEL_ID,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...currentHistory.map(m => ({ role: m.role, content: m.content })),
                        contextMsg
                    ],
                    stream: true
                }, (chunk) => {
                    if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                    if (chunk.content) accumulatedContent += chunk.content;
                    updateLastMessage(accumulatedContent, accumulatedReasoning, citations);
                });
            }

        } catch (error) {
            console.error(error);
            updateLastMessage(accumulatedContent + "\n[System Error: Failed to complete response]", accumulatedReasoning);
        } finally {
            setIsStreaming(false);
            setIsSearching(false);
        }
    };

    const updateLastMessage = (content: string, reasoning: string, citations?: InfoItem[]) => {
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.role === 'assistant') {
                return [...prev.slice(0, -1), { ...last, content, reasoning, citations: citations || last.citations }];
            } else {
                return [...prev, { id: crypto.randomUUID(), role: 'assistant', content, reasoning, citations, timestamp: Date.now() }];
            }
        });
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
                        <h3 className="text-sm font-bold text-slate-800">AI 情报副驾驶</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Powered by DeepSeek R1</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Future: History or Clear button */}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/30 scroll-smooth">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
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
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                                
                                {/* Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-2 w-full space-y-1 animate-in fade-in slide-in-from-top-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">参考来源</div>
                                        {msg.citations.map(cite => (
                                            <CitationCard 
                                                key={cite.id} 
                                                item={cite} 
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
                    <div className="flex items-center gap-3 animate-pulse px-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <PuzzleIcon className="w-4 h-4 text-indigo-600 animate-spin" />
                        </div>
                        <span className="text-xs font-bold text-indigo-600">正在检索情报知识库...</span>
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
                        placeholder="输入问题，AI 将自动检索知识库..."
                        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none h-14 max-h-32 custom-scrollbar placeholder:text-slate-400"
                        disabled={isStreaming || isSearching}
                    />
                    <div className="flex justify-between items-center px-2 pb-2">
                        <div className="flex gap-1">
                           {/* Tools icons placeholders if needed */}
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
                    AI 内容由 DeepSeek R1 生成，可能存在幻觉，请核对重要信息。
                </div>
            </div>
        </div>
    );
};
