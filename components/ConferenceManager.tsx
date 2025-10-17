import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LivestreamTask } from '../types';
import {
    getLivestreamTasks,
    deleteLivestreamTask,
    startLivestreamTask,
    stopLivestreamTask,
    getLivestreamTaskReport,
} from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { EventReportModal } from './EventReportModal';
import { CreateAnalysisTaskModal } from './CreateAnalysisTaskModal';
import { PlusIcon, TrashIcon, CheckIcon, VideoCameraIcon, FilmIcon, PhotoIcon, PlayIcon, StopIcon } from './icons';

const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-gray-500" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getStatusDetails = (status: LivestreamTask['status']) => {
    switch (status) {
        case 'running': return { text: '运行中', color: 'bg-blue-100 text-blue-800' };
        case 'completed': return { text: '已完成', color: 'bg-green-100 text-green-800' };
        case 'failed': return { text: '失败', color: 'bg-red-100 text-red-800' };
        case 'stopped': return { text: '已停止', color: 'bg-yellow-100 text-yellow-800' };
        default: return { text: '待处理', color: 'bg-gray-100 text-gray-800' };
    }
};

const TaskTypeDisplay: React.FC<{ type: LivestreamTask['task_type'] }> = ({ type }) => {
    switch (type) {
        case 'live': return <div className="flex items-center gap-2"><VideoCameraIcon className="w-4 h-4 text-red-500" /><span>直播</span></div>;
        case 'video': return <div className="flex items-center gap-2"><FilmIcon className="w-4 h-4 text-blue-500" /><span>视频</span></div>;
        case 'summit': return <div className="flex items-center gap-2"><PhotoIcon className="w-4 h-4 text-purple-500" /><span>图片集</span></div>;
        default: return <span>{type}</span>;
    }
};

export const ConferenceManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState<string | null>(null); // Track task ID being mutated
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({ type: 'all', status: 'all' });
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<LivestreamTask | null>(null);
    const [taskToView, setTaskToView] = useState<LivestreamTask | null>(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await getLivestreamTasks();
            const fetchedTasks = response.tasks;
            
            // Defensive check: Ensure fetchedTasks is an array before processing
            if (!Array.isArray(fetchedTasks)) {
                console.warn("API at /livestream/tasks did not return a `tasks` array. Defaulting to empty array.");
                setTasks([]);
                return;
            }

            const statusOrder: { [key in LivestreamTask['status']]: number } = {
                'running': 1, 'pending': 2, 'stopped': 3, 'completed': 4, 'failed': 5,
            };
            const sortedTasks = [...fetchedTasks].sort((a, b) => 
                statusOrder[a.status] - statusOrder[b.status] || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setTasks(sortedTasks);
        } catch (err: any) {
            setError(err.message || '无法加载任务列表');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => 
            (filters.type === 'all' || task.task_type === filters.type) &&
            (filters.status === 'all' || task.status === filters.status)
        );
    }, [tasks, filters]);
    
    const handleStart = async (taskId: string) => {
        setIsMutating(taskId);
        setError('');
        try {
            await startLivestreamTask(taskId);
            await loadTasks(); // Refetch
        } catch (err: any) {
            setError(`启动任务失败: ${err.message}`);
        } finally {
            setIsMutating(null);
        }
    };

    const handleStop = async (taskId: string) => {
        setIsMutating(taskId);
        setError('');
        try {
            await stopLivestreamTask(taskId);
            await loadTasks(); // Refetch
        } catch (err: any) {
            setError(`停止任务失败: ${err.message}`);
        } finally {
            setIsMutating(null);
        }
    };

    const handleDelete = async (taskId: string) => {
        setIsMutating(taskId);
        setError('');
        try {
            await deleteLivestreamTask(taskId);
            await loadTasks();
        } catch (err: any) {
            setError(`删除失败: ${err.message}`);
        } finally {
            setIsMutating(null);
            setTaskToDelete(null);
        }
    };

    const handleViewReport = async (task: LivestreamTask) => {
        // Prioritize using the report content from the task object if available
        if (task.detailed_report) {
            setTaskToView({ ...task, reportContentHtml: task.detailed_report });
            return;
        }

        // Fallback to fetching if the task is completed but the report isn't in the object
        if (task.status === 'completed') {
            setIsMutating(task.task_id);
            setError('');
            try {
                const reportContent = await getLivestreamTaskReport(task.task_id, 'detailed');
                setTaskToView({ ...task, reportContentHtml: reportContent });
            } catch (err: any) {
                const errorMessage = `加载报告失败: ${err.message}`;
                setError(errorMessage);
                setTaskToView({ ...task, reportContentHtml: `<p class="text-red-500">${errorMessage}</p>` });
            } finally {
                setIsMutating(null);
            }
        } else {
            setError('任务尚未完成，无法查看报告。');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">发布会管理</h2>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                    <PlusIcon className="w-5 h-5" />
                    <span>新增分析任务</span>
                </button>
            </div>
            
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-600">任务类型</label>
                        <select value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))} className="w-full mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md">
                            <option value="all">所有类型</option>
                            <option value="live">直播</option>
                            <option value="video">视频</option>
                            <option value="summit">图片集</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs font-medium text-gray-600">任务状态</label>
                         <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-full mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md">
                            <option value="all">所有状态</option>
                            <option value="running">运行中</option>
                            <option value="pending">待处理</option>
                            <option value="completed">已完成</option>
                            <option value="stopped">已停止</option>
                            <option value="failed">失败</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">任务标题</th>
                            <th className="px-6 py-3">类型</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3">创建时间</th>
                            <th className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={5} className="text-center py-10"><Spinner className="h-8 w-8 text-gray-400 mx-auto" /></td></tr>}
                        {!isLoading && filteredTasks.map(task => {
                            const status = getStatusDetails(task.status);
                            const isTaskMutating = isMutating === task.task_id;
                            return (
                                <tr key={task.task_id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{task.event_name}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-xs" title={task.source_url}>{task.source_url}</div>
                                    </td>
                                    <td className="px-6 py-4"><TaskTypeDisplay type={task.task_type} /></td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.text}</span></td>
                                    <td className="px-6 py-4 text-xs">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                    <td className="px-6 py-4">
                                        {isTaskMutating ? <Spinner className="h-5 w-5 text-blue-500" /> : (
                                            <div className="flex items-center gap-2">
                                                {task.status === 'completed' && <button onClick={() => handleViewReport(task)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-md" title="查看报告"><CheckIcon className="w-4 h-4" /></button>}
                                                {(task.status === 'pending' || task.status === 'stopped' || task.status === 'failed') && (
                                                    <button onClick={() => handleStart(task.task_id)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md" title="启动任务">
                                                        <PlayIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {task.status === 'running' && (
                                                    <button onClick={() => handleStop(task.task_id)} className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-gray-100 rounded-md" title="停止任务">
                                                        <StopIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => setTaskToDelete(task)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md" title="删除"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isCreateModalOpen && <CreateAnalysisTaskModal onClose={() => setIsCreateModalOpen(false)} onSuccess={loadTasks} />}
            {taskToDelete && <ConfirmationModal title="确认删除任务" message={`您确定要删除任务 "${taskToDelete.event_name}" 吗？此操作无法撤销。`} onConfirm={() => handleDelete(taskToDelete.task_id)} onCancel={() => setTaskToDelete(null)} />}
            {taskToView && <EventReportModal event={taskToView} onClose={() => setTaskToView(null)} />}
        </div>
    );
};