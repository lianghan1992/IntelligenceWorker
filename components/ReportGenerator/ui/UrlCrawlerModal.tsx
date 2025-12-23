
import React, { useState, useEffect, useRef } from 'react';
import { 
    CloseIcon, GlobeIcon, LinkIcon, RefreshIcon, 
    CheckCircleIcon, ShieldExclamationIcon, EyeIcon, 
    CloudIcon, DocumentTextIcon, ArrowRightIcon
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

const MAX_CONCURRENCY = 3; // Reduced concurrency slightly for stability
const MAX_RETRIES = 2;

export const UrlCrawlerModal: React.FC<UrlCrawlerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [urlInput, setUrlInput] = useState('');
    const [tasks, setTasks] = useState<CrawlTask[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewContent, setPreviewContent] = useState<{ title: string; html: string } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const estimateTokens = (text: string) => Math.ceil(text.length / 1.5);

    const processTask = async (task: CrawlTask, retryCount = 0) => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));

        try {
            const response = await fetch(`https://r.jina.ai/${task.url}`, {
                headers: { 
                    'X-Return-Format': 'markdown',
                    'X-No-Cache': 'true' 
                }
            });

            if (response.status === 429 && retryCount < MAX_RETRIES) {
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'retrying', errorMessage: `限流重试 (${retryCount + 1})...` } : t));
                await new Promise(r => setTimeout(r, 3000 * (retryCount + 1)));
                return processTask(task, retryCount + 1);
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();
            
            const titleMatch = content.match(/^#\s+(.*)$/m);
            const title = titleMatch ? titleMatch[1].trim().slice(0, 50) : task.url.slice(0, 50);
            const tokens = estimateTokens(content);

            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'uploading', content, title, tokens } : t));
            
            const file = new File([content], `${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.md`, { type: 'text/markdown' });
            const uploadRes = await uploadStratifyFile(file);

            setTasks(prev => prev.map(t => t.id === task.id ? { 
                ...t, 
                status: 'success', 
                attachmentUrl: uploadRes.url,
                errorMessage: undefined 
            } : t));

        } catch (error: any) {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', errorMessage: error.message || '抓取失败' } : t));
        }
    };

    useEffect(() => {
        if (!isProcessing) return;

        const pendingTasks = tasks.filter(t => t.status === 'pending');
        const activeTasks = tasks.filter(t => ['running', 'uploading', 'retrying'].includes(t.status));

        if (pendingTasks.length === 0 && activeTasks.length === 0) {
            setIsProcessing(false);
            return;
        }

        if (pendingTasks.length > 0 && activeTasks.length < MAX_CONCURRENCY) {
            const nextTask = pendingTasks[0];
            processTask(nextTask);
        }
    }, [tasks, isProcessing]);

    const handleStart = () => {
        const urls = Array.from(new Set(
            urlInput.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
        ));
        
        if (urls.length === 0) return;

        // Use random random ID to ensure uniqueness across batches
        const newTasks: CrawlTask[] = urls.map((u) => ({
            id: `crawl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: u,
            title: u,
            content: '',
            status: 'pending'
        }));

        setTasks(newTasks);
        setIsProcessing(true);
        setUrlInput(''); 
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

    const successCount = tasks.filter(t => t.status === 'success').length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 relative border border-slate-100 ring-1 ring-black/5">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                            <GlobeIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-snug">URL 批量采集</h3>
                            <p className="text-xs text-slate-500 font-medium">Jina Reader 驱动 • 自动正文提取 • Token 估算</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Input Area */}
                    <div className="w-[350px] flex-shrink-0 border-r border-slate-100 bg-slate-50 flex flex-col z-10">
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <LinkIcon className="w-3.5 h-3.5" /> 输入网址
                                </label>
                                <span className="text-[10px] text-slate-400">每行一个 URL</span>
                            </div>
                            <div className="flex-1 relative group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 ring-indigo-100 transition-all">
                                <textarea 
                                    ref={textareaRef}
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    className="w-full h-full p-4 bg-transparent border-none outline-none text-sm font-mono leading-relaxed resize-none text-slate-600 placeholder:text-slate-300"
                                    placeholder="https://article-1.com&#10;https://article-2.com"
                                    disabled={isProcessing}
                                />
                            </div>
                        </div>
                        <div className="p-5 pt-0">
                            <button 
                                onClick={handleStart}
                                disabled={isProcessing || !urlInput.trim()}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-600 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95"
                            >
                                {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <ArrowRightIcon className="w-4 h-4" />}
                                {isProcessing ? '采集中...' : '开始抓取'}
                            </button>
                        </div>
                    </div>

                    {/* Right: Task List */}
                    <div className="flex-1 bg-white overflow-hidden flex flex-col relative">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                        
                         <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">任务队列</h4>
                             {tasks.length > 0 && (
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-500">Total: {tasks.length}</span>
                                    {successCount > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Success: {successCount}</span>}
                                </div>
                             )}
                         </div>
                         
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-0">
                            {tasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                        <CloudIcon className="w-8 h-8 opacity-20" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-400">暂无采集任务</p>
                                        <p className="text-xs mt-1 opacity-70">请在左侧输入 URL 并开始</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {tasks.map(task => (
                                        <div key={task.id} className="group bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <h4 className="text-sm font-bold text-slate-700 truncate" title={task.title}>{task.title || task.url}</h4>
                                                    {task.tokens ? (
                                                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                            {task.tokens.toLocaleString()} tok
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate font-mono">{task.url}</p>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 pt-1">
                                                {task.status === 'success' ? (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md flex items-center gap-1 border border-green-100">
                                                            <CheckCircleIcon className="w-3 h-3"/> 成功
                                                        </span>
                                                        <button 
                                                            onClick={() => handlePreview(task)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                                            title="预览内容"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-24 text-right">
                                                        {task.status === 'running' && <span className="text-[10px] font-bold text-blue-500 animate-pulse flex items-center justify-end gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 抓取中</span>}
                                                        {task.status === 'uploading' && <span className="text-[10px] font-bold text-purple-500 animate-pulse flex items-center justify-end gap-1"><CloudIcon className="w-3 h-3 animate-bounce"/> 上传中</span>}
                                                        {task.status === 'error' && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded flex items-center justify-end gap-1 truncate max-w-full" title={task.errorMessage}><ShieldExclamationIcon className="w-3 h-3"/> 失败</span>}
                                                        {task.status === 'retrying' && <span className="text-[10px] font-bold text-amber-500">重试中...</span>}
                                                        {task.status === 'pending' && <span className="text-[10px] font-bold text-slate-300">等待中</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white z-10">
                    <p className="text-[10px] text-slate-400 font-medium">支持多线程并发采集 • 自动去重</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors">取消</button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isProcessing || successCount === 0}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-30 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            确认添加 ({successCount})
                        </button>
                    </div>
                </div>

                {/* Preview Overlay */}
                {previewContent && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="px-6 py-3 border-b flex justify-between items-center bg-white shadow-sm z-10">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100"><DocumentTextIcon className="w-4 h-4 text-indigo-600" /></div>
                                <h3 className="font-bold text-slate-800 truncate text-sm">{previewContent.title}</h3>
                            </div>
                            <button onClick={() => setPreviewContent(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                            <article 
                                className="prose prose-sm prose-slate max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200"
                                dangerouslySetInnerHTML={{ __html: previewContent.html }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
