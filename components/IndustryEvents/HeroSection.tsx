import React, { useState, useEffect, useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { PlayIcon, ClockIcon, FilmIcon, DocumentTextIcon, CalendarIcon } from '../icons';

interface HeroSectionProps {
    tasks: LivestreamTask[];
    onViewReport: (task: LivestreamTask) => void;
}

// Helper to handle image src
const getSafeImageSrc = (base64Data: string | null | undefined): string | null => {
  if (!base64Data || base64Data.trim() === '' || base64Data.toLowerCase() === 'none' || base64Data.toLowerCase() === 'null') {
    return null;
  }
  if (base64Data.startsWith('data:image') || base64Data.startsWith('http')) {
    return base64Data;
  }
  return `data:image/jpeg;base64,${base64Data}`;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    if (s === 'recording' || s === 'downloading') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse shadow-lg shadow-red-900/20">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                LIVE 直播中
            </span>
        );
    }
    if (s === 'listening' || s === 'scheduled' || s === 'pending') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-900/20">
                <ClockIcon className="w-3 h-3" />
                即将开始
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-700/80 backdrop-blur text-white text-xs font-bold rounded-full">
            精彩回放
        </span>
    );
};

const Countdown: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calc = () => {
            const diff = new Date(targetDate).getTime() - new Date().getTime();
            if (diff <= 0) return '即将开始';
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `距开始 ${h}小时 ${m}分`;
        };
        setTimeLeft(calc());
        const timer = setInterval(() => setTimeLeft(calc()), 60000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return <span>{timeLeft}</span>;
};

// Helper to format list item time
const formatListItemTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const timeStr = date.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
        return `今天 ${timeStr}`;
    }
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
};

// Helper to get relative status text for list
const getRelativeStatus = (task: LivestreamTask) => {
    const status = task.status.toLowerCase();
    if (['recording', 'downloading'].includes(status)) return { text: '正在直播', color: 'text-red-500 font-bold' };
    
    const now = new Date().getTime();
    const start = new Date(task.start_time).getTime();
    const diffHours = (start - now) / (1000 * 60 * 60);

    if (['listening', 'scheduled', 'pending'].includes(status)) {
        if (diffHours < 0) return { text: '即将开始', color: 'text-blue-400' };
        if (diffHours < 24) return { text: `${Math.ceil(diffHours)}小时后`, color: 'text-blue-400' };
        return { text: '未开始', color: 'text-gray-400' };
    }
    
    return { text: '已结束', color: 'text-gray-500' };
};

export const HeroSection: React.FC<HeroSectionProps> = ({ tasks, onViewReport }) => {
    // 1. Filter Logic: Focus on Live and Upcoming (Future)
    const playlist = useMemo(() => {
        const now = new Date().getTime();
        
        // A. Live Tasks (Top Priority)
        const live = tasks.filter(t => ['recording', 'downloading', 'stopping'].includes(t.status.toLowerCase()));
        
        // B. Upcoming Tasks (Future start time or status is scheduled)
        // Sort by nearest start time
        const upcoming = tasks.filter(t => {
            const s = t.status.toLowerCase();
            return ['listening', 'scheduled', 'pending'].includes(s);
        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        // C. Very recent finished (Only if list is too short, e.g., finished today)
        // This ensures we don't show ancient history in the "Today/Focus" list
        const recentFinished = tasks.filter(t => {
            const s = t.status.toLowerCase();
            const isFinished = ['finished', 'completed'].includes(s);
            const endTime = new Date(t.updated_at || t.created_at).getTime(); // approx end time
            const isRecent = (now - endTime) < 24 * 60 * 60 * 1000; // within 24h
            return isFinished && isRecent;
        }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        return [...live, ...upcoming, ...recentFinished];
    }, [tasks]);

    const [activeIndex, setActiveIndex] = useState(0);
    const activeTask = playlist[activeIndex];

    // Auto-select first live task if available on mount
    useEffect(() => {
        const firstLiveIndex = playlist.findIndex(t => ['recording', 'downloading'].includes(t.status.toLowerCase()));
        if (firstLiveIndex !== -1) setActiveIndex(firstLiveIndex);
    }, [playlist]);

    if (!activeTask) return null;

    const activeImage = getSafeImageSrc(activeTask.cover_image_b64);
    const isSingleMode = playlist.length <= 1;

    return (
        <div className="relative w-full overflow-hidden rounded-3xl bg-gray-900 shadow-2xl mb-10 transition-all duration-500 group">
            {/* Style injection for scrollbar hiding */}
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* 1. Dynamic Background Layer - Full Cover */}
            <div className="absolute inset-0 z-0">
                {activeImage ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-105 group-hover:scale-110 filter blur-xl opacity-60"
                        style={{ backgroundImage: `url(${activeImage})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black opacity-80" />
                )}
                {/* Dark overlay for text contrast */}
                <div className="absolute inset-0 bg-black/40" /> 
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent" />
            </div>

            {/* 2. Content Container */}
            <div className={`relative z-10 flex flex-col lg:flex-row h-[550px] lg:h-[520px]`}>
                
                {/* Left: Main Stage (Flexible Width) */}
                <div className={`relative flex-1 flex flex-col justify-end p-8 sm:p-12 transition-all duration-500`}>
                    
                    {/* Main Visual (Subtle overlay on the right side of the main stage to blend with list) */}
                     <div className="absolute inset-0 z-0 lg:right-0 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                    </div>

                    {/* Text Content */}
                    <div className="relative z-10 max-w-4xl space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <StatusBadge status={activeTask.status} />
                            <span className="text-blue-200 font-bold text-sm tracking-wide uppercase drop-shadow-md flex items-center gap-2">
                                <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                {activeTask.company}
                            </span>
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-2xl line-clamp-3">
                            {activeTask.task_name}
                        </h1>
                        
                        <div className="flex flex-wrap items-center text-gray-200 text-sm sm:text-base gap-6 font-medium drop-shadow-md bg-black/20 backdrop-blur-sm w-fit px-4 py-2 rounded-lg border border-white/10">
                            <span className="flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-gray-300" />
                                {new Date(activeTask.start_time).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {['listening', 'scheduled', 'pending'].includes(activeTask.status.toLowerCase()) && (
                                <span className="text-yellow-400 font-bold flex items-center gap-2 border-l border-white/20 pl-6">
                                    <ClockIcon className="w-5 h-5"/>
                                    <Countdown targetDate={activeTask.start_time} />
                                </span>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-4 pt-4">
                            <a 
                                href={activeTask.live_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-600/30 transition-all transform hover:scale-105 hover:shadow-2xl"
                            >
                                <PlayIcon className="w-6 h-6" />
                                <span className="text-lg">{['recording', 'downloading'].includes(activeTask.status.toLowerCase()) ? '进入直播间' : '观看回放/详情'}</span>
                            </a>
                            
                            {['finished', 'completed'].includes(activeTask.status.toLowerCase()) && (
                                <button 
                                    onClick={() => onViewReport(activeTask)}
                                    className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-semibold border border-white/20 transition-all hover:border-white/40"
                                >
                                    <DocumentTextIcon className="w-5 h-5" />
                                    阅读AI报告
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Playlist (Wider Fixed Width) */}
                {!isSingleMode && (
                    <div className="lg:w-[400px] xl:w-[480px] bg-gray-900/80 backdrop-blur-xl border-l border-white/10 flex flex-col flex-shrink-0">
                        <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                            <h3 className="text-white font-bold text-base uppercase tracking-wider text-opacity-90 flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                                今日焦点 & 热门
                            </h3>
                            <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">{playlist.length} 场</span>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-3">
                            {playlist.map((task, index) => {
                                const isActive = index === activeIndex;
                                const img = getSafeImageSrc(task.cover_image_b64);
                                const isLive = ['recording', 'downloading'].includes(task.status.toLowerCase());
                                const relStatus = getRelativeStatus(task);
                                
                                return (
                                    <div 
                                        key={task.id}
                                        onClick={() => setActiveIndex(index)}
                                        className={`group flex gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden ${isActive ? 'bg-white/10 border border-white/20 shadow-lg' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                        
                                        {/* Thumbnail */}
                                        <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800 border border-white/10 shadow-md">
                                            {img ? (
                                                <img src={img} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity scale-105 group-hover:scale-110 duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600"><FilmIcon className="w-8 h-8"/></div>
                                            )}
                                            {isLive && (
                                                <div className="absolute top-1 right-1 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-8"></div>
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                            <h4 className={`text-sm font-medium leading-tight line-clamp-2 ${isActive ? 'text-white font-bold' : 'text-gray-300 group-hover:text-white'}`}>
                                                {task.task_name}
                                            </h4>
                                            <div className="flex justify-between items-center mt-1">
                                                 <p className="text-xs text-gray-400 truncate font-medium">{task.company}</p>
                                                 <span className={`text-[10px] ${relStatus.color} bg-black/30 px-1.5 py-0.5 rounded border border-white/5`}>
                                                    {relStatus.text}
                                                 </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" />
                                                {formatListItemTime(task.start_time)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {playlist.length === 0 && (
                                <div className="text-center py-10 text-gray-500 text-sm">
                                    暂无今日或即将开始的发布会
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
