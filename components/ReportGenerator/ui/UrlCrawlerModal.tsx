
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    CloseIcon, GlobeIcon, LinkIcon, RefreshIcon, 
    CheckCircleIcon, ShieldExclamationIcon, EyeIcon, 
    ChevronRightIcon, ClockIcon 
} from '../../icons';

interface CrawledArticle {
    id: string;
    url: string;
    title: string;
    content: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'retrying';
    errorMessage?: string;
}

interface UrlCrawlerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (articles: Array<{ title: string; url: string; content: string }>) => void;
}

// 并发限制常量
const MAX_CONCURRENCY = 10;
const MAX_RETRIES = 3;

export const UrlCrawlerModal: React.FC<UrlCrawlerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [urlInput, setUrlInput] = useState('');
    const [taskQueue, setTaskQueue] = useState<CrawledArticle[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewArticle, setPreviewArticle] = useState<CrawledArticle | null>(null);
    
    // 使用 Ref 追踪任务状态，避免闭包问题
    const queueRef = useRef<CrawledArticle[]>([]);

    const updateTaskStatus = (id: string, updates: Partial<CrawledArticle>) => {
        setTaskQueue(prev => {
            const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
            queueRef.current = next;
            return next;
        });
    };

    const fetchUrl = async (task: CrawledArticle, retryCount = 0): Promise<void> => {
        updateTaskStatus(task.id, { status: 'running' });

        try {
            const response = await fetch(`https://r.jina.ai/${task.url}`, {
                headers: { 'X-Return-Format': 'markdown' }
            });

            if (response.status === 429) {
                if (retryCount < MAX_RETRIES) {
                    updateTaskStatus(task.id, { status: 'retrying', errorMessage: `触发限流，${(retryCount + 1) * 3}s 后重试...` });
                    await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 3000));
                    return fetchUrl(task, retryCount + 1);
                } else {
                    throw new Error('超出重试次数 (Jina RPM Limit)');
                }
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const content = await response.text();
            
            // 提取标题：寻找第一个 # 标题
            let title = task.url;
            const titleMatch = content.match(/^#\s+(.*)$/m);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
            } else {
                // 兜底：截取前 30 个字符
                title = content.substring(0, 50).split('\n')[0] || task.url;
            }

            updateTaskStatus(task.id, { status: 'success', title, content });
        } catch (error: any) {
            updateTaskStatus(task.id, { status: 'error', errorMessage: error.message || '抓取失败' });
        }
    };

    const handleStartCrawl = async () => {
        const urls = urlInput
            .split('\n')
            .map(u => u.trim())
            .filter(u => u.startsWith('http'));

        if (urls.length === 0) {
            alert('请输入有效的 URL 链接');
            return;
        }

        const initialTasks: CrawledArticle[] = urls.map((url, index) => ({
            id: `task-${Date.now()}-${index}`,
            url,
            title: url,
            content: '',
            status: 'pending'
        }));

        setTaskQueue(initialTasks);
        queueRef.current = initialTasks;
        setIsProcessing(true);

        // 并发执行逻辑
        const pool = [...initialTasks];
        const executing = new Set<Promise<void>>();

        for (const task of pool) {
            // 如果并发数达到上限，等待其中一个完成
            if (executing.size >= MAX_CONCURRENCY) {
                await Promise.race(executing);
            }

            const p = fetchUrl(task).then(() => {
                executing.delete(p);
            });
            executing.add(p);
        }

        await Promise.all(executing);
        setIsProcessing(false);
    };

    const handleConfirm = () => {
        const successful = taskQueue.filter(t => t.status === 'success');
        if (successful.length > 0) {
            onSuccess(successful.map(t => ({ title: t.title, url: t.url, content: t.content })));
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <GlobeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">从网页提取参考资料</h3>
                            <p className="text-xs text-slate-500 font-medium">使用 JINA Reader 将外部文章转化为 Markdown 上下文</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
                        <CloseIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left: Input Side */}
                    <div className={`flex-1 p-8 flex flex-col border-r border-slate-100 transition-all ${isProcessing ? 'bg-slate-50/50' : 'bg-white'}`}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">输入文章链接 (每行一个)</label>
                        <textarea
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder="https://example.com/article/1&#10;https://techcrunch.com/2024/..."
                            className="flex-1 w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] outline-none transition-all text-sm font-mono leading-relaxed shadow-inner resize-none"
                            disabled={isProcessing}
                        />
                        <div className="mt-6 flex gap-3">
                            {isProcessing ? (
                                <div className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold flex items-center justify-center gap-3">
                                    <RefreshIcon className="w-5 h-5 animate-spin" />
                                    <span>引擎正在处理中...</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStartCrawl}
                                    disabled={!urlInput.trim()}
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-blue-600 shadow-xl transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    <LinkIcon className="w-5 h-5" />
                                    开始批量加载
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Results Side */}
                    <div className="w-full md:w-[400px] bg-slate-50/30 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">抓取队列 ({taskQueue.length})</span>
                            {taskQueue.some(t => t.status === 'success') && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                    {taskQueue.filter(t => t.status === 'success').length} 成功
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {taskQueue.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center px-8">
                                    <ClockIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-xs font-medium leading-relaxed">待解析的链接将在此处显示进度</p>
                                </div>
                            ) : (
                                taskQueue.map(task => (
                                    <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-right-4">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug flex-1" title={task.title}>
                                                {task.title}
                                            </h4>
                                            <div className="flex-shrink-0">
                                                {task.status === 'running' && <RefreshIcon className="w-4 h-4 text-blue-500 animate-spin" />}
                                                {task.status === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                                                {task.status === 'error' && <ShieldExclamationIcon className="w-4 h-4 text-red-500" />}
                                                {task.status === 'retrying' && <RefreshIcon className="w-4 h-4 text-amber-500 animate-spin" />}
                                                {task.status === 'pending' && <div className="w-4 h-4 border-2 border-slate-200 rounded-full"></div>}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate mb-3 font-mono">{task.url}</p>
                                        
                                        <div className="flex justify-between items-center">
                                            <div className="text-[10px] font-bold">
                                                {task.status === 'error' && <span className="text-red-500">{task.errorMessage}</span>}
                                                {task.status === 'retrying' && <span className="text-amber-600">{task.errorMessage}</span>}
                                                {task.status === 'success' && <span className="text-green-600">已就绪</span>}
                                            </div>
                                            {task.status === 'success' && (
                                                <button 
                                                    onClick={() => setPreviewArticle(task)}
                                                    className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-all uppercase tracking-wider"
                                                >
                                                    <EyeIcon className="w-3 h-3" /> Preview
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100">
                             <button 
                                onClick={handleConfirm}
                                disabled={!taskQueue.some(t => t.status === 'success') || isProcessing}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
                             >
                                加入参考资料 ({taskQueue.filter(t => t.status === 'success').length})
                             </button>
                        </div>
                    </div>
                </div>

                {/* Markdown Preview Overlay */}
                {previewArticle && (
                    <div className="absolute inset-0 z-20 bg-white animate-in slide-in-from-bottom duration-300 flex flex-col">
                        <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-md">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-blue-600">
                                    <GlobeIcon className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-800 truncate text-sm">{previewArticle.title}</h3>
                            </div>
                            <button 
                                onClick={() => setPreviewArticle(null)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                <ChevronRightIcon className="w-4 h-4 rotate-180" /> 返回列表
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-white">
                            <article 
                                className="prose prose-slate prose-sm md:prose-base max-w-4xl mx-auto"
                                dangerouslySetInnerHTML={{ 
                                    __html: window.marked ? window.marked.parse(previewArticle.content) : `<pre>${previewArticle.content}</pre>` 
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
};
