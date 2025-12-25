
import React, { useState, useRef, useEffect } from 'react';
import { Message, WorkStage } from './types';
import { SparklesIcon, ArrowRightIcon, RefreshIcon, CloudIcon, PuzzleIcon, PhotoIcon, CloseIcon, DocumentTextIcon, CheckIcon } from '../../icons';
import { KnowledgeSearchModal } from './KnowledgeSearchModal';

interface ChatPanelProps {
    messages: Message[];
    stage: WorkStage;
    onSendMessage: (text: string) => void;
    isStreaming: boolean;
    onSwitchToVisual: () => void;
    canSwitchToVisual: boolean;
}

interface Attachment {
    id: string;
    type: 'image' | 'file';
    content: string; // Base64 for image, Text string for file
    name: string;
    size: number;
    isTruncated?: boolean;
}

// 限制配置
const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_TEXT_CHARS: 20000, // 文本文件最大提取字符数
    ALLOWED_TEXT_TYPES: ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/x-markdown'],
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    stage, 
    onSendMessage, 
    isStreaming, 
    onSwitchToVisual,
    canSwitchToVisual
}) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
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

    // --- File Handling Logic ---

    const processFile = (file: File): Promise<Attachment> => {
        return new Promise((resolve, reject) => {
            // 1. Check Size
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                reject(new Error(`文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB). 请上传小于 10MB 的文件。`));
                return;
            }

            const isImage = file.type.startsWith('image/');
            const isText = CONFIG.ALLOWED_TEXT_TYPES.includes(file.type) || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.csv');

            // 2. Process Image (Base64)
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

            // 3. Process Text (Read as Text)
            if (isText) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    let text = e.target?.result as string;
                    let isTruncated = false;
                    // Truncation Logic
                    if (text.length > CONFIG.MAX_TEXT_CHARS) {
                        text = text.substring(0, CONFIG.MAX_TEXT_CHARS) + '\n\n... [由于篇幅限制，后续内容已截断]';
                        isTruncated = true;
                    }
                    resolve({
                        id: crypto.randomUUID(),
                        type: 'file',
                        content: text,
                        name: file.name,
                        size: file.size,
                        isTruncated
                    });
                };
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsText(file);
                return;
            }

            // 4. Fallback for PDF/Word (Placeholder only)
            // 在纯前端模式下，无法解析复杂二进制，仅作为提示
            if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('officedocument')) {
                // Rejecting for now to ensure quality, as prompt requested
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
            setAttachments(prev => [...prev, attachment]);
        } catch (err: any) {
            alert(`添加失败: ${err.message}`);
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };
    
    const removeCitation = (id: string) => {
        setKnowledgeCitations(prev => prev.filter(c => c.id !== id));
    };

    const handleKnowledgeSelect = (content: string, title: string) => {
        setKnowledgeCitations(prev => [...prev, {
            id: crypto.randomUUID(),
            title,
            content,
            source: '知识库'
        }]);
        setIsKnowledgeModalOpen(false);
    };

    // --- Sending Logic ---

    const handleSend = () => {
        if ((!input.trim() && attachments.length === 0 && knowledgeCitations.length === 0) || isStreaming) return;
        
        let finalContent = input;
        
        // 1. Append Knowledge Citations
        if (knowledgeCitations.length > 0) {
            finalContent += "\n\n--- 引用知识 (Reference Context) ---\n";
            knowledgeCitations.forEach((cit, idx) => {
                finalContent += `\n[${idx + 1}] **${cit.title}**:\n${cit.content}\n`;
            });
            finalContent += "\n--- End Reference ---\n";
        }

        // 2. Append Text Files Content
        const textAttachments = attachments.filter(a => a.type === 'file');
        if (textAttachments.length > 0) {
            textAttachments.forEach(att => {
                finalContent += `\n\n--- 文件: ${att.name} ---\n${att.content}\n--- End File ---\n`;
            });
        }

        // 3. Handle Images (Embed Markdown Image Syntax for LLM)
        const imageAttachments = attachments.filter(a => a.type === 'image');
        if (imageAttachments.length > 0) {
             imageAttachments.forEach(att => {
                 // GPT-4o Vision supports base64 data URIs in markdown images directly in some integrations, 
                 // OR we rely on the parent component to parse this Markdown and convert to `content: [{type: image_url}]`
                 // Here we simply append it as a standard MD image format. The parent `runAnalysisPhase` needs to be smart enough OR
                 // we just append it to text and hope the downstream handles it. 
                 // *Optimization*: We keep it text-based here.
                 finalContent += `\n![${att.name}](${att.content})\n`;
             });
        }

        onSendMessage(finalContent);
        
        // Cleanup
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
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {isStreaming ? 'AI Thinking...' : 'Ready'}
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
                            支持上传图片或文本资料作为上下文。
                        </p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-100' : 'bg-indigo-100 text-indigo-600'}`}>
                            {msg.role === 'user' ? <div className="w-4 h-4 bg-slate-400 rounded-full" /> : <SparklesIcon className="w-4 h-4" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm overflow-hidden ${
                            msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-sm' 
                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                        }`}>
                            {/* Simple rendering for chat bubbles. Actual content rendering (markdown) happens in parent or separate component if needed, keeping it simple here for performance */}
                            <div className="whitespace-pre-wrap break-words">{msg.content.substring(0, 500) + (msg.content.length > 500 ? '...' : '') || <span className="animate-pulse">...</span>}</div>
                            {msg.content.length > 500 && <div className="text-[10px] opacity-50 mt-1 italic">(内容过长，仅展示摘要)</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Staging Area (暂存区) --- */}
            {(attachments.length > 0 || knowledgeCitations.length > 0) && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto custom-scrollbar min-h-[60px] items-center">
                    
                    {/* Knowledge Chips */}
                    {knowledgeCitations.map(cit => (
                        <div key={cit.id} className="relative group flex-shrink-0 animate-in zoom-in duration-200">
                             <div className="h-8 pl-2 pr-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-2 max-w-[150px]">
                                <PuzzleIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                <span className="text-[10px] truncate text-indigo-700 font-medium">{cit.title}</span>
                             </div>
                             <button 
                                onClick={() => removeCitation(cit.id)}
                                className="absolute top-1 right-1 p-0.5 text-indigo-400 hover:text-red-500 rounded-full transition-colors"
                            >
                                <CloseIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}

                    {/* File/Image Chips */}
                    {attachments.map(att => (
                        <div key={att.id} className="relative group flex-shrink-0 animate-in zoom-in duration-200">
                            {att.type === 'image' ? (
                                <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden relative shadow-sm">
                                    <img src={att.content} alt={att.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-8 pl-2 pr-8 bg-white border border-slate-200 rounded-lg flex items-center gap-2 shadow-sm max-w-[150px]" title={att.name}>
                                    <DocumentTextIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                    <span className="text-[10px] truncate text-slate-600">{att.name}</span>
                                    {att.isTruncated && <span className="text-[9px] text-amber-500 font-bold px-1 border border-amber-200 rounded bg-amber-50">截断</span>}
                                </div>
                            )}
                            <button 
                                onClick={() => removeAttachment(att.id)}
                                className="absolute -top-1.5 -right-1.5 bg-slate-400 text-white rounded-full p-0.5 shadow-sm hover:bg-red-500 transition-colors z-10"
                            >
                                <CloseIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
                {/* Toolbar */}
                <div className="flex items-center gap-2 mb-3 px-1">
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept=".txt,.md,.csv,.json" />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isStreaming}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200"
                        title="上传文本资料 (Markdown/Txt)"
                    >
                        <CloudIcon className="w-3.5 h-3.5" /> 文档
                    </button>

                    <button 
                        onClick={() => setIsKnowledgeModalOpen(true)}
                        disabled={isStreaming}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200"
                        title="引用知识库内容"
                    >
                        <PuzzleIcon className="w-3.5 h-3.5" /> 知识库
                    </button>

                    <input type="file" ref={imageInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept="image/*" />
                    <button 
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploading || isStreaming}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors border border-slate-200"
                        title="上传图片"
                    >
                        <PhotoIcon className="w-3.5 h-3.5" /> 图片
                    </button>
                    
                    {isUploading && <span className="text-xs text-indigo-500 animate-pulse ml-2 font-medium">读取中...</span>}
                </div>

                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={stage === 'analysis' ? "输入技术名称，开始分析..." : "描述修改要求，如 '换成深色科技风'..."}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 custom-scrollbar transition-shadow shadow-inner focus:bg-white placeholder:text-slate-400"
                        disabled={isStreaming}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={(!input.trim() && attachments.length === 0 && knowledgeCitations.length === 0) || isStreaming}
                        className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95"
                    >
                        {isStreaming ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Knowledge Search Modal */}
            <KnowledgeSearchModal 
                isOpen={isKnowledgeModalOpen} 
                onClose={() => setIsKnowledgeModalOpen(false)} 
                onSelect={handleKnowledgeSelect}
            />
        </div>
    );
};
