
import React, { useState, useEffect } from 'react';
import { SpiderTask } from '../../../types';
import { getSpiderTasks } from '../../../api/intelligence';
import { RefreshIcon, PlayIcon } from '../../icons';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    const style = 
        s === 'completed' || s === 'done' ? 'bg-green-100 text-green-700' :
        s === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' :
        s === 'failed' || s === 'error' ? 'bg-red-100 text-red-700' : 
        'bg-gray-100 text-gray-600';
    
    return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${style}`}>{status}</span>;
};

export const TaskMonitor: React.FC = () => {
    const [tasks, setTasks] = useState<SpiderTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderTasks();
            setTasks(res.items || []);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchTasks(); }, []);

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <PlayIcon className="w-4 h-4 text-emerald-600"/> 最近任务流水
                </h3>
                <button onClick={fetchTasks} className="p-1 hover:bg-gray-200 rounded text-gray-500"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0">
                        <tr>
                            <th className="px-6 py-3 whitespace-nowrap">任务 ID</th>
                            <th className="px-6 py-3 whitespace-nowrap">URL</th>
                            <th className="px-6 py-3 whitespace-nowrap">类型</th>
                            <th className="px-6 py-3 whitespace-nowrap">状态</th>
                            <th className="px-6 py-3 whitespace-nowrap">错误信息</th>
                            <th className="px-6 py-3 whitespace-nowrap">创建时间</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">暂无任务记录</td></tr>
                        ) : (
                            tasks.map(task => (
                                <tr key={task.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">{task.id.slice(0, 8)}...</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs max-w-[200px] md:max-w-[250px] truncate font-mono text-gray-600" title={task.url}>{task.url}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded">{task.task_type}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={task.status} /></td>
                                    <td className="px-6 py-4 max-w-xs truncate text-xs text-red-500" title={task.error_message || undefined}>{task.error_message || '-'}</td>
                                    <td className="px-6 py-4 text-xs font-mono whitespace-nowrap">{new Date(task.created_at).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
