import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentTask, PaginatedDocumentsResponse } from '../../types';
import { getDocuments, uploadDocument, deleteDocument, regenerateHtml, downloadHtml } from '../../api';
import {
    PlusIcon, RefreshIcon, DownloadIcon, TrashIcon, SparklesIcon,
    ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon, CheckIcon, ClockIcon, CloseIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

const Spinner: React.FC<{ small?: boolean }> = ({ small }) => (
    <svg className={`animate-spin ${small ? 'h-4 w-4' : 'h-5 w-5'} text-gray-500`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getStatusBadge = (status: DocumentTask['status']) => {
    switch (status) {
        case 'completed': return { text: '已完成', className: 'bg-green-100 text-green-800' };
        case 'processing': return { text: '处理中', className: 'bg-blue-100 text-blue-800 animate-pulse' };
        case 'pending': return { text: '排队中', className: 'bg-yellow-100 text-yellow-800' };
        case 'failed': return { text: '失败', className: 'bg-red-100 text-red-800 font-bold' };
        default: return { text: '未知', className: 'bg-gray-100 text-gray-800' };
    }
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const MarkdownToHtmlManager: React.FC = () => {
    const [tasks, setTasks] = useState<DocumentTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, totalPages: 1 });
    const [sort, setSort] = useState({ sort_by: 'created_at', sort_order: 'desc' });
    
    const [taskToDelete, setTaskToDelete] = useState<DocumentTask | null>(null);
    const [regeneratingTaskId, setRegeneratingTaskId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadTasks = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: pagination.page,
                page_size: pagination.page_size,
                sort_by: sort.sort_by,
                sort_order: sort.sort_order,
            };
            const response = await getDocuments(params);
            setTasks(response.items || []);
            setPagination(prev => ({ ...prev, total: response.total, totalPages: response.totalPages }));
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取任务列表失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [pagination.page, pagination.page_size, sort]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        try {
            await uploadDocument(file);
            await loadTasks(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : '上传失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    
    const handleDownload = async (task: DocumentTask) => {
        setActionLoading(true);
        try {
            const blob = await downloadHtml(task.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.original_filename.split('.')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : '下载失败');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRegenerate = async (task: DocumentTask) => {
        if (regeneratingTaskId) return; // Prevent multiple clicks
        setRegeneratingTaskId(task.id);
        setError(null);
        try {
            await regenerateHtml(task.id);
            // Wait a moment for the backend to update status, then refresh.
            setTimeout(async () => {
                await loadTasks(false);
                setRegeneratingTaskId(null); // Set to null after refresh
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? `重新生成 "${task.original_filename}" 失败: ${err.message}` : '操作失败');
            setRegeneratingTaskId(null); // Also reset on error
        }
    };

    const handleDeleteConfirm = async () => {
        if (!taskToDelete) return;

        setActionLoading(true);
        setError(null);
        try {
            await deleteDocument(taskToDelete.id);
            await loadTasks(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : '删除失败');
        } finally {
            setActionLoading(false);
            setTaskToDelete(null);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Markdown转HTML任务</h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => loadTasks()} className="p-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading && !tasks.length ? 'animate-spin' : ''}`} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.md,.txt,.docx" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition disabled:bg-blue-300">
                        {isUploading ? <Spinner /> : <PlusIcon className="w-4 h-4" />}
                        <span>{isUploading ? '上传中...' : '上传文档'}</span>
                    </button>
                </div>
            </div>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
            
            <div className="flex-1 overflow-y-auto">
                {/* Desktop Table */}
                <div className="bg-white rounded-lg border overflow-x-auto hidden md:block">
                     <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">文件名</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">文件大小</th>
                                <th className="px-6 py-3">页数</th>
                                <th className="px-6 py-3">创建时间</th>
                                <th className="px-6 py-3">更新时间</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10"><Spinner /></td></tr>
                            ) : !isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10">未找到任何任务。</td></tr>
                            ) : (
                                tasks.map(task => {
                                    const statusBadge = getStatusBadge(task.status);
                                    const isAnyActionInProgress = actionLoading || !!regeneratingTaskId;
                                    return (
                                    <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={task.original_filename}>{task.original_filename}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span></td>
                                        <td className="px-6 py-4">{formatBytes(task.file_size)}</td>
                                        <td className="px-6 py-4">{task.total_pages}</td>
                                        <td className="px-6 py-4">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                        <td className="px-6 py-4">{new Date(task.updated_at).toLocaleString('zh-CN')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                <button onClick={() => handleDownload(task)} disabled={task.status !== 'completed' || isAnyActionInProgress} className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed">下载</button>
                                                <button onClick={() => handleRegenerate(task)} disabled={isAnyActionInProgress} className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-20">
                                                    {regeneratingTaskId === task.id ? <Spinner small /> : '重新生成'}
                                                </button>
                                                <button onClick={() => setTaskToDelete(task)} disabled={isAnyActionInProgress} className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50">删除</button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                     </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {isLoading && tasks.length === 0 ? <div className="text-center py-10 text-gray-500">加载中...</div> :
                     !isLoading && tasks.length === 0 ? <div className="text-center py-10 text-gray-500">未找到任何任务。</div> :
                     tasks.map(task => {
                        const statusBadge = getStatusBadge(task.status);
                        const isAnyActionInProgress = actionLoading || !!regeneratingTaskId;
                         return (
                            <div key={task.id} className="bg-white rounded-lg border p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-gray-900 pr-4 break-all">{task.original_filename}</p>
                                    <span className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t text-sm grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div><strong className="text-gray-500">文件大小: </strong>{formatBytes(task.file_size)}</div>
                                    <div><strong className="text-gray-500">页数: </strong>{task.total_pages}</div>
                                    <div className="col-span-2"><strong className="text-gray-500">创建于: </strong>{new Date(task.created_at).toLocaleString('zh-CN')}</div>
                                </div>
                                <div className="mt-4 pt-3 border-t flex items-center justify-end gap-2 flex-wrap">
                                     <button onClick={() => handleDownload(task)} disabled={task.status !== 'completed' || isAnyActionInProgress} className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed">下载</button>
                                    <button onClick={() => handleRegenerate(task)} disabled={isAnyActionInProgress} className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-20">
                                        {regeneratingTaskId === task.id ? <Spinner small /> : '重新生成'}
                                    </button>
                                    <button onClick={() => setTaskToDelete(task)} disabled={isAnyActionInProgress} className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50">删除</button>
                                </div>
                            </div>
                         )
                     })
                    }
                </div>
            </div>

            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center mt-4 text-sm gap-4">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50"><ChevronLeftIcon className="w-4 h-4" /></button>
                    <span>第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50"><ChevronRightIcon className="w-4 h-4" /></button>
                </div>
            </div>

            {taskToDelete && (
                 <ConfirmationModal
                    title="确认删除"
                    message={`您确定要删除 "${taskToDelete.original_filename}" 的任务吗？`}
                    confirmText="确认删除"
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setTaskToDelete(null)}
                    isLoading={actionLoading}
                />
            )}
        </div>
    );
};