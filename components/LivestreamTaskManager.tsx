import React, { useState, useEffect, useCallback } from 'react';
import { LivestreamTask, Prompt } from '../types';
import { getLivestreamTasks, deleteLivestreamTask, startListenTask, stopListenTask } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, TrashIcon, PlayIcon, StopIcon, SearchIcon, ArrowLeftIcon, ArrowRightIcon } from './icons';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';
import { PromptDisplayModal } from './PromptDisplayModal';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'recording': return 'bg-red-100 text-red-800';
        case 'listening': return 'bg-cyan-100 text-cyan-800';
        case 'pending': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'processing': return 'bg-indigo-100 text-indigo-800';
        case 'failed': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getSafeImageUrl = (base64String: string | null): string | null => {
    if (!base64String) return null;
    if (base64String.startsWith('data:image')) {
        return base64String;
    }
    return `data:image/jpeg;base64,${base64String}`;
};


export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ searchTerm: '', status: '' });
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);
    const [sorting, setSorting] = useState({ sortBy: 'created_at', order: 'desc' });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [promptToView, setPromptToView] = useState<{title: string, prompt: Prompt} | null>(null);


    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getLivestreamTasks({
                page: pagination.page,
                limit: pagination.limit,
                search_term: debouncedSearchTerm,
                status: filters.status,
                sort_by: sorting.sortBy,
                order: sorting.order,
            });
            setTasks(data.items);
            setPagination(prev => ({ ...prev, total: data.total, totalPages: data.totalPages > 0 ? data.totalPages : 1 }));
        } catch (err: any) {
            setError(err.message || '无法获取任务列表');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, debouncedSearchTerm, filters.status, sorting.sortBy, sorting.order]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    const handleAction = async (taskId: string, action: 'start' | 'stop' | 'delete') => {
        setActionLoading(taskId);
        setError('');
        try {
            switch(action) {
                case 'start':
                    await startListenTask(taskId);
                    break;
                case 'stop':
                    await stopListenTask(taskId);
                    break;
                case 'delete':
                    await deleteLivestreamTask(taskId);
                    setTaskToDelete(null);
                    break;
            }
            await fetchTasks(); // Refresh list after action
        } catch (err: any) {
             setError(`操作失败: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleDeleteConfirm = () => {
        if (taskToDelete) {
            handleAction(taskToDelete.id, 'delete');
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPagination(p => ({ ...p, page: 1 }));
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(p => ({ ...p, page: newPage }));
        }
    };
    
    const handleSort = (newSortBy: string) => {
        setSorting(prev => ({
            sortBy: newSortBy,
            order: prev.sortBy === newSortBy && prev.order === 'asc' ? 'desc' : 'asc'
        }));
        setPagination(p => ({ ...p, page: 1 }));
    };

    const SortIndicator: React.FC<{ columnKey: string }> = ({ columnKey }) => {
        if (sorting.sortBy !== columnKey) return null;
        return <span className="ml-1">{sorting.order === 'asc' ? '▲' : '▼'}</span>;
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">事件分析任务管理</h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                        <PlusIcon className="w-4 h-4" /> <span>创建历史任务</span>
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                        <PlusIcon className="w-4 h-4" /> <span>创建新任务</span>
                    </button>
                </div>
            </div>
            
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
            
             <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-grow md:max-w-xs">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange}
                            placeholder="搜索直播或主播名称..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full md:w-40 bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm">
                            <option value="">所有状态</option>
                            <option value="pending">即将开始</option>
                            <option value="listening">监听中</option>
                            <option value="recording">直播中</option>
                            <option value="processing">AI总结</option>
                            <option value="completed">已完成</option>
                            <option value="failed">失败</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 w-16">封面</th>
                            <th onClick={() => handleSort('livestream_name')} className="px-6 py-3 cursor-pointer hover:bg-gray-100">事件 / 主播 <SortIndicator columnKey="livestream_name" /></th>
                            <th className="px-6 py-3">关联实体</th>
                            <th className="px-6 py-3">提示词</th>
                            <th onClick={() => handleSort('status')} className="px-6 py-3 cursor-pointer hover:bg-gray-100">状态 <SortIndicator columnKey="status" /></th>
                            <th onClick={() => handleSort('start_time')} className="px-6 py-3 cursor-pointer hover:bg-gray-100">开始时间 <SortIndicator columnKey="start_time" /></th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={7} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && tasks.map(task => (
                            <tr key={task.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <img src={getSafeImageUrl(task.livestream_image) || `https://ui-avatars.com/api/?name=${task.livestream_name}&background=random`} alt={task.livestream_name} className="w-14 h-10 object-cover rounded-md bg-gray-200" />
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                    <a href={task.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-800 hover:text-blue-600 hover:underline truncate block">{task.livestream_name}</a>
                                    <div className="text-xs text-gray-500">{task.host_name}</div>
                                </td>
                                <td className="px-6 py-4">{task.entity || 'N/A'}</td>
                                <td className="px-6 py-4">
                                     <button 
                                        onClick={() => setPromptToView({
                                            title: `任务: ${task.livestream_name}`,
                                            prompt: {
                                                name: '应用提示词',
                                                description: `此任务在分析时使用的提示词内容。`,
                                                prompt: task.prompt_content || '该任务没有配置提示词。'
                                            }
                                        })}
                                        disabled={!task.prompt_content}
                                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        查看提示
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                        {task.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{new Date(task.start_time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                     {actionLoading === task.id ? <Spinner className="w-4 h-4 text-gray-500" /> : (
                                         <>
                                            {['pending', 'recording'].includes(task.status.toLowerCase()) && <button onClick={() => handleAction(task.id, 'start')} className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded hover:bg-green-200">开始监听</button>}
                                            {['listening', 'recording'].includes(task.status.toLowerCase()) && <button onClick={() => handleAction(task.id, 'stop')} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded hover:bg-yellow-200">停止监听</button>}
                                            <button onClick={() => setTaskToDelete(task)} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200">删除</button>
                                         </>
                                     )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <span className="text-sm text-gray-600">共 {pagination.total} 条记录</span>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span>上一页</span>
                    </button>
                    <span className="text-sm font-semibold">第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                        <span>下一页</span>
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={fetchTasks} />}
            {isHistoryModalOpen && <AddHistoryEventModal onClose={() => setIsHistoryModalOpen(false)} onSuccess={fetchTasks} />}
            {taskToDelete && <ConfirmationModal title="确认删除任务" message={`您确定要删除任务 "${taskToDelete.livestream_name}" 吗？此操作无法撤销。`} onConfirm={handleDeleteConfirm} onCancel={() => setTaskToDelete(null)} />}
            {promptToView && <PromptDisplayModal title={promptToView.title} prompt={promptToView.prompt} onClose={() => setPromptToView(null)} />}
        </div>
    );
};