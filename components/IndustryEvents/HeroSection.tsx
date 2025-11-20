
import React, { useState, useEffect, useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { PlayIcon, ClockIcon, FilmIcon, DocumentTextIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

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
    // API Doc: recording, downloading, stopping -> LIVE
    if (['recording', 'downloading', 'stopping'].includes(s)) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse shadow-lg shadow-red-900/20">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                LIVE 直播中
            </span>
        );
    }
    // API Doc: listening, scheduled -> UPCOMING
    // 'pending' is kept for backward compatibility if needed
    if (['listening', 'scheduled', 'pending'].includes(s)) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-900/20">
                <ClockIcon className="w-3 h-3" />
                即将开始
            </span>
        );
    }
    // API Doc: processing -> PROCESSING
    if (s === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg">
                <SparklesIcon className="w-3 h-3" />
                AI生成中
            </span>
        );
    }
    // API Doc: finished -> FINISHED
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-700/80 backdrop-blur text-white text-xs font-bold rounded-full">
            精彩回放
        </span>
    );
};

// Simple Sparkles icon for local usage
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
);

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
    // Refined Filtering Logic based on API Documentation
    const playlist = useMemo(() => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('zh-CN'); 

        const isToday = (dateStr: string) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('zh-CN') === todayStr;
        };
        
        // Priority 1: Live (recording, downloading, stopping)
        const live = tasks.filter(t => ['recording', 'downloading', 'stopping'].includes(t.status.toLowerCase()));

        // Priority 2: Processing (Just finished recording, AI working)
        const processing = tasks.filter(t => t.status.toLowerCase() === 'processing');

        // Priority 3: Upcoming Today (listening, scheduled)
        // We strictly check if the start time is "Today" or very near future (e.g. tomorrow morning)
        const upcomingToday = tasks.filter(t => {
            const s = t.status.toLowerCase();
            // API doc says 'scheduled' or 'listening'
            if (!['listening', 'scheduled', 'pending'].includes(s)) return false;
            
            const startTime = new Date(t.start_time).getTime();
            const nowTime = now.getTime();
            // Is today OR within next 24h
            return isToday(t.start_time) || (startTime > nowTime && startTime - nowTime < 24 * 60 * 60 * 1000);
        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        // Priority 4: Finished Today (Recent highlights)
        const finishedToday = tasks.filter(t => {
            const s = t.status.toLowerCase();
            return ['finished', 'completed'].includes(s) && isToday(t.start_time);
        }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        // Combine into playlist
        let list = [...live, ...processing, ...upcomingToday, ...finishedToday];

        // Fallback: If list is empty, grab the single most relevant upcoming task from the future
        if (list.length === 0) {
             const nextUpcoming = tasks.filter(t => ['listening', 'scheduled', 'pending'].includes(t.status.toLowerCase()))
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
             if (nextUpcoming) list.push(nextUpcoming);
             
             // Or if no upcoming, grab the very last finished one
             if (!nextUpcoming) {
                 const lastFinished = tasks.filter(t => ['finished', 'completed'].includes(t.status.toLowerCase()))
                    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];
                 if (lastFinished) list.push(lastFinished);
             }
        }

        // Remove duplicates (just in case logic overlaps)
        return Array.from(new Set(list.map(t => t.id))).map(id => list.find(t => t.id === id)!);
    }, [tasks]);

    const [activeIndex, setActiveIndex] = useState(0);
    const activeTask = playlist[activeIndex];

    // Reset index if playlist changes significantly
    useEffect(() => {
        if (playlist.length > 0 && activeIndex >= playlist.length) {
            setActiveIndex(0);
        }
    }, [playlist.length]);

    const handleNext = () => {
        setActiveIndex((prev) => (prev + 1) % playlist.length);
    };

    const handlePrev = () => {
        setActiveIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    };

    if (!activeTask) return null;

    const activeImage = getSafeImageSrc(activeTask.cover_image_b64);
    const hasMultiple = playlist.length > 1;

    return (
        <div className="relative w-full overflow-hidden rounded-3xl bg-gray-900 shadow-2xl mb-10 group h-[500px] lg:h-[550px]">
            {/* 1. Background Layer */}
            <div className="absolute inset-0 z-0">
                {activeImage ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-105"
                        style={{ 
                            backgroundImage: `url(${activeImage})`,
                            // Removed heavy blur to make image visible
                            filter: 'blur(0px)',
                            opacity: 0.85
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black" />
                )}
                {/* Gradient Overlay: Ensures text readability while letting image shine through */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            </div>

            {/* 2. Content Container */}
            <div className="relative z-10 flex flex-col justify-end h-full p-8 sm:p-12 lg:p-16 max-w-5xl">
                
                {/* Navigation Arrows (Only if multiple) */}
                {hasMultiple && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 lg:right-10 flex flex-col gap-4 z-20">
                         <button onClick={handlePrev} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110 border border-white/10 shadow-lg">
                             <ChevronLeftIcon className="w-6 h-6" />
                         </button>
                         <button onClick={handleNext} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-110 border border-white/10 shadow-lg">
                             <ChevronRightIcon className="w-6 h-6" />
                         </button>
                    </div>
                )}

                <div className="space-y-6 transition-all duration-500 ease-in-out transform translate-y-0 opacity-100">
                    {/* Metadata Row */}
                    <div className="flex items-center flex-wrap gap-3 mb-2">
                        <StatusBadge status={activeTask.status} />
                        <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-100 font-bold text-xs tracking-wide uppercase border border-white/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            {activeTask.company}
                        </span>
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl line-clamp-2">
                        {activeTask.task_name}
                    </h1>
                    
                    {/* Time & Countdown */}
                    <div className="flex flex-wrap items-center text-gray-200 text-sm sm:text-base gap-6 font-medium">
                        <span className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/5">
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

            {/* Pagination Indicators (Dots) */}
            {hasMultiple && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {playlist.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/80'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
