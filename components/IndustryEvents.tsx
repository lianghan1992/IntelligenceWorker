import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../types';
import { getLivestreamTasks } from '../api';
import { EventReportModal } from './EventReportModal';
import { TaskCard } from './TaskCard';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';
import { PlusIcon } from './icons';

export const IndustryEvents: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddHistoryModalOpen, setIsAddHistoryModalOpen] = useState(false);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetch all tasks and filter on the client-side for this view
            const tasksData = await getLivestreamTasks({ limit: 200, sort_by: 'start_time', order: 'desc' });
            setTasks(tasksData.items);
        } catch (err: any) {
            setError(err.message || '无法加载事件列表');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const { liveTasks, upcomingTasks, finishedTasks } = useMemo(() => {
        const now = new Date();
        const live: LivestreamTask[] = [];
        const upcoming: LivestreamTask[] = [];
        const finished: LivestreamTask[] = [];

        tasks.forEach(task => {
            const startTime = new Date(task.start_time);
            if (task.status === 'recording') {
                live.push(task);
            } else if (['completed', 'failed'].includes(task.status) || (startTime < now && task.status !== 'recording')) {
                finished.push(task);
            } else {
                upcoming.push(task);
            }
        });
        
        upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        return { liveTasks: live, upcomingTasks: upcoming, finishedTasks: finished };
    }, [tasks]);

    const handleSuccess = () => {
        loadTasks();
    };

    const renderSection = (title: string, taskArray: LivestreamTask[]) => {
        if (taskArray.length === 0) return null;
        return (
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {taskArray.map(event => (
                        <TaskCard 
                            key={event.id} 
                            task={event} 
                            onViewReport={setSelectedEvent}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-gray-50/70 min-h-full">
            <div className="max-w-screen-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">发布会</h1>
                        <p className="mt-1 text-gray-600">追踪行业关键事件，获取AI生成的深度解读报告。</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsAddHistoryModalOpen(true)} className="px-4 py-2 bg-white border text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-100">创建历史任务</button>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                            <PlusIcon className="w-5 h-5" />
                            创建新任务
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-gray-500">正在加载...</div>
                ) : error ? (
                    <div className="text-center py-20 text-red-500">{error}</div>
                ) : (
                    <>
                        {renderSection("直播中", liveTasks)}
                        {renderSection("即将开始", upcomingTasks)}
                        {renderSection("已结束", finishedTasks)}
                    </>
                )}
            </div>
            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />}
            {isAddHistoryModalOpen && <AddHistoryEventModal onClose={() => setIsAddHistoryModalOpen(false)} onSuccess={handleSuccess} />}
        </div>
    );
};
