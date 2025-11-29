
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
    if (['recording', 'downloading', 'stopping'].includes(s)) {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/90 backdrop-blur-md text-white text-xs font-bold rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                LIVE NOW
            </span>
        );
    }
    if (['listening', 'scheduled', 'pending'].includes(s)) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-full">
                <ClockIcon className="w-3.5 h-3.5" />
                UPCOMING
            </span>
        );
    }
    if (s === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/80 backdrop-blur-md text-white text-xs font-bold rounded-full">
                <SparklesIcon className="w-3.5 h-3.5" />
                AI PROCESSING
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 backdrop-blur-md text-slate-300 border border-slate-700 text-xs font-bold rounded-full">
            REPLAY
        </span>
    );
};

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
);

const Countdown: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const [time, setTime] = useState<{d: number, h: number, m: number, s: number} | null>(null);

    useEffect(() => {
        const calc = () => {
            const diff = new Date(targetDate).getTime() - new Date().getTime();
            if (diff <= 0) return null;
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            return { d, h, m, s };
        };
        setTime(calc());
        const timer = setInterval(() => setTime(calc()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!time) return <span className="text-sm font-bold tracking-widest">即将开始</span>;

    const TimeUnit = ({ val, label }: { val: number, label: string }) => (
        <div className="flex flex-col items-center mx-2 md:mx-4">
            <span className="text-2xl md:text-4xl font-light font-mono text-white tracking-tighter">
                {String(val).padStart(2, '0')}
            </span>
            <span className="text-[10px] uppercase text-white/40 tracking-widest font-bold mt-1">{label}</span>
        </div>
    );

    return (
        <div className="flex items-center">
            {time.d > 0 && <TimeUnit val={time.d} label="DAYS" />}
            {time.d > 0 && <span className="text-2xl text-white/20 font-light -mt-4">:</span>}
            <TimeUnit val={time.h} label="HRS" />
            <span className="text-2xl text-white/20 font-light -mt-4">:</span>
            <TimeUnit val={time.m} label="MIN" />
            <span className="text-2xl text-white/20 font-light -mt-4">:</span>
            <TimeUnit val={time.s} label="SEC" />
        </div>
    );
};

export const HeroSection: React.FC<HeroSectionProps> = ({ tasks, onViewReport }) => {
    const playlist = useMemo(() => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('zh-CN'); 

        const isToday = (dateStr: string) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('zh-CN') === todayStr;
        };
        
        const live = tasks.filter(t => ['recording', 'downloading', 'stopping'].includes(t.status.toLowerCase()));
        const processing = tasks.filter(t => t.status.toLowerCase() === 'processing');
        const upcomingToday = tasks.filter(t => {
            const s = t.status.toLowerCase();
            if (!['listening', 'scheduled', 'pending'].includes(s)) return false;
            const startTime = new Date(t.start_time).getTime();
            const nowTime = now.getTime();
            return isToday(t.start_time) || (startTime > nowTime && startTime - nowTime < 48 * 60 * 60 * 1000);
        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        const finishedToday = tasks.filter(t => {
            const s = t.status.toLowerCase();
            return ['finished', 'completed'].includes(s) && isToday(t.start_time);
        }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        let list = [...live, ...processing, ...upcomingToday, ...finishedToday];

        if (list.length === 0) {
             const nextUpcoming = tasks.filter(t => ['listening', 'scheduled', 'pending'].includes(t.status.toLowerCase()))
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
             if (nextUpcoming) list.push(nextUpcoming);
             
             const lastFinished = tasks.filter(t => ['finished', 'completed'].includes(t.status.toLowerCase()))
                .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];
             if (lastFinished && !list.find(i => i.id === lastFinished.id)) list.push(lastFinished);
        }

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
        }, 8000);
        return () => clearInterval(interval);
    }, [hasMultiple, isHovered, playlist.length]);

    if (!activeTask) return null;

    const activeImage = getSafeImageSrc(activeTask.cover_image_b64);
    const isUpcoming = ['listening', 'scheduled', 'pending'].includes(activeTask.status.toLowerCase());

    return (
        <div 
            className="relative w-full rounded-2xl md:rounded-[32px] bg-black shadow-2xl mb-6 md:mb-10 group overflow-hidden border border-white/5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* === Mobile View (Stacked Card - Optimized) === */}
            <div className="md:hidden relative h-[450px] flex flex-col">
                 <div className="absolute inset-0">
                    {activeImage ? (
                        <img src={activeImage} className="w-full h-full object-cover opacity-80" alt="" />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center"><FilmIcon className="w-12 h-12 text-slate-600"/></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                 </div>
                 
                 <div className="relative z-10 p-6 mt-auto flex flex-col h-full justify-end">
                     <div className="flex items-center gap-3 mb-3">
                        <StatusBadge status={activeTask.status} />
                     </div>
                     <h2 className="text-3xl font-extrabold text-white leading-none mb-2 line-clamp-2 tracking-tight">{activeTask.task_name}</h2>
                     <p className="text-white/60 font-medium mb-4">{activeTask.company}</p>
                     
                     {isUpcoming && (
                         <div className="mb-6 p-4 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
                             <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-2 text-center">Event Starts In</div>
                             <div className="flex justify-center">
                                <Countdown targetDate={activeTask.start_time} />
                             </div>
                         </div>
                     )}
                     
                     <div className="flex gap-3">
                        <a href={activeTask.live_url} target="_blank" rel="noopener noreferrer" className="flex-1 py-3.5 bg-white text-black text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                            <PlayIcon className="w-4 h-4 fill-current" /> 观看直播
                        </a>
                        {['finished', 'completed'].includes(activeTask.status.toLowerCase()) && (
                            <button onClick={() => onViewReport(activeTask)} className="flex-1 py-3.5 bg-white/10 backdrop-blur-md text-white text-sm font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 active:bg-white/20 transition-colors">
                                <DocumentTextIcon className="w-4 h-4" /> 总结报告
                            </button>
                        )}
                     </div>
                 </div>
            </div>

            {/* === Desktop View (The "Jobs" Look) === */}
            <div className="hidden md:flex h-[480px] lg:h-[520px] relative bg-black">
                
                {/* 1. Background Image with "Gradient Mask" */}
                <div className="absolute inset-0 z-0">
                    {activeImage ? (
                        <div className="w-full h-full relative">
                            {/* The Image */}
                            <img 
                                src={activeImage} 
                                className="absolute right-0 top-0 h-full w-[75%] object-cover transition-transform duration-[30s] ease-linear group-hover:scale-105" 
                                style={{ 
                                    // The Magic: Fade image from transparent (left) to opaque (right)
                                    maskImage: 'linear-gradient(to right, transparent 0%, black 40%, black 100%)',
                                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 40%, black 100%)' 
                                }}
                                alt="Hero Background"
                            />
                            {/* Subtle colored glow behind the text based on image usage, here we stick to dark */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-800 bg-slate-950">
                            <FilmIcon className="w-32 h-32 opacity-10" />
                        </div>
                    )}
                </div>

                {/* 2. Content Layer (Floating on the left) */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-12 flex flex-col justify-center h-full">
                    <div className="max-w-2xl space-y-8">
                        
                        {/* Meta Row */}
                        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <StatusBadge status={activeTask.status} />
                            <span className="text-white/40 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                                <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                                {activeTask.company}
                            </span>
                        </div>

                        {/* Massive Title */}
                        <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.05] drop-shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                            {activeTask.task_name}
                        </h1>

                        {/* Metadata & Countdown */}
                        <div className="flex items-center gap-8 text-white/70 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                                <span className="text-lg font-medium">{new Date(activeTask.start_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="w-px h-6 bg-white/20"></div>
                            <div className="flex items-center gap-3">
                                <ClockIcon className="w-5 h-5 text-indigo-400" />
                                <span className="text-lg font-mono">{new Date(activeTask.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        {/* Floating Glass Action Bar */}
                        <div className="pt-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                            <a 
                                href={activeTask.live_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group/btn relative px-8 py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all hover:scale-105 flex items-center gap-3 overflow-hidden"
                            >
                                <PlayIcon className="w-6 h-6 fill-current" />
                                <span className="relative z-10">
                                    {['recording', 'downloading'].includes(activeTask.status.toLowerCase()) ? '进入直播' : '观看详情'}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                            </a>

                            {['finished', 'completed'].includes(activeTask.status.toLowerCase()) && (
                                <button 
                                    onClick={() => onViewReport(activeTask)}
                                    className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white border border-white/10 rounded-2xl font-bold text-lg transition-all hover:border-white/30 flex items-center gap-3"
                                >
                                    <DocumentTextIcon className="w-6 h-6 text-indigo-300" />
                                    AI 总结报告
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Floating Countdown (If Upcoming) - Positioned Bottom Right */}
                {isUpcoming && (
                    <div className="absolute bottom-12 right-12 z-20 animate-in fade-in zoom-in duration-1000">
                        <div className="bg-black/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Starting In</p>
                            <Countdown targetDate={activeTask.start_time} />
                        </div>
                    </div>
                )}

                {/* 4. Navigation Controls */}
                {hasMultiple && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-4 bg-white/5 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-110">
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-4 bg-white/5 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-110">
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
