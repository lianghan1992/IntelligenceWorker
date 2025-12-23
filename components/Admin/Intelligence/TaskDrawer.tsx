
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderTask, SpiderPoint, SpiderTaskCounts, SpiderTaskTypeCounts } from '../../../types';
import { getSpiderPointTasks } from '../../../api/intelligence';
import { CloseIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, PlayIcon, ShieldExclamationIcon, ClockIcon } from '../../icons';

interface TaskDrawerProps {
    point: SpiderPoint;
    onClose: () => void;
}

// Visual Mapping for Task Types
const getTypeInfo = (type: string) => {
    switch (type) {
        case 'JINA_FETCH': return { label: '网页抓取', color: 'text-blue-600 bg-blue-50 border-blue-100' };
        case 'LLM_ANALYZE_LIST': return { label: '列表解析', color: 'text-purple-600 bg-purple-50 border-purple-100' };
        case 'LLM_ANALYZE_ARTICLE': return { label: '正文清洗', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
        case 'PERSIST': return { label: '数据持久化', color: 'text-green-600 bg-green-50 border-green-100' };
        default: return { label: type, color: 'text-gray-600 bg-gray-50 border-gray-100' };
    }
};

/**
 * Fix: Return proper JSX from StatusBadge.
 */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    const style = 
        s === 'done' || s === 'completed' ? 'bg-green-100 text-green-700' :
        s === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' :
        s === 'error' || s === 'failed' ? 'bg-red-100 text-red-700' : 
        'bg-yellow-100 text-yellow-700'; // pending
    
    const icon = 
        s === 'done' ? <CheckCircleIcon className="w-3 h-3" /> :
        s === 'running' ? <PlayIcon className="w-3 h-3" /> :
        s === 'error' ? <ShieldExclamationIcon className="w-3 h-3" /> :
        <ClockIcon className="w-3 h-3" />;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${style}`}>
            {icon} {status}
        </span>
    );
};

/**
 * Fix: Re-implemented StatCard with proper JSX syntax.
 */
const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
        <div className="text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-wide mb-1">{label}</div>
        <div className={`text-lg md:text-xl font-extrabold ${color}`}>{value}</div>
    </div>
);

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ point, onClose }) => {
    const [tasks, setTasks] = useState<SpiderTask[]>([]);
    const [counts, setCounts] = useState<SpiderTaskCounts | null>(null);
    const [typeCounts, setTypeCounts] = useState<SpiderTaskTypeCounts | null>(null);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 20;

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderPointTasks(point.uuid, { page, limit });
            setTasks(res.items);
            setCounts(res.counts);
            setTypeCounts(res.type_counts || null);
            setTotal(res.total);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [point.uuid, page]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
            <div className="w-full md:max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200">
                
                {/* Header */}
                <div className="p-4 md:p-5 border-b flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-lg md:text-xl text-gray-800 truncate">{point.name}</h3>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-mono hidden sm:inline-block">{point.uuid.slice(0,8)}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium truncate">{point.source_name} • {point.url}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={fetchTasks} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 border border-transparent hover:border-gray-200 transition-all"><RefreshIcon className={`w-5 h-5 ${isLoading?'animate-spin':''}`}/></button>
                        <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-500 transition-all"><CloseIcon className="w-5 h-5"/></button>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="p-4 md:p-5 bg-gray-50 border-b border-gray-200 space-y-4 flex-shrink-0">
                    {/* Status Stats - 2x2 Grid on Mobile, Flex on Desktop */}
                    {counts && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <StatCard label="Pending" value={counts.pending} color="text-yellow-600" />
                            <StatCard label="Running" value={counts.running} color="text-blue-600" />
                            <StatCard label="Done" value={counts.done} color="text-green-600" />
                            <StatCard label="Error" value={counts.error} color="text-red-600" />
                        </div>
                    )}
                    {/* Type Stats - Scrollable on Mobile */}
                    {typeCounts && (
                        <div className="flex gap-2 pt-2 border-t border-gray-200 overflow-x-auto no-scrollbar pb-1">
                            {(Object.entries(typeCounts) as [string, number][]).map(([type, count]) => {
                                const info = getTypeInfo(type);
                                return (
                                    <div key={type} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${info.color}`}>
                                        <span>{info.label}</span>
                                        <span className="font-bold bg-white/50 px-1.5 rounded text-[10px]">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Task List */}
                <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 w-28 md:w-32">状态</th>
                                <th className="px-4 py-3 w-32 md:w-40">类型</th>
                                <th className="px-4 py-3 min-w-[200px]">详情 / 错误</th>
                                <th className="px-4 py-3 w-32 md:w-40 text-right hidden sm:table-cell">时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tasks.length === 0 && !isLoading ? (
                                <tr><td colSpan={4} className="text-center py-20 text-gray-400">暂无任务记录</td></tr>
                            ) : (
                                tasks.map(task => {
                                    const typeInfo = getTypeInfo(task.task_type);
                                    return (
                                        <tr key={task.id} className="hover:bg-gray-50 group transition-colors">
                                            <td className="px-4 py-3 align-top">
                                                <StatusBadge status={task.status} />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                                {task.page_number && <div className="text-[10px] text-gray-400 mt-1 font-mono">Page {task.page_number}</div>}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-xs text-gray-600 font-mono break-all line-clamp-2 hover:line-clamp-none transition-all cursor-help" title={task.url}>
                                                    {task.url}
                                                </div>
                                                {task.error_message && (
                                                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 font-mono break-all">
                                                        {task.error_message}
                                                    </div>
                                                )}
                                                <div className="sm:hidden text-[10px] text-gray-400 mt-1 font-mono">
                                                    {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-gray-400 font-mono align-top hidden sm:table-cell">
                                                {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {total > 0 && (
                    <div className="p-4 border-t bg-white flex justify-between items-center text-sm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex-shrink-0">
                        <span className="text-gray-500 font-medium">共 {total} 条</span>
                        <div className="flex items-center gap-3">
                            <button 
                                disabled={page <= 1} 
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeftIcon className="w-4 h-4 text-gray-600"/>
                            </button>
                            <span className="font-bold text-gray-700 min-w-[3rem] text-center">{page} / {totalPages}</span>
                            <button 
                                disabled={page >= totalPages} 
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRightIcon className="w-4 h-4 text-gray-600"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
