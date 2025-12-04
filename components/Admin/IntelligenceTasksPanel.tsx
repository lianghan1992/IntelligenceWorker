
import React, { useState, useEffect, useCallback } from 'react';
import { IntelligenceTaskPublic, getTasks } from '../../api/intelligence';
import { RefreshIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const IntelligenceTasksPanel: React.FC = () => {
    const [tasks, setTasks] = useState<IntelligenceTaskPublic[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [statusFilter, setStatusFilter] = useState('');

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getTasks({
                page: pagination.page,
                limit: pagination.limit,
                status_filter: statusFilter || undefined
            });
            setTasks(res.items || []);
            // Mock total if not returned, or use res.total if available
            setPagination(p => ({ ...p, total: res.total || 100 })); 
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, statusFilter]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handlePageChange = (newPage: number) => {
        setPagination(p => ({ ...p, page: newPage }));
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" /> 系统任务监控
                    </h3>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 outline-none"
                    >
                        <option value="">所有状态</option>
                        <option value="等待中">等待中</option>
                        <option value="执行中">执行中</option>
                        <option value="已完成">已完成</option>
                        <option value="已失败">已失败</option>
                    </select>
                </div>
                <button onClick={fetchTasks} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/30 p-6 custom-scrollbar">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3">任务类型</th>
                                <th className="px-6 py-3">来源/点位</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">阶段详情</th>
                                <th className="px-6 py-3">开始时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10"><Spinner /></td></tr>
                            ) : tasks.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10 text-slate-400">暂无任务</td></tr>
                            ) : tasks.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-800">{t.task_type}</td>
                                    <td className="px-6 py-3">
                                        <div className="text-xs font-bold">{t.source_name}</div>
                                        <div className="text-slate-400 text-[10px]">{t.point_name}</div>
                                        <div className="text-slate-300 text-[10px] truncate max-w-[200px]" title={t.url}>{t.url}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === '已完成' ? 'bg-green-100 text-green-700' : t.status === '已失败' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="text-xs text-slate-600">{t.stage || '-'}</div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-xs" title={t.detail_info}>{t.detail_info}</div>
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono">{t.start_time ? new Date(t.start_time).toLocaleString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Pagination */}
                    <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-white">
                        <span className="text-xs text-slate-400">第 {pagination.page} 页</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                                disabled={pagination.page <= 1}
                                className="p-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                                <ChevronLeftIcon className="w-4 h-4"/>
                            </button>
                            <button 
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={tasks.length < pagination.limit} // Simple check
                                className="p-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                                <ChevronRightIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
