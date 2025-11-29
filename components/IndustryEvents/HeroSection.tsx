
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    if (['recording', 'downloading', 'stopping'].includes(s)) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-100 border border-red-500/30 text-xs font-bold rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                LIVE 直播中
            </span>
        );
    }
    if (['listening', 'scheduled', 'pending'].includes(s)) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-100 border border-blue-500/30 text-xs font-bold rounded-full">
                <ClockIcon className="w-3.5 h-3.5 text-blue-400" />
                即将开始
            </span>
        );
    }
    if (s === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 text-xs font-bold rounded-full">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                AI生成中
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/50 text-slate-300 border border-slate-600/50 text-xs font-bold rounded-full">
            精彩回放
        </span>
    );
};

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
            return `${h}小时 ${m}分`;
        };
        setTimeLeft(calc());
        const timer = setInterval(() => setTimeLeft(calc()), 60000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return <span>{timeLeft}</span>;
};

export const HeroSection: React.FC<HeroSectionProps> = ({ tasks, onViewReport }) => {
    const playlist = useMemo(() => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('zh-CN'); 

        const isToday = (dateStr: string) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('zh-CN') === todayStr;
        };
        
        // Priority 1: Live
        const live = tasks.filter(t => ['recording', 'downloading', 'stopping'].includes(t.status.toLowerCase()));
        // Priority 2: Processing
        const processing = tasks.filter(t => t.status.toLowerCase() === 'processing');
        // Priority 3: Upcoming Today
        const upcomingToday = tasks.filter(t => {
            const s = t.status.toLowerCase();
            if (!['listening', 'scheduled', 'pending'].includes(s)) return false;
            const startTime = new Date(t.start_time).getTime();
            const nowTime = now.getTime();
            return isToday(t.start_time) || (startTime > nowTime && startTime - nowTime < 24 * 60 * 60 * 1000);
        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        // Priority 4: Finished Today
        const finishedToday = tasks.filter(t => {
            const s = t.status.toLowerCase();
            return ['finished', 'completed'].includes(s) && isToday(t.start_time);
        }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        let list = [...live, ...processing, ...upcomingToday, ...finishedToday];

        // Fallback: If empty, show next upcoming or last finished
        if (list.length === 0) {
             const nextUpcoming = tasks.filter(t => ['listening', 'scheduled', 'pending'].includes(t.status.toLowerCase()))
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
             if (nextUpcoming) list.push(nextUpcoming);
             
             if (!nextUpcoming) {
                 const lastFinished = tasks.filter(t => ['finished', 'completed'].includes(t.status.toLowerCase()))
                    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];
                 if (lastFinished) list.push(lastFinished);
             }
        }

        // De-duplicate
        return Array.from(new Set(list.map(t => t.id))).map(id => list.find(t => t.id === id)!);
    }, [tasks]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const activeTask = playlist[activeIndex];

    const handleNext = () => setActiveIndex((prev) => (prev + 1) % playlist.length);
    const handlePrev = () => setActiveIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    const hasMultiple = playlist.length > 1;

    useEffect(() => {
        if (!hasMultiple || isHovered) return;
        const interval = setInterval(() => {
            handleNext();
        }, 6000);
        return () => clearInterval(interval);
    }, [hasMultiple, isHovered, playlist.length]);

    if (!activeTask) return null;

    const activeImage = getSafeImageSrc(activeTask.cover_image_b64);

    return (
        <div 
            className="relative w-full overflow-hidden md:rounded-3xl bg-[#0B1120] shadow-2xl mb-6 md:mb-10 group h-[400px] md:h-[480px] lg:h-[520px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* --- 1. Desktop Layout (Right Image, Left Content) --- */}
            
            {/* Desktop Background: Dark Slate Base */}
            <div className="absolute inset-0 bg-[#0B1120] hidden md:block">
                {/* Right Side Image with Fade */}
                {activeImage && (
                    <div 
                        className="absolute top-0 right-0 h-full w-[65%] bg-cover bg-center transition-all duration-1000 ease-in-out"
                        style={{ 
                            backgroundImage: `url(${activeImage})`,
                            // Creating a seamless fade from the dark background (left) to the image (right)
                            maskImage: 'linear-gradient(to right, transparent 0%, black 40%, black 100%)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 40%, black 100%)'
                        }}
                    />
                )}
                {/* Additional Ambient Glow from the image color (Simulated) */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120] via-[#0B1120]/80 to-transparent pointer-events-none" />
            </div>

            {/* --- 2. Mobile Layout (Full Background Image) --- */}
            <div className="absolute inset-0 md:hidden">
                {activeImage ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${activeImage})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/60 to-transparent" />
            </div>

            {/* --- 3. Navigation Arrows --- */}
            {hasMultiple && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white backdrop-blur-sm transition-all border border-white/5 hover:border-white/20 hidden md:flex"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white backdrop-blur-sm transition-all border border-white/5 hover:border-white/20 hidden md:flex"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* --- 4. Content Content --- */}
            <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex flex-col justify-end md:justify-center pb-8 md:pb-0 pointer-events-none">
                <div className="w-full md:max-w-2xl space-y-4 md:space-y-6 pointer-events-auto">
                    
                    {/* Top Badges */}
                    <div className="flex items-center flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <StatusBadge status={activeTask.status} />
                        <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold tracking-wide uppercase backdrop-blur-md">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_5px_rgba(129,140,248,0.8)]"></span>
                            {activeTask.company}
                        </span>
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight drop-shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
                        {activeTask.task_name}
                    </h1>
                    
                    {/* Meta Info Grid */}
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-slate-300 font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                                <CalendarIcon className="w-4 h-4 text-indigo-300" />
                            </div>
                            <span>
                                {new Date(activeTask.start_time).toLocaleString('zh-CN', { month: 'long', day: 'numeric' })}
                                <span className="mx-2 opacity-50">|</span>
                                {new Date(activeTask.start_time).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {['listening', 'scheduled', 'pending'].includes(activeTask.status.toLowerCase()) && (
                            <div className="flex items-center gap-2 text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <ClockIcon className="w-4 h-4" />
                                <span className="font-bold tracking-wide">
                                    <Countdown targetDate={activeTask.start_time} />
                                </span>
                            </div>
                        )}
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
                        <a 
                            href={activeTask.live_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all hover:scale-105"
                        >
                            <PlayIcon className="w-5 h-5 fill-current" />
                            <span>
                                {['recording', 'downloading'].includes(activeTask.status.toLowerCase()) ? '进入直播间' : '观看详情'}
                            </span>
                        </a>
                        
                        {['finished', 'completed'].includes(activeTask.status.toLowerCase()) && (
                            <button 
                                onClick={() => onViewReport(activeTask)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold backdrop-blur-sm transition-all hover:border-white/30"
                            >
                                <DocumentTextIcon className="w-5 h-5 text-slate-300" />
                                <span>阅读 AI 报告</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- 5. Pagination Dots --- */}
            {hasMultiple && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                    {playlist.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); }}
                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === activeIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-600 hover:bg-slate-500'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
