import React, { useState, useEffect, useCallback } from 'react';
import { LivestreamTask } from '../types';
import { getLivestreamTasks, deleteLivestreamTask, startListenTask, stopListenTask } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { PlayIcon, StopIcon, TrashIcon } from './icons';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-gray-500" }) => (
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
    if (statusLower === 'listening') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">监听中</span>;
    if (statusLower === 'failed') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>;
    if (statusLower === 'pending') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">待处理</span>;
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
};

export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null); // Store task ID being acted upon

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
            loadTasks();
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
            loadTasks(); // Refresh list to show new status
        } catch (err: any) {
            setError(err.message || '操作失败');
        } finally {
            setIsActionLoading(null);
        }
    };


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">事件分析任务管理</h2>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">事件名称</th>
                            <th className="px-6 py-3">关联实体</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">开始时间</th>
                            <th className="px-6 py-3">URL</th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={6} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && tasks.map(task => (
                            <tr key={task.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold text-gray-800">{task.livestream_name}</td>
                                <td className="px-6 py-4">{task.entity || '-'}</td>
                                <td className="px-6 py-4">{getStatusChip(task.status)}</td>
                                <td className="px-6 py-4">{formatTime(task.start_time)}</td>
                                <td className="px-6 py-4 max-w-xs truncate"><a href={task.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{task.url}</a></td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    {(task.status.toLowerCase() === 'pending' || task.status.toLowerCase() === 'listening') && (
                                        <button
                                            onClick={() => handleToggleListen(task)}
                                            disabled={isActionLoading === task.id}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50"
                                            title={task.status.toLowerCase() === 'listening' ? '停止监听' : '开始监听'}
                                        >
                                            {isActionLoading === task.id ? <Spinner className="w-4 h-4 text-gray-500" /> : task.status.toLowerCase() === 'listening' ? <StopIcon className="w-4 h-4 text-red-600" /> : <PlayIcon className="w-4 h-4 text-green-600" />}
                                        </button>
                                    )}
                                    <button onClick={() => setTaskToDelete(task)} disabled={isActionLoading === task.id} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md disabled:opacity-50"><TrashIcon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                         {!isLoading && tasks.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-10">暂无事件分析任务</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
            
            {taskToDelete && <ConfirmationModal title="确认删除任务" message={`您确定要删除事件 "${taskToDelete.livestream_name}" 吗？此操作无法撤销。`} onConfirm={handleDeleteConfirm} onCancel={() => setTaskToDelete(null)} isLoading={!!isActionLoading} />}
        </div>
    );
};
