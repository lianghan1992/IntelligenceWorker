
import React, { useState, useEffect, useCallback } from 'react';
import { StratifyTask } from '../../../types';
import { getStratifyTasks } from '../../../api/stratify';
import { RefreshIcon, ChevronRightIcon, SparklesIcon, ClockIcon } from '../../icons';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: any = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800 animate-pulse',
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800'
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
};

export const TaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<StratifyTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            // Backend currently doesn't strictly support page param on /tasks, but we prepare for it
            const data = await getStratifyTasks({ limit: 50 });
            setTasks(data || []);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-slate-400" />
                    任务历史记录 (Last 50)
                </h3>
                <button onClick={fetchTasks} className="p-1.5 hover:bg-gray-200 rounded text-slate-500">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-gray-50 border-b sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">任务 ID</th>
                            <th className="px-6 py-4">场景</th>
                            <th className="px-6 py-4">主题 / 输入</th>
                            <th className="px-6 py-4">状态</th>
                            <th className="px-6 py-4">创建时间</th>
                            <th className="px-6 py-4 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tasks.length === 0 && !isLoading ? (
                            <tr><td colSpan={6} className="text-center py-20 text-slate-400 italic">暂无报告生成记录</td></tr>
                        ) : (
                            tasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                        {task.id.substring(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] uppercase">
                                            {task.scenario_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-md truncate font-medium text-slate-800" title={task.input_text}>
                                            {task.input_text}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={task.status} />
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                                        {new Date(task.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                                            <ChevronRightIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
