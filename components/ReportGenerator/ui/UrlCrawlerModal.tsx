
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    CloseIcon, GlobeIcon, LinkIcon, RefreshIcon, 
    CheckCircleIcon, ShieldExclamationIcon, EyeIcon, 
    ChevronRightIcon, ClockIcon, CheckIcon, DocumentTextIcon,
    CodeIcon, PlusIcon, TrashIcon
} from '../../icons';

// 声明 marked 供 TS 使用
declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

interface CrawledArticle {
    id: string;
    url: string;
    title: string;
    content: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'retrying';
    errorMessage?: string;
    timestamp: number;
}

interface UrlCrawlerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (articles: Array<{ title: string; url: string; content: string }>) => void;
}

const MAX_CONCURRENCY = 5; // 降低并发以保证稳定性
const MAX_RETRIES = 2;

export const UrlCrawlerModal: React.FC<UrlCrawlerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [urlInput, setUrlInput] = useState('');
    const [taskQueue, setTaskQueue] = useState<CrawledArticle[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSource, setShowSource] = useState(false); // 切换 预览/源码
    
    const queueRef = useRef<CrawledArticle[]>([]);
    const processingRef = useRef(false);

    // 当有新任务或选中任务变化时，自动滚动到预览顶部
    const previewContainerRef = useRef<HTMLDivElement>(null);

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
            // 使用 Jina Reader API
            const response = await fetch(`https://r.jina.ai/${task.url}`, {
                headers: { 
                    'X-Return-Format': 'markdown',
                    'X-With-Generated-Alt': 'true' 
                }
            });

            if (response.status === 429) {
                if (retryCount < MAX_RETRIES) {
                    updateTaskStatus(task.id, { status: 'retrying', errorMessage: `限流重试 (${retryCount + 1}/${MAX_RETRIES})...` });
                    await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
                    return fetchUrl(task, retryCount + 1);
                } else {
                    throw new Error('请求过于频繁 (429)');
                }
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const content = await response.text();
            
            // 简单提取标题
            let title = task.url;
            const titleMatch = content.match(/^#\s+(.*)$/m);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
            } else {
                const titleTagMatch = content.match(/title: (.*)/i);
                if (titleTagMatch) title = titleTagMatch[1];
            }

            updateTaskStatus(task.id, { status: 'success', title, content });
            
            // 如果当前选中的是这个任务，或者是第一个成功的任务且当前未选中，则选中它
            if (!selectedTaskId) {
                setSelectedTaskId(task.id);
            }
        } catch (error: any) {
            updateTaskStatus(task.id, { status: 'error', errorMessage: error.message || '抓取失败' });
        }
    };

    const processQueue = async () => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsProcessing(true);

        const pool = new Set<Promise<void>>();
        
        // 持续检查队列中是否有 pending 任务
        while (true) {
            const pendingTasks = queueRef.current.filter(t => t.status === 'pending');
            if (pendingTasks.length === 0 && pool.size === 0) break;

            if (pendingTasks.length > 0 && pool.size < MAX_CONCURRENCY) {
                const task = pendingTasks[0];
                // 标记为 running 防止重复获取 (虽然后面 fetchUrl 会立即标记，但这里先占位更安全)
                // updateTaskStatus(task.id, { status: 'running' }); 
                // 注意：这里不能立即改状态，因为 updateTaskStatus 是异步的，依赖 fetchUrl 内部逻辑即可，但要从 pending 列表中移除
                
                const promise = fetchUrl(task).then(() => {
                    pool.delete(promise);
                });
                pool.add(promise);
            } else {
                // 等待任一任务完成
                await Promise.race(pool);
            }
        }

        setIsProcessing(false);
        processingRef.current = false;
    };

    const handleAddTasks = () => {
        const urls = urlInput
            .split(/[\n,;]+/) // 支持换行、逗号、分号分割
            .map(u => u.trim())
            .filter(u => u.startsWith('http'));

        if (urls.length === 0) return;

        const newTasks: CrawledArticle[] = urls.map((url) => ({
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url,
            title: '等待解析...',
            content: '',
            status: 'pending',
            timestamp: Date.now()
        }));

        setTaskQueue(prev => {
            const next = [...prev, ...newTasks];
            queueRef.current = next;
            return next;
        });
        setUrlInput('');
        
        // 如果当前没有选中的，选中第一个新的
        if (!selectedTaskId && newTasks.length > 0) {
            setSelectedTaskId(newTasks[0].id);
        }

        // 启动队列处理
        processQueue();
    };

    const handleRemoveTask = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setTaskQueue(prev => {
            const next = prev.filter(t => t.id !== id);
            queueRef.current = next;
            return next;
        });
        if (selectedTaskId === id) setSelectedTaskId(null);
    };

    const handleConfirm = () => {
        const successful = taskQueue.filter(t => t.status === 'success');
        if (successful.length > 0) {
            onSuccess(successful.map(t => ({ title: t.title, url: t.url, content: t.content })));
        }
        onClose();
    };

    const selectedTask = taskQueue.find(t => t.id === selectedTaskId);
    const successCount = taskQueue.filter(t => t.status === 'success').length;

    // 渲染 Markdown 预览
    const renderPreview = useMemo(() => {
        if (!selectedTask) return <div className="text-slate-400 text-sm">请选择左侧任务查看预览</div>;
        
        if (selectedTask.status === 'pending' || selectedTask.status === 'running' || selectedTask.status === 'retrying') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                    <RefreshIcon className="w-8 h-8 animate-spin text-blue-500" />
                    <p>正在智能提取网页内容...</p>
                </div>
            );
        }

        if (selectedTask.status === 'error') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-red-400 space-y-4">
                    <ShieldExclamationIcon className="w-10 h-10" />
                    <p>解析失败: {selectedTask.errorMessage}</p>
                </div>
            );
        }

        if (showSource) {
            return (
                <textarea 
                    readOnly 
                    className="w-full h-full p-4 font-mono text-xs bg-slate-50 text-slate-700 resize-none outline-none"
                    value={selectedTask.content}
                />
            );
        }

        const html = window.marked ? window.marked.parse(selectedTask.content) : `<pre>${selectedTask.content}</pre>`;
        
        return (
            <div className="prose prose-sm max-w-none p-8 overflow-y-auto h-full custom-scrollbar">
                <h1>{selectedTask.title}</h1>
                <div className="text-xs text-slate-400 border-b pb-4 mb-4 font-mono flex items-center gap-2">
                    <GlobeIcon className="w-3 h-3"/> {selectedTask.url}
                </div>
                <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
        );
    }, [selectedTask, showSource]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-200 ring-1 ring-black/5">
                
                {/* 顶部栏 */}
                <div className="h-16 px-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <GlobeIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">网页智能阅读器</h3>
                            <p className="text-xs text-slate-500">Jina Reader Engine • Markdown 自动转换</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xs font-medium text-slate-500">
                            已解析: <span className="text-indigo-600 font-bold">{successCount}</span> / {taskQueue.length}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 主体内容区：左右分栏 */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* 左侧：输入与列表 (350px) */}
                    <div className="w-[350px] flex-shrink-0 border-r border-slate-100 bg-slate-50 flex flex-col">
                        
                        {/* 输入区域 */}
                        <div className="p-4 border-b border-slate-200/60 bg-white shadow-sm z-10">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">添加目标链接</label>
                            <div className="relative">
                                <textarea
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddTasks();
                                        }
                                    }}
                                    placeholder="输入 URL (支持批量，回车添加)"
                                    className="w-full h-20 p-3 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all placeholder:text-slate-400"
                                />
                                <button 
                                    onClick={handleAddTasks}
                                    disabled={!urlInput.trim()}
                                    className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                    title="添加至队列"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* 任务列表 */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {taskQueue.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                                    <ClockIcon className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs">队列为空，请添加 URL</p>
                                </div>
                            ) : (
                                taskQueue.map(task => (
                                    <div 
                                        key={task.id}
                                        onClick={() => setSelectedTaskId(task.id)}
                                        className={`group relative p-3 rounded-xl border cursor-pointer transition-all ${
                                            selectedTaskId === task.id 
                                            ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50' 
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-xs font-bold line-clamp-1 flex-1 mr-2 ${selectedTaskId === task.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                {task.title || 'Loading...'}
                                            </h4>
                                            {/* 删除按钮 (Hover显示) */}
                                            <button 
                                                onClick={(e) => handleRemoveTask(e, task.id)}
                                                className="hidden group-hover:block p-0.5 text-slate-300 hover:text-red-500 transition-colors absolute top-2 right-2"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[10px] text-slate-400 truncate max-w-[180px] font-mono" title={task.url}>
                                                {task.url}
                                            </span>
                                            
                                            {/* 状态指示器 */}
                                            {task.status === 'running' && <RefreshIcon className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                                            {task.status === 'success' && <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />}
                                            {task.status === 'error' && <ShieldExclamationIcon className="w-3.5 h-3.5 text-red-500" />}
                                            {task.status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-300"></div>}
                                        </div>
                                        
                                        {task.status === 'error' && (
                                            <div className="mt-1 text-[9px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded w-fit">
                                                {task.errorMessage}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 右侧：预览区 */}
                    <div className="flex-1 bg-white flex flex-col h-full overflow-hidden relative">
                        
                        {/* 预览工具栏 */}
                        <div className="h-10 border-b border-slate-100 flex items-center justify-between px-4 bg-white z-10">
                            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
                                <span>Content Preview</span>
                                {selectedTask && selectedTask.content && (
                                    <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-1.5 rounded">
                                        {selectedTask.content.length} chars
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setShowSource(!showSource)}
                                    className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${showSource ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {showSource ? <CodeIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                                    {showSource ? '源码' : '预览'}
                                </button>
                            </div>
                        </div>

                        {/* 预览内容 */}
                        <div className="flex-1 overflow-hidden relative" ref={previewContainerRef}>
                            {renderPreview}
                        </div>

                        {/* 底部确认栏 */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center gap-4">
                             <div className="text-xs text-slate-500">
                                 已选择导入 <span className="font-bold text-slate-800">{successCount}</span> 篇文档
                             </div>
                             <button 
                                onClick={handleConfirm}
                                disabled={isProcessing || successCount === 0}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-600 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center gap-2"
                             >
                                 <CheckIcon className="w-4 h-4" />
                                 确认导入
                             </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
