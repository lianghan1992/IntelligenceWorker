import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks } from '../../api';
import { TaskCard } from './TaskCard';
import { EventReportModal } from './EventReportModal';

const TaskSection: React.FC<{ title: string; tasks: LivestreamTask[]; onCardClick: (task: LivestreamTask) => void; color: string; }> = ({ title, tasks, onCardClick, color }) => {
    if (tasks.length === 0) {
        return null;
    }
    return (
        <section>
            <div className="flex items-center gap-4 mb-4 relative">
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`w-1 h-7 rounded-full`} style={{ backgroundColor: color }}></div>
                    <div className={`absolute left-0 w-24 h-1 bottom-0`} style={{ background: `radial-gradient(ellipse at center, ${color}33 0%, transparent 70%)`}}></div>
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                </div>
                <div className="flex-grow h-px bg-gray-200"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onViewReport={() => onCardClick(task)} />
                ))}
            </div>
        </section>
    );
};

export const IndustryEvents: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getLivestreamTasks({ page_size: 50, sort_by: 'created_at', order: 'desc' });
            if (response && Array.isArray(response.items)) {
                setTasks(response.items);
            } else {
                console.warn("IndustryEvents: API call did not return a valid paginated response. Defaulting to empty.");
                setTasks([]);
            }
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
        const liveTasks: LivestreamTask[] = [];
        const upcomingTasks: LivestreamTask[] = [];
        const finishedTasks: LivestreamTask[] = [];

        tasks.forEach(task => {
            const status = task.status.toLowerCase();
            
            if (status === 'recording' || status === 'downloading' || status === 'stopping') {
                liveTasks.push(task);
            } else if (status === 'listening' || status === 'pending' || status === 'scheduled') {
                upcomingTasks.push(task);
            } else { // finished, failed, processing, and for backward compatibility 'completed'
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
        const status = task.status.toLowerCase();
        if ((status === 'completed' || status === 'finished') && task.summary_report) {
            setSelectedEvent(task);
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center py-20 text-gray-500">加载中...</div>;
        if (error) return <div className="text-center py-20 text-red-500">加载失败: {error}</div>;
        
        const noTasks = tasks.length === 0;

        if (noTasks) {
             return (
                <div className="flex-1 flex items-center justify-center text-center bg-white/50 backdrop-blur-sm rounded-xl border-2 border-dashed mt-6">
                    <div className="text-gray-500">
                        <p className="font-semibold text-lg">暂无任何发布会任务</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-12">
                <TaskSection title="直播中" tasks={liveTasks} onCardClick={handleTaskCardClick} color="#ef4444" />
                <TaskSection title="即将开始" tasks={upcomingTasks} onCardClick={handleTaskCardClick} color="#3b82f6" />
                <TaskSection title="已结束" tasks={finishedTasks} onCardClick={handleTaskCardClick} color="#8b5cf6" />
            </div>
        )
    }

    return (
        <>
            <div className="p-6 min-h-full flex flex-col relative overflow-hidden colorful-bg-animation">
                {renderContent()}
            </div>
            {selectedEvent && (
                <EventReportModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
             <style>{`
                .colorful-bg-animation::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(236, 72, 153, 0.12), rgba(245, 158, 11, 0.12), rgba(16, 185, 129, 0.12));
                    background-size: 400% 400%;
                    animation: gradient-animation 15s ease infinite;
                    z-index: -1;
                    opacity: 1;
                    filter: blur(60px);
                }

                @keyframes gradient-animation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </>
    );
};