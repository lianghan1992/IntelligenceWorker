
import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightTask, DeepInsightPage } from '../../../types';
import { 
    getDeepInsightTask, 
    getDeepInsightTaskPages, 
    downloadDeepInsightPagePdf, 
    downloadDeepInsightBundle,
    getDeepInsightTaskStatus,
    fetchDeepInsightCover
} from '../../../api';
import { ChevronLeftIcon, RefreshIcon, DownloadIcon, DocumentTextIcon, CloseIcon } from '../../icons';

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

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const taskData = await getDeepInsightTask(taskId);
            setTask(taskData);
            
            const pagesData = await getDeepInsightTaskPages(taskId, pagination.page, pagination.limit);
            setPages(pagesData.items || []);
            setPagination(p => ({ ...p, total: pagesData.total }));
        } catch (err: any) {
            setError(err.message || '加载详情失败');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [taskId, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchData();
        
        // Polling with Status Snapshot
        const interval = setInterval(async () => {
            if (task?.status === 'processing' || task?.status === 'pending') {
                try {
                    const statusSnapshot = await getDeepInsightTaskStatus(taskId);
                    
                    // If status changed or new pages processed, refresh full data
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
        if (task?.status === 'completed') {
            fetchDeepInsightCover(taskId).then(url => {
                if (active && url) setCoverUrl(url);
            });
        }
        return () => { active = false; if (coverUrl) URL.revokeObjectURL(coverUrl); };
    }, [task?.status, taskId]);

    const handleDownloadPage = async (pageIndex: number) => {
        try {
            const blob = await downloadDeepInsightPagePdf(taskId, pageIndex);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `page_${pageIndex}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('下载失败');
        }
    };

    const handleDownloadBundle = async () => {
        if (!task) return;
        setDownloading(true);
        try {
            const blob = await downloadDeepInsightBundle(taskId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.file_name}_bundle.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('下载合稿失败');
        } finally {
            setDownloading(false);
        }
    };

    if (isLoading && !task) return <div className="flex justify-center p-10"><Spinner /></div>;
    if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
    if (!task) return null;

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        {coverUrl ? (
                            <img src={coverUrl} alt="Cover" className="w-12 h-16 object-cover rounded border shadow-sm" />
                        ) : (
                            <div className="w-12 h-16 bg-gray-100 rounded border flex items-center justify-center">
                                <DocumentTextIcon className="w-6 h-6 text-gray-300" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {task.file_name}
                                <StatusBadge status={task.status} />
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                ID: {task.id} • {task.processed_pages} / {task.total_pages} 页 • 更新于 {new Date(task.updated_at).toLocaleString('zh-CN')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => fetchData()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="刷新">
                        <RefreshIcon className="w-5 h-5" />
                    </button>
                    {task.status === 'completed' && (
                        <button 
                            onClick={handleDownloadBundle}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {downloading ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                            下载完整PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Pages Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {pages.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">暂无页面数据或正在解析中...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {pages.map((page) => (
                            <div key={page.id} className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                                <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden border-b">
                                    {/* Image Placeholder - In real app, display image_path if available (needs auth proxy usually) */}
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                        <DocumentTextIcon className="w-12 h-12 opacity-20" />
                                        <span className="text-xs absolute mt-8 font-mono text-gray-400">PAGE {page.page_index}</span>
                                    </div>
                                    {/* Status Overlay */}
                                    <div className="absolute top-2 right-2">
                                        <StatusBadge status={page.status} />
                                    </div>
                                </div>
                                <div className="p-3 flex justify-between items-center bg-white">
                                    <span className="text-xs text-gray-500">第 {page.page_index} 页</span>
                                    <button 
                                        onClick={() => handleDownloadPage(page.page_index)}
                                        disabled={page.status !== 'completed'}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="下载单页PDF"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
                <div className="bg-white border-t p-4 flex justify-between items-center text-sm">
                    <span className="text-gray-600">共 {pagination.total} 页</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={pagination.page <= 1} 
                            onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <span className="px-2 py-1 text-gray-600">{pagination.page}</span>
                        <button 
                            disabled={pagination.page * pagination.limit >= pagination.total} 
                            onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
