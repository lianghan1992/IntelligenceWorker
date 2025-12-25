
import React, { useState, useRef, useEffect } from 'react';
import { Message, WorkStage } from './types';
import { SparklesIcon, ArrowRightIcon, DocumentTextIcon, RefreshIcon } from '../../icons';

interface ChatPanelProps {
    messages: Message[];
    stage: WorkStage;
    onSendMessage: (text: string) => void;
    isStreaming: boolean;
    onSwitchToVisual: () => void;
    canSwitchToVisual: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    stage, 
    onSendMessage, 
    isStreaming, 
    onSwitchToVisual,
    canSwitchToVisual
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isStreaming) return;
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
        <div className="flex flex-col h-full bg-white border-r border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-sm font-bold text-slate-700">
                        {stage === 'analysis' ? '阶段一：深度分析' : '阶段二：视觉生成'}
                    </span>
                </div>
                {stage === 'analysis' && canSwitchToVisual && (
                    <button 
                        onClick={onSwitchToVisual}
                        disabled={isStreaming}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1 animate-in fade-in zoom-in"
                    >
                        <SparklesIcon className="w-3 h-3" /> 生成看板
                    </button>
                )}
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm px-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <DocumentTextIcon className="w-6 h-6" />
                        </div>
                        <p className="font-medium text-slate-600 mb-1">欢迎使用新技术四象限分析</p>
                        <p className="text-xs leading-relaxed">请输入您想分析的技术名称（如“固态电池”、“城市NOA”），AI 将为您生成深度报告。</p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-indigo-100 text-indigo-600'}`}>
                            {msg.role === 'user' ? <div className="w-4 h-4 bg-slate-400 rounded-full" /> : <SparklesIcon className="w-4 h-4" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-sm' 
                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                        }`}>
                            {msg.content || <span className="animate-pulse">...</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={stage === 'analysis' ? "输入技术名称，或提出修改意见..." : "描述视觉修改要求，例如 '换成深色科技风'..."}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 custom-scrollbar"
                        disabled={isStreaming}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isStreaming}
                        className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all"
                    >
                        {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
