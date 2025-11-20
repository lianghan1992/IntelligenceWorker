
import React, { useState, useEffect, useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { PlayIcon, ClockIcon, FilmIcon, DocumentTextIcon } from '../icons';

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
                LIVE
            </span>
        );
    }
    if (s === 'listening' || s === 'scheduled' || s === 'pending') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-900/20">
                <ClockIcon className="w-3 h-3" />
                UPCOMING
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-700/80 backdrop-blur text-white text-xs font-bold rounded-full">
            REPLAY
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

export const HeroSection: React.FC<HeroSectionProps> = ({ tasks, onViewReport }) => {
    // Filter high priority tasks: Live > Upcoming (next 24h) > Recent Finished (last 24h)
    // If none, maybe show generic recent.
    const playlist = useMemo(() => {
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        
        const live = tasks.filter(t => ['recording', 'downloading', 'stopping'].includes(t.status.toLowerCase()));
        const upcoming = tasks.filter(t => {
            const isPending = ['listening', 'scheduled', 'pending'].includes(t.status.toLowerCase());
            const isSoon = new Date(t.start_time).getTime() - now < oneDay; // within 24h
            return isPending && isSoon;
        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        // If we have very few live/upcoming, add some recent highlights
        let recent: LivestreamTask[] = [];
        if (live.length + upcoming.length < 5) {
             recent = tasks.filter(t => {
                const isDone = ['finished', 'completed'].includes(t.status.toLowerCase());
                // const isRecent = now - new Date(t.start_time).getTime() < oneDay * 7; // last 7 days
                return isDone; // Just show finished ones
            })
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
            .slice(0, 5 - (live.length + upcoming.length));
        }

        return [...live, ...upcoming, ...recent];
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
        <div className="relative w-full overflow-hidden rounded-3xl bg-gray-900 shadow-2xl mb-10 transition-all duration-500">
            {/* 1. Dynamic Background Layer */}
            <div className="absolute inset-0 z-0">
                {activeImage ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-110 filter blur-3xl opacity-40"
                        style={{ backgroundImage: `url(${activeImage})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black opacity-60" />
                )}
                <div className="absolute inset-0 bg-black/40" /> {/* Dimmer */}
            </div>

            {/* 2. Content Container */}
            <div className={`relative z-10 flex flex-col lg:flex-row h-[500px] lg:h-[480px]`}>
                
                {/* Left: Main Stage */}
                <div className={`relative flex-1 flex flex-col justify-end p-6 sm:p-10 transition-all duration-500 ${isSingleMode ? 'w-full' : 'lg:w-3/4'}`}>
                    {/* Main Visual (Clickable area for video) */}
                     <div className="absolute inset-0 z-0 lg:right-4">
                        {/* Provide a subtle gradient overlay on the image itself for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent lg:to-transparent lg:via-transparent lg:bg-gradient-to-r lg:from-gray-900 lg:via-gray-900/60 lg:to-transparent"></div>
                    </div>

                    {/* Text Content */}
                    <div className="relative z-10 max-w-3xl space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <StatusBadge status={activeTask.status} />
                            <span className="text-blue-300 font-semibold text-sm tracking-wide uppercase">{activeTask.company}</span>
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">
                            {activeTask.task_name}
                        </h1>
                        
                        <div className="flex items-center text-gray-300 text-sm sm:text-base gap-4">
                            <span>{new Date(activeTask.start_time).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            {['listening', 'scheduled'].includes(activeTask.status.toLowerCase()) && (
                                <span className="text-yellow-400 font-medium flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4"/>
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
                                className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all transform hover:scale-105"
                            >
                                <PlayIcon className="w-5 h-5" />
                                {['recording', 'downloading'].includes(activeTask.status.toLowerCase()) ? '进入直播间' : '观看回放/详情'}
                            </a>
                            
                            {['finished', 'completed'].includes(activeTask.status.toLowerCase()) && (
                                <button 
                                    onClick={() => onViewReport(activeTask)}
                                    className="flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-semibold border border-white/10 transition-all"
                                >
                                    <DocumentTextIcon className="w-5 h-5" />
                                    阅读AI报告
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Playlist (Only if > 1 item) */}
                {!isSingleMode && (
                    <div className="lg:w-[320px] bg-gray-900/60 backdrop-blur-xl border-l border-white/5 flex flex-col">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider text-opacity-80">今日焦点 & 热门</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
                            {playlist.map((task, index) => {
                                const isActive = index === activeIndex;
                                const img = getSafeImageSrc(task.cover_image_b64);
                                const isLive = ['recording', 'downloading'].includes(task.status.toLowerCase());
                                
                                return (
                                    <div 
                                        key={task.id}
                                        onClick={() => setActiveIndex(index)}
                                        className={`group flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${isActive ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                                            {img ? (
                                                <img src={img} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600"><FilmIcon className="w-6 h-6"/></div>
                                            )}
                                            {isLive && (
                                                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                            )}
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className={`text-sm font-medium truncate leading-tight mb-1 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                {task.task_name}
                                            </h4>
                                            <p className="text-xs text-gray-500 truncate">{task.company}</p>
                                            {isActive && isLive && <p className="text-[10px] text-red-400 mt-1 font-bold">正在直播</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
