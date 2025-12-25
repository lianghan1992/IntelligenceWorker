
import React, { useState, useRef, useEffect } from 'react';
import { Message, WorkStage } from './types';
import { SparklesIcon, ArrowRightIcon, RefreshIcon, CloudIcon, PuzzleIcon, PhotoIcon, CloseIcon, DocumentTextIcon, CheckIcon, ViewGridIcon, GlobeIcon, LinkIcon, BrainIcon, ChevronDownIcon } from '../../icons';
import { KnowledgeSearchModal } from './KnowledgeSearchModal';

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
    content: string; // Base64 for image, Text string for file
    name: string;
    size: number;
    isTruncated?: boolean;
    tokenEstimate?: number; // Estimated token count
}

// 限制配置 & Token 估算
const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_TEXT_CHARS: 50000, // 文本文件最大提取字符数
    MAX_TOKENS_PER_REQUEST: 100000, // 上下文安全水位，粗略估计
    ALLOWED_TEXT_TYPES: ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/x-markdown'],
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

// 简单的 Token 估算器 (1中文 ~ 1 token, 1英文单词 ~ 0.75 token)
const estimateTokens = (text: string): number => {
    const len = text.length;
    // 粗略算法：假设平均 1 字符 = 0.8 token (混合中英文环境)
    return Math.ceil(len * 0.8);
};

// --- Sub-Component: Thinking Block ---
const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(true); // 默认展开，让用户看到正在思考
    
    // 如果思考过程很长且结束了，可以自动收起（可选逻辑，这里暂时保持手动控制）
    
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

// --- Sub-Component: Web Fetch Modal ---
interface WebFetchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (content: string, urlCount: number) => void;
}

const WebFetchModal: React.FC<WebFetchModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [urls, setUrls] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);

    const fetchWithConcurrency = async (urlList: string[], limit: number) => {
        const results: string[] = [];
        let executing: Promise<void>[] = [];
        let completed = 0;

        setProgress({ current: 0, total: urlList.length });

        const fetchSingle = async (url: string) => {
            try {
                const jinaUrl = `https://r.jina.ai/${url}`;
                const response = await fetch(jinaUrl, { headers: { 'X-No-Cache': 'true' } });
                if (!response.ok) throw new Error(`Status ${response.status}`);
                const text = await response.text();
                results.push(`\n\n--- 网页来源: ${url} ---\n\n${text}\n`);
            } catch (e: any) {
                results.push(`\n\n--- 网页来源: ${url} ---\n[抓取失败: ${e.message}]\n`);
            } finally {
                completed++;
                setProgress(prev => ({ ...prev, current: completed }));
            }
        };

        for (const url of urlList) {
            const p = fetchSingle(url);
            executing.push(p);
            const cleanup = () => { executing = executing.filter(e => e !== p); };
            p.then(cleanup).catch(cleanup);
            if (executing.length >= limit) await Promise.race(executing);
        }
        await Promise.all(executing);
        return results.join('\n');
    };

    const handleFetch = async () => {
        const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
        if (urlList.length === 0) return;
        setIsFetching(true);
        setError(null);
        try {
            const combinedContent = await fetchWithConcurrency(urlList, 10);
            onSuccess(combinedContent, urlList.length);
            setUrls('');
            onClose();
        } catch (e: any) {
            setError(e.message || "抓取过程发生错误");
        } finally {
            setIsFetching(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] transition-opacity duration-300" onClick={() => !isFetching && onClose()}></div>
            <div className="bg-white/95 backdrop-blur-md w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><GlobeIcon className="w-5 h-5 text-indigo-600" /> 批量抓取网页内容</h3>
                    {!isFetching && <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><CloseIcon className="w-5 h-5" /></button>}
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">网页 URL 列表 (每行一个)</label>
                        <textarea value={urls} onChange={e => setUrls(e.target.value)} disabled={isFetching} placeholder="https://example.com/article1&#10;https://example.com/article2" className="w-full h-40 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono leading-relaxed" />
                    </div>
                    {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}
                    {isFetching && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-indigo-600"><span>正在抓取并清洗内容...</span><span>{progress.current} / {progress.total}</span></div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}></div></div>
                        </div>
                    )}
                    <div className="flex justify-end pt-2">
                        <button onClick={handleFetch} disabled={isFetching || !urls.trim()} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">
                            {isFetching ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />} {isFetching ? '处理中...' : '开始抓取'}
                        </button>
                    </div>
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
    const [isUploading, setIsUploading] = useState(false);
    
    // Modals
    const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
    const [isWebModalOpen, setIsWebModalOpen] = useState(false);
    
    const [knowledgeCitations, setKnowledgeCitations] = useState<{id: string, title: string, content: string, source: string}[]>([]);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Calculate Total Input Tokens (Approx)
    const totalTokens = React.useMemo(() => {
        let count = estimateTokens(input);
        attachments.forEach(a => {
            if (a.type === 'file' && a.tokenEstimate) {
                count += a.tokenEstimate;
            }
        });
        knowledgeCitations.forEach(k => {
            count += estimateTokens(k.content);
        });
        return count;
    }, [input, attachments, knowledgeCitations]);

    const isTokenOverLimit = totalTokens > CONFIG.MAX_TOKENS_PER_REQUEST;

    // --- File Handling Logic ---

    const processFile = (file: File): Promise<Attachment> => {
        return new Promise((resolve, reject) => {
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                reject(new Error(`文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB). 请上传小于 10MB 的文件。`));
                return;
            }

            const isImage = file.type.startsWith('image/');
            const isText = CONFIG.ALLOWED_TEXT_TYPES.includes(file.type) || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.csv');

            if (isImage) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        id: crypto.randomUUID(),
                        type: 'image',
                        content: e.target?.result as string,
                        name: file.name,
                        size: file.size
                    });
                };
                reader.onerror = () => reject(new Error('图片读取失败'));
                reader.readAsDataURL(file);
                return;
            }

            if (isText) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    let text = e.target?.result as string;
                    let isTruncated = false;
                    if (text.length > CONFIG.MAX_TEXT_CHARS) {
                        text = text.substring(0, CONFIG.MAX_TEXT_CHARS) + '\n\n... [由于篇幅限制，后续内容已截断]';
                        isTruncated = true;
                    }
                    
                    const tokenEst = estimateTokens(text);
                    
                    resolve({
                        id: crypto.randomUUID(),
                        type: 'file',
                        content: text,
                        name: file.name,
                        size: file.size,
                        isTruncated,
                        tokenEstimate: tokenEst
                    });
                };
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsText(file);
                return;
            }

            if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('officedocument')) {
                reject(new Error("当前模式仅支持 Markdown/Txt/CSV 纯文本文件解析。PDF/Word 请等待后端存储服务接入。"));
                return;
            }

            reject(new Error("不支持的文件格式。请上传图片或文本文件。"));
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const attachment = await processFile(file);
            // Check potential overflow BEFORE adding
            if (totalTokens + (attachment.tokenEstimate || 0) > CONFIG.MAX_TOKENS_PER_REQUEST) {
               if(!confirm('文件可能导致总 Token 数超出模型限制，是否继续添加？(可能会导致请求失败)')) {
                   return;
               }
            }
            setAttachments(prev => [...prev, attachment]);
        } catch (err: any) {
            alert(`添加失败: ${err.message}`);
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleWebFetchSuccess = (content: string, urlCount: number) => {
        const tokenEst = estimateTokens(content);
        const newAttachment: Attachment = {
            id: crypto.randomUUID(),
            type: 'file',
            content: content,
            name: `Web_Crawl_${new Date().toISOString().slice(0,10)}_${urlCount}pages.md`,
            size: content.length,
            isTruncated: false,
            tokenEstimate: tokenEst
        };
        setAttachments(prev => [...prev, newAttachment]);
    };

    const removeAttachment = (id: string) => { setAttachments(prev => prev.filter(a => a.id !== id)); };
    const removeCitation = (id: string) => { setKnowledgeCitations(prev => prev.filter(c => c.id !== id)); };

    const handleKnowledgeSelect = (content: string, title: string) => {
        setKnowledgeCitations(prev => [...prev, {
            id: crypto.randomUUID(),
            title,
            content,
            source: '知识库'
        }]);
        setIsKnowledgeModalOpen(false);
    };

    const handleSend = () => {
        if ((!input.trim() && attachments.length === 0 && knowledgeCitations.length === 0) || isStreaming) return;
        if (isTokenOverLimit) {
            if(!confirm('当前输入内容可能超过模型上下文限制，可能导致回答中断或失败。是否仍要发送？')) return;
        }

        let finalContent = input;
        if (knowledgeCitations.length > 0) {
            finalContent += "\n\n--- 引用知识 (Reference Context) ---\n";
            knowledgeCitations.forEach((cit, idx) => { finalContent += `\n[${idx + 1}] **${cit.title}**:\n${cit.content}\n`; });
            finalContent += "\n--- End Reference ---\n";
        }
        const textAttachments = attachments.filter(a => a.type === 'file');
        if (textAttachments.length > 0) {
            textAttachments.forEach(att => { finalContent += `\n\n--- 文件: ${att.name} ---\n${att.content}\n--- End File ---\n`; });
        }
        const imageAttachments = attachments.filter(a => a.type === 'image');
        if (imageAttachments.length > 0) {
             imageAttachments.forEach(att => { finalContent += `\n![${att.name}](${att.content})\n`; });
        }

        onSendMessage(finalContent);
        setInput('');
        setAttachments([]);
        setKnowledgeCitations([]);
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
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-white" ref={scrollRef}>
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
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-100' : 'bg-indigo-100 text-indigo-600 ring-4 ring-indigo-50'}`}>
                            {msg.role === 'user' ? <div className="w-5 h-5 bg-slate-400 rounded-full" /> : <SparklesIcon className="w-5 h-5" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl p-5 text-sm leading-relaxed shadow-sm overflow-hidden ${
                            msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-sm' 
                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-md'
                        }`}>
                            {/* Render Reasoning Block if present */}
                            {msg.role === 'assistant' && msg.reasoning && (
                                <ThinkingBlock content={msg.reasoning} isStreaming={isStreaming && msg.id === messages[messages.length-1].id} />
                            )}

                            <div className="whitespace-pre-wrap break-words">{msg.content.substring(0, 500) + (msg.content.length > 500 ? '...' : '') || (msg.reasoning ? '' : <span className="animate-pulse">...</span>)}</div>
                            {msg.content.length > 500 && <div className="text-[10px] opacity-50 mt-2 italic">(内容过长，仅展示摘要)</div>}
                            
                            {msg.role === 'assistant' && !isStreaming && msg.content.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                                     <button onClick={onPreview} className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">
                                        <ViewGridIcon className="w-4 h-4" />
                                        {stage === 'analysis' ? '预览报告' : '查看看板'}
                                     </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Staging Area (暂存区) --- */}
            {(attachments.length > 0 || knowledgeCitations.length > 0) && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto custom-scrollbar min-h-[60px] items-center">
                    {knowledgeCitations.map(cit => (
                        <div key={cit.id} className="relative group flex-shrink-0 animate-in zoom-in duration-200">
                             <div className="h-8 pl-2 pr-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-2 max-w-[150px]">
                                <PuzzleIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                <span className="text-[10px] truncate text-indigo-700 font-medium">{cit.title}</span>
                             </div>
                             <button onClick={() => removeCitation(cit.id)} className="absolute top-1 right-1 p-0.5 text-indigo-400 hover:text-red-500 rounded-full transition-colors"><CloseIcon className="w-3 h-3" /></button>
                        </div>
                    ))}
                    {attachments.map(att => (
                        <div key={att.id} className="relative group flex-shrink-0 animate-in zoom-in duration-200">
                            {att.type === 'image' ? (
                                <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden relative shadow-sm">
                                    <img src={att.content} alt={att.name} className="w-full h-full object-cover" />
                                    <button onClick={() => removeAttachment(att.id)} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5 shadow-sm"><CloseIcon className="w-3 h-3" /></button>
                                </div>
                            ) : (
                                <div className="h-8 pl-2 pr-8 bg-white border border-slate-200 rounded-lg flex items-center gap-2 shadow-sm max-w-[150px]" title={att.name}>
                                    {att.name.startsWith('Web_Crawl') ? <GlobeIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <DocumentTextIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                                    <span className="text-[10px] truncate text-slate-600">{att.name}</span>
                                    {att.isTruncated && <span className="text-[9px] text-amber-500 font-bold px-1 border border-amber-200 rounded bg-amber-50">截断</span>}
                                </div>
                            )}
                            {att.type !== 'image' && <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-slate-200 hover:bg-red-500 hover:text-white text-slate-500 rounded-full p-0.5 transition-colors"><CloseIcon className="w-3 h-3" /></button>}
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] z-20">
                <div className="flex justify-between items-center mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept=".txt,.md,.csv,.json" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isStreaming} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200" title="上传文本资料 (Markdown/Txt)">
                            <CloudIcon className="w-3.5 h-3.5" /> 文档
                        </button>
                        <button onClick={() => setIsWebModalOpen(true)} disabled={isStreaming} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200" title="输入 URL 抓取网页内容">
                            <GlobeIcon className="w-3.5 h-3.5" /> 网页
                        </button>
                        <button onClick={() => setIsKnowledgeModalOpen(true)} disabled={isStreaming} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200" title="引用知识库内容">
                            <PuzzleIcon className="w-3.5 h-3.5" /> 知识库
                        </button>
                        <input type="file" ref={imageInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept="image/*" />
                        <button onClick={() => imageInputRef.current?.click()} disabled={isUploading || isStreaming} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200" title="上传图片">
                            <PhotoIcon className="w-3.5 h-3.5" /> 图片
                        </button>
                        {isUploading && <span className="text-xs text-indigo-500 animate-pulse ml-2 font-medium">读取中...</span>}
                    </div>
                    {/* Token Counter */}
                    <div className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${isTokenOverLimit ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                        {totalTokens.toLocaleString()} / {CONFIG.MAX_TOKENS_PER_REQUEST.toLocaleString()} Tokens
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={stage === 'analysis' ? "输入技术名称，开始分析..." : "描述修改要求..."}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-14 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-28 custom-scrollbar transition-shadow shadow-inner focus:bg-white placeholder:text-slate-400"
                        disabled={isStreaming}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={(!input.trim() && attachments.length === 0 && knowledgeCitations.length === 0) || isStreaming}
                        className="absolute right-3 bottom-3 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95"
                    >
                        {isStreaming ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <ArrowRightIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <KnowledgeSearchModal isOpen={isKnowledgeModalOpen} onClose={() => setIsKnowledgeModalOpen(false)} onSelect={handleKnowledgeSelect} />
            <WebFetchModal isOpen={isWebModalOpen} onClose={() => setIsWebModalOpen(false)} onSuccess={handleWebFetchSuccess} />
        </div>
    );
};
