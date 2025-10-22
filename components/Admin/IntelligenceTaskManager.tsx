import React, { useState, useEffect, useCallback } from 'react';
import { CrawlerTask } from '../../types';
import { getCrawlerTasks } from '../../api';
import { RefreshIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from '../icons';

const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'running') return { text: '采集中', className: 'bg-blue-100 text-blue-800 animate-pulse' };
    if (statusLower === 'completed') return { text: '已完成', className: 'bg-green-100 text-green-800' };
    if (statusLower === 'failed') return { text: '失败', className: 'bg-red-100 text-red-800 font-bold' };
    if (statusLower === 'pending') return { text: '排队中', className: 'bg-yellow-100 text-yellow-800' };
    return { text: status, className: 'bg-gray-100 text-gray-800' };
};

const SortableHeader: React.FC<{
    column: string;
    label: string;
    sortConfig: { sort_by: string; order: string };
    onSort: (column: string) => void;
    className?: string;
}> = ({ column, label, sortConfig, onSort, className = "px-6 py-3" }) => (
    <th scope="col" className={className}>
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => onSort(column)}>
            {label}
            {sortConfig.sort_by === column ? (
                sortConfig.order === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
            ) : (
                <ChevronUpDownIcon className="w-3 h-3 text-gray-400" />
            )}
        </div>
    </th>
);

export const IntelligenceTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<CrawlerTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
    const [sort, setSort] = useState({ sort_by: 'start_time', order: 'desc' });

    const loadTasks = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                sort_by: sort.sort_by,
                order: sort.order,
            };
            const response = await getCrawlerTasks(params);
            if (response && Array.isArray(response.items)) {
                setTasks(response.items);
                setPagination({
                    page: response.page,
                    limit: response.limit,
                    total: response.total,
                    totalPages: response.totalPages ?? 1,
                });
            } else {
                setTasks([]);
                setPagination({ page: 1, limit: 15, total: 0, totalPages: 1 });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取采集任务失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, sort]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleSort = (column: string) => {
        const isAsc = sort.sort_by === column && sort.order === 'asc';
        setSort({ sort_by: column, order: isAsc ? 'desc' : 'asc' });
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };
    
    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-800">采集任务监控</h2>
                 <button onClick={() => loadTasks()} className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
            
            <div className="bg-white rounded-lg border overflow-y-auto flex-1">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <SortableHeader column="source_name" label="情报源" sortConfig={sort} onSort={handleSort} />
                            <th scope="col" className="px-6 py-3">情报点</th>
                            <SortableHeader column="start_time" label="开始时间" sortConfig={sort} onSort={handleSort} />
                            <SortableHeader column="status" label="状态" sortConfig={sort} onSort={handleSort} />
                            <th scope="col" className="px-6 py-3">新增文章数</th>
                            <th scope="col" className="px-6 py-3">日志</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-10">加载中...</td></tr>
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10">未找到任何任务。</td></tr>
                        ) : (
                            tasks.map(task => {
                                const statusBadge = getStatusBadge(task.status);
                                return (
                                <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{task.source_name}</td>
                                    <td className="px-6 py-4">{task.point_name}</td>
                                    <td className="px-6 py-4">{new Date(task.start_time).toLocaleString('zh-CN')}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span></td>
                                    <td className="px-6 py-4 font-medium text-center">{task.new_articles_count}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500 max-w-sm truncate" title={task.logs || ''}>{task.logs || '-'}</td>
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
