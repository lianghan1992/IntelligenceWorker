
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, StepId } from './types';
import { ArrowRightIcon, RefreshIcon, UserIcon, SparklesIcon, CheckCircleIcon } from '../../../icons';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isGenerating: boolean;
    currentStep: StepId;
    stepStatus: 'pending' | 'generating' | 'review' | 'done';
    onConfirmStep: () => void;
    onRegenerateStep: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, onSendMessage, isGenerating, currentStep, stepStatus, onConfirmStep, onRegenerateStep 
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isGenerating]);

    const handleSend = () => {
        if (!input.trim()) return;
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
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-600"/> 评估助手 Copilot
                </h3>
                <div className="text-xs text-slate-400 font-mono uppercase tracking-wide">
                    {currentStep.toUpperCase()} PHASE
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar" ref={scrollRef}>
                {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                {isUser ? <UserIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                            </div>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                isUser 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'
                            }`}>
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        </div>
                    );
                })}
                {isGenerating && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                            <SparklesIcon className="w-4 h-4" />
                        </div>
                        <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-2">
                            <RefreshIcon className="w-4 h-4 animate-spin"/>
                            AI 正在思考与生成...
                        </div>
                    </div>
                )}
            </div>

            {/* Actions / Input */}
            <div className="p-4 border-t border-slate-100 bg-white">
                {stepStatus === 'review' ? (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100 mb-2">
                            <strong>当前阶段生成完毕。</strong> 请检查左侧报告内容，您可以直接输入修改意见让 AI 调整，或点击确认进入下一阶段。
                        </div>
                        <div className="flex gap-3">
                             <button 
                                onClick={onConfirmStep}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold shadow-md hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5"/> 确认并继续
                            </button>
                             <button 
                                onClick={onRegenerateStep}
                                className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                                title="完全重新生成本节"
                            >
                                <RefreshIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入修改意见 (e.g. 补充一下竞品特斯拉的参数)..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-slate-300"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isGenerating || stepStatus === 'done'} // Disable input if generating or all done
                            placeholder={currentStep === 'init' ? "输入要评估的技术名称..." : "输入指令..."}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isGenerating}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-slate-300"
                        >
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
