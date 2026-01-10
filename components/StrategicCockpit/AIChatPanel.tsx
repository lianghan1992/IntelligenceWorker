
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions, createSession } from '../../api/stratify';
import { searchSemanticSegments, fetchJinaReader } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, RefreshIcon, CheckCircleIcon, SearchIcon, GlobeIcon, DatabaseIcon } from '../icons';
import { InfoItem } from '../../types';
import { AGENTS } from '../../agentConfig';

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

const MODEL_ID = "openrouter@xiaomi/mimo-v2-flash:free";

const TOOLS = [
    {
        type: "function",
        function: {
            name: "search_knowledge_base",
            description: "Search the internal automotive intelligence database for stored facts, news, and technical parameters.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search keywords."
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_google",
            description: "Search the real-time internet (Google) for very recent news, live events, or specific data not found in the internal database.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search keywords for Google."
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
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isStreaming && isExpanded && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isStreaming, isExpanded]);

    if (!content) return null;

    return (
        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-1 max-w-full">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100/50 transition-colors select-none"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse text-indigo-500' : ''}`} />
                <span>深度思考 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    <div 
                        ref={scrollRef}
                        className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-slim-scrollbar italic break-words border-l-2 border-indigo-200 pl-2"
                    >
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-indigo-400 animate-pulse"></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 显式检索片段展示组件 ---
const RetrievedIntelligence: React.FC<{ query: string; items: InfoItem[]; isSearching: boolean; onClick: (item: InfoItem) => void }> = ({ query, items, isSearching, onClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [searchStep, setSearchStep] = useState(0);
    
    useEffect(() => {
        if(isSearching) {
            const interval = setInterval(() => setSearchStep(s => (s + 1) % 3), 800);
            return () => clearInterval(interval);
        } else {
            setSearchStep(0);
        }
    }, [isSearching]);

    const searchStatusText = [
        "正在解析检索意图...",
        "正在连接数据源...",
        "正在阅读与整理..."
    ];
    
    if ((!query && !isSearching) || (query === 'EMPTY_FALLBACK')) return null;

    const itemCount = items ? items.length : 0;
    const isExternal = items.some(i => i.source_name === 'Google Search');

    return (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/30 overflow-hidden animate-in fade-in slide-in-from-top-2 shadow-sm max-w-full">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/50 transition-colors select-none"
            >
                {isSearching ? <RefreshIcon className="w-3.5 h-3.5 animate-spin text-blue-500 flex-shrink-0" /> : (isExternal ? <GlobeIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> : <DatabaseIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />)}
                <span className="flex-1 text-left truncate min-w-0">
                    {isSearching ? `检索中: "${query || '深度分析...'}"` : `检索完成: "${query}"`}
                </span>
                {!isSearching && itemCount > 0 && (
                    <span className="ml-1 bg-white px-1.5 py-0.5 rounded text-[9px] text-blue-600 border border-blue-100 font-mono flex-shrink-0">{itemCount}</span>
                )}
                <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform flex-shrink-0 text-blue-400 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-2 border-t border-blue-100/50">
                    {isSearching && (
                        <div className="py-3 flex flex-col items-center justify-center text-blue-400 gap-2">
                             <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                             </div>
                             <span className="text-[10px] font-medium opacity-80">{searchStatusText[searchStep]}</span>
                        </div>
                    )}
                    {!isSearching && (
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-slim-scrollbar pr-1">
                            {items.map((item, idx) => (
                                <div 
                                    key={item.id || idx} 
                                    onClick={() => onClick(item)}
                                    className="p-2.5 bg-white border border-slate-100 rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="flex-shrink-0 w-3.5 h-3.5 rounded bg-blue-100 text-blue-600 text-[9px] font-bold flex items-center justify-center font-mono">
                                            {idx + 1}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-700 truncate flex-1 group-hover:text-blue-600 min-w-0">{item.title}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed pl-5.5 opacity-80 group-hover:opacity-100">
                                        {item.content}
                                    </p>
                                </div>
                            ))}
                            {itemCount === 0 && (
                                <div className="py-2 text-center text-xs text-slate-400 italic">未发现强关联参考资料</div>
                            )}
                        </div>
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
    const [sessionId, setSessionId] = useState<string | null>(null);
    
    // Initialize with current date to inform user
    const [messages, setMessages] = useState<Message[]>(() => {
        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        return [{ 
            id: 'init', 
            role: 'assistant', 
            content: `我是您的 **AI 情报副驾驶**。\n📅 今天是 **${today}**。\n\n我可以为您深入分析汽车行业动态，支持实时检索、数据校验与长文本总结。`, 
            timestamp: Date.now() 
        }];
    });

    const [isStreaming, setIsStreaming] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
             messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming, isSearching]);

    const ensureSession = async () => {
        if (sessionId) return sessionId;
        try {
            const sess = await createSession(AGENTS.STRATEGIC_COPILOT, 'Copilot Chat');
            setSessionId(sess.id);
            return sess.id;
        } catch (e) {
            console.error("Failed to create session", e);
            return null;
        }
    };

    // 增强版 JSON 提取
    const extractJson = (str: string) => {
        const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
            try { return JSON.parse(codeBlockMatch[1]); } catch (e) { /* continue */ }
        }
        try { return JSON.parse(str); } catch (e) { /* continue */ }
        const firstOpen = str.indexOf('{');
        const lastClose = str.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose > firstOpen) {
            const potentialJson = str.substring(firstOpen, lastClose + 1);
            try { return JSON.parse(potentialJson); } catch (e) { 
                try {
                     const fixed = potentialJson.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                     return JSON.parse(fixed);
                } catch(e2) { /* continue */ }
            }
        }
        return null;
    };

    const handleSend = async () => {
        if (!input.trim() || isStreaming || isSearching) return;
        
        const activeSessionId = await ensureSession();
        const currentInput = input.trim();
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: currentInput, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsStreaming(true);

        const currentHistory = [...messages, userMsg];
        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        
        const systemPrompt = `You are Auto Insight Copilot, an expert in the automotive industry.
Current Date: ${currentDate}.
Your Knowledge Cutoff is old.

Tools available:
1. "search_knowledge_base": For internal historical data/facts.
2. "search_google": For real-time news (today/this month) or specific external info.

INSTRUCTIONS:
- If the user asks about recent events (today, this week/month) or specific data, YOU MUST USE A TOOL.
- When using a tool, output ONLY the JSON object. DO NOT output any conversational text.
- Format: { "tool": "search_google", "query": "..." }
- If no tool is needed, answer directly in Chinese.`;

        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let nativeToolCall: any = null;
        let isToolCallDetected = false;

        try {
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
                    isToolCallDetected = true;
                }

                const contentTrimmed = accumulatedContent.trimStart();
                const isJsonStart = contentTrimmed.startsWith('{') || contentTrimmed.startsWith('```json');
                
                if (!isToolCallDetected && (
                    contentTrimmed.includes('"tool":') || 
                    contentTrimmed.includes('search_google')
                )) {
                    isToolCallDetected = true;
                }

                if (isJsonStart || isToolCallDetected) {
                     if (!isSearching) setIsSearching(true);
                     updateLastAssistantMessage("", accumulatedReasoning, "分析意图中...");
                } else {
                     updateLastAssistantMessage(accumulatedContent, accumulatedReasoning);
                }
            }, undefined, undefined, activeSessionId || undefined);

            let finalToolName = '';
            let finalToolQuery = '';
            
            if (nativeToolCall?.name) {
                finalToolName = nativeToolCall.name;
                try {
                    const args = JSON.parse(nativeToolCall.arguments);
                    finalToolQuery = args.query;
                } catch (e) { /* ignore */ }
            }
            
            if (!finalToolQuery) {
                const jsonObj = extractJson(accumulatedContent);
                if (jsonObj) {
                    finalToolName = jsonObj.tool || jsonObj.action || finalToolName;
                    finalToolQuery = jsonObj.query || finalToolQuery;
                    if (!finalToolName && (jsonObj.source === 'google')) finalToolName = 'search_google';
                }
            }

            if (!finalToolQuery) {
                const dqMatch = accumulatedContent.match(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (dqMatch) finalToolQuery = dqMatch[1];
            }

            const intentDetected = isToolCallDetected || !!finalToolName;

            if (intentDetected && !finalToolQuery) {
                 finalToolQuery = currentInput;
            }

            if (finalToolQuery && !finalToolName) {
                finalToolName = (accumulatedContent.includes('google') || finalToolQuery.includes('最新')) ? 'search_google' : 'search_knowledge_base';
            }

            if (finalToolQuery) {
                setIsStreaming(false); 
                setIsSearching(true);
                updateLastAssistantMessage("", accumulatedReasoning, finalToolQuery);

                let citations: InfoItem[] = [];
                
                if (finalToolName === 'search_google') {
                    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(finalToolQuery)}&tbs=qdr:m&num=10`;
                    
                    try {
                        const searchResultMarkdown = await fetchJinaReader(googleUrl, {
                            'X-Return-Format': 'markdown',
                            'X-Target-Selector': '#center_col', 
                            'X-Remove-Selector': 'header, .class, #id'
                        });

                        const urls = new Set<string>();
                        const linkRegex = /\[.*?\]\((https?:\/\/[^)]+)\)/g;
                        let match;
                        while ((match = linkRegex.exec(searchResultMarkdown)) !== null) {
                            if (!match[1].includes('google.com') && !match[1].startsWith('/')) {
                                urls.add(match[1]);
                            }
                        }

                        const topUrls = Array.from(urls).slice(0, 5);
                        
                        if (topUrls.length > 0) {
                            updateLastAssistantMessage("", accumulatedReasoning, `正在阅读 ${topUrls.length} 篇网页...`);
                            const contentPromises = topUrls.map(async (url) => {
                                try {
                                    const content = await fetchJinaReader(url);
                                    const titleMatch = content.match(/^#+\s+(.*)$/m);
                                    const title = titleMatch ? titleMatch[1] : url;
                                    return {
                                        id: url,
                                        title: title.substring(0, 100),
                                        content: content.substring(0, 3000),
                                        source_name: 'Google Search',
                                        original_url: url,
                                        created_at: new Date().toISOString(),
                                        similarity: 1
                                    } as InfoItem;
                                } catch (e) {
                                    return null;
                                }
                            });
                            const fetchedArticles = await Promise.all(contentPromises);
                            citations = fetchedArticles.filter((item): item is InfoItem => item !== null && item.content.length > 50);
                        }
                        
                        if (citations.length === 0) {
                             citations = [{
                                id: 'google-summary',
                                title: 'Google 搜索摘要',
                                content: searchResultMarkdown.substring(0, 4000),
                                source_name: 'Google Search',
                                original_url: googleUrl,
                                created_at: new Date().toISOString(),
                                similarity: 1
                            }];
                        }
                    } catch (e) {
                        citations = [];
                    }
                } else {
                    try {
                        const searchRes = await searchSemanticSegments({
                            query_text: finalToolQuery,
                            page: 1,
                            page_size: 10,
                            similarity_threshold: 0.15
                        });
                        citations = searchRes.items || [];
                    } catch (e) { /* ignore */ }
                }

                setIsSearching(false);
                setIsStreaming(true); 

                const context = citations.map((item, idx) => 
                    `[${idx+1}] 标题: ${item.title}\n来源: ${item.source_name}\n内容: ${item.content}`
                ).join('\n\n') || "未找到相关信息。";

                const toolResponseMsg = {
                    role: 'system',
                    content: `### ${finalToolName === 'search_google' ? '互联网搜索' : '知识库检索'}结果 (关键词: ${finalToolQuery}):\n${context}\n\n请综合以上信息回答用户。`
                };

                accumulatedContent = '';
                
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
                }, undefined, undefined, activeSessionId || undefined);
            } else {
                updateLastAssistantMessage(accumulatedContent, accumulatedReasoning);
            }

        } catch (error) {
            updateLastAssistantMessage(accumulatedContent + "\n\n> *⚠️ 连接异常，请重试。*", accumulatedReasoning);
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
                    searchQuery: searchQuery !== undefined ? searchQuery : last.searchQuery, 
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
        
        let displayContent = content;
        if (!isUser && displayContent.trim().startsWith('{') && displayContent.includes('tool')) {
             return <div className="text-xs text-slate-400 italic">正在处理工具调用...</div>;
        }

        const userProseClass = "prose prose-sm max-w-none text-white break-words prose-p:text-white prose-headings:text-white prose-strong:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white prose-a:text-indigo-200 hover:prose-a:text-white prose-code:text-white prose-blockquote:text-white/80";
        const aiProseClass = "prose prose-sm max-w-none text-slate-700 break-words prose-p:text-slate-700 prose-headings:text-slate-900 prose-strong:text-indigo-700 prose-a:text-indigo-600 prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50 prose-blockquote:px-3 prose-blockquote:py-1";

        if (window.marked && typeof window.marked.parse === 'function') {
            return (
                <div 
                    className={isUser ? userProseClass : aiProseClass}
                    dangerouslySetInnerHTML={{ __html: window.marked.parse(displayContent) }} 
                />
            );
        }
        return <div className={`whitespace-pre-wrap text-sm leading-relaxed break-words ${isUser ? 'text-white' : 'text-slate-700'}`}>{displayContent}</div>;
    };

    return (
        <div className={`flex flex-col h-full bg-[#f8fafc] border-l border-slate-200 shadow-xl overflow-hidden ${className}`}>
            <style>{`
                .custom-slim-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-slim-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-slim-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-slim-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 border-b border-slate-200 bg-white/90 backdrop-blur z-20 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg text-white shadow-md">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">AI Copilot</h3>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Insight Assistant</p>
                    </div>
                </div>
                {isSearching && (
                    <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 animate-pulse">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-blue-600">检索中</span>
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-6 custom-slim-scrollbar bg-slate-50/50 scroll-smooth">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isLastAssistant = !isUser && idx === messages.length - 1;

                    return (
                        <div key={msg.id} className={`flex gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-full`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${
                                isUser ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-slate-200'
                            }`}>
                                {isUser ? <UserIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
                            </div>
                            
                            <div className={`flex flex-col max-w-[88%] md:max-w-[85%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 md:px-5 md:py-4 rounded-2xl shadow-sm border transition-all duration-200 w-full ${
                                    isUser 
                                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 border-transparent text-white rounded-tr-sm shadow-indigo-200' 
                                        : 'bg-white border-slate-200 text-slate-800 rounded-tl-sm shadow-slate-100'
                                }`}>
                                    {/* Reasoning Block (Only Assistant) */}
                                    {msg.reasoning && <ThinkingBlock content={msg.reasoning} isStreaming={isStreaming && isLastAssistant} />}
                                    
                                    {/* Retrieval Process Block (Only Assistant) */}
                                    {!isUser && msg.searchQuery && (
                                        <RetrievedIntelligence 
                                            query={msg.searchQuery} 
                                            items={msg.retrievedItems || []} 
                                            isSearching={isLastAssistant && (isSearching || (!msg.retrievedItems && !msg.content))} 
                                            onClick={(item) => onReferenceClick && onReferenceClick(item)}
                                        />
                                    )}

                                    {/* Message Content */}
                                    <div className="relative break-words overflow-hidden">
                                        {renderMessageContent(msg.content, isUser)}
                                        
                                        {/* Loading Dots */}
                                        {!isUser && isStreaming && isLastAssistant && !msg.content && !isSearching && !msg.reasoning && (
                                            <div className="flex gap-1 items-center py-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="mt-1 text-[9px] text-slate-300 font-medium px-1 select-none">
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-5 bg-white border-t border-slate-200 relative z-30 flex-shrink-0">
                <div className="relative bg-slate-50 border border-slate-200 rounded-[20px] shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 focus-within:bg-white transition-all duration-200">
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
                        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none h-12 md:h-14 max-h-32 custom-slim-scrollbar placeholder:text-slate-400 leading-relaxed font-medium text-slate-700"
                        disabled={isStreaming || isSearching}
                    />
                    <div className="flex justify-between items-center px-2 pb-2">
                        <div className="flex gap-1.5 px-1">
                           <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm opacity-60 hover:opacity-100 transition-opacity cursor-default">
                               <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                               <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">AI Guard On</span>
                           </div>
                        </div>
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming || isSearching}
                            className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
                                input.trim() && !isStreaming && !isSearching
                                    ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
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
