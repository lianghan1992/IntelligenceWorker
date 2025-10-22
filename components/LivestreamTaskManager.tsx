import React, { useState, useEffect, useCallback } from 'react';
import {
    getLivestreamTasks,
    getLivestreamTasksStats,
    deleteLivestreamTask,
    startListenTask,
    stopListenTask,
} from '../api';
import { LivestreamTask, LivestreamTaskStats } from '../types';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';
import { EventReportModal } from './EventReportModal';
import { ConfirmationModal } from './ConfirmationModal';
import { TaskCard } from './TaskCard';
import { PlusIcon, SearchIcon, ArrowLeftIcon, ArrowRightIcon } from './icons';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};


export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [stats, setStats] = useState<LivestreamTaskStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ status: '', searchTerm: '' });
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    const [modal, setModal] = useState<'add' | 'addHistory' | 'viewReport' | 'confirmDelete' | null>(null);
    const [selectedTask, setSelectedTask] = useState<LivestreamTask | null>(null);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const fetchTasksAndStats = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [tasksData, statsData] = await Promise.all([
                getLivestreamTasks({
                    page: pagination.page,
                    limit: pagination.limit,
                    status: filters.status || undefined,
                    search_term: debouncedSearchTerm || undefined,
                    sort_by: 'start_time',
                    order: 'desc',
                }),
                getLivestreamTasksStats(),
            ]);

            setTasks(tasksData.items);
            setPagination(p => ({ ...p, total: tasksData.total, totalPages: tasksData.totalPages > 0 ? tasksData.totalPages : 1 }));
            setStats(statsData);
        } catch (err: any) {
            setError(err.message || '无法获取任务列表');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, filters.status, debouncedSearchTerm]);
    
    useEffect(() => {
        fetchTasksAndStats();
    }, [fetchTasksAndStats]);

    const handleAction = async (action: (taskId: string) => Promise<any>, taskId: string) => {
        setProcessingIds(prev => new Set(prev).add(taskId));
        setError('');
        try {
            await action(taskId);
            await fetchTasksAndStats();
        } catch (err: any) {
            setError(err.message || '操作失败');
        } finally {
            setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };

    const handleStart = (taskId: string) => handleAction(startListenTask, taskId);
    const handleStop = (taskId: string) => handleAction(stopListenTask, taskId);
    
    const handleDelete = (task: LivestreamTask) => {
        setSelectedTask(task);
        setModal('confirmDelete');
    };
    
    const handleDeleteConfirm = async () => {
        if (!selectedTask) return;
        await handleAction(deleteLivestreamTask, selectedTask.id);
        setModal(null);
        setSelectedTask(null);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setPagination(p => ({ ...p, page: 1 }));
        setFilters(f => ({ ...f, [name]: value }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(p => ({ ...p, page: newPage }));
        }
    };

    const StatButton: React.FC<{ label: string; value: number | undefined; statusKey: string }> = ({ label, value, statusKey }) => (
        <button
            onClick={() => handleFilterChange({ target: { name: 'status', value: statusKey } } as any)}
            className={`text-left p-3 rounded-lg border transition-colors ${filters.status === statusKey ? 'bg-blue-50 border-blue-400' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
        >
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value ?? '-'}</p>
        </button>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">发布会与直播管理</h2>
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <StatButton label="全部" value={stats?.total} statusKey="" />
                <StatButton label="待启动" value={stats?.pending} statusKey="pending" />
                <StatButton label="监听中" value={stats?.listening} statusKey="listening" />
                <StatButton label="录制中" value={stats?.recording} statusKey="recording" />
                <StatButton label="处理中" value={stats?.processing} statusKey="processing" />
                <StatButton label="已完成" value={stats?.completed} statusKey="completed" />
                <StatButton label="失败" value={stats?.failed} statusKey="failed" />
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="搜索任务名称或URL..." className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4" />
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal('addHistory')} className="px-4 py-2 bg-white border text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-100">创建历史任务</button>
                    <button onClick={() => setModal('add')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                        <PlusIcon className="w-5 h-5" />
                        创建新任务
                    </button>
                </div>
            </div>

            {isLoading && !tasks.length ? (
                <div className="text-center py-20 text-gray-500">正在加载任务...</div>
            ) : tasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onStart={handleStart}
                            onStop={handleStop}
                            onDelete={handleDelete}
                            onViewReport={(t) => { setSelectedTask(t); setModal('viewReport'); }}
                            isProcessing={(id) => processingIds.has(id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <p className="text-gray-500">没有找到符合条件的任务。</p>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <span className="text-sm text-gray-600">共 {pagination.total} 条记录</span>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading} className="p-2 bg-white border rounded-md disabled:opacity-50"> <ArrowLeftIcon className="w-5 h-5"/> </button>
                    <span className="text-sm font-semibold">第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading} className="p-2 bg-white border rounded-md disabled:opacity-50"> <ArrowRightIcon className="w-5 h-5"/> </button>
                </div>
            </div>

            {modal === 'add' && <AddEventModal onClose={() => setModal(null)} onSuccess={fetchTasksAndStats} />}
            {modal === 'addHistory' && <AddHistoryEventModal onClose={() => setModal(null)} onSuccess={fetchTasksAndStats} />}
            {modal === 'viewReport' && <EventReportModal event={selectedTask} onClose={() => { setModal(null); setSelectedTask(null); }} />}
            {modal === 'confirmDelete' && selectedTask && (
                <ConfirmationModal
                    title="确认删除任务"
                    message={`您确定要删除 "${selectedTask.livestream_name}" 吗？此操作无法撤销。`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => { setModal(null); setSelectedTask(null); }}
                    isLoading={processingIds.has(selectedTask.id)}
                />
            )}
        </div>
    );
};
