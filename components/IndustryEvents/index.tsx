import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks } from '../../api';
import { TaskCard } from './TaskCard';
import { EventReportModal } from './EventReportModal';
import { VideoCameraIcon, CheckIcon } from '../icons';

export const IndustryEvents: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'upcoming' | 'finished'>('upcoming');
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch both upcoming and finished tasks
            const upcomingParams = { status: 'pending,listening,recording', limit: 50 };
            const finishedParams = { status: 'completed,processing,failed', limit: 50, sort_by: 'start_time', order: 'desc' };
            
            const [upcomingResponse, finishedResponse] = await Promise.all([
                getLivestreamTasks(upcomingParams),
                getLivestreamTasks(finishedParams)
            ]);
            
            const allTasks = [...(upcomingResponse.items || []), ...(finishedResponse.items || [])];
            setTasks(allTasks);
        } catch (err) {
            setError(err instanceof Error ? err.message : '发生未知错误');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const { upcomingTasks, finishedTasks } = useMemo(() => {
        const upcoming: LivestreamTask[] = [];
        const finished: LivestreamTask[] = [];
        tasks.forEach(task => {
            const status = task.status.toLowerCase();
            if (['pending', 'listening', 'recording'].includes(status)) {
                upcoming.push(task);
            } else {
                finished.push(task);
            }
        });
        // Sort upcoming tasks by start time ascending
        upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        // Sort finished tasks by start time descending
        finished.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        return { upcomingTasks: upcoming, finishedTasks: finished };
    }, [tasks]);
    
    const tasksToDisplay = view === 'upcoming' ? upcomingTasks : finishedTasks;

    const handleViewReport = (task: LivestreamTask) => {
        if (task.summary_report) {
            setSelectedEvent(task);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-20 text-gray-500">正在加载发布会...</div>;
        }
        if (error) {
            return <div className="text-center py-20 text-red-500">加载失败: {error}</div>;
        }
        if (tasksToDisplay.length === 0) {
            return (
                <div className="text-center py-20">
                    <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">暂无{view === 'upcoming' ? '即将开始' : '已结束'}的发布会</h3>
                    <p className="mt-1 text-sm text-gray-500">请稍后查看或切换分类。</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tasksToDisplay.map(task => (
                    <TaskCard key={task.id} task={task} onViewReport={() => handleViewReport(task)} />
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 bg-gray-50/70 h-full flex flex-col">
            <div className="flex-shrink-0 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">行业发布会</h1>
                        <p className="text-gray-500 mt-1">追踪行业重要事件，AI自动生成会议纪要。</p>
                    </div>
                </div>
                 <div className="mt-4 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setView('upcoming')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                view === 'upcoming'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <VideoCameraIcon className="w-5 h-5" />
                            即将开始 ({upcomingTasks.length})
                        </button>
                        <button
                            onClick={() => setView('finished')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                view === 'finished'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <CheckIcon className="w-5 h-5" />
                            已结束 ({finishedTasks.length})
                        </button>
                    </nav>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {renderContent()}
            </div>

            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
        </div>
    );
};
