
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderTask, SpiderPoint, SpiderTaskCounts } from '../../../types';
import { getSpiderPointTasks } from '../../../api/intelligence';
import { CloseIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';

interface TaskDrawerProps {
    point: SpiderPoint;
    onClose: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    const style = 
        s === 'done' || s === 'completed' ? 'bg-green-100 text-green-700' :
        s === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' :
        s === 'error' || s === 'failed' ? 'bg-red-100 text-red-700' : 
        'bg-yellow-100 text-yellow-700'; // pending
    return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${style}`}>{status}</span>;
};

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ point, onClose }) => {
    const [tasks, setTasks] = useState<SpiderTask[]>([]);
    const [counts, setCounts] = useState<SpiderTaskCounts | null>(null);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 20;

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderPointTasks(point.id, { page, limit });
            setTasks(res.items);
            setCounts(res.counts);
            setTotal(res.total);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [point.id, page]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

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

                {/* Stats Header */}
                {counts && (
                    <div className="grid grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-gray-500 uppercase">Pending</div>
                            <div className="font-bold text-yellow-600">{counts.pending}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-gray-500 uppercase">Running</div>
                            <div className="font-bold text-blue-600">{counts.running}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-gray-500 uppercase">Done</div>
                            <div className="font-bold text-green-600">{counts.done}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-gray-500 uppercase">Error</div>
                            <div className="font-bold text-red-600">{counts.error}</div>
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                    {tasks.length === 0 && !isLoading ? (
                        <div className="text-center py-20 text-gray-400">该采集点暂无任务记录</div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map(task => (
                                <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-200 hover:shadow-sm transition-all text-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={task.status} />
                                            <span className="font-bold text-gray-700">{task.task_type}</span>
                                            {task.page_number && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 rounded">Page {task.page_number}</span>}
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono">{new Date(task.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono break-all bg-gray-50 p-2 rounded mb-2">
                                        {task.url}
                                    </div>
                                    {task.error_message && (
                                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                            Error: {task.error_message}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                {total > 0 && (
                    <div className="p-3 border-t bg-gray-50 flex justify-between items-center text-sm">
                        <span className="text-gray-500">Total: {total}</span>
                        <div className="flex gap-2">
                            <button 
                                disabled={page <= 1} 
                                onClick={() => setPage(p => p - 1)}
                                className="p-1.5 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                            >
                                <ChevronLeftIcon className="w-4 h-4"/>
                            </button>
                            <span className="px-2 py-1">{page}</span>
                            <button 
                                disabled={page * limit >= total} 
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                            >
                                <ChevronRightIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
