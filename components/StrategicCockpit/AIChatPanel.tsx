
import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletions, createSession } from '../../api/stratify';
import { searchSemanticSegments } from '../../api/intelligence';
import { SparklesIcon, ArrowRightIcon, BrainIcon, ChevronDownIcon, UserIcon, RefreshIcon, CheckCircleIcon, DatabaseIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';
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

const MODEL_ID = "zhipu@glm-4-flash";

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
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100/50 transition-colors select-none bg-indigo-50/50"
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
    if ((!query && !isSearching)) return null;
    const itemCount = items ? items.length : 0;

    return (
        <div className="mb-4 rounded-xl border border-blue-100 bg-white overflow-hidden animate-in fade-in slide-in-from-top-2 shadow-sm max-w-full">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-blue-700 bg-blue-50/50 hover:bg-blue-50 transition-colors select-none"
            >
                {isSearching ? <RefreshIcon className="w-3.5 h-3.5 animate-spin text-blue-600 flex-shrink-0" /> : <DatabaseIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                <span className="flex-1 text-left truncate min-w-0">
                    {isSearching ? `检索中: "${query}"` : `已检索到 ${itemCount} 条情报`}
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
                             <span className="text-[10px] font-bold opacity-80 animate-pulse">正在扫描知识库...</span>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-slim-scrollbar pr-1">
                            {items.length > 0 ? items.map((item, idx) => (
                                <div 
                                    key={item.id || idx} 
                                    onClick={() => onClick(item)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center font-mono border border-blue-100">
                                            {idx + 1}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-800 truncate flex-1 group-hover:text-blue-700 min-w-0 font-serif">{item.title}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed pl-6 opacity-90 group-hover:opacity-100 font-serif">
                                        {item.content}
                                    </p>
                                </div>
                            )) : (
                                <div className="py-3 text-center text-xs text-slate-400 italic">知识库中未找到相关内容</div>
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
    isExpanded?: boolean;
    onToggle?: () => void;
    hideToggle?: boolean;
}> = ({ className, onReferenceClick, isExpanded = true, onToggle, hideToggle = false }) => {
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const [messages, setMessages] = useState<Message[]>(() => {
        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        return [{ 
            id: 'init', 
            role: 'assistant', 
            content: `我是您的 **AI Copilot**。\n📅 今天是 **${today}**。\n\n我专注于智能汽车领域的垂直情报分析，会自动检索知识库为您解答。`, 
            timestamp: Date.now() 
        }];
    });

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    useEffect(() => {
        if (isExpanded) scrollToBottom();
    }, [messages, isStreaming, isSearching, isExpanded]);

    const ensureSession = async () => {
        if (sessionId) return sessionId;
        try {
            const sess = await createSession(AGENTS.STRATEGIC_COPILOT, 'Copilot Chat');
            setSessionId(sess.id);
            return sess.id;
        } catch (e) { return null; }
    };

    const handleSend = async () => {
        const currentInput = input.trim();
        if (!currentInput || isStreaming || isSearching) return;
        
        setInput('');
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: currentInput, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        
        const assistantMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', searchQuery: currentInput, timestamp: Date.now() }]);
        setIsSearching(true);

        let accumulatedContent = '';
        let accumulatedReasoning = '';

        try {
            const activeSessionId = await ensureSession();
            let retrievedItems: InfoItem[] = [];
            try {
                const searchRes = await searchSemanticSegments({ query_text: currentInput, page: 1, page_size: 6, similarity_threshold: 0.3 });
                retrievedItems = searchRes.items || [];
            } catch (e) { console.error(e); }

            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, retrievedItems: retrievedItems } : m));
            setIsSearching(false);
            setIsStreaming(true);

            const contextText = retrievedItems.length > 0
                ? retrievedItems.map((item, idx) => `[资料${idx + 1}] ${item.title}: ${item.content}`).join('\n\n')
                : "（未找到直接相关资料，请基于已有知识库回答）";

            // Fix: Replace undefined variable 'currentMessagePayload' with 'currentInput'
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: `你是一个情报分析专家。请基于资料库回答问题。资料库内容：\n${contextText}` },
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                    { role: 'user', content: currentInput }
                ],
                stream: true,
                temperature: 0.2,
                enable_billing: false
            }, (chunk) => {
                if (chunk.reasoning) accumulatedReasoning += chunk.reasoning;
                if (chunk.content) accumulatedContent += chunk.content;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent, reasoning: accumulatedReasoning } : m));
            }, undefined, (err) => {
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent + `\n\n> *⚠️ 发生错误: ${err.message}*` } : m));
            }, activeSessionId || undefined, AGENTS.STRATEGIC_COPILOT);

        } catch (error: any) {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `⚠️ 连接异常: ${error.message}` } : m));
        } finally {
            setIsStreaming(false);
            setIsSearching(false);
        }
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
                    <span className="[writing-mode:vertical-lr] text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] select-none">
                        AI COPILOT ASSISTANT
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
        <div className={`flex flex-col h-full bg-white shadow-xl overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-right-4 ${className}`}>
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
                        <h3 className="text-base font-black text-slate-800 tracking-tight">AI Copilot</h3>
                        {/* Hidden Model Name as requested */}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSearching && (
                        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 animate-pulse">
                            <span className="text-[10px] font-bold text-blue-600">检索中</span>
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
                    const isUser = msg.role === 'user';
                    const isLastAssistant = !isUser && idx === messages.length - 1;
                    return (
                        <div key={msg.id} className={`flex gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-full`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${isUser ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-slate-200'}`}>
                                {isUser ? <UserIcon className="w-4 h-4"/> : <SparklesIcon className="w-4 h-4"/>}
                            </div>
                            <div className={`flex flex-col max-w-[88%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-4 rounded-2xl shadow-sm border transition-all duration-200 w-full ${isUser ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-transparent text-white rounded-tr-sm shadow-indigo-100' : 'bg-white border-slate-100 text-slate-800 rounded-tl-sm'}`}>
                                    {msg.reasoning && <ThinkingBlock content={msg.reasoning} isStreaming={isStreaming && isLastAssistant} />}
                                    {!isUser && msg.searchQuery && <RetrievedIntelligence query={msg.searchQuery} items={msg.retrievedItems || []} isSearching={isLastAssistant && isSearching} onClick={(item) => onReferenceClick && onReferenceClick(item)} />}
                                    <div className="relative break-words overflow-hidden">{renderMessageContent(msg.content, isUser)}</div>
                                </div>
                                <span className="mt-1.5 text-[10px] text-slate-300 font-medium px-1">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
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
                        disabled={isStreaming || isSearching}
                    />
                    <div className="flex justify-between items-center px-2 pb-2">
                        <div className="flex items-center gap-1 px-2 py-0.5">
                           <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RAG Mode Active</span>
                        </div>
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming || isSearching}
                            className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${input.trim() && !isStreaming && !isSearching ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}
                        >
                            {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
