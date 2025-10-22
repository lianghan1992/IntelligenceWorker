import React, { useState, useEffect, useCallback } from 'react';
import { LivestreamTask } from '../types';
import { getLivestreamTasks, deleteLivestreamTask, startListenTask, stopListenTask } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { PhotoIcon, PlusIcon } from './icons';
import { AddHistoryEventModal } from './AddHistoryEventModal';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-4 w-4 text-gray-500" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }).replace(/\//g, '-');
};

const getStatusChip = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">已完成</span>;
    if (statusLower === 'processing') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 animate-pulse">分析中</span>;
    if (statusLower === 'recording') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">录制中</span>;
    if (statusLower === 'listening') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800">监听中</span>;
    if (statusLower === 'failed') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>;
    if (statusLower === 'pending') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">待处理</span>;
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
};

const getSafeImageUrl = (base64String: string | null): string | null => {
    if (!base64String) return null;
    if (base64String.startsWith('data:image')) {
        return base64String;
    }
    return `data:image/jpeg;base64,${base64String}`;
};

export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const fetchedTasks = await getLivestreamTasks();
             if (!Array.isArray(fetchedTasks)) {
                console.warn("LivestreamTaskManager: API call did not return an array. Defaulting to empty.");
                setTasks([]);
                return;
            }
            const sorted = fetchedTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTasks(sorted);
        } catch (err: any) {
            setError(err.message || '无法获取任务列表');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleDeleteConfirm = async () => {
        if (!taskToDelete) return;
        setIsActionLoading(taskToDelete.id);
        try {
            await deleteLivestreamTask(taskToDelete.id);
            setTaskToDelete(null);
            await loadTasks();
        } catch (err: any) {
            setError(err.message || '删除任务失败');
        } finally {
            setIsActionLoading(null);
        }
    };
    
    const handleToggleListen = async (task: LivestreamTask) => {
        setIsActionLoading(task.id);
        try {
            if (task.status.toLowerCase() === 'listening') {
                await stopListenTask(task.id);
            } else {
                await startListenTask(task.id);
            }
            await loadTasks();
        } catch (err: any) {
            setError(err.message || '操作失败');
        } finally {
            setIsActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">事件分析任务管理</h2>
                 <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                    <PlusIcon className="w-4 h-4" />
                    <span>创建历史任务</span>
                </button>
            </div>


            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">封面</th>
                            <th className="px-4 py-3">事件 / 主播</th>
                            <th className="px-4 py-3">关联实体</th>
                            <th className="px-4 py-3">提示词</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3">开始时间</th>
                            <th className="px-4 py-3">URL</th>
                            <th className="px-4 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading && <tr><td colSpan={8} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && tasks.map(task => {
                            const imageUrl = getSafeImageUrl(task.livestream_image);
                            return (
                                <tr key={task.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        {imageUrl ? (
                                            <img src={imageUrl} alt="封面" className="w-16 h-9 object-cover rounded-md bg-gray-100 border" />
                                        ) : (
                                            <div className="w-16 h-9 bg-gray-100 rounded-md flex items-center justify-center border">
                                                <PhotoIcon className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-gray-800">{task.livestream_name}</div>
                                        <div className="text-xs text-gray-500">{task.host_name || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3">{task.entity || '-'}</td>
                                    <td className="px-4 py-3 max-w-[200px] truncate" title={task.prompt_content || '无'}>
                                        {task.prompt_content || '无'}
                                    </td>
                                    <td className="px-4 py-3">{getStatusChip(task.status)}</td>
                                    <td className="px-4 py-3">{formatTime(task.start_time)}</td>
                                    <td className="px-4 py-3 max-w-[150px] truncate"><a href={task.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{task.url}</a></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            {(task.status.toLowerCase() === 'pending' || task.status.toLowerCase() === 'listening') && (
                                                <button
                                                    onClick={() => handleToggleListen(task)}
                                                    disabled={isActionLoading === task.id}
                                                    className={`px-2 py-1 text-xs font-semibold rounded-md disabled:opacity-50 w-20 text-center ${task.status.toLowerCase() === 'listening' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                                                >
                                                    {isActionLoading === task.id ? <Spinner className="mx-auto" /> : task.status.toLowerCase() === 'listening' ? '停止监听' : '开始监听'}
                                                </button>
                                            )}
                                            <button onClick={() => setTaskToDelete(task)} disabled={isActionLoading === task.id} className="px-2 py-1 text-xs font-semibold rounded-md bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 w-16 text-center">
                                                {isActionLoading === task.id ? <Spinner className="mx-auto" /> : '删除'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                         {!isLoading && tasks.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-10 text-gray-500">暂无事件分析任务</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
            
            {taskToDelete && <ConfirmationModal title="确认删除任务" message={`您确定要删除事件 "${taskToDelete.livestream_name}" 吗？此操作无法撤销。`} onConfirm={handleDeleteConfirm} onCancel={() => setTaskToDelete(null)} isLoading={!!isActionLoading} />}
            {isHistoryModalOpen && (
                <AddHistoryEventModal 
                    onClose={() => setIsHistoryModalOpen(false)}
                    onSuccess={loadTasks}
                />
            )}
        </div>
    );
};