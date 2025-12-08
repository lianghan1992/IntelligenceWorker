
import React, { useState, useEffect } from 'react';
import { SpiderTask, SpiderPoint } from '../../../types';
import { getSpiderPointTasks } from '../../../api/intelligence';
import { CloseIcon, RefreshIcon } from '../../icons';

interface TaskDrawerProps {
    point: SpiderPoint;
    onClose: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    const style = 
        s === 'completed' ? 'bg-green-100 text-green-700' :
        s === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' :
        s === 'failed' ? 'bg-red-100 text-red-700' : 
        'bg-gray-100 text-gray-600';
    return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${style}`}>{status}</span>;
};

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ point, onClose }) => {
    const [tasks, setTasks] = useState<SpiderTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderPointTasks(point.id);
            setTasks(res);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchTasks(); }, [point.id]);

    return (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">{point.point_name} - 任务日志</h3>
                        <p className="text-xs text-gray-500 mt-1">{point.source_name} | {point.point_url}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchTasks} className="p-2 hover:bg-gray-200 rounded text-gray-500"><RefreshIcon className={`w-5 h-5 ${isLoading?'animate-spin':''}`}/></button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded text-gray-500"><CloseIcon className="w-5 h-5"/></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                    {tasks.length === 0 && !isLoading ? (
                        <div className="text-center py-20 text-gray-400">该采集点暂无任务记录</div>
                    ) : (
                        <div className="space-y-4">
                            {tasks.map(task => (
                                <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{task.task_type}</span>
                                            {task.page_number && <span className="text-xs text-gray-500">Page {task.page_number}</span>}
                                        </div>
                                        <StatusBadge status={task.status} />
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono break-all bg-gray-50 p-2 rounded mb-2">
                                        {task.url}
                                    </div>
                                    {task.error_message && (
                                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 mb-2">
                                            Error: {task.error_message}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-xs text-gray-400 mt-2 border-t pt-2">
                                        <span>ID: {task.id.slice(0,8)}</span>
                                        <span>Created: {new Date(task.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
