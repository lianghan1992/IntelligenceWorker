import React, { useState, useEffect, useCallback } from 'react';
import { LivestreamTask, PaginatedResponse, LivestreamTaskStats } from '../types';
import { getLivestreamTasks, getLivestreamTasksStats, startListenTask, stopListenTask, deleteLivestreamTask } from '../api';
import { TaskCard } from './TaskCard';
import { EventReportModal } from './EventReportModal';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, SearchIcon } from './icons';

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

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`text-3xl font-bold text-gray-800 mt-1 ${color}`}>{value}</p>
    </div>
);


export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [stats, setStats] = useState<LivestreamTaskStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ searchTerm: '', status: '' });
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    const [selectedEventForReport, setSelectedEventForReport] = useState<LivestreamTask | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddHistoryModalOpen, setIsAddHistoryModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);
    const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);


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
                    sort_by: 'start_time',
                    order: 'desc',
                }),
                getLivestreamTasksStats(),
            ]);
            setTasks(tasksData.items);
            setPagination(prev => ({ ...prev, total: tasksData.total, totalPages: tasksData.totalPages > 0 ? tasksData.totalPages : 1 }));
            setStats(statsData);
        } catch (err: any) {
            setError(err.message || '无法加载任务列表');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, debouncedSearchTerm, filters.status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (taskId: string, action: 'start' | 'stop' | 'delete') => {
        setProcessingTaskId(taskId);
        setError('');
        try {
            switch (action) {
                case 'start':
                    await startListenTask(taskId);
                    break;
                case 'stop':
                    await stopListenTask(taskId);
                    break;
                case 'delete':
                    if(taskToDelete) await deleteLivestreamTask(taskToDelete.id);
                    setTaskToDelete(null);
                    break;
            }
            await fetchData(); // Refresh data after action
        } catch (err: any) {
            setError(`操作失败: ${err.message}`);
        } finally {
            setProcessingTaskId(null);
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
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">发布会管理</h2>
            
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <StatCard label="全部" value={stats.total} color="text-gray-800" />
                    <StatCard label="监听中" value={stats.listening} color="text-cyan-600" />
                    <StatCard label="直播中" value={stats.recording} color="text-red-600" />
                    <StatCard label="处理中" value={stats.processing} color="text-yellow-600" />
                    <StatCard label="已完成" value={stats.completed} color="text-green-600" />
                    <StatCard label="失败" value={stats.failed} color="text-red-800" />
                </div>
            )}

            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            name="searchTerm"
                            value={filters.searchTerm}
                            onChange={handleFilterChange}
                            placeholder="搜索名称或URL..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                            <option value="">所有状态</option>
                            <option value="pending">即将开始</option>
                            <option value="listening">监听中</option>
                            <option value="recording">直播中</option>
                            <option value="processing">处理中</option>
                            <option value="completed">已结束</option>
                            <option value="failed">失败</option>
                        </select>
                         <button onClick={() => setIsAddHistoryModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 text-sm">
                            <PlusIcon className="w-5 h-5" />
                            <span>补录历史</span>
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                            <PlusIcon className="w-5 h-5" />
                            <span>新增任务</span>
                        </button>
                    </div>
                </div>
            </div>

            {isLoading && !tasks.length ? (
                <div className="text-center py-20">正在加载任务...</div>
            ) : tasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onViewReport={setSelectedEventForReport}
                            onStart={(id) => handleAction(id, 'start')}
                            onStop={(id) => handleAction(id, 'stop')}
                            onDelete={setTaskToDelete}
                            isProcessing={(id) => processingTaskId === id}
                        />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <p className="text-gray-500">暂无相关任务。</p>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                 <span className="text-sm text-gray-600">共 {pagination.total} 条记录</span>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span className="text-sm font-semibold">第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>

            {selectedEventForReport && <EventReportModal event={selectedEventForReport} onClose={() => setSelectedEventForReport(null)} />}
            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={fetchData} />}
            {isAddHistoryModalOpen && <AddHistoryEventModal onClose={() => setIsAddHistoryModalOpen(false)} onSuccess={fetchData} />}
            {taskToDelete && <ConfirmationModal title="确认删除任务" message={`您确定要删除 "${taskToDelete.livestream_name}" 吗？此操作将一并删除Bililive中的监听任务，且无法撤销。`} onConfirm={() => handleAction(taskToDelete.id, 'delete')} onCancel={() => setTaskToDelete(null)} isLoading={processingTaskId === taskToDelete.id} />}
        </div>
    );
};
