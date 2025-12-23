
import React, { useState, useEffect, useRef } from 'react';
import { 
    CloseIcon, GlobeIcon, LinkIcon, RefreshIcon, 
    CheckCircleIcon, ShieldExclamationIcon, EyeIcon, 
    ChevronRightIcon, ClockIcon, CloudIcon, DocumentTextIcon
} from '../../icons';
import { uploadStratifyFile } from '../../../api/stratify';

interface CrawlTask {
    id: string;
    url: string;
    title: string;
    content: string;
    status: 'pending' | 'running' | 'uploading' | 'success' | 'error' | 'retrying';
    errorMessage?: string;
    attachmentUrl?: string;
    tokens?: number;
}

interface UrlCrawlerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (files: Array<{ name: string; url: string; tokens: number }>) => void;
}

const MAX_CONCURRENCY = 10;
const MAX_RETRIES = 2;

export const UrlCrawlerModal: React.FC<UrlCrawlerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [urlInput, setUrlInput] = useState('');
    const [tasks, setTasks] = useState<CrawlTask[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewContent, setPreviewContent] = useState<{ title: string; html: string } | null>(null);
    
    // 进度追踪
    const runningCount = tasks.filter(t => t.status === 'running' || t.status === 'uploading').length;

    const updateTask = (id: string, updates: Partial<CrawlTask>) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const estimateTokens = (text: string) => Math.ceil(text.length / 1.5);

    const processTask = async (task: CrawlTask, retryCount = 0) => {
        updateTask(task.id, { status: 'running' });

        try {
            // 1. 抓取阶段
            const response = await fetch(`https://r.jina.ai/${task.url}`, {
                headers: { 'X-Return-Format': 'markdown' }
            });

            if (response.status === 429 && retryCount < MAX_RETRIES) {
                updateTask(task.id, { status: 'retrying' });
                await new Promise(r => setTimeout(r, 3000 * (retryCount + 1)));
                return processTask(task, retryCount + 1);
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();
            
            // 提取标题
            const titleMatch = content.match(/^#\s+(.*)$/m);
            const title = titleMatch ? titleMatch[1].trim() : task.url;
            const tokens = estimateTokens(content);

            // 2. 上传阶段 (转化为附件)
            updateTask(task.id, { status: 'uploading', content, title, tokens });
            
            const file = new File([content], `${title.slice(0, 20)}.md`, { type: 'text/markdown' });
            const uploadRes = await uploadStratifyFile(file);

            updateTask(task.id, { 
                status: 'success', 
                attachmentUrl: uploadRes.url 
            });

        } catch (error: any) {
            updateTask(task.id, { status: 'error', errorMessage: error.message || '抓取失败' });
        }
    };

    // 核心并发控制逻辑
    useEffect(() => {
        if (!isProcessing) return;

        const pending = tasks.filter(t => t.status === 'pending');
        const active = tasks.filter(t => ['running', 'uploading', 'retrying'].includes(t.status));

        if (pending.length > 0 && active.length < MAX_CONCURRENCY) {
            const nextBatch = pending.slice(0, MAX_CONCURRENCY - active.length);
            nextBatch.forEach(task => processTask(task));
        }

        if (tasks.length > 0 && tasks.every(t => ['success', 'error'].includes(t.status))) {
            setIsProcessing(false);
        }
    }, [tasks, isProcessing]);

    const handleStart = () => {
        const urls = Array.from(new Set(urlInput.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))));
        if (urls.length === 0) return;

        setTasks(urls.map((u, i) => ({
            id: `crawl-${Date.now()}-${i}`,
            url: u,
            title: u,
            content: '',
            status: 'pending'
        })));
        setIsProcessing(true);
    };

    const handlePreview = (task: CrawlTask) => {
        if (!window.marked) return;
        setPreviewContent({
            title: task.title,
            html: window.marked.parse(task.content)
        });
    };

    const handleConfirm = () => {
        const results = tasks
            .filter(t => t.status === 'success' && t.attachmentUrl)
            .map(t => ({ name: t.title, url: t.attachmentUrl!, tokens: t.tokens || 0 }));
        onSuccess(results);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 relative">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <GlobeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">批量文章抓取</h3>
                            <p className="text-xs text-slate-500 font-medium">支持并发处理与实时 Markdown 预览</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Editor */}
                    <div className="w-1/3 p-6 border-r border-slate-100 flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">输入 URL (每行一个)</label>
                        <textarea 
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            className="flex-1 w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none text-sm font-mono transition-all resize-none shadow-inner"
                            placeholder="https://..."
                            disabled={isProcessing}
                        />
                        <button 
                            onClick={handleStart}
                            disabled={isProcessing || !urlInput.trim()}
                            className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                            {isProcessing ? `正在处理 (${runningCount}/10)...` : '开始加载'}
                        </button>
                    </div>

                    {/* Right: Task List */}
                    <div className="flex-1 bg-slate-50/30 overflow-y-auto p-6 custom-scrollbar">
                        {tasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <LinkIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-sm font-bold">待解析的链接将在此列出</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {tasks.map(task => (
                                    <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:border-blue-300">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-bold text-slate-800 truncate" title={task.title}>{task.title}</h4>
                                                {task.tokens && <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 rounded">~{task.tokens} tokens</span>}
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate font-mono">{task.url}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {task.status === 'success' && (
                                                <button 
                                                    onClick={() => handlePreview(task)}
                                                    className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                    title="预览内容"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <div className="w-24 text-right">
                                                {task.status === 'running' && <span className="text-[10px] font-bold text-blue-500 animate-pulse flex items-center justify-end gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 抓取中</span>}
                                                {task.status === 'uploading' && <span className="text-[10px] font-bold text-indigo-500 animate-pulse flex items-center justify-end gap-1"><CloudIcon className="w-3 h-3 animate-bounce"/> 上传中</span>}
                                                {task.status === 'success' && <span className="text-[10px] font-bold text-green-600 flex items-center justify-end gap-1"><CheckCircleIcon className="w-3 h-3"/> 已就绪</span>}
                                                {task.status === 'error' && <span className="text-[10px] font-bold text-red-500" title={task.errorMessage}>抓取失败</span>}
                                                {task.status === 'pending' && <span className="text-[10px] font-bold text-slate-300">排队中</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-100 flex justify-between items-center bg-white">
                    <p className="text-[10px] text-slate-400 font-medium">支持最大 10 并发，已就绪的文档将作为附件注入 Agent 上下文</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold text-sm">取消</button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isProcessing || !tasks.some(t => t.status === 'success')}
                            className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-30"
                        >
                            加入资料 ({tasks.filter(t => t.status === 'success').length})
                        </button>
                    </div>
                </div>

                {/* Markdown Preview Overlay */}
                {previewContent && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom">
                        <div className="px-8 py-4 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-slate-200"><DocumentTextIcon className="w-5 h-5 text-indigo-600" /></div>
                                <h3 className="font-bold text-slate-800 truncate max-w-2xl">{previewContent.title}</h3>
                            </div>
                            <button onClick={() => setPreviewContent(null)} className="p-2 hover:bg-slate-200 rounded-full">
                                <CloseIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                            <article 
                                className="prose prose-slate max-w-4xl mx-auto"
                                dangerouslySetInnerHTML={{ __html: previewContent.html }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
