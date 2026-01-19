
import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightTask, DeepInsightPage } from '../../../types';
import { 
    getDeepInsightTask, 
    getDeepInsightTaskPages, 
    downloadDeepInsightBundle,
    getDeepInsightTaskStatus,
    fetchDeepInsightCover,
    regenerateDeepInsightSummary,
    regenerateDeepInsightCover
} from '../../../api';
import { ChevronLeftIcon, RefreshIcon, DownloadIcon, DocumentTextIcon, PhotoIcon, SparklesIcon } from '../../icons';

interface TaskDetailProps {
    taskId: string;
    onBack: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: any = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800 animate-pulse',
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800 font-bold'
    };
    const labels: any = {
        pending: '等待中',
        processing: '处理中',
        completed: '已完成',
        failed: '失败'
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
};

export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onBack }) => {
    const [task, setTask] = useState<DeepInsightTask | null>(null);
    const [pages, setPages] = useState<DeepInsightPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [downloading, setDownloading] = useState(false);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    
    // Action loading states
    const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
    const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const taskData = await getDeepInsightTask(taskId);
            setTask(taskData);
            
            // Generate dummy pages for grid view based on total_pages since backend doesn't list pages
            const dummyPages = Array.from({ length: taskData.total_pages }).map((_, i) => ({
                id: `page-${i + 1}`,
                page_index: i + 1,
                status: 'completed' // Assuming pages are ready if task is completed
            }));
            
            setPages(dummyPages);
            setPagination(p => ({ ...p, total: taskData.total_pages }));
        } catch (err: any) {
            setError(err.message || '加载详情失败');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchData();
        
        // Polling with Status Snapshot
        const interval = setInterval(async () => {
            if (task?.status === 'processing' || task?.status === 'pending') {
                try {
                    const statusSnapshot = await getDeepInsightTaskStatus(taskId);
                    if (
                        statusSnapshot.status !== task.status || 
                        statusSnapshot.processed_pages !== task.processed_pages
                    ) {
                        fetchData(true);
                    }
                } catch (e) {
                    console.warn("Status polling failed", e);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchData, task?.status, task?.processed_pages, taskId]);

    useEffect(() => {
        let active = true;
        // Always try to fetch cover if task exists
        if (task) {
            fetchDeepInsightCover(taskId).then(url => {
                if (active && url) setCoverUrl(url);
            });
        }
        return () => { active = false; if (coverUrl) URL.revokeObjectURL(coverUrl); };
    }, [taskId, isRegeneratingCover]); // Reload when cover regenerated

    const handleDownloadBundle = async () => {
        if (!task) return;
        setDownloading(true);
        try {
            const blob = await downloadDeepInsightBundle(taskId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.file_name}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('下载失败');
        } finally {
            setDownloading(false);
        }
    };

    const handleRegenSummary = async () => {
        setIsRegeneratingSummary(true);
        try {
            await regenerateDeepInsightSummary(taskId);
            alert('摘要生成任务已触发');
            fetchData(true);
        } catch (e: any) {
            alert('操作失败: ' + e.message);
        } finally {
            setIsRegeneratingSummary(false);
        }
    };

    const handleRegenCover = async () => {
        setIsRegeneratingCover(true);
        try {
            await regenerateDeepInsightCover(taskId);
            alert('封面生成任务已触发');
            // Cover URL effect will pick up change eventually
        } catch (e: any) {
            alert('操作失败: ' + e.message);
        } finally {
            setIsRegeneratingCover(false);
        }
    };

    if (isLoading && !task) return <div className="flex justify-center p-10"><Spinner /></div>;
    if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
    if (!task) return null;

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        {coverUrl ? (
                            <img src={coverUrl} alt="Cover" className="w-12 h-16 object-cover rounded border shadow-sm flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-16 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                <DocumentTextIcon className="w-6 h-6 text-gray-300" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 truncate">
                                <span className="truncate">{task.file_name}</span>
                                <StatusBadge status={task.status} />
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                {task.processed_pages} / {task.total_pages} 页 • {task.category_name || '未分类'} • {new Date(task.updated_at).toLocaleString('zh-CN')}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 self-end md:self-auto">
                    <button 
                        onClick={handleRegenSummary}
                        disabled={isRegeneratingSummary}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                        title="重新生成智能摘要"
                    >
                        {isRegeneratingSummary ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={handleRegenCover}
                        disabled={isRegeneratingCover}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                        title="重新生成封面"
                    >
                        {isRegeneratingCover ? <Spinner /> : <PhotoIcon className="w-5 h-5" />}
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <button onClick={() => fetchData()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="刷新">
                        <RefreshIcon className="w-5 h-5" />
                    </button>
                    {task.status === 'completed' && (
                        <button 
                            onClick={handleDownloadBundle}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {downloading ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                            下载原文
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Block */}
            {task.summary && (
                <div className="px-6 py-4 bg-white border-b border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">AI 智能摘要</h4>
                    <p className="text-sm text-gray-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {task.summary}
                    </p>
                </div>
            )}

            {/* Pages Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {pages.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">正在解析文档页面...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {pages.map((page) => (
                            <div key={page.id} className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                                <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden border-b flex items-center justify-center">
                                    <DocumentTextIcon className="w-12 h-12 text-gray-300 opacity-50" />
                                    <div className="absolute bottom-2 left-0 right-0 text-center">
                                        <span className="text-xs font-mono text-gray-400 bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                            Page {page.page_index}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2 bg-white text-center">
                                     <span className="text-xs text-gray-400">预览图暂未生成</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
