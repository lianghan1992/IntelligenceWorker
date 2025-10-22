import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../types';
import { getLivestreamTasks } from '../api';
import { TaskCard } from './TaskCard';
import { AddEventModal } from './AddEventModal';
import { PlusIcon } from './icons';
import { EventReportModal } from './EventReportModal';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'finished';

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

const TaskSection: React.FC<{ title: string; tasks: LivestreamTask[]; onCardClick: (task: LivestreamTask) => void; }> = ({ title, tasks, onCardClick }) => (
    <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} />
            ))}
        </div>
    </section>
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
                console.warn("IndustryEvents: API call did not return an array. Defaulting to empty.");
                setTasks([]);
                return;
            }
            const sorted = fetchedTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTasks(sorted);
        } catch (err) {
            setError(err instanceof Error ? err.message : '发生未知错误');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const { liveTasks, upcomingTasks, finishedTasks } = useMemo(() => {
        const live: LivestreamTask[] = [];
        const upcoming: LivestreamTask[] = [];
        const finished: LivestreamTask[] = [];

        tasks.forEach(task => {
            const status = task.status.toLowerCase();
            if (status === 'listening' || status === 'recording') {
                live.push(task);
            } else if (status === 'pending') {
                upcoming.push(task);
            } else { // completed, failed
                finished.push(task);
            }
        });
        
        const sortByDate = (a: LivestreamTask, b: LivestreamTask) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        live.sort(sortByDate);
        upcoming.sort(sortByDate);
        finished.sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());


        return { liveTasks: live, upcomingTasks: upcoming, finishedTasks: finished };
    }, [tasks]);
    
    const handleTaskCardClick = (task: LivestreamTask) => {
        if (task.status.toLowerCase() === 'completed') {
            setSelectedEvent(task);
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center py-20 text-gray-500">加载中...</div>;
        if (error) return <div className="text-center py-20 text-red-500">加载失败: {error}</div>;
        
        const noLive = liveTasks.length === 0;
        const noUpcoming = upcomingTasks.length === 0;
        const noFinished = finishedTasks.length === 0;

        if (noLive && noUpcoming && noFinished) {
             return (
                <div className="flex-1 flex items-center justify-center text-center bg-white rounded-xl border-2 border-dashed mt-6">
                    <div className="text-gray-500">
                        <p className="font-semibold text-lg">暂无任何发布会任务</p>
                        <p className="mt-1">点击右上角按钮创建一个新任务吧。</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-12">
                {(statusFilter === 'all' || statusFilter === 'live') && !noLive && (
                    <TaskSection title="直播中" tasks={liveTasks} onCardClick={handleTaskCardClick} />
                )}
                {(statusFilter === 'all' || statusFilter === 'upcoming') && !noUpcoming && (
                    <TaskSection title="即将开始" tasks={upcomingTasks} onCardClick={handleTaskCardClick} />
                )}
                {(statusFilter === 'all' || statusFilter === 'finished') && !noFinished && (
                     <TaskSection title="已结束" tasks={finishedTasks} onCardClick={handleTaskCardClick} />
                )}
            </div>
        )
    }

    return (
        <>
            <div className="p-6 bg-gray-50/50 min-h-full flex flex-col">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-800">发布会智能分析</h1>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                            <PlusIcon className="w-4 h-4" />
                            <span>创建分析任务</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border">
                        <span className="text-sm font-semibold text-gray-600">筛选:</span>
                        <div className="flex gap-2 flex-wrap">
                            <FilterButton label="全部" isActive={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                            <FilterButton label="即将开始" isActive={statusFilter === 'upcoming'} onClick={() => setStatusFilter('upcoming')} />
                            <FilterButton label="直播中" isActive={statusFilter === 'live'} onClick={() => setStatusFilter('live')} />
                            <FilterButton label="已结束" isActive={statusFilter === 'finished'} onClick={() => setStatusFilter('finished')} />
                        </div>
                    </div>
                </div>

                {renderContent()}
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