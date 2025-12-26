
import React, { useState, useRef, useEffect } from 'react';
import { Message, WorkStage } from './types';
import { SparklesIcon, ArrowRightIcon, RefreshIcon, CloudIcon, PuzzleIcon, PhotoIcon, CloseIcon, DocumentTextIcon, CheckIcon, ViewGridIcon, GlobeIcon, LinkIcon, BrainIcon, ChevronDownIcon } from '../../icons';
import { KnowledgeSearchModal } from './KnowledgeSearchModal';
import { fetchJinaReader } from '../../../api/intelligence';

interface ChatPanelProps {
    messages: Message[];
    stage: WorkStage;
    onSendMessage: (text: string) => void;
    isStreaming: boolean;
    onSwitchToVisual: () => void;
    canSwitchToVisual: boolean;
    onPreview: () => void; 
}

interface Attachment {
    id: string;
    type: 'image' | 'file';
    content: string; 
    name: string;
    size: number;
    isTruncated?: boolean;
    tokenEstimate?: number;
}

const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    MAX_TEXT_CHARS: 50000, 
    MAX_TOKENS_PER_REQUEST: 100000,
    ALLOWED_TEXT_TYPES: ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/x-markdown'],
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

const estimateTokens = (text: string): number => {
    const len = text.length;
    return Math.ceil(len * 0.8);
};

// --- Sub-Component: Thinking Block ---
const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    if (!content) return null;

    return (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
                <BrainIcon className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span>深度思考过程 {isStreaming ? '...' : ''}</span>
                <ChevronDownIcon className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
                <div className="px-4 py-3 bg-white/50">
                    <div className="text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed opacity-90 break-words border-l-2 border-indigo-200 pl-3">
                        {content}
                        {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-indigo-500 animate-blink"></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Component: Message Bubble ---
const MessageBubble: React.FC<{ msg: Message; isStreaming: boolean; isLast: boolean; onPreview: () => void; stage: WorkStage }> = ({ msg, isStreaming, isLast, onPreview, stage }) => {
    const isGenerating = isStreaming && isLast;
    const shouldCollapseByDefault = !isGenerating && msg.content.length > 500;
    
    const [isExpanded, setIsExpanded] = useState(!shouldCollapseByDefault);

    useEffect(() => {
        if (!isGenerating && msg.content.length > 500) {
            setIsExpanded(false);
        } else {
            setIsExpanded(true);
        }
    }, [isGenerating, msg.content.length]);

    const isCodeMode = msg.role === 'assistant' && (msg.content.includes('```html') || msg.content.includes('<!DOCTYPE html>') || msg.content.trim().startsWith('<html'));

    return (
        <div className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-100' : 'bg-indigo-100 text-indigo-600 ring-4 ring-indigo-50'}`}>
                {msg.role === 'user' ? <div className="w-5 h-5 bg-slate-400 rounded-full" /> : <SparklesIcon className="w-5 h-5" />}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
                msg.role === 'user' 
                    ? 'bg-slate-800 text-white rounded-tr-sm p-5' 
                    : isCodeMode 
                        ? 'bg-[#1e1e1e] text-slate-300 border border-slate-700 rounded-tl-sm shadow-xl' 
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-md p-5'
            }`}>
                
                {msg.role === 'assistant' && msg.reasoning && (
                    <div className={isCodeMode ? "p-4 border-b border-white/10 bg-white/5" : ""}>
                        <ThinkingBlock content={msg.reasoning} isStreaming={isGenerating} />
                    </div>
                )}

                <div className={`${isCodeMode ? 'p-5 font-mono text-sm' : 'text-sm leading-relaxed'}`}>
                    <div className={`whitespace-pre-wrap break-words ${!isExpanded ? 'max-h-60 overflow-hidden relative' : ''}`}>
                        {msg.content || (msg.reasoning ? '' : <span className="animate-pulse">...</span>)}
                        {!isExpanded && (
                            <div className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t ${isCodeMode ? 'from-[#1e1e1e]' : 'from-white'} to-transparent`} />
                        )}
                    </div>

                    {msg.content.length > 500 && !isGenerating && (
                        <div className="mt-3 flex justify-center">
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all ${
                                    isCodeMode 
                                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                            >
                                {isExpanded ? '收起内容' : '展开完整内容'}
                            </button>
                        </div>
                    )}
                </div>
                
                {msg.role === 'assistant' && !isGenerating && msg.content.length > 0 && (
                    <div className={`px-5 py-3 border-t flex gap-2 ${isCodeMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                            <button onClick={onPreview} className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">
                            <ViewGridIcon className="w-4 h-4" />
                            {stage === 'analysis' ? '预览报告文档' : '查看渲染效果'}
                            </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Web Fetch Modal ---
const WebFetchModal: React.FC<{ isOpen: boolean; onClose: () => void; onFetch: (urls: string[]) => void }> = ({ isOpen, onClose, onFetch }) => {
    const [text, setText] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    
    if (!isOpen) return null;

    const handleStart = () => {
        // Split by newlines or comma, clean whitespace, filter empty
        const urls = text.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length === 0) return;
        
        onFetch(urls);
        onClose();
        setText('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <GlobeIcon className="w-5 h-5 text-indigo-600"/> 抓取网页内容 (支持批量)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="输入 URL，每行一个。例如:&#10;https://example.com/article1&#10;https://example.com/article2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4 h-32 resize-none"
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold hover:bg-slate-200">取消</button>
                    <button 
                        onClick={handleStart} 
                        disabled={!text.trim()}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md disabled:opacity-50"
                    >
                        开始抓取
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    stage, 
    onSendMessage, 
    isStreaming, 
    onSwitchToVisual,
    canSwitchToVisual,
    onPreview
}) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [processingWeb, setProcessingWeb] = useState(false);
    
    // Modals
    const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
    const [isWebModalOpen, setIsWebModalOpen] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;
            if (isNearBottom || isStreaming) {
                scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages, isStreaming]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Mock processing for UI feedback
        const newAttachment: Attachment = {
            id: crypto.randomUUID(),
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            size: file.size,
            content: URL.createObjectURL(file), // Just for preview
            tokenEstimate: 100
        };
        setAttachments([...attachments, newAttachment]);
        e.target.value = ''; // Reset input
    };
    
    const handleWebFetch = async (urls: string[]) => {
        setProcessingWeb(true);
        try {
            // Fetch one by one to avoid overwhelming or handle errors gracefully per item
            for (const url of urls) {
                try {
                    const markdown = await fetchJinaReader(url);
                    const newAttachment: Attachment = {
                        id: crypto.randomUUID(),
                        type: 'file',
                        name: `Web: ${url}`,
                        size: markdown.length,
                        content: markdown,
                        tokenEstimate: estimateTokens(markdown)
                    };
                    setAttachments(prev => [...prev, newAttachment]);
                } catch (error) {
                    console.error(`Failed to fetch ${url}`, error);
                    // Optionally notify user
                    const errAttachment: Attachment = {
                        id: crypto.randomUUID(),
                        type: 'file',
                        name: `Error: ${url}`,
                        size: 0,
                        content: `[Fetch Failed: ${error}]`,
                        tokenEstimate: 0
                    };
                    setAttachments(prev => [...prev, errAttachment]);
                }
            }
        } finally {
            setProcessingWeb(false);
        }
    };

    const handleKnowledgeSelect = (items: { content: string, title: string }[]) => {
        const newAttachments = items.map(item => ({
            id: crypto.randomUUID(),
            type: 'file' as const,
            name: `Ref: ${item.title}`,
            size: item.content.length,
            content: item.content,
            tokenEstimate: estimateTokens(item.content)
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
        setIsKnowledgeModalOpen(false);
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleSend = () => {
        if ((!input.trim() && attachments.length === 0) || isStreaming) return;
        
        let finalMessage = input;
        if (attachments.length > 0) {
            const attachmentText = attachments.map(a => `[附件: ${a.name}]\n${a.content}`).join('\n\n');
            finalMessage = `${input}\n\n---\n${attachmentText}`;
        }
        
        onSendMessage(finalMessage);
        setInput('');
        setAttachments([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {isStreaming ? 'AI Thinking...' : 'Ready'}
                    </span>
                </div>
                {stage === 'analysis' && canSwitchToVisual && (
                    <button onClick={onSwitchToVisual} disabled={isStreaming} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 animate-in fade-in zoom-in">
                        <SparklesIcon className="w-3.5 h-3.5" /> 生成看板
                    </button>
                )}
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-slate-50/30" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm px-8 pb-20">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner ring-1 ring-indigo-50">
                            <SparklesIcon className="w-10 h-10" />
                        </div>
                        <p className="font-bold text-slate-700 text-xl mb-3">新技术四象限分析</p>
                        <p className="text-center leading-relaxed text-slate-500 max-w-md">
                            请输入您想分析的技术名称（如“固态电池”、“端到端大模型”）。<br/>
                            AI 将为您深度剖析技术原理、商业价值与竞争格局。
                        </p>
                    </div>
                )}
                
                {messages.map((msg, index) => (
                    <MessageBubble 
                        key={msg.id} 
                        msg={msg} 
                        isStreaming={isStreaming} 
                        isLast={index === messages.length - 1} 
                        onPreview={onPreview}
                        stage={stage}
                    />
                ))}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] z-20">
                 {/* Toolbar */}
                 <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <button 
                        onClick={() => imageInputRef.current?.click()} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="上传图片"
                    >
                        <PhotoIcon className="w-5 h-5"/>
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="上传文件"
                    >
                        <CloudIcon className="w-5 h-5"/>
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <button 
                        onClick={() => setIsWebModalOpen(true)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="抓取网页 (Jina Reader)"
                    >
                        {processingWeb ? <RefreshIcon className="w-5 h-5 animate-spin text-indigo-600"/> : <GlobeIcon className="w-5 h-5"/>}
                    </button>
                    <button 
                        onClick={() => setIsKnowledgeModalOpen(true)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="引用知识库"
                    >
                        <PuzzleIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* Attachment Previews */}
                {attachments.length > 0 && (
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto custom-scrollbar">
                        {attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 flex-shrink-0">
                                {att.type === 'image' ? <PhotoIcon className="w-3.5 h-3.5"/> : <DocumentTextIcon className="w-3.5 h-3.5"/>}
                                <span className="max-w-[150px] truncate">{att.name}</span>
                                <button onClick={() => removeAttachment(att.id)} className="ml-1 text-slate-400 hover:text-red-500">
                                    <CloseIcon className="w-3.5 h-3.5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative px-4 pb-4">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={stage === 'analysis' ? "输入技术名称，开始分析... (AI会基于上文完整内容进行修改)" : "描述修改要求... (AI会重写完整代码)"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-14 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 custom-scrollbar transition-shadow shadow-inner focus:bg-white placeholder:text-slate-400"
                        disabled={isStreaming}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={(!input.trim() && attachments.length === 0) || isStreaming}
                        className="absolute right-6 bottom-6 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95"
                    >
                        {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>

                {/* Hidden Inputs */}
                <input type="file" ref={imageInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt,.md,.doc,.docx" className="hidden" />
            </div>
            
            {/* Modals */}
            <KnowledgeSearchModal isOpen={isKnowledgeModalOpen} onClose={() => setIsKnowledgeModalOpen(false)} onSelect={handleKnowledgeSelect} />
            <WebFetchModal isOpen={isWebModalOpen} onClose={() => setIsWebModalOpen(false)} onFetch={handleWebFetch} />
        </div>
    );
};
