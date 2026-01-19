
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasksLite } from '../../api';
import { TaskCard } from './TaskCard';
import { EventReportModal } from './EventReportModal';
import { HeroSection } from './HeroSection';
// Added RefreshIcon to imports
import { RefreshIcon } from '../icons';

const TaskSection: React.FC<{ title: string; tasks: Partial<LivestreamTask>[]; onCardClick: (task: Partial<LivestreamTask>) => void; color: string; }> = ({ title, tasks, onCardClick, color }) => {
    if (tasks.length === 0) {
        return null;
    }
    return (
        <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-4 md:mb-6 relative">
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`w-1 h-5 md:h-7 rounded-full`} style={{ backgroundColor: color }}></div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800">{title}</h2>
                </div>
                <div className="flex-grow h-px bg-gray-200/60"></div>
                <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 rounded-full">{tasks.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onViewReport={() => onCardClick(task)} />
                ))}
            </div>
        </section>
    );
};

export const IndustryEvents: React.FC = () => {
    const [tasks, setTasks] = useState<Partial<LivestreamTask>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 使用 lite 接口加载 100 条轻量级数据
            const response = await getLivestreamTasksLite({ page: 1, size: 100 });
            if (response && Array.isArray(response.items)) {
                setTasks(response.items);
            } else {
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

    const { upcomingOthers, finishedOthers } = useMemo(() => {
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        const isHeroWorthy = (t: Partial<LivestreamTask>) => {
            const s = t.status?.toLowerCase() || '';
            if (['recording', 'downloading', 'stopping'].includes(s)) return true;
            if (['listening', 'scheduled', 'pending'].includes(s) && t.start_time) {
                return new Date(t.start_time).getTime() - now < oneDay; 
            }
            return false; 
        };

        const otherTasks = tasks.filter(t => !isHeroWorthy(t));

        const upcomingOthers = otherTasks.filter(t => ['listening', 'scheduled', 'pending'].includes(t.status?.toLowerCase() || ''))
            .sort((a, b) => (a.start_time && b.start_time) ? new Date(a.start_time).getTime() - new Date(b.start_time).getTime() : 0);
            
        const finishedOthers = otherTasks.filter(t => !['listening', 'scheduled', 'pending'].includes(t.status?.toLowerCase() || ''))
            .sort((a, b) => (a.start_time && b.start_time) ? new Date(b.start_time).getTime() - new Date(a.start_time).getTime() : 0);

        return { upcomingOthers, finishedOthers };
    }, [tasks]);
    
    const handleTaskCardClick = (task: Partial<LivestreamTask>) => {
        const status = task.status?.toLowerCase();
        if (status === 'completed' || status === 'finished') {
            setSelectedEvent(task as LivestreamTask);
        }
    };

    if (isLoading) return <div className="p-10 flex flex-col items-center justify-center h-full text-slate-400 gap-3"><RefreshIcon className="w-8 h-8 animate-spin" /><p className="font-bold">载入轻量级列表...</p></div>;
    if (error) return <div className="text-center py-20 text-red-500">加载失败: {error}</div>;

    return (
        <>
            <div className="md:p-6 p-0 min-h-full flex flex-col relative bg-gray-50">
                <div className="space-y-6 md:space-y-10 pb-20 md:pb-20">
                    {/* Hero Section handles its own data selection from the passed tasks */}
                    <HeroSection tasks={tasks as LivestreamTask[]} onViewReport={handleTaskCardClick} />

                    <div className="px-4 md:px-2 space-y-8 md:space-y-12">
                        <TaskSection title="后续日程" tasks={upcomingOthers} onCardClick={handleTaskCardClick} color="#3b82f6" />
                        <TaskSection title="往期回顾" tasks={finishedOthers} onCardClick={handleTaskCardClick} color="#8b5cf6" />
                    </div>
                </div>
            </div>
            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
        </>
    );
};
