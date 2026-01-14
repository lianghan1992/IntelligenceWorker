
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions, createSession } from '../../api/stratify';
import { searchSemanticSegments } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, RefreshIcon, CheckCircleIcon, DatabaseIcon } from '../icons';
import { InfoItem } from '../../types';
import { AGENTS } from '../../agentConfig';
import { marked } from 'marked';

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

// Update model to Zhipu GLM-4 Flash as requested
const MODEL_ID = "zhipu@glm-4-flash";

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
    
    if ((!query && !isSearching)) return null;

    const itemCount = items ? items.length : 0;

    return (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/30 overflow-hidden animate-in fade-in slide-in-from-top-2 shadow-sm max-w-full">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/50 transition-colors select-none"
            >
                {isSearching ? <RefreshIcon className="w-3.5 h-3.5 animate-spin text-blue-500 flex-shrink-0" /> : <DatabaseIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                <span className="flex-1 text-left truncate min-w-0">
                    {isSearching ? `检索中: "${query}"` : `已检索到 ${itemCount} 条情报`}
                </span>
                {!isSearching && itemCount > 0 && (
                    <span className="ml-1 bg-white px-1.5 py-0.5 rounded text-[9px] text-blue-600 border border-blue-100 font-mono flex-shrink-0">{itemCount}</span>
                )}
                <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform flex-shrink-0 text-blue-400 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-2 border-t border-blue-100/50">
                    {isSearching && (
                        <div className="py-2 flex flex-col items-center justify-center text-blue-400 gap-1">
                             <span className="text-[10px] font-medium opacity-80 animate-pulse">正在扫描知识库向量索引...</span>
                        </div>
                    )}
                    {!isSearching && (
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-slim-scrollbar pr-1">
                            {items.length > 0 ? items.map((item, idx) => (
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
                            )) : (
                                <div className="py-2 text-center text-xs text-slate-400 italic">知识库中未找到强相关内容</div>
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
    
    const [messages, setMessages] = useState<Message[]>(() => {
        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        return [{ 
            id: 'init', 
            role: 'assistant', 
            content: `我是您的 **AI 情报副驾驶**。\n📅 今天是 **${today}**。\n\n我专注于智能汽车领域的垂直情报分析，会自动检索知识库为您解答。`, 
            timestamp: Date.now() 
        }];
    });

    const [isStreaming, setIsStreaming] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const displayModelName = React.useMemo(() => {
        const parts = MODEL_ID.split('@');
        return parts.length > 1 ? parts[1].toUpperCase() : MODEL_ID.toUpperCase();
    }, []);

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

    const handleSend = async () => {
        const currentInput = input.trim();
        if (!currentInput || isStreaming || isSearching) return;
        
        // 1. UI Update: Add User Message
        setInput('');
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: currentInput, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        
        // 2. Prepare Assistant Message Placeholder for Retrieval
        const assistantMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, { 
            id: assistantMsgId, 
            role: 'assistant', 
            content: '', 
            searchQuery: currentInput, // Show searching state immediately
            timestamp: Date.now() 
        }]);
        setIsSearching(true);

        let accumulatedContent = '';
        let accumulatedReasoning = '';

        try {
            // 3. Ensure Session
            const activeSessionId = await ensureSession();
            
            // 4. Perform Vector Search (Explicit RAG)
            let retrievedItems: InfoItem[] = [];
            try {
                const searchRes = await searchSemanticSegments({
                    query_text: currentInput,
                    page: 1,
                    page_size: 6, // Retrieve top 6 relevant segments
                    similarity_threshold: 0.3
                });
                retrievedItems = searchRes.items || [];
            } catch (e) {
                console.error("Vector search failed", e);
            }

            // Update UI with search results
            setMessages(prev => prev.map(m => 
                m.id === assistantMsgId 
                ? { ...m, retrievedItems: retrievedItems } 
                : m
            ));
            setIsSearching(false);
            setIsStreaming(true);

            // 5. Construct Prompt with Context
            const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            
            const contextText = retrievedItems.length > 0
                ? retrievedItems.map((item, idx) => `[参考资料${idx + 1}] 标题: ${item.title}\n内容: ${item.content}`).join('\n\n')
                : "（知识库中未找到高度相关资料，请基于您的训练数据回答，但需告知用户资料库无相关信息）";

            const systemPrompt = `你是一个情报分析专家。当前日期: ${currentDate}。
请基于下方提供的【参考资料】回答用户的【问题】。
要求：
1. 答案必须基于参考资料，如果资料不足，请明确说明。
2. 引用资料时，可提及资料标题。
3. 保持客观、专业、简洁。
4. 严禁编造事实。`;

            // Prepare messages payload
            // Use current messages state directly (excluding the placeholders we just added)
            const historyMessages = messages.map(m => ({ role: m.role, content: m.content }));
            const currentMessagePayload = `【参考资料】\n${contextText}\n\n【问题】\n${currentInput}`;

            await streamChatCompletions({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...historyMessages,
                    { role: 'user', content: currentMessagePayload }
                ],
                stream: true,
                temperature: 0.2, // Low temperature for factual Q&A
                enable_billing: false // ⚡️ Disable billing as requested
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;
                
                // Update the placeholder assistant message
                setMessages(prev => prev.map(m => 
                    m.id === assistantMsgId 
                    ? { ...m, content: accumulatedContent, reasoning: accumulatedReasoning } 
                    : m
                ));
            }, undefined, (err) => {
                // Handle API error during streaming
                setMessages(prev => prev.map(m => 
                    m.id === assistantMsgId 
                    ? { ...m, content: accumulatedContent + `\n\n> *⚠️ 发生错误: ${err.message || '服务暂时不可用'}*` } 
                    : m
                ));
            }, activeSessionId || undefined, AGENTS.STRATEGIC_COPILOT);

        } catch (error: any) {
            setMessages(prev => prev.map(m => 
                m.id === assistantMsgId 
                ? { ...m, content: accumulatedContent + `\n\n> *⚠️ 初始化失败: ${error.message || '网络连接异常'}*` } 
                : m
            ));
        } finally {
            setIsStreaming(false);
            setIsSearching(false);
        }
    };

    const renderMessageContent = (content: string, isUser: boolean) => {
        if (!content) return null;
        
        const userProseClass = "prose prose-sm max-w-none text-white break-words prose-p:text-white prose-headings:text-white prose-strong:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white prose-a:text-indigo-200 hover:prose-a:text-white prose-code:text-white prose-blockquote:text-white/80";
        const aiProseClass = "prose prose-sm max-w-none text-slate-700 break-words prose-p:text-slate-700 prose-headings:text-slate-900 prose-strong:text-indigo-700 prose-a:text-indigo-600 prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50 prose-blockquote:px-3 prose-blockquote:py-1";

        try {
            return (
                <div 
                    className={isUser ? userProseClass : aiProseClass}
                    dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} 
                />
            );
        } catch (e) {
             return <div className={`whitespace-pre-wrap text-sm leading-relaxed break-words ${isUser ? 'text-white' : 'text-slate-700'}`}>{content}</div>;
        }
    };

    return (
        <div className={`flex flex-col h-full bg-white shadow-xl overflow-hidden ${className}`}>
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
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{displayModelName}</p>
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
                                    
                                    {/* Retrieval Process Block (Only Assistant) - NOW USING EXPLICIT RAG */}
                                    {!isUser && msg.searchQuery && (
                                        <RetrievedIntelligence 
                                            query={msg.searchQuery} 
                                            items={msg.retrievedItems || []} 
                                            isSearching={isLastAssistant && isSearching} 
                                            onClick={(item) => onReferenceClick && onReferenceClick(item)}
                                        />
                                    )}

                                    {/* Message Content */}
                                    <div className="relative break-words overflow-hidden">
                                        {renderMessageContent(msg.content, isUser)}
                                        
                                        {/* Loading Dots (Only if no content yet and not searching) */}
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
                               <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">RAG Mode</span>
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
