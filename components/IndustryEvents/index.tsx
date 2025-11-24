
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks } from '../../api';
import { TaskCard } from './TaskCard';
import { EventReportModal } from './EventReportModal';
import { HeroSection } from './HeroSection';

// Helper to separate tasks into grid sections if needed
const TaskSection: React.FC<{ title: string; tasks: LivestreamTask[]; onCardClick: (task: LivestreamTask) => void; color: string; }> = ({ title, tasks, onCardClick, color }) => {
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
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch more items to fill both Hero and Grid
            const response = await getLivestreamTasks({ page_size: 100, sort_by: 'created_at', order: 'desc' });
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

    const { heroTasks, upcomingOthers, finishedOthers } = useMemo(() => {
        // Logic: 
        // 1. Hero gets Live, Upcoming (Next 24h), and maybe top recent highlights.
        // 2. Grid gets everything else (History, future scheduled events).
        // To simplify: Pass ALL tasks to Hero, Hero picks its playlist.
        // BUT, we don't want to duplicate items in the grid below immediately if they are in Hero.
        // Let's keep it simple: Hero shows "Highlights", Grid shows "Everything" (or "Past Events").
        
        // Refined Logic:
        // Hero displays dynamic playlist.
        // Grid displays: "Upcoming" (future > 24h) and "Past Events" (finished). 
        // "Live" and "Imminent" are exclusive to Hero to reduce clutter.
        
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        const isHeroWorthy = (t: LivestreamTask) => {
            const s = t.status.toLowerCase();
            if (['recording', 'downloading', 'stopping'].includes(s)) return true; // Live
            if (['listening', 'scheduled', 'pending'].includes(s)) {
                // Upcoming within 24h
                return new Date(t.start_time).getTime() - now < oneDay; 
            }
            return false; 
        };

        const heroWorthyTasks = tasks.filter(isHeroWorthy);
        const otherTasks = tasks.filter(t => !isHeroWorthy(t));

        // Sort others
        const upcomingOthers = otherTasks.filter(t => ['listening', 'scheduled', 'pending'].includes(t.status.toLowerCase()))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            
        const finishedOthers = otherTasks.filter(t => !['listening', 'scheduled', 'pending'].includes(t.status.toLowerCase()))
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()); // Newest finished first

        return { 
            heroTasks: heroWorthyTasks.length > 0 ? heroWorthyTasks : [], // If no active, Hero handles fallback internally or we pass empty
            upcomingOthers,
            finishedOthers 
        };
    }, [tasks]);
    
    const handleTaskCardClick = (task: LivestreamTask) => {
        const status = task.status.toLowerCase();
        if (status === 'completed' || status === 'finished') {
            setSelectedEvent(task);
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center py-20 text-gray-500"><div className="animate-pulse">正在加载行业事件...</div></div>;
        if (error) return <div className="text-center py-20 text-red-500">加载失败: {error}</div>;
        
        const noTasks = tasks.length === 0;

        if (noTasks) {
             return (
                <div className="flex-1 flex items-center justify-center text-center bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200 h-96">
                    <div className="text-gray-400">
                        <p className="font-semibold text-lg">暂无任何发布会任务</p>
                    </div>
                </div>
            );
        }

        // If we have Hero tasks, show Hero. Otherwise, if we only have history, maybe just show grid?
        // Actually, HeroSection has a fallback logic to show recent finished tasks if no live ones.
        // So we simply pass all tasks to HeroSection, let it decide what to highlight, 
        // and we render the full categorized list below for comprehensive browsing.
        
        return (
            <div className="space-y-6 md:space-y-10 pb-20 md:pb-20">
                {/* 1. Immersive Hero Area */}
                <HeroSection tasks={tasks} onViewReport={handleTaskCardClick} />

                {/* 2. Standard Grid Areas */}
                <div className="px-4 md:px-2 space-y-8 md:space-y-12">
                    {/* Show "Future" if not in Hero (e.g. next week) */}
                    <TaskSection 
                        title="后续日程" 
                        tasks={upcomingOthers} 
                        onCardClick={handleTaskCardClick} 
                        color="#3b82f6" 
                    />
                    
                    {/* Show "History" */}
                    <TaskSection 
                        title="往期回顾" 
                        tasks={finishedOthers} 
                        onCardClick={handleTaskCardClick} 
                        color="#8b5cf6" 
                    />
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="md:p-6 p-0 min-h-full flex flex-col relative bg-gray-50">
                {renderContent()}
            </div>
            {selectedEvent && (
                <EventReportModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </>
    );
};