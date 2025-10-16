import React, { useState, useEffect, useMemo } from 'react';
import { LivestreamTask } from '../types';
import { getLivestreamTasks } from '../api';
import { TaskCard } from './TaskCard';

type TaskTypeFilter = 'all' | LivestreamTask['task_type'];
type StatusFilter = 'all' | LivestreamTask['status'];

const FilterButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
            isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white hover:bg-gray-100'
        }`}
    >
        {label}
    </button>
);

export const IndustryEvents: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [taskTypeFilter, setTaskTypeFilter] = useState<TaskTypeFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    useEffect(() => {
        const loadTasks = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // The new API returns tasks sorted by creation date, we'll sort them by status priority client-side
                const fetchedTasks = await getLivestreamTasks();
                const statusOrder: { [key in LivestreamTask['status']]: number } = {
                    'running': 1,
                    'pending': 2,
                    'stopped': 3,
                    'completed': 4,
                    'failed': 5,
                };
                const sortedTasks = [...fetchedTasks].sort((a, b) => {
                    if (statusOrder[a.status] !== statusOrder[b.status]) {
                        return statusOrder[a.status] - statusOrder[b.status];
                    }
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                setTasks(sortedTasks);
            } catch (err) {
                setError(err instanceof Error ? err.message : '发生未知错误');
            } finally {
                setIsLoading(false);
            }
        };

        loadTasks();
    }, []);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesType = taskTypeFilter === 'all' || task.task_type === taskTypeFilter;
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            return matchesType && matchesStatus;
        });
    }, [tasks, taskTypeFilter, statusFilter]);

    return (
        <div className="p-6 bg-gray-50/50 min-h-full flex flex-col">
            <div className="mb-6 bg-white p-4 rounded-xl border shadow-sm">
                 <h1 className="text-2xl font-bold text-gray-800 mb-4">智能分析任务中心</h1>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                         <span className="text-sm font-semibold text-gray-600 w-16">任务类型:</span>
                        <div className="flex gap-2">
                             <FilterButton label="全部" isActive={taskTypeFilter === 'all'} onClick={() => setTaskTypeFilter('all')} />
                             <FilterButton label="直播" isActive={taskTypeFilter === 'live'} onClick={() => setTaskTypeFilter('live')} />
                             <FilterButton label="视频" isActive={taskTypeFilter === 'video'} onClick={() => setTaskTypeFilter('video')} />
                             <FilterButton label="图片集" isActive={taskTypeFilter === 'summit'} onClick={() => setTaskTypeFilter('summit')} />
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                         <span className="text-sm font-semibold text-gray-600 w-16">任务状态:</span>
                        <div className="flex gap-2 flex-wrap">
                            <FilterButton label="全部" isActive={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                            <FilterButton label="运行中" isActive={statusFilter === 'running'} onClick={() => setStatusFilter('running')} />
                            <FilterButton label="待处理" isActive={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
                            <FilterButton label="已完成" isActive={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} />
                            <FilterButton label="已停止" isActive={statusFilter === 'stopped'} onClick={() => setStatusFilter('stopped')} />
                            <FilterButton label="失败" isActive={statusFilter === 'failed'} onClick={() => setStatusFilter('failed')} />
                        </div>
                    </div>
                </div>
            </div>

            {isLoading && <div className="text-center py-10">加载中...</div>}
            {error && <div className="text-center py-10 text-red-500">加载失败: {error}</div>}
            
            {!isLoading && !error && filteredTasks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTasks.map((task) => (
                        <TaskCard key={task.task_id} task={task} />
                    ))}
                </div>
            )}
            
            {!isLoading && !error && filteredTasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-center bg-white rounded-xl border-2 border-dashed">
                    <div className="text-gray-500">
                        <p className="font-semibold text-lg">无匹配的分析任务</p>
                        <p className="mt-1">请调整筛选条件或稍后重试。</p>
                    </div>
                </div>
            )}
        </div>
    );
};