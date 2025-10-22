import React, { useState, useEffect, useCallback } from 'react';
import { LivestreamTask } from '../types';
import { getLivestreamTasks, deleteLivestreamTask, startListenTask, stopListenTask } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { AddEventModal } from './AddEventModal';
import { PlusIcon, TrashIcon, PlayIcon, StopIcon } from './icons';
import { EventReportModal } from './EventReportModal';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-gray-500" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'recording') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 animate-pulse">录制中</span>;
    if (s === 'listening') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800 animate-pulse">监听中</span>;
    if (s === 'processing') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 animate-pulse">分析中</span>;
    if (s === 'completed') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">已完成</span>;
    if (s === 'failed') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>;
    if (s === 'pending') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">等待监听</span>;
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
};


export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState<string | null>(null);
    const [error, setError] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);
    const [taskToView, setTaskToView] = useState<LivestreamTask | null>(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getLivestreamTasks();
             const sorted = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTasks(sorted);
        } catch (err: any) {
            setError(err.message || '无法加载任务列表');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleDelete = async () => {
        if (!taskToDelete) return;
        setIsMutating(taskToDelete.id);
        setError('');
        try {
            await deleteLivestreamTask(taskToDelete.id);
            setTaskToDelete(null);
            await loadTasks(); // Refresh list
        } catch (err: any) {
            setError(`删除失败: ${err.message}`);
        } finally {
            setIsMutating(null);
        }
    };

    const handleListenControl = async (taskId: string, action: 'start' | 'stop') => {
        setIsMutating(taskId);
        setError('');
        try {
            if (action === 'start') {
                await startListenTask(taskId);
            } else {
                await stopListenTask(taskId);
            }
            await loadTasks();
        } catch(err: any) {
            setError(`操作失败: ${err.message}`);
        } finally {
            setIsMutating(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">直播分析任务管理</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                    <PlusIcon className="w-5 h-5" />
                    <span>创建新任务</span>
                </button>
            </div>
            
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">直播名称</th>
                            <th className="px-6 py-3">开始时间</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">创建时间</th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={5} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && tasks.map(task => {
                            const isTaskMutating = isMutating === task.id;
                            const canViewReport = task.status.toLowerCase() === 'completed';
                            const status = task.status.toLowerCase();
                            const canStart = status === 'pending';
                            const canStop = status === 'listening' || status === 'recording';

                            return (
                                <tr key={task.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{task.livestream_name}</div>
                                        <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">访问链接</a>
                                    </td>
                                    <td className="px-6 py-4">{new Date(task.start_time).toLocaleString('zh-CN')}</td>
                                    <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                                    <td className="px-6 py-4">{new Date(task.created_at).toLocaleDateString('zh-CN')}</td>
                                    <td className="px-6 py-4">
                                        {isTaskMutating ? <Spinner className="h-5 w-5 text-blue-500" /> : (
                                            <div className="flex items-center gap-2">
                                                 {canViewReport && (
                                                    <button onClick={() => setTaskToView(task)} className="font-semibold text-blue-600 hover:underline text-sm">查看报告</button>
                                                )}
                                                {canStart && (
                                                    <button onClick={() => handleListenControl(task.id, 'start')} className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-md" title="开始监听">
                                                        <PlayIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canStop && (
                                                    <button onClick={() => handleListenControl(task.id, 'stop')} className="p-2 text-gray-500 hover:text-orange-600 hover:bg-gray-100 rounded-md" title="停止监听">
                                                        <StopIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => setTaskToDelete(task)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md" title="删除任务">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                         {!isLoading && tasks.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-16 text-gray-500">暂无分析任务</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={loadTasks} />}
            {taskToDelete && <ConfirmationModal title="确认删除任务" message={`您确定要删除任务 "${taskToDelete.livestream_name}" 吗？`} onConfirm={handleDelete} onCancel={() => setTaskToDelete(null)} />}
            {taskToView && <EventReportModal event={taskToView} onClose={() => setTaskToView(null)} />}
        </div>
    );
};