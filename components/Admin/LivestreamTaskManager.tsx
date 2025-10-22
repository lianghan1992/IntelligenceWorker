import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks, deleteLivestreamTask, getLivestreamTasksStats, startListenTask, stopListenTask } from '../../api';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';
import { PlusIcon, RefreshIcon, DocumentTextIcon, FilmIcon, TrashIcon, PlayIcon, StopIcon, TagIcon } from '../icons';
import { ConfirmationModal } from './ConfirmationModal';
import { EventReportModal } from './EventReportModal';

// --- Internal Components ---

const getStatusDetails = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'recording') return { text: '直播中', className: 'bg-red-500 text-white', type: 'live' };
    if (statusLower === 'listening') return { text: '监听中', className: 'bg-cyan-500 text-white', type: 'upcoming' };
    if (statusLower === 'pending') return { text: '即将开始', className: 'bg-blue-500 text-white', type: 'upcoming' };
    if (statusLower === 'completed') return { text: '已结束', className: 'bg-green-500 text-white', type: 'finished' };
    if (statusLower === 'processing') return { text: 'AI总结中', className: 'bg-indigo-500 text-white', type: 'finished' };
    if (statusLower === 'failed') return { text: '失败', className: 'bg-red-500 text-white', type: 'finished' };
    return { text: '已结束', className: 'bg-gray-500 text-white', type: 'finished' };
};

const getSafeImageUrl = (base64String: string | null): string | null => {
    if (!base64String) return null;
    if (base64String.startsWith('data:image')) return base64String;
    return `data:image/jpeg;base64,${base64String}`;
};

const AdminTaskCard: React.FC<{
    task: LivestreamTask;
    onViewReport: () => void;
    onAction: (action: 'delete' | 'start' | 'stop') => void;
}> = ({ task, onViewReport, onAction }) => {
    const statusDetails = getStatusDetails(task.status);
    const hasReport = statusDetails.type === 'finished' && !!task.summary_report;
    const imageUrl = getSafeImageUrl(task.livestream_image);

    const formattedDate = new Date(task.start_time).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(/\//g, '.');

    return (
        <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col transition-shadow hover:shadow-md">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-gray-900">
                {imageUrl ? (
                    <img src={imageUrl} alt={task.livestream_name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
                        <TagIcon className="w-12 h-12 text-gray-600"/>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-bold rounded-full ${statusDetails.className}`}>
                    {statusDetails.text}
                </span>
                <div className="absolute bottom-0 p-3 text-white">
                    <h3 className="text-sm font-bold drop-shadow-md leading-tight">{task.livestream_name}</h3>
                </div>
            </div>
            
            <div className="p-3 flex-grow flex flex-col">
                <p className="text-xs text-gray-500">{task.host_name || 'N/A'} | {formattedDate}</p>
                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        {task.status.toLowerCase() === 'pending' && <button onClick={() => onAction('start')} className="p-2 text-gray-500 hover:bg-green-100 hover:text-green-600 rounded-md transition-colors" title="开始监听"><PlayIcon className="w-4 h-4" /></button>}
                        {task.status.toLowerCase() === 'listening' && <button onClick={() => onAction('stop')} className="p-2 text-gray-500 hover:bg-yellow-100 hover:text-yellow-600 rounded-md transition-colors" title="停止监听"><StopIcon className="w-4 h-4" /></button>}
                        <button onClick={() => onAction('delete')} className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors" title="删除任务"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                    <button 
                        onClick={onViewReport}
                        disabled={!hasReport}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <DocumentTextIcon className="w-4 h-4" />
                        <span>报告</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


const TaskSection: React.FC<{ title: string; tasks: LivestreamTask[]; onCardClick: (task: LivestreamTask) => void; onAction: (task: LivestreamTask, action: 'delete' | 'start' | 'stop') => void; }> = ({ title, tasks, onCardClick, onAction }) => {
    if (tasks.length === 0) {
        return null;
    }
    return (
        <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tasks.map((task) => (
                    <AdminTaskCard key={task.id} task={task} onViewReport={() => onCardClick(task)} onAction={(action) => onAction(task, action)} />
                ))}
            </div>
        </section>
    );
};

// --- Main Component ---

export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);
    const [taskToAction, setTaskToAction] = useState<{task: LivestreamTask, action: 'delete' | 'start' | 'stop'} | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [stats, setStats] = useState<any>({});
    
    const loadTasks = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            const [tasksResponse, statsResponse] = await Promise.all([
                getLivestreamTasks({ limit: 1000 }),
                getLivestreamTasksStats()
            ]);

            if (tasksResponse && Array.isArray(tasksResponse.items)) {
                setTasks(tasksResponse.items);
            } else {
                console.warn("LivestreamTaskManager: API call did not return a valid paginated response. Defaulting to empty.");
                setTasks([]);
            }
            setStats(statsResponse || {});
        } catch (err) {
            setError(err instanceof Error ? err.message : '发生未知错误');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
        const interval = setInterval(() => loadTasks(false), 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(interval);
    }, [loadTasks]);

    const handleAction = (task: LivestreamTask, action: 'delete' | 'start' | 'stop') => {
        setTaskToAction({ task, action });
    };

    const confirmAction = async () => {
        if (!taskToAction) return;

        setActionLoading(true);
        setError(null);
        const { task, action } = taskToAction;

        try {
            switch (action) {
                case 'delete':
                    await deleteLivestreamTask(task.id);
                    break;
                case 'start':
                    await startListenTask(task.id);
                    break;
                case 'stop':
                    await stopListenTask(task.id);
                    break;
            }
            await loadTasks(false); // Refresh list after action
        } catch (err) {
            setError(err instanceof Error ? err.message : `操作失败`);
        } finally {
            setActionLoading(false);
            setTaskToAction(null);
        }
    };
    
    const { liveTasks, upcomingTasks, finishedTasks } = useMemo(() => {
        const liveTasks: LivestreamTask[] = [];
        const upcomingTasks: LivestreamTask[] = [];
        const finishedTasks: LivestreamTask[] = [];

        tasks.forEach(task => {
            const status = task.status.toLowerCase();
            
            if (status === 'recording') {
                liveTasks.push(task);
            } else if (status === 'listening' || status === 'pending') {
                upcomingTasks.push(task);
            } else {
                finishedTasks.push(task);
            }
        });
        
        const sortByDate = (a: LivestreamTask, b: LivestreamTask) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        liveTasks.sort(sortByDate);
        upcomingTasks.sort(sortByDate);
        finishedTasks.sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        return { liveTasks, upcomingTasks, finishedTasks };
    }, [tasks]);
    
    const handleTaskCardClick = (task: LivestreamTask) => {
        if (task.status.toLowerCase() === 'completed' && task.summary_report) {
            setSelectedEvent(task);
        }
    };
    
    const renderContent = () => {
        if (isLoading) return <div className="text-center py-20 text-gray-500">加载中...</div>;
        if (error && !tasks.length) return <div className="text-center py-20 text-red-500">加载失败: {error}</div>;

        const noTasks = tasks.length === 0;

        if (noTasks) {
             return (
                <div className="flex-1 flex items-center justify-center text-center bg-white rounded-xl border-2 border-dashed mt-6 py-20">
                    <div className="text-gray-500">
                        <p className="font-semibold text-lg">暂无任何发布会任务</p>
                        <p className="mt-1">点击右上角按钮创建一个新任务吧。</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-12">
                <TaskSection title="直播中" tasks={liveTasks} onCardClick={handleTaskCardClick} onAction={handleAction} />
                <TaskSection title="即将开始" tasks={upcomingTasks} onCardClick={handleTaskCardClick} onAction={handleAction} />
                <TaskSection title="已结束" tasks={finishedTasks} onCardClick={handleTaskCardClick} onAction={handleAction} />
            </div>
        );
    }

    return (
        <>
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">发布会任务管理</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={() => loadTasks()} className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                            <PlusIcon className="w-4 h-4" />
                            <span>创建历史任务</span>
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                            <PlusIcon className="w-4 h-4" />
                            <span>创建分析任务</span>
                        </button>
                    </div>
                </div>
                {error && <div className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</div>}
            </div>

            {renderContent()}
            
            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={loadTasks} />}
            {isHistoryModalOpen && <AddHistoryEventModal onClose={() => setIsHistoryModalOpen(false)} onSuccess={loadTasks} />}
            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
            {taskToAction && (
                <ConfirmationModal
                    title={`确认${{ delete: '删除', start: '开始', stop: '停止' }[taskToAction.action]}任务`}
                    message={`您确定要${{ delete: '删除', start: '开始', stop: '停止' }[taskToAction.action]} "${taskToAction.task.livestream_name}" 吗？`}
                    confirmText={`确认${{ delete: '删除', start: '开始', stop: '停止' }[taskToAction.action]}`}
                    onConfirm={confirmAction}
                    onCancel={() => setTaskToAction(null)}
                    isLoading={actionLoading}
                />
            )}
        </>
    );
};
