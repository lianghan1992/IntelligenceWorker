
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions } from '../../api/stratify';
import { searchSemanticSegments, fetchJinaReader } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, RefreshIcon, CheckCircleIcon, SearchIcon, GlobeIcon, DatabaseIcon } from '../icons';
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
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-1 max-w-full">
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
                    <div 
                        ref={scrollRef}
                        className="text-[11px] font-mono text-slate-500 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar italic opacity-80 break-words"
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
    
    // 如果没有检索词且不在搜索中，或者检索词为空，都不显示
    if ((!query && !isSearching) || (query === 'EMPTY_FALLBACK')) return null;

    const itemCount = items ? items.length : 0;
    const isExternal = items.some(i => i.source_name === 'Google Search');

    return (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden animate-in fade-in slide-in-from-top-2 shadow-sm ring-1 ring-blue-100/50 max-w-full">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-blue-800 bg-blue-100/50 hover:bg-blue-100 transition-colors"
            >
                {isSearching ? <RefreshIcon className="w-3.5 h-3.5 animate-spin text-blue-600 flex-shrink-0" /> : (isExternal ? <GlobeIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /> : <DatabaseIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />)}
                <span className="flex-1 text-left truncate min-w-0">
                    {isSearching ? `正在检索${isExternal ? '互联网' : '情报库'}: "${query || '深度分析中...'}"` : `已完成检索: "${query}"`}
                </span>
                {!isSearching && itemCount > 0 && (
                    <span className="ml-1 bg-blue-200/60 px-1.5 py-0.5 rounded-full text-[9px] text-blue-800 font-mono flex-shrink-0">{itemCount} 来源</span>
                )}
                <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-2 bg-white/60 border-t border-blue-100/50">
                    {isSearching && (
                        <div className="py-4 flex flex-col items-center justify-center text-blue-400 gap-2">
                             <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 transition-all duration-300 min-w-[120px] text-center">{searchStatusText[searchStep]}</span>
                        </div>
                    )}
                    {!isSearching && (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {items.map((item, idx) => (
                                <div 
                                    key={item.id || idx} 
                                    onClick={() => onClick(item)}
                                    className="p-3 bg-white border border-blue-100 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="flex-shrink-0 w-4 h-4 rounded bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center font-mono">
                                            {idx + 1}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-800 truncate flex-1 group-hover:text-blue-700 min-w-0">{item.title}</span>
                                        <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">{(item.similarity ? item.similarity * 100 : 0).toFixed(0)}%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed pl-6 group-hover:text-slate-700 italic break-words">
                                        {item.content}
                                    </p>
                                </div>
                            ))}
                            {itemCount === 0 && (
                                <div className="py-3 text-center text-xs text-slate-400 italic">未发现强关联的情报片段。</div>
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
        setTimeout(() => {
             messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming, isSearching]);

    // 增强版 JSON 提取
    const extractJson = (str: string) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (match) {
                try { return JSON.parse(match[1]); } catch (e2) { /* ignore */ }
            }
            const jsonStart = str.indexOf('{');
            const jsonEnd = str.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                try { return JSON.parse(str.substring(jsonStart, jsonEnd + 1)); } catch (e3) { /* ignore */ }
            }
            return null;
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isStreaming || isSearching) return;
        
        const currentInput = input.trim();
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: currentInput, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsStreaming(true);

        const currentHistory = [...messages, userMsg];
        const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Updated System Prompt to include new tool instructions
        const systemPrompt = `You are Auto Insight Copilot, an expert in the automotive industry.
Current Date: ${currentDate}.
Your Knowledge Cutoff is old.
1. For internal historical data/facts, use "search_knowledge_base".
2. For real-time news (today/this month) or specific external info, use "search_google".
If the user asks about recent events, ALWAYS use "search_google".
DO NOT say "According to my knowledge base" unless you have actually called a tool.
Output JSON tool call immediately if data is needed.
Use Chinese for your responses.`;

        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let nativeToolCall: any = null;
        let isToolCallDetected = false;

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
                    isToolCallDetected = true;
                }

                const contentTrimmed = accumulatedContent.trimStart();
                const isJsonStart = contentTrimmed.startsWith('{') || contentTrimmed.startsWith('```json');
                
                // 宽泛检测
                if (!isToolCallDetected && (contentTrimmed.includes('"tool":') || contentTrimmed.includes('"tool_name"') || contentTrimmed.includes('search_') || contentTrimmed.includes('search_google'))) {
                    isToolCallDetected = true;
                }

                if (isJsonStart || isToolCallDetected) {
                     if (!isSearching) setIsSearching(true);
                     updateLastAssistantMessage("", accumulatedReasoning, "分析中...");
                } else {
                     updateLastAssistantMessage(accumulatedContent, accumulatedReasoning);
                }
            });

            // 第二阶段：提取搜索词并执行检索
            let finalToolName = '';
            let finalToolQuery = '';
            
            // 1. 原生调用提取
            if (nativeToolCall?.name) {
                finalToolName = nativeToolCall.name;
                try {
                    const args = JSON.parse(nativeToolCall.arguments);
                    finalToolQuery = args.query;
                } catch (e) { /* ignore */ }
            }
            
            // 2. 文本 JSON 提取 (支持多种格式变体)
            if (!finalToolName || !finalToolQuery) {
                const jsonObj = extractJson(accumulatedContent);
                if (jsonObj) {
                    if (jsonObj.tool) finalToolName = jsonObj.tool;
                    if (jsonObj.tool_name) finalToolName = jsonObj.tool_name;
                    if (jsonObj.action) finalToolName = jsonObj.action; // Support 'action' field

                    if (jsonObj.query) finalToolQuery = jsonObj.query;
                    else if (jsonObj.parameters?.query) finalToolQuery = jsonObj.parameters.query;
                    else if (jsonObj.arguments?.query) finalToolQuery = jsonObj.arguments.query;
                    else if (Array.isArray(jsonObj.queries) && jsonObj.queries.length > 0) finalToolQuery = jsonObj.queries[0]; // Support 'queries' array
                }
            }

            // 3. 正则强力提取
            if (!finalToolQuery) {
                const regexMatch = accumulatedContent.match(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (regexMatch) finalToolQuery = regexMatch[1];
                else {
                    const regexMatchSingle = accumulatedContent.match(/'query'\s*:\s*'((?:[^'\\]|\\.)*)'/);
                    if (regexMatchSingle) finalToolQuery = regexMatchSingle[1];
                }
            }

            // 智能回退
            if (!finalToolQuery && isToolCallDetected) {
                console.warn("Tool call detected but parsing failed. Falling back to user input.");
                finalToolQuery = currentInput;
                // Default to KB if name extraction failed
                if (!finalToolName) finalToolName = 'search_knowledge_base'; 
            }

            // 默认兜底：如果检测到了 search_google 字符串但没解析出 name
            if (!finalToolName && accumulatedContent.includes('search_google')) {
                finalToolName = 'search_google';
            }

            if (finalToolQuery) {
                // 状态切换
                setIsStreaming(false);
                setIsSearching(true);
                updateLastAssistantMessage("", accumulatedReasoning, finalToolQuery);

                let citations: InfoItem[] = [];
                
                if (finalToolName === 'search_google') {
                    // --- Google Search Logic via Jina ---
                    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(finalToolQuery)}&tbs=qdr:m&num=10`;
                    
                    try {
                        // 1. Fetch Search Results Page
                        const searchResultMarkdown = await fetchJinaReader(googleUrl, {
                            'X-Return-Format': 'markdown',
                            'X-Target-Selector': '#center_col', // User requested specific selector for Google
                            'X-Remove-Selector': 'header, .class, #id'
                        });

                        // 2. Extract Links (Look for [Read more](url))
                        const urls = new Set<string>();
                        // Pattern to match [Read more](https://...) from the user provided example
                        const readMoreRegex = /\[Read more\]\((https?:\/\/[^)]+)\)/g;
                        let match;
                        while ((match = readMoreRegex.exec(searchResultMarkdown)) !== null) {
                            // Filter out google internal links just in case
                            if (!match[1].includes('google.com/search') && !match[1].includes('google.com/url')) {
                                urls.add(match[1]);
                            }
                        }

                        // Fallback: standard markdown links if Read more not found
                        if (urls.size === 0) {
                            const standardLinkRegex = /\[.*?\]\((https?:\/\/[^)]+)\)/g;
                            while ((match = standardLinkRegex.exec(searchResultMarkdown)) !== null) {
                                if (!match[1].includes('google.com') && !match[1].startsWith('/')) {
                                    urls.add(match[1]);
                                }
                            }
                        }

                        const topUrls = Array.from(urls).slice(0, 5);
                        
                        if (topUrls.length > 0) {
                            // Update status
                            updateLastAssistantMessage("", accumulatedReasoning, `正在阅读 ${topUrls.length} 篇网页...`);

                            // 3. Concurrent Fetch of Article Content
                            const contentPromises = topUrls.map(async (url) => {
                                try {
                                    const content = await fetchJinaReader(url);
                                    // Simple extraction of title from markdown (first line usually)
                                    const titleMatch = content.match(/^#+\s+(.*)$/m);
                                    const title = titleMatch ? titleMatch[1] : url;
                                    return {
                                        id: url,
                                        title: title.substring(0, 100),
                                        content: content.substring(0, 3000), // Limit content per article to avoid context overflow
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
                        
                        // If fetching failed or no links, use the search result summary
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
                        console.error("Google search via Jina failed", e);
                        citations = [];
                    }

                } else {
                    // --- Standard KB Search ---
                    try {
                        const searchRes = await searchSemanticSegments({
                            query_text: finalToolQuery,
                            page: 1,
                            page_size: 10,
                            similarity_threshold: 0.15
                        });
                        citations = searchRes.items || [];
                    } catch (e) {
                        console.error("KB Search failed", e);
                    }
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
            } else {
                // 没有检测到工具调用，正常结束
                updateLastAssistantMessage(accumulatedContent, accumulatedReasoning);
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
        
        const userProseClass = "prose prose-sm max-w-none text-white break-words prose-p:text-white prose-headings:text-white prose-strong:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white prose-a:text-indigo-200 hover:prose-a:text-white prose-code:text-white prose-blockquote:text-white/80";
        const aiProseClass = "prose prose-sm max-w-none text-slate-700 break-words prose-p:text-slate-700 prose-headings:text-slate-900 prose-strong:text-indigo-700 prose-a:text-indigo-600 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50";

        if (window.marked && typeof window.marked.parse === 'function') {
            return (
                <div 
                    className={isUser ? userProseClass : aiProseClass}
                    dangerouslySetInnerHTML={{ __html: window.marked.parse(content) }} 
                />
            );
        }
        return <div className={`whitespace-pre-wrap text-sm leading-relaxed break-words ${isUser ? 'text-white' : 'text-slate-700'}`}>{content}</div>;
    };

    return (
        <div className={`flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur z-20 shadow-sm flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar bg-slate-50/10 scroll-smooth overflow-x-hidden">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isLastAssistant = !isUser && idx === messages.length - 1;

                    return (
                        <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-full`}>
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md transform transition-transform hover:scale-110 ${
                                isUser ? 'bg-slate-900 text-white' : 'bg-white text-indigo-600 border border-slate-100'
                            }`}>
                                {isUser ? <UserIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}
                            </div>
                            
                            <div className={`flex flex-col max-w-[85%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-4 rounded-2xl shadow-sm border transition-all duration-300 w-full ${
                                    isUser 
                                        ? 'bg-slate-900 border-slate-800 text-white rounded-tr-sm' 
                                        : 'bg-white border-slate-200 text-slate-800 rounded-tl-sm'
                                }`}>
                                    {/* Reasoning Block (Only Assistant) */}
                                    {msg.reasoning && <ThinkingBlock content={msg.reasoning} isStreaming={isStreaming && isLastAssistant} />}
                                    
                                    {/* Retrieval Process Block (Only Assistant) */}
                                    {/* 只要有 searchQuery，就显示检索模块，状态由 isSearching 和 retrievedItems 共同决定 */}
                                    {!isUser && msg.searchQuery && (
                                        <RetrievedIntelligence 
                                            query={msg.searchQuery} 
                                            items={msg.retrievedItems || []} 
                                            // 如果是最后一条消息，且正在检索（全局状态）或者还没有结果，则显示检索加载态
                                            isSearching={isLastAssistant && (isSearching || (!msg.retrievedItems && !msg.content))} 
                                            onClick={(item) => onReferenceClick && onReferenceClick(item)}
                                        />
                                    )}

                                    {/* Message Content */}
                                    <div className="relative break-words overflow-hidden">
                                        {renderMessageContent(msg.content, isUser)}
                                        
                                        {/* Loading Dots for streaming assistant when content is empty and not searching */}
                                        {!isUser && isStreaming && isLastAssistant && !msg.content && !isSearching && !msg.reasoning && (
                                            <div className="flex gap-1 items-center py-2 px-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'200ms'}}></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'400ms'}}></div>
                                                <span className="text-xs text-indigo-400 ml-2">正在分析...</span>
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
            <div className="p-5 bg-white border-t border-slate-100 relative z-30 flex-shrink-0">
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
