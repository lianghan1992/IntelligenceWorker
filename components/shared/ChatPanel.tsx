
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowRightIcon, RefreshIcon, UserIcon, SparklesIcon 
} from '../icons';
import { marked } from 'marked';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isThinking?: boolean;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isGenerating: boolean;
    placeholder?: string;
    title?: string;
}

export const SharedChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    onSendMessage, 
    isGenerating,
    placeholder = "输入指令...",
    title = "AI Copilot"
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom whenever messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isGenerating]);

    const handleSend = () => {
        if (!input.trim() || isGenerating) return;
        onSendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-600"/> {title}
                </h3>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar" ref={scrollRef}>
                {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                                {isUser ? <UserIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                            </div>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                                isUser 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                            }`}>
                                {isUser ? (
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                ) : (
                                    <div 
                                        className="prose prose-sm max-w-none text-slate-700 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-headings:text-slate-800"
                                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || '...') as string }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* Typing Indicator */}
                {isGenerating && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center flex-shrink-0 animate-pulse">
                            <SparklesIcon className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="bg-white border border-slate-100 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-2 shadow-sm">
                            <RefreshIcon className="w-4 h-4 animate-spin text-indigo-500"/>
                            <span className="text-xs font-bold text-indigo-900">AI 正在深度思考与规划...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
                <div className="relative">
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isGenerating} 
                        placeholder={placeholder}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-shadow"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isGenerating}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-slate-300 shadow-sm"
                    >
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 text-center">
                    AI生成内容可能存在误差，请核实后使用
                </div>
            </div>
        </div>
    );
};
