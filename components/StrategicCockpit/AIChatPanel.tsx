
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

export const AIChatPanel: React.FC<{ 
    onReferenceClick?: (article: InfoItem) => void;
}> = ({ onReferenceClick }) => {
    const [input, setInput] = useState('');
    
    const [messages, setMessages] = useState<Message[]>(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        return [{ 
            id: 'init', 
            role: 'assistant', 
            content: `This is your **AI Intelligence Copilot**.\n🗓️ Today is ${today}.\n\nI can help you deep dive into automotive industry trends, perform real-time retrieval, and generate long-text summaries.`, 
            timestamp: Date.now() 
        }];
    });

    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
             messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;
        
        const currentInput = input.trim();
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: currentInput, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsStreaming(true);

        const currentHistory = [...messages, userMsg];
        const currentDate = new Date().toISOString();
        
        const systemPrompt = `You are Auto Insight Copilot. Current Date: ${currentDate}. Answer concisely and professionally.`;

        let accumulatedContent = '';

        try {
            await streamChatCompletions({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...currentHistory.map(m => ({ role: m.role, content: m.content }))
                ],
                stream: true
            }, (chunk) => {
                if (chunk.content) accumulatedContent += chunk.content;
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...last, content: accumulatedContent }];
                    } else {
                        return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: accumulatedContent, timestamp: Date.now() }];
                    }
                });
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsStreaming(false);
        }
    };

    const renderMessageContent = (content: string, isUser: boolean) => {
        if (!content) return null;
        if (window.marked && typeof window.marked.parse === 'function') {
            return (
                <div 
                    className={`prose prose-sm max-w-none ${isUser ? 'text-white prose-p:text-white prose-strong:text-white' : 'text-slate-700 dark:text-slate-200'}`}
                    dangerouslySetInnerHTML={{ __html: window.marked.parse(content) }} 
                />
            );
        }
        return <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>;
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200 z-10">
            {/* Reference Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-900">AI Copilot</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Grounded Intelligence</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F8FAFC] scroll-smooth">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${isUser ? 'bg-slate-200 overflow-hidden' : 'bg-indigo-100 text-indigo-600'}`}>
                                {isUser ? (
                                    <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500"><UserIcon className="w-4 h-4"/></div>
                                ) : (
                                    <SparklesIcon className="w-4 h-4" />
                                )}
                            </div>
                            
                            {/* Bubble */}
                            <div className="flex-1 flex flex-col space-y-1">
                                <div className={`
                                    p-4 rounded-2xl shadow-sm text-sm leading-relaxed border
                                    ${isUser 
                                        ? 'bg-[#4F46E5] text-white rounded-tr-none border-transparent' 
                                        : 'bg-white border-slate-100 rounded-tl-none text-slate-700'
                                    }
                                `}>
                                    {renderMessageContent(msg.content, isUser)}
                                </div>
                                <span className={`text-[10px] text-slate-400 ${isUser ? 'text-right' : 'text-left'} ml-1`}>
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Reference Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative">
                    <textarea 
                        className="w-full pl-4 pr-12 py-3 text-sm bg-slate-100 border-none rounded-2xl resize-none focus:ring-2 focus:ring-indigo-600/50 text-slate-800 placeholder-slate-400 outline-none" 
                        placeholder="Ask anything about the auto industry..." 
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={isStreaming}
                    ></textarea>
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isStreaming}
                        className="absolute right-2 bottom-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none"
                    >
                        {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>
                <div className="flex items-center gap-2 mt-3 justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Guard Ready</span>
                </div>
            </div>
        </div>
    );
};
