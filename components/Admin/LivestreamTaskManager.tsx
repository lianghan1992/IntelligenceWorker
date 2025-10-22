
import React, { useState, useEffect, useCallback } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks, deleteLivestreamTask, startListenTask, stopListenTask } from '../../api';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, TrashIcon, PlayIcon, StopIcon } from '../icons';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'recording': return 'bg-red-100 text-red-800';
        case 'listening': return 'bg-cyan-100 text-cyan-800';
        case 'pending': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'processing': return 'bg-indigo-100 text-indigo-800';
        case 'failed': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getLivestreamTasks({ limit: 1000, sort_by: 'created_at', order: 'desc' });
            setTasks(data.items);
        } catch (err: any) {
            setError(err.message || '无法获取任务列表');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    const handleAction = async (taskId: string, action: 'start' | 'stop' | 'delete') => {
        setActionLoading(taskId);
        setError('');
        try {
            switch(action) {
                case 'start':
                    await startListenTask(taskId);
                    break;
                case 'stop':
                    await stopListenTask(taskId);
                    break;
                case 'delete':
                    await deleteLivestreamTask(taskId);
                    setTaskToDelete(null);
                    break;
            }
            await fetchTasks(); // Refresh list after action
        } catch (err: any) {
             setError(`操作失败: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleDeleteConfirm = () => {
        if (taskToDelete) {
            handleAction(taskToDelete.id, 'delete');
        }
    };

    return (
        <div>
             <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        className="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-blue-500 text-blue-600"
                    >
                        发布会管理
                    </button>
                </nav>
            </div>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                            <PlusIcon className="w-4 h-4" /> <span>创建历史任务</span>
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                            <PlusIcon className="w-4 h-4" /> <span>创建新任务</span>
                        </button>
                    </div>
                </div>
                
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

                <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">任务名称</th>
                                <th className="px-6 py-3">主播/实体</th>
                                <th className="px-6 py-3">开始时间</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">bililive ID</th>
                                <th className="px-6 py-3">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && <tr><td colSpan={6} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                            {!isLoading && tasks.map(task => (
                                <tr key={task.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{task.livestream_name}</div>
                                        <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate">{task.url}</a>
                                    </td>
                                    <td className="px-6 py-4">{task.host_name || task.entity || 'N/A'}</td>
                                    <td className="px-6 py-4">{new Date(task.start_time).toLocaleString('zh-CN')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{task.bililive_live_id || 'N/A'}</td>
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        {actionLoading === task.id ? <Spinner className="w-4 h-4 text-gray-500" /> : (
                                            <>
                                                {task.status.toLowerCase() === 'pending' && <button onClick={() => handleAction(task.id, 'start')} className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-md" title="开始监听"><PlayIcon className="w-4 h-4" /></button>}
                                                {task.status.toLowerCase() === 'listening' && <button onClick={() => handleAction(task.id, 'stop')} className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-gray-100 rounded-md" title="停止监听"><StopIcon className="w-4 h-4" /></button>}
                                                <button onClick={() => setTaskToDelete(task)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md" title="删除任务"><TrashIcon className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={fetchTasks} />}
                {isHistoryModalOpen && <AddHistoryEventModal onClose={() => setIsHistoryModalOpen(false)} onSuccess={fetchTasks} />}
                {taskToDelete && <ConfirmationModal title="确认删除任务" message={`您确定要删除任务 "${taskToDelete.livestream_name}" 吗？此操作无法撤销。`} onConfirm={handleDeleteConfirm} onCancel={() => setTaskToDelete(null)} />}
            </div>
        </div>
    );
};
