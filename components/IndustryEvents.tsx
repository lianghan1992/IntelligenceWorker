import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../types';
import { getLivestreamTasks } from '../api';
import { TaskCard } from './TaskCard';
import { AddEventModal } from './AddEventModal';
import { PlusIcon } from './icons';
import { EventReportModal } from './EventReportModal';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'analyzing' | 'completed' | 'failed';

const FilterButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
            isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white hover:bg-gray-100 border'
        }`}
    >
        {label}
    </button>
);

export const IndustryEvents: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedTasks = await getLivestreamTasks();

            if (!Array.isArray(fetchedTasks)) {
                console.warn("IndustryEvents: API at /livestream/tasks did not return an array. Defaulting to empty array.");
                setTasks([]);
                return;
            }
            
            const statusOrder: { [key: string]: number } = {
                'recording': 1,
                'listening': 2,
                'processing': 3,
                'pending': 4,
                'completed': 5,
                'failed': 6,
            };
            const sortedTasks = [...fetchedTasks].sort((a, b) => {
                const orderA = statusOrder[a.status] || 99;
                const orderB = statusOrder[b.status] || 99;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setTasks(sortedTasks);
        } catch (err) {
            setError(err instanceof Error ? err.message : '发生未知错误');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const filteredTasks = useMemo(() => {
        if (statusFilter === 'all') return tasks;
        return tasks.filter(task => {
            const status = task.status.toLowerCase();
            switch (statusFilter) {
                case 'upcoming': return status === 'pending';
                case 'live': return status === 'listening' || status === 'recording';
                case 'analyzing': return status === 'processing';
                case 'completed': return status === 'completed';
                case 'failed': return status === 'failed';
                default: return true;
            }
        });
    }, [tasks, statusFilter]);
    
    const handleTaskCardClick = (task: LivestreamTask) => {
        if (task.status === 'completed') {
            setSelectedEvent(task);
        }
    };


    return (
        <>
            <div className="p-6 bg-gray-50/50 min-h-full flex flex-col">
                <div className="mb-6 bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-800">行业事件智能分析</h1>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                            <PlusIcon className="w-4 h-4" />
                            <span>创建分析任务</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-600 w-16">任务状态:</span>
                        <div className="flex gap-2 flex-wrap">
                            <FilterButton label="全部" isActive={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                            <FilterButton label="即将开始" isActive={statusFilter === 'upcoming'} onClick={() => setStatusFilter('upcoming')} />
                            <FilterButton label="直播中" isActive={statusFilter === 'live'} onClick={() => setStatusFilter('live')} />
                            <FilterButton label="分析中" isActive={statusFilter === 'analyzing'} onClick={() => setStatusFilter('analyzing')} />
                            <FilterButton label="已完成" isActive={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} />
                            <FilterButton label="失败" isActive={statusFilter === 'failed'} onClick={() => setStatusFilter('failed')} />
                        </div>
                    </div>
                </div>

                {isLoading && <div className="text-center py-10">加载中...</div>}
                {error && <div className="text-center py-10 text-red-500">加载失败: {error}</div>}
                
                {!isLoading && !error && filteredTasks.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTasks.map((task) => (
                            <TaskCard key={task.id} task={task} onClick={() => handleTaskCardClick(task)} />
                        ))}
                    </div>
                )}
                
                {!isLoading && !error && filteredTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-center bg-white rounded-xl border-2 border-dashed">
                        <div className="text-gray-500">
                            <p className="font-semibold text-lg">无匹配的分析任务</p>
                            <p className="mt-1">请调整筛选条件或创建一个新任务。</p>
                        </div>
                    </div>
                )}
            </div>
            {isAddModalOpen && (
                <AddEventModal 
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={loadTasks}
                />
            )}
            {selectedEvent && (
                <EventReportModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </>
    );
};