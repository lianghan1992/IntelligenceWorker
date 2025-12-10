
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderTask } from '../../../types';
import { getSpiderTasks } from '../../../api/intelligence';
import { RefreshIcon, PlayIcon, CheckCircleIcon, ShieldExclamationIcon, ClockIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
        case 'completed': return { text: '完成', className: 'bg-green-100 text-green-700', icon: CheckCircleIcon };
        case 'failed': return { text: '失败', className: 'bg-red-100 text-red-700', icon: ShieldExclamationIcon };
        case 'running': return { text: '执行中', className: 'bg-blue-100 text-blue-700 animate-pulse', icon: PlayIcon };
        case 'pending': return { text: '等待', className: 'bg-yellow-100 text-yellow-700', icon: ClockIcon };
        default: return { text: status, className: 'bg-gray-100 text-gray-600', icon: ClockIcon };
    }
};

const getTaskTypeLabel = (type: string) => {
    switch (type) {
        case 'initial': return '初始全量';
        case 'incremental': return '增量爬取';
        default: return type;
    }
};

const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.floor((e - s) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
};

export const TaskList: React.FC = () => {
    const [tasks, setTasks] = useState<SpiderTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderTasks({ page, page_size: pageSize });
            if (Array.isArray(res)) {
                 // Fallback if API returns array directly (old behavior)
                 setTasks(res);
                 setTotal(res.length);
            } else {
                 setTasks(res.items || []);
                 setTotal(res.total || 0);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [page]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 text-lg">任务历史记录</h3>
                <button onClick={fetchTasks} className="p-2 hover:bg-gray-200 rounded text-gray-500 border bg-white shadow-sm transition-all">
                    <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 font-bold">来源 / 采集点</th>
                            <th className="px-6 py-3 font-bold">类型</th>
                            <th className="px-6 py-3 font-bold">状态</th>
                            <th className="px-6 py-3 font-bold">文章数</th>
                            <th className="px-6 py-3 font-bold">开始时间</th>
                            <th className="px-6 py-3 font-bold">耗时</th>
                            <th className="px-6 py-3 font-bold">错误信息</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.length === 0 && !isLoading ? (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">暂无任务记录</td></tr>
                        ) : (
                            tasks.map(task => {
                                const statusInfo = getStatusBadge(task.status);
                                return (
                                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{task.source_name || '-'}</div>
                                            <div className="text-xs text-gray-500">{task.point_name || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{getTaskTypeLabel(task.task_type)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${statusInfo.className}`}>
                                                <statusInfo.icon className="w-3 h-3" /> {statusInfo.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-700">{task.articles_collected ?? '-'}</td>
                                        <td className="px-6 py-4 text-xs font-mono">
                                            {task.start_time ? new Date(task.start_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono">{formatDuration(task.start_time, task.end_time)}</td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[200px] truncate text-xs text-red-500" title={task.error_message}>{task.error_message || '-'}</div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t bg-white flex justify-between items-center text-xs text-gray-500">
                <span>共 {total} 条记录</span>
                <div className="flex gap-2">
                    <button 
                        disabled={page <= 1} 
                        onClick={() => setPage(p => p - 1)} 
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        上一页
                    </button>
                    <span className="px-2 py-1">{page}</span>
                    <button 
                        disabled={tasks.length < pageSize} 
                        onClick={() => setPage(p => p + 1)} 
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        下一页
                    </button>
                </div>
            </div>
        </div>
    );
};
