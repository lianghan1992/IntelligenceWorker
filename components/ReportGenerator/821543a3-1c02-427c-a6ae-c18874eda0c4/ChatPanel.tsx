
import React, { useState, useRef, useEffect } from 'react';
import { Message, WorkStage } from './types';
import { SparklesIcon, ArrowRightIcon, RefreshIcon, CloudIcon, PuzzleIcon, PhotoIcon, CloseIcon, DocumentTextIcon, CheckIcon, ViewGridIcon, GlobeIcon, LinkIcon, BrainIcon, ChevronDownIcon, EyeIcon } from '../../icons';
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
    type: 'image' | 'file' | 'web';
    content: string; 
    name: string;
    size: number;
    isTruncated?: boolean;
    tokenEstimate?: number;
    url?: string;
}

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
    const isUser = msg.role === 'user';

    // UI aligned with fixed requirements
    const bubbleStyle = isUser 
        ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tr-sm p-5 shadow-sm'
        : isCodeMode 
            ? 'bg-[#1e1e1e] text-slate-300 border border-slate-700 rounded-tl-sm shadow-xl p-5'
            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-md p-5';
            
    const gradientFrom = isUser ? 'from-indigo-50' : (isCodeMode ? 'from-[#1e1e1e]' : 'from-white');

    return (
        <div className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${isUser ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 ring-1 ring-slate-100'}`}>
                {isUser ? <div className="w-5 h-5 bg-white/20 rounded-full" /> : <SparklesIcon className="w-5 h-5" />}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl overflow-hidden transition-all duration-300 ${bubbleStyle}`}>
                
                {msg.role === 'assistant' && msg.reasoning && (
                    <div className={isCodeMode ? "p-4 border-b border-white/10 bg-white/5" : ""}>
                        <ThinkingBlock content={msg.reasoning} isStreaming={isGenerating} />
                    </div>
                )}

                <div className={`${isCodeMode ? 'font-mono text-sm' : 'text-sm leading-relaxed'}`}>
                    <div className={`whitespace-pre-wrap break-words ${!isExpanded ? 'max-h-60 overflow-hidden relative' : ''}`}>
                        {msg.content || (msg.reasoning ? '' : <span className="animate-pulse">...</span>)}
                        {!isExpanded && (
                            <div className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t ${gradientFrom} to-transparent`} />
                        )}
                    </div>

                    {msg.content.length > 500 && !isGenerating && (
                        <div className="mt-3 flex justify-center">
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all ${
                                    isCodeMode 
                                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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
interface FetchItem {
    id: string;
    url: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    content?: string;
    errorMsg?: string;
}

const WebFetchModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (items: Attachment[]) => void }> = ({ isOpen, onClose, onConfirm }) => {
    const [urlInput, setUrlInput] = useState('');
    const [items, setItems] = useState<FetchItem[]>([]);
    const [previewItemId, setPreviewItemId] = useState<string | null>(null);
    
    useEffect(() => {
        const pendingItems = items.filter(i => i.status === 'pending');
        if (pendingItems.length === 0) return;

        pendingItems.forEach(async (item) => {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'loading' } : i));
            try {
                const markdown = await fetchJinaReader(item.url);
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', content: markdown } : i));
            } catch (error: any) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: error.message } : i));
            }
        });
    }, [items]);

    const handleAddUrls = () => {
        const urls = urlInput.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length === 0) return;
        
        const newItems: FetchItem[] = urls.map(url => ({
            id: crypto.randomUUID(),
            url,
            status: 'pending'
        }));
        
        setItems(prev => [...prev, ...newItems]);
        setUrlInput('');
    };

    const handleConfirm = () => {
        const successItems = items.filter(i => i.status === 'success' && i.content);
        const attachments: Attachment[] = successItems.map(item => ({
            id: item.id,
            type: 'web',
            name: `Web: ${item.url}`,
            url: item.url,
            content: item.content!,
            size: item.content!.length,
            tokenEstimate: estimateTokens(item.content!)
        }));
        onConfirm(attachments);
        onClose();
        setItems([]);
        setPreviewItemId(null);
    };

    if (!isOpen) return null;
    const activePreviewItem = items.find(i => i.id === previewItemId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <GlobeIcon className="w-6 h-6 text-indigo-600"/> 抓取网页内容
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full"><CloseIcon className="w-6 h-6"/></button>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                    <div className={`flex-1 flex flex-col p-6 border-r border-gray-100 ${activePreviewItem ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
                        <div className="mb-4">
                            <textarea
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                placeholder="输入 URL，每行一个。例如:&#10;https://example.com/article1"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none mb-3"
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddUrls();
                                    }
                                }}
                            />
                            <button 
                                onClick={handleAddUrls}
                                disabled={!urlInput.trim()}
                                className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors text-sm"
                            >
                                添加到抓取队列
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {items.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">暂无抓取任务</div>}
                            {items.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                    <div className="flex-1 min-w-0 mr-3">
                                        <div className="text-xs font-mono text-slate-500 truncate" title={item.url}>{item.url}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {item.status === 'loading' && <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 抓取中...</span>}
                                            {item.status === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckIcon className="w-3 h-3"/> 成功 ({estimateTokens(item.content || '')} tokens)</span>}
                                            {item.status === 'error' && <span className="text-xs text-red-500 flex items-center gap-1"><CloseIcon className="w-3 h-3"/> 失败</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {item.status === 'success' && (
                                            <button onClick={() => setPreviewItemId(item.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="预览/编辑内容"><EyeIcon className="w-4 h-4"/></button>
                                        )}
                                        <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><CloseIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {activePreviewItem && (
                        <div className="flex-1 p-6 bg-slate-50 overflow-hidden flex flex-col md:w-1/2 absolute md:static inset-0 z-20">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-700">内容预览与编辑 (Markdown)</h4>
                                <button onClick={() => setPreviewItemId(null)} className="text-slate-500 hover:text-slate-800 md:hidden">关闭</button>
                            </div>
                            <div className="flex-1 overflow-hidden bg-white rounded-xl border border-slate-200 shadow-inner">
                                <textarea 
                                    className="w-full h-full p-4 resize-none outline-none text-xs text-slate-600 font-mono leading-relaxed custom-scrollbar"
                                    value={activePreviewItem.content || ''}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setItems(prev => prev.map(i => i.id === activePreviewItem.id ? { ...i, content: newVal } : i));
                                    }}
                                />
                            </div>
                            <div className="mt-2 text-right">
                                <span className="text-[10px] text-slate-400">支持实时编辑，确认引用后生效</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-100">关闭</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={items.filter(i => i.status === 'success').length === 0}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        确认引用 ({items.filter(i => i.status === 'success').length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, stage, onSendMessage, isStreaming, onSwitchToVisual, canSwitchToVisual, onPreview
}) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
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
        const newAttachment: Attachment = {
            id: crypto.randomUUID(),
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            size: file.size,
            content: URL.createObjectURL(file), 
            tokenEstimate: 100
        };
        setAttachments([...attachments, newAttachment]);
        e.target.value = ''; 
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

    const handleSend = () => {
        if ((!input.trim() && attachments.length === 0) || isStreaming) return;
        let finalMessage = input;
        if (attachments.length > 0) {
            const extraMaterials = attachments.map((a, idx) => {
                const source = a.url ? `(来源: ${a.url})` : `(来源: ${a.name})`;
                return `--- 材料 ${idx + 1} ${source} ---\n${a.content}\n`;
            }).join('\n');
            finalMessage += `\n\n================================================================\n【系统提示：以下是用户提供的额外参考材料，请重点基于这些材料进行分析】\n================================================================\n\n${extraMaterials}`;
        }
        onSendMessage(finalMessage);
        setInput('');
        setAttachments([]);
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{isStreaming ? 'AI Thinking...' : 'Ready'}</span>
                </div>
                {stage === 'analysis' && canSwitchToVisual && (
                    <button onClick={onSwitchToVisual} disabled={isStreaming} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 animate-in fade-in zoom-in">
                        <SparklesIcon className="w-3.5 h-3.5" /> 生成看板
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-slate-50/30" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm px-8 pb-20">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner ring-1 ring-indigo-50">
                            <SparklesIcon className="w-10 h-10" />
                        </div>
                        <p className="font-bold text-slate-700 text-xl mb-3">新技术评估专家 (Gemini)</p>
                        <p className="text-center text-slate-500 max-w-md">请输入您想分析的技术名称。您可以上传相关文档或抓取网页作为参考材料。</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <MessageBubble key={msg.id} msg={msg} isStreaming={isStreaming} isLast={index === messages.length - 1} onPreview={onPreview} stage={stage} />
                ))}
            </div>

            <div className="bg-white border-t border-slate-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] z-20">
                 <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <button onClick={() => imageInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><PhotoIcon className="w-5 h-5"/></button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><CloudIcon className="w-5 h-5"/></button>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <button onClick={() => setIsWebModalOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><GlobeIcon className="w-5 h-5"/></button>
                    <button onClick={() => setIsKnowledgeModalOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><PuzzleIcon className="w-5 h-5"/></button>
                </div>

                {attachments.length > 0 && (
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto custom-scrollbar">
                        {attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 flex-shrink-0 animate-in zoom-in">
                                {att.type === 'image' ? <PhotoIcon className="w-3.5 h-3.5"/> : att.type === 'web' ? <GlobeIcon className="w-3.5 h-3.5 text-blue-500"/> : <DocumentTextIcon className="w-3.5 h-3.5"/>}
                                <span className="max-w-[150px] truncate">{att.name}</span>
                                <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="ml-1 text-slate-400 hover:text-red-500"><CloseIcon className="w-3.5 h-3.5"/></button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative px-4 pb-4">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder={stage === 'analysis' ? "输入技术名称，开始分析..." : "描述修改要求..."}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-14 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 custom-scrollbar transition-shadow shadow-inner focus:bg-white placeholder:text-slate-400"
                        disabled={isStreaming}
                    />
                    <button onClick={handleSend} disabled={(!input.trim() && attachments.length === 0) || isStreaming} className="absolute right-6 bottom-6 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95">
                        {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>
                <input type="file" ref={imageInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt,.md,.doc,.docx" className="hidden" />
            </div>
            
            <KnowledgeSearchModal isOpen={isKnowledgeModalOpen} onClose={() => setIsKnowledgeModalOpen(false)} onSelect={handleKnowledgeSelect} />
            <WebFetchModal isOpen={isWebModalOpen} onClose={() => setIsWebModalOpen(false)} onConfirm={items => setAttachments(prev => [...prev, ...items])} />
        </div>
    );
};
