
import React, { useState, useRef, useEffect } from 'react';
import { Message, WorkStage } from './types';
import { SparklesIcon, ArrowRightIcon, DocumentTextIcon, RefreshIcon, CloudIcon, PuzzleIcon, PhotoIcon } from '../../icons';

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

    // Toolbar Handlers (Mock functionality for UI demo)
    const handleInsertContext = (text: string) => {
        setInput(prev => prev + (prev ? '\n' : '') + `[引用: ${text}] `);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header / StatusBar */}
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {isStreaming ? 'AI Generating...' : 'Ready'}
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
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-white" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm px-8 pb-20">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <SparklesIcon className="w-8 h-8" />
                        </div>
                        <p className="font-bold text-slate-700 text-lg mb-2">新技术四象限分析</p>
                        <p className="text-center leading-relaxed text-slate-500">
                            请输入您想分析的技术名称（如“固态电池”、“端到端大模型”）。<br/>
                            AI 将为您自动生成深度研报。
                        </p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-100' : 'bg-indigo-100 text-indigo-600'}`}>
                            {msg.role === 'user' ? <div className="w-4 h-4 bg-slate-400 rounded-full" /> : <SparklesIcon className="w-4 h-4" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-sm' 
                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                        }`}>
                            <div className="whitespace-pre-wrap">{msg.content || <span className="animate-pulse">...</span>}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area with Toolbar */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
                {/* Toolbar */}
                <div className="flex items-center gap-2 mb-3 px-1">
                    <button 
                        onClick={() => handleInsertContext("已上传: 技术白皮书.pdf")} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200"
                        title="上传参考文档"
                    >
                        <CloudIcon className="w-3.5 h-3.5" /> 上传
                    </button>
                    <button 
                        onClick={() => handleInsertContext("引用: 向量知识库-固态电池最新进展")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200"
                        title="引用知识库内容"
                    >
                        <PuzzleIcon className="w-3.5 h-3.5" /> 知识库
                    </button>
                    <button 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200"
                        title="上传图片"
                    >
                        <PhotoIcon className="w-3.5 h-3.5" /> 图片
                    </button>
                </div>

                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={stage === 'analysis' ? "输入技术名称，开始分析..." : "描述修改要求，如 '换成深色科技风'..."}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 custom-scrollbar transition-shadow shadow-inner focus:bg-white"
                        disabled={isStreaming}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isStreaming}
                        className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95"
                    >
                        {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
