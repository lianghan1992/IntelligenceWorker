import React, { useState, useEffect, useCallback } from 'react';
import { LivestreamTask, PaginatedResponse } from '../types';
import { getLivestreamTasks, getLivestreamTasksStats, deleteLivestreamTask, startListenTask, stopListenTask } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';
import { PlusIcon, SearchIcon, TrashIcon, PlayIcon, StopIcon } from './icons';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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


export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [stats, setStats] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    
    const [filters, setFilters] = useState({ searchTerm: '', status: '' });
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    const [modal, setModal] = useState<'add' | 'addHistory' | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [tasksData, statsData] = await Promise.all([
                getLivestreamTasks({
                    page: pagination.page,
                    limit: pagination.limit,
                    search_term: debouncedSearchTerm,
                    status: filters.status,
                    sort_by: 'created_at',
                    order: 'desc'
                }),
                getLivestreamTasksStats()
            ]);
            setTasks(tasksData.items);
            setPagination(prev => ({ ...prev, total: tasksData.total, totalPages: tasksData.totalPages > 0 ? tasksData.totalPages : 1 }));
            setStats(statsData);
        } catch (err: any) {
            setError(err.message || '无法获取任务列表');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, debouncedSearchTerm, filters.status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    const handleDeleteConfirm = async () => {
        if (!taskToDelete) return;
        try {
            await deleteLivestreamTask(taskToDelete.id);
            setTaskToDelete(null);
            fetchData();
        } catch (err: any) {
            setError(err.message || '删除任务失败');
        }
    };

    const toggleListen = async (task: LivestreamTask) => {
        const isListening = task.status === 'listening';
        const action = isListening ? stopListenTask : startListenTask;
        try {
            await action(task.id);
            fetchData();
        } catch(err: any) {
            setError(`操作失败: ${err.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">发布会事件管理</h2>
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="搜索事件名称..." className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                             <option value="">所有状态</option>
                             {['pending', 'listening', 'recording', 'processing', 'completed', 'failed'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                         <button onClick={() => setModal('addHistory')} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50">
                            <PlusIcon className="w-5 h-5" /><span>录入历史事件</span>
                        </button>
                        <button onClick={() => setModal('add')} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                            <PlusIcon className="w-5 h-5" /><span>创建新事件</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">事件名称</th>
                            <th className="px-6 py-3">主办方</th>
                            <th className="px-6 py-3">开始时间</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={5} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && tasks.map(task => (
                            <tr key={task.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-800">{task.livestream_name}</td>
                                <td className="px-6 py-4">{task.host_name || task.entity || 'N/A'}</td>
                                <td className="px-6 py-4">{new Date(task.start_time).toLocaleString('zh-CN')}</td>
                                <td className="px-6 py-4">{task.status}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => toggleListen(task)} title={task.status === 'listening' ? "停止监听" : "开始监听"} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
                                        {task.status === 'listening' ? <StopIcon className="w-4 h-4 text-red-500"/> : <PlayIcon className="w-4 h-4 text-green-500"/>}
                                    </button>
                                    <button onClick={() => setTaskToDelete(task)} title="删除" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"><TrashIcon className="w-4 h-4 text-red-500" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <span className="text-sm text-gray-600">共 {pagination.total} 条记录</span>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span className="text-sm font-semibold">第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>

            {modal === 'add' && <AddEventModal onClose={() => setModal(null)} onSuccess={fetchData} />}
            {modal === 'addHistory' && <AddHistoryEventModal onClose={() => setModal(null)} onSuccess={fetchData} />}
            {taskToDelete && <ConfirmationModal title="确认删除事件" message={`您确定要删除 "${taskToDelete.livestream_name}" 吗？此操作无法撤销。`} onConfirm={handleDeleteConfirm} onCancel={() => setTaskToDelete(null)} />}
        </div>
    );
};
