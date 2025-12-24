
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    CloseIcon, GlobeIcon, LinkIcon, RefreshIcon, 
    CheckCircleIcon, ShieldExclamationIcon, EyeIcon, 
    ChevronRightIcon, ClockIcon, CheckIcon
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
            const p = fetchUrl(task).then(() => {
                executing.delete(p);
            });
            executing.add(p);
            
            // 如果并发数达到上限，等待其中一个完成
            if (executing.size >= MAX_CONCURRENCY) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);
        setIsProcessing(false);
    };

    const handleConfirm = () => {
        const successful = taskQueue.filter(t => t.status === 'success');
        if (successful.length > 0) {
            onSuccess(successful.map(t => ({ title: t.title, url: t.url, content: t.content })));
        }
        onClose();
    };

    const successCount = taskQueue.filter(t => t.status === 'success').length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-white/20">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <GlobeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">网页内容智能提取</h3>
                            <p className="text-xs text-slate-500 font-medium">使用 JINA Reader 引擎将 URL 转化为 Markdown 知识</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
                        <CloseIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left: Input Side */}
                    <div className={`flex-1 p-8 flex flex-col border-r border-slate-100 transition-all ${isProcessing ? 'bg-slate-50/50 opacity-80 pointer-events-none' : 'bg-white'}`}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                            <LinkIcon className="w-3 h-3" />
                            Target URLs (One per line)
                        </label>
                        <textarea
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder={`https://example.com/tech-report\nhttps://news.ycombinator.com/item?id=...`}
                            className="flex-1 w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] outline-none transition-all text-sm font-mono leading-relaxed shadow-inner resize-none placeholder:text-slate-300 text-slate-700"
                            disabled={isProcessing}
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleStartCrawl}
                                disabled={!urlInput.trim() || isProcessing}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-blue-600 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                                {isProcessing ? '引擎全速运转中...' : '启动批量抓取'}
                            </button>
                        </div>
                    </div>

                    {/* Right: Results Side */}
                    <div className="w-full md:w-[400px] bg-slate-50/30 flex flex-col overflow-hidden relative">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Queue ({taskQueue.length})</span>
                            {successCount > 0 && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                    {successCount} 完成
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {taskQueue.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center px-8">
                                    <ClockIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-xs font-medium leading-relaxed">请在左侧输入 URL<br/>解析进度将在此处实时显示</p>
                                </div>
                            ) : (
                                taskQueue.map(task => (
                                    <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-right-4 duration-300 group">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug flex-1 group-hover:text-blue-600 transition-colors" title={task.title}>
                                                {task.title}
                                            </h4>
                                            <div className="flex-shrink-0 pt-0.5">
                                                {task.status === 'running' && <RefreshIcon className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                                                {task.status === 'success' && <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />}
                                                {task.status === 'error' && <ShieldExclamationIcon className="w-3.5 h-3.5 text-red-500" />}
                                                {task.status === 'retrying' && <RefreshIcon className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
                                                {task.status === 'pending' && <div className="w-3 h-3 border-2 border-slate-200 rounded-full"></div>}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate mb-2 font-mono opacity-60">{task.url}</p>
                                        
                                        {(task.status === 'error' || task.status === 'retrying') && (
                                            <div className={`text-[10px] font-bold px-2 py-1 rounded bg-opacity-10 ${task.status === 'error' ? 'bg-red-500 text-red-600' : 'bg-amber-500 text-amber-600'}`}>
                                                {task.errorMessage}
                                            </div>
                                        )}
                                        {task.status === 'success' && (
                                            <div className="text-[10px] text-green-600/80 font-medium flex items-center gap-1">
                                                <CheckIcon className="w-3 h-3" /> 已提取 {task.content.length} 字符
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Footer Action */}
                        <div className="p-4 bg-white/80 backdrop-blur border-t border-slate-100 flex justify-end">
                             <button 
                                onClick={handleConfirm}
                                disabled={isProcessing || successCount === 0}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center gap-2"
                             >
                                 确认导入 ({successCount})
                                 <ChevronRightIcon className="w-3 h-3" />
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
