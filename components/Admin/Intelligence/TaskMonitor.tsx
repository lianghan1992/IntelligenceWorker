
import React, { useState, useEffect } from 'react';
import { SpiderTask } from '../../../types';
import { getSpiderTasks } from '../../../api/intelligence';
import { RefreshIcon, PlayIcon } from '../../icons';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    const style = 
        s === 'completed' ? 'bg-green-100 text-green-700' :
        s === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' :
        s === 'failed' ? 'bg-red-100 text-red-700' : 
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
            setTasks(res);
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
            
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0">
                        <tr>
                            <th className="px-6 py-3">任务 ID</th>
                            <th className="px-6 py-3">来源 / 采集点</th>
                            <th className="px-6 py-3">阶段</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">详情信息</th>
                            <th className="px-6 py-3">开始时间</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">暂无任务记录</td></tr>
                        ) : (
                            tasks.map(task => (
                                <tr key={task.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs">{task.id.slice(0, 8)}...</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{task.source_name}</div>
                                        <div className="text-xs">{task.point_name}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded">{task.stage}</span></td>
                                    <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                                    <td className="px-6 py-4 max-w-xs truncate text-xs" title={task.detail}>{task.detail}</td>
                                    <td className="px-6 py-4 text-xs font-mono">{new Date(task.start_time).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
