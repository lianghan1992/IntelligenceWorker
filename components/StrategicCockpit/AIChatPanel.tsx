
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions, createSession } from '../../api/stratify';
import { searchSemanticGrouped } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, RefreshIcon, CheckCircleIcon, DatabaseIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from '../icons';
import { InfoItem } from '../../types';
import { AGENTS } from '../../agentConfig';
import { marked } from 'marked';

// --- Types ---

interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    reasoning?: string; // Deep thinking content
    
    // Agent Metadata
    tool_calls?: ToolCall[];      // Requests made by assistant
    tool_call_id?: string;        // ID linking tool result to request (for role: tool)
    
    // UI Metadata for rendering cards
    uiState?: {
        type: 'searching' | 'results';
        query?: string;
        items?: InfoItem[];
    };
    
    timestamp?: number;
}

const MODEL_ID = "zhipu@glm-4-flash";

// --- Components ---

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
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/30 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-1 max-w-full">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100/50 transition-colors select-none bg-indigo-50/50 font-serif"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse text-indigo-600' : ''}`} />
                <span>深度思考 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-4 pb-3">
                    <div 
                        ref={scrollRef}
                        className="text-[12px] font-serif text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-slim-scrollbar italic break-words border-l-2 border-indigo-200 pl-3 pt-1"
                    >
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-indigo-400 animate-pulse"></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

const RetrievedIntelligence: React.FC<{ query: string; items: InfoItem[]; isSearching: boolean; onClick: (item: InfoItem) => void }> = ({ query, items, isSearching, onClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    // If not searching and no items, don't render (unless it's an empty result state we want to show)
    if (!isSearching && (!items || items.length === 0)) return null;

    const itemCount = items ? items.length : 0;

    return (
        <div className="mb-4 rounded-xl border border-blue-100 bg-white overflow-hidden animate-in fade-in slide-in-from-top-2 shadow-sm max-w-full font-serif">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-blue-700 bg-blue-50/50 hover:bg-blue-50 transition-colors select-none"
            >
                {isSearching ? <RefreshIcon className="w-3.5 h-3.5 animate-spin text-blue-600 flex-shrink-0" /> : <DatabaseIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                <span className="flex-1 text-left truncate min-w-0">
                    {isSearching ? `正在检索知识库: "${query}"` : `已检索到 ${itemCount} 篇相关情报 ("${query}")`}
                </span>
                {!isSearching && itemCount > 0 && (
                    <span className="ml-1 bg-white px-1.5 py-0.5 rounded text-[9px] text-blue-600 border border-blue-100 font-mono flex-shrink-0">{itemCount}</span>
                )}
                <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform flex-shrink-0 text-blue-400 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-2 border-t border-blue-100/50 bg-slate-50/30">
                    {isSearching ? (
                        <div className="py-3 flex flex-col items-center justify-center text-blue-500 gap-1">
                             <span className="text-[10px] font-bold opacity-80 animate-pulse font-serif">正在扫描行业数据库...</span>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-slim-scrollbar pr-1">
                            {items.length > 0 ? items.map((item, idx) => (
                                <div 
                                    key={item.id || idx} 
                                    onClick={() => onClick(item)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center font-mono border border-blue-100 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12px] font-bold text-slate-800 leading-snug group-hover:text-blue-700 font-serif mb-1 line-clamp-2">
                                                {item.title}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-serif">
                                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{item.source_name}</span>
                                                {item.publish_date && <span>{new Date(item.publish_date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 flex-shrink-0 mt-1" />
                                    </div>
                                </div>
                            )) : (
                                <div className="py-3 text-center text-xs text-slate-400 italic font-serif">未找到相关内容，尝试更换关键词</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Agent Configuration ---

const SEARCH_TOOL_DEF = {
    type: "function",
    function: {
        name: "search_knowledge_base",
        description: "搜索内部汽车行业情报数据库。当用户询问行业动态、技术细节、竞品信息或任何需要事实依据的问题时，必须优先使用此工具。如果一次搜索结果不足，可以尝试更换关键词再次搜索。",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "搜索关键词。应提炼用户问题的核心实体和意图，例如'小米SU7 交付量' 或 '固态电池 技术路线'。"
                }
            },
            required: ["query"]
        }
    }
};

const SYSTEM_PROMPT = `你是一个专业的汽车行业情报分析师 (AI Copilot)。
你的职责是基于事实回答用户问题。
1. **优先检索**：遇到任何事实性问题，必须先调用 \`search_knowledge_base\` 工具获取信息。不要直接编造答案。
2. **多轮思考**：如果第一次检索结果不理想，可以尝试换个角度或关键词再次检索。
3. **基于证据**：回答时请引用检索到的资料（UI会自动展示引用卡片，你只需在文本中自然融合信息）。
4. **风格**：保持专业、客观、逻辑清晰。使用简体中文。字体风格应正式（前端已配置衬线体，你只需输出 Markdown）。
5. **UI交互**：当展示列表时，适当使用 Markdown 列表。

请记住：你的知识库是最新的，利用好它。`;


export const AIChatPanel: React.FC<{ 
    className?: string; 
    onReferenceClick?: (article: InfoItem) => void;
    isExpanded?: boolean;
    onToggle?: () => void;
    hideToggle?: boolean;
}> = ({ className, onReferenceClick, isExpanded = true, onToggle, hideToggle = false }) => {
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false); // Indicates Agent loop is active
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // We keep a local message history that aligns with OpenAI format
    const [messages, setMessages] = useState<Message[]>(() => {
        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        return [{ 
            id: 'init', 
            role: 'assistant', 
            content: `我是您的 **AI Copilot**。\n📅 今天是 **${today}**。\n\n我已连接至实时情报数据库。请问您想了解什么？（例如：“查询最近关于固态电池的进展”或“小米汽车的最新动态”）`, 
            timestamp: Date.now() 
        }];
    });

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    useEffect(() => {
        if (isExpanded) scrollToBottom();
    }, [messages, isProcessing, isExpanded]);

    const ensureSession = async () => {
        if (sessionId) return sessionId;
        try {
            const sess = await createSession(AGENTS.STRATEGIC_COPILOT, 'Copilot Chat');
            setSessionId(sess.id);
            return sess.id;
        } catch (e) { return null; }
    };

    // --- Core Agent Loop ---
    const runAgentLoop = async (newHistory: Message[]) => {
        setIsProcessing(true);
        const activeSessionId = await ensureSession();
        
        let keepRunning = true;
        let turnCount = 0;
        const MAX_TURNS = 5; // Prevent infinite loops

        // Create a working copy of history for the LLM API (strip UI fields)
        let apiHistory = newHistory.map(m => {
            const apiMsg: any = { role: m.role, content: m.content };
            if (m.tool_calls) apiMsg.tool_calls = m.tool_calls;
            if (m.tool_call_id) apiMsg.tool_call_id = m.tool_call_id;
            return apiMsg;
        });

        // Add System Prompt if not present (usually managed by backend via Agent ID, but we enforce specific instruction here)
        if (apiHistory.length > 0 && apiHistory[0].role !== 'system') {
             apiHistory = [{ role: 'system', content: SYSTEM_PROMPT }, ...apiHistory];
        }

        try {
            while (keepRunning && turnCount < MAX_TURNS) {
                turnCount++;
                
                // 1. Prepare a placeholder message for the Assistant's response
                const assistantMsgId = crypto.randomUUID();
                
                // Update UI: Add empty assistant bubble
                setMessages(prev => [...prev, { 
                    id: assistantMsgId, 
                    role: 'assistant', 
                    content: '', 
                    timestamp: Date.now() 
                }]);

                let accumulatedContent = '';
                let accumulatedReasoning = '';
                let toolCallsBuffer: any[] = [];
                let currentToolIndex = -1;

                // 2. Stream Request to LLM
                await streamChatCompletions({
                    model: MODEL_ID,
                    messages: apiHistory,
                    stream: true,
                    temperature: 0.1, // Low temp for tool use reliability
                    tools: [SEARCH_TOOL_DEF], // Pass tools
                    tool_choice: "auto",
                    enable_billing: true
                }, (chunk) => {
                    // Handle Reasoning
                    if (chunk.reasoning) {
                        accumulatedReasoning += chunk.reasoning;
                    }
                    
                    // Handle Content
                    if (chunk.content) {
                        accumulatedContent += chunk.content;
                    }

                    // Handle Tool Calls (OpenAI Stream Format)
                    if (chunk.tool_calls) {
                        chunk.tool_calls.forEach((tc: any) => {
                            if (tc.index !== undefined) {
                                currentToolIndex = tc.index;
                                if (!toolCallsBuffer[currentToolIndex]) {
                                    toolCallsBuffer[currentToolIndex] = { ...tc, function: { name: "", arguments: "" }, id: tc.id };
                                }
                            }
                            // Accumulate function name
                            if (tc.function?.name && toolCallsBuffer[currentToolIndex]) {
                                toolCallsBuffer[currentToolIndex].function.name += tc.function.name;
                            }
                            // Accumulate arguments
                            if (tc.function?.arguments && toolCallsBuffer[currentToolIndex]) {
                                toolCallsBuffer[currentToolIndex].function.arguments += tc.function.arguments;
                            }
                        });
                    }

                    // Live Update UI
                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                        ...m,
                        content: accumulatedContent,
                        reasoning: accumulatedReasoning,
                        // If we detect a tool call is starting, we can show a "Planning..." indicator in reasoning or UI
                    } : m));

                }, undefined, (err) => {
                    throw err; 
                }, activeSessionId || undefined, AGENTS.STRATEGIC_COPILOT);


                // 3. Process Result of the Turn
                const finalMsg: Message = {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: accumulatedContent,
                    reasoning: accumulatedReasoning,
                    tool_calls: toolCallsBuffer.length > 0 ? toolCallsBuffer : undefined,
                    timestamp: Date.now()
                };

                // Add to API History
                apiHistory.push({
                    role: 'assistant',
                    content: finalMsg.content,
                    tool_calls: finalMsg.tool_calls
                });

                // Check if Tool Calls exist
                if (finalMsg.tool_calls && finalMsg.tool_calls.length > 0) {
                    // Update UI to show the final "thinking" state before executing tool
                    // We don't break loop yet. We execute tool.
                    
                    // --- Execute Tools ---
                    for (const toolCall of finalMsg.tool_calls) {
                        if (toolCall.function.name === 'search_knowledge_base') {
                            let args = { query: '' };
                            try {
                                args = JSON.parse(toolCall.function.arguments);
                            } catch (e) {
                                console.error("Failed to parse tool args", e);
                                args.query = "error"; 
                            }

                            // A. UI: Show "Searching" Card
                            const toolMsgId = crypto.randomUUID();
                            setMessages(prev => [...prev, {
                                id: toolMsgId,
                                role: 'tool',
                                content: 'Searching...',
                                tool_call_id: toolCall.id,
                                uiState: { type: 'searching', query: args.query }
                            }]);

                            // B. API: Call Vector Search
                            let searchResultString = "No results found.";
                            let foundItems: InfoItem[] = [];
                            
                            try {
                                const res = await searchSemanticGrouped({ 
                                    query_text: args.query, 
                                    page: 1, 
                                    size: 5, // Top 5 results
                                    similarity_threshold: 0.35 
                                });
                                
                                foundItems = (res.items || []).map((item: any) => ({
                                    id: item.article_id,
                                    title: item.title,
                                    content: item.segments ? item.segments.map((s: any) => s.content).join('\n') : '',
                                    source_name: item.source_name,
                                    publish_date: item.publish_date,
                                    original_url: item.url,
                                    created_at: item.created_at
                                }));

                                if (foundItems.length > 0) {
                                    searchResultString = JSON.stringify(foundItems.map(i => ({
                                        title: i.title,
                                        source: i.source_name,
                                        date: i.publish_date,
                                        content: i.content
                                    }))); // Minified JSON for LLM
                                }

                            } catch (err: any) {
                                searchResultString = `Search Error: ${err.message}`;
                            }

                            // C. UI: Update Card with Results
                            setMessages(prev => prev.map(m => m.id === toolMsgId ? {
                                ...m,
                                content: `Found ${foundItems.length} items.`, // Internal log
                                uiState: { 
                                    type: 'results', 
                                    query: args.query, 
                                    items: foundItems 
                                }
                            } : m));

                            // D. API History: Add Tool Result
                            apiHistory.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: searchResultString
                            });
                        }
                    }
                    // Loop continues to let LLM process the tool results
                } else {
                    // No tool calls -> Final Answer -> Stop Loop
                    keepRunning = false;
                }
            }

        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: `⚠️ 对话发生错误: ${error.message}`, 
                timestamp: Date.now() 
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = () => {
        const currentInput = input.trim();
        if (!currentInput || isProcessing) return;
        
        setInput('');
        
        // Add User Message to UI
        const userMsg: Message = { 
            id: crypto.randomUUID(), 
            role: 'user', 
            content: currentInput, 
            timestamp: Date.now() 
        };
        
        const nextHistory = [...messages, userMsg];
        setMessages(nextHistory);
        
        // Trigger Agent Loop
        runAgentLoop(nextHistory);
    };

    const renderMessageContent = (content: string, isUser: boolean) => {
        if (!content) return null;
        const proseClass = isUser 
            ? "prose prose-sm max-w-none text-white prose-p:text-white prose-strong:text-white font-serif" 
            : "prose prose-sm max-w-none text-slate-700 prose-strong:text-indigo-800 prose-headings:font-bold prose-headings:text-slate-900 font-serif leading-relaxed";
        try {
            return <div className={proseClass} dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />;
        } catch (e) {
             return <div className={`whitespace-pre-wrap text-sm font-serif ${isUser ? 'text-white' : 'text-slate-700'}`}>{content}</div>;
        }
    };

    if (!isExpanded) {
        return (
            <div className={`flex flex-col items-center h-full py-4 bg-white border-l border-slate-200 ${className}`}>
                <button 
                    onClick={onToggle}
                    className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                    title="展开 AI Copilot"
                >
                    <SparklesIcon className="w-5 h-5" />
                </button>
                <div className="flex-1 flex flex-col items-center justify-center gap-10 py-10 overflow-hidden">
                    <span className="[writing-mode:vertical-lr] text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] select-none font-serif">
                        AI COPILOT AGENT
                    </span>
                </div>
                <button 
                    onClick={onToggle}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-white shadow-xl overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-right-4 font-serif ${className}`}>
            <style>{`
                .custom-slim-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-slim-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-slim-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
            `}</style>
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur z-20 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.02)] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg text-white shadow-md shadow-indigo-100">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-slate-800 tracking-tight font-serif">AI Copilot</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isProcessing && (
                        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 animate-pulse">
                            <span className="text-[10px] font-bold text-blue-600 font-serif">Thinking & Acting...</span>
                        </div>
                    )}
                    {!hideToggle && (
                         <button 
                            onClick={onToggle}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="收起"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-slim-scrollbar bg-[#f8fafc] scroll-smooth">
                {messages.map((msg, idx) => {
                    if (msg.role === 'tool') {
                        // Render Search Results Card
                        if (msg.uiState) {
                             return (
                                 <div key={msg.id} className="max-w-[88%] mr-auto">
                                     <RetrievedIntelligence 
                                         query={msg.uiState.query || ''} 
                                         items={msg.uiState.items || []} 
                                         isSearching={msg.uiState.type === 'searching'} 
                                         onClick={(item) => onReferenceClick && onReferenceClick(item)} 
                                     />
                                 </div>
                             );
                        }
                        return null; // Don't show raw tool messages if no UI state
                    }

                    const isUser = msg.role === 'user';
                    // Reasoning is displayed for assistant messages
                    const showReasoning = !isUser && !!msg.reasoning;
                    
                    return (
                        <div key={msg.id} className={`flex gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-full`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${isUser ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-slate-200'}`}>
                                {isUser ? <UserIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
                            </div>
                            <div className={`flex flex-col max-w-[88%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-4 rounded-2xl shadow-sm border transition-all duration-200 w-full ${isUser ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-transparent text-white rounded-tr-sm shadow-indigo-100' : 'bg-white border-slate-100 text-slate-800 rounded-tl-sm'}`}>
                                    {showReasoning && <ThinkingBlock content={msg.reasoning!} isStreaming={isProcessing && idx === messages.length - 1} />}
                                    <div className="relative break-words overflow-hidden">{renderMessageContent(msg.content, isUser)}</div>
                                </div>
                                <span className="mt-1.5 text-[10px] text-slate-300 font-medium px-1 font-serif">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 relative z-30 flex-shrink-0">
                <div className="relative bg-slate-50 border border-slate-200/60 rounded-[20px] shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 focus-within:bg-white transition-all duration-200">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="询问关于汽车行业的问题..."
                        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none h-14 md:h-16 max-h-32 custom-slim-scrollbar placeholder:text-slate-400 font-medium text-slate-700 font-serif"
                        disabled={isProcessing}
                    />
                    <div className="flex justify-between items-center px-2 pb-2">
                        <div className="flex items-center gap-1 px-2 py-0.5">
                           <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-serif">Agent Mode Active</span>
                        </div>
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isProcessing}
                            className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${input.trim() && !isProcessing ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}
                        >
                            {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
