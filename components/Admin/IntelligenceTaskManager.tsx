
import React, { useState, useEffect, useCallback } from 'react';
import { ApiProcessingTask } from '../../types';
import { getSources } from '../../api'; // You might need a way to get all tasks, let's assume an API exists
// Assuming an API function `getIntelligenceTasks` exists. It's not in the provided `api.ts`, so I'll create a placeholder.
// In a real scenario, this would be in `api.ts`.
import { apiFetch } from '../../api';
import { ChartIcon, CheckIcon, CloseIcon, SparklesIcon } from '../icons';

const getIntelligenceTasks = (params: any): Promise<any> => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/intelligence/tasks?${query}`);
}
const getIntelligenceTasksStats = (): Promise<any> => {
    return apiFetch(`/api/intelligence/tasks/stats`);
}

// --- Internal Components ---
const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-4 shadow-sm">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full flex-shrink-0">{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') return { text: '已完成', className: 'bg-green-100 text-green-800' };
    if (statusLower === 'processing') return { text: '处理中', className: 'bg-indigo-100 text-indigo-800 animate-pulse' };
    if (statusLower === 'failed') return { text: '失败', className: 'bg-red-100 text-red-800 font-bold' };
    return { text: status, className: 'bg-gray-100 text-gray-800' };
};

export const IntelligenceTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<ApiProcessingTask[]>([]);
    const [stats, setStats] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ status: '', source_name: '' });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                status: filters.status || undefined,
                source_name: filters.source_name || undefined,
            };
            const [tasksResponse, statsResponse] = await Promise.all([
                getIntelligenceTasks(params),
                getIntelligenceTasksStats()
            ]);
            
            setTasks(tasksResponse.items || []);
            setPagination({
                page: tasksResponse.page,
                limit: tasksResponse.limit,
                total: tasksResponse.total,
                totalPages: Math.ceil(tasksResponse.total / tasksResponse.limit),
            });
            setStats(statsResponse || {});
        } catch (err) {
            setError(err instanceof Error ? err.message : '发生未知错误');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };
    
    return (
        <div className="h-full flex flex-col">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="任务总数" value={stats.total || 0} icon={<ChartIcon className="w-6 h-6"/>} />
                <StatCard title="处理中" value={stats.processing || 0} icon={<SparklesIcon className="w-6 h-6"/>} />
                <StatCard title="已完成" value={stats.completed || 0} icon={<CheckIcon className="w-6 h-6"/>} />
                <StatCard title="失败" value={stats.failed || 0} icon={<CloseIcon className="w-6 h-6"/>} />
            </div>

             <div className="mb-4 p-4 bg-white rounded-lg border flex items-center gap-4">
                <input type="text" name="source_name" value={filters.source_name} onChange={handleFilterChange} placeholder="按情报源名称筛选..." className="w-full bg-white border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select name="status" value={filters.status} onChange={handleFilterChange} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">所有状态</option>
                    <option value="processing">处理中</option>
                    <option value="completed">已完成</option>
                    <option value="failed">失败</option>
                </select>
            </div>
            
            <div className="bg-white rounded-lg border overflow-x-auto flex-1">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">情报源/点</th>
                            <th scope="col" className="px-6 py-3">URL</th>
                            <th scope="col" className="px-6 py-3">状态</th>
                            <th scope="col" className="px-6 py-3">创建时间</th>
                            <th scope="col" className="px-6 py-3">更新时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center py-10">加载中...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={5} className="text-center py-10 text-red-500">{error}</td></tr>
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10">未找到任何任务。</td></tr>
                        ) : (
                            tasks.map(task => {
                                const statusBadge = getStatusBadge(task.status);
                                return (
                                <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{task.source_name}<br/><span className="text-xs text-gray-500 font-normal">{task.point_name}</span></td>
                                    <td className="px-6 py-4"><a href={task.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">{task.url}</a></td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span></td>
                                    <td className="px-6 py-4">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                    <td className="px-6 py-4">{new Date(task.updated_at).toLocaleString('zh-CN')}</td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm flex-shrink-0">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span>第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>
        </div>
    );
};
