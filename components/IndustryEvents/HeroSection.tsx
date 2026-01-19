
import React, { useState, useEffect, useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { PlayIcon, ClockIcon, FilmIcon, DocumentTextIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';
import { getLivestreamCover } from '../../api';

interface HeroSectionProps {
    tasks: LivestreamTask[];
    onViewReport: (task: Partial<LivestreamTask>) => void;
}

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
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 backdrop-blur-md text-slate-300 border border-slate-700 text-xs font-bold rounded-full">
            REPLAY
        </span>
    );
};

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
        const live = tasks.filter(t => ['recording', 'downloading', 'stopping'].includes((t.status || '').toLowerCase()));
        const processing = tasks.filter(t => t.status?.toLowerCase() === 'processing');
        const upcomingToday = tasks.filter(t => {
            const s = t.status?.toLowerCase() || '';
            if (!['listening', 'scheduled', 'pending'].includes(s)) return false;
            return new Date(t.start_time).toLocaleDateString('zh-CN') === todayStr;
        });
        const finishedToday = tasks.filter(t => ['finished', 'completed'].includes(t.status?.toLowerCase() || '') && new Date(t.start_time).toLocaleDateString('zh-CN') === todayStr);

        let list = [...live, ...processing, ...upcomingToday, ...finishedToday];
        if (list.length === 0) list = tasks.slice(0, 3);
        return Array.from(new Set(list.map(t => t.id))).map(id => list.find(t => t.id === id)!);
    }, [tasks]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const activeTask = playlist[activeIndex];

    useEffect(() => {
        if (!activeTask?.id) return;
        let active = true;
        setIsImageLoaded(false);
        setCoverUrl(null);
        getLivestreamCover(activeTask.id).then(url => {
            if (active && url) setCoverUrl(url);
        });
        return () => { active = false; if (coverUrl) URL.revokeObjectURL(coverUrl); }
    }, [activeTask?.id]);

    useEffect(() => {
        if (playlist.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % playlist.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [playlist.length, isHovered]);

    if (!activeTask) return null;

    const isUpcoming = ['listening', 'scheduled', 'pending'].includes((activeTask.status || '').toLowerCase());

    return (
        <div 
            className="relative w-full rounded-2xl md:rounded-[32px] bg-black shadow-2xl mb-6 md:mb-10 group overflow-hidden border border-white/5 animate-in fade-in slide-in-from-top-4 duration-1000"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex h-[450px] lg:h-[520px] relative bg-black">
                <div className="absolute inset-0 z-0 overflow-hidden">
                    {coverUrl ? (
                        <div className="w-full h-full relative">
                            <img 
                                src={coverUrl} 
                                onLoad={() => setIsImageLoaded(true)}
                                className={`absolute right-0 top-0 h-full w-[75%] object-cover transition-all duration-[20s] ease-linear group-hover:scale-110 ${isImageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-xl'}`} 
                                style={{ 
                                    maskImage: 'linear-gradient(to right, transparent 0%, black 40%, black 100%)',
                                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 40%, black 100%)' 
                                }}
                                alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-800 bg-slate-950">
                            <FilmIcon className="w-32 h-32 opacity-10 animate-pulse" />
                        </div>
                    )}
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-center h-full">
                    <div className="max-w-2xl space-y-6 md:space-y-8">
                        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <StatusBadge status={activeTask.status || ''} />
                            <span className="text-white/40 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                                <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                                {activeTask.company}
                            </span>
                        </div>

                        <h1 className="text-4xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.1] drop-shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                            {activeTask.task_name}
                        </h1>

                        <div className="flex items-center gap-8 text-white/70 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                                <span className="text-base md:text-lg font-medium">{new Date(activeTask.start_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <ClockIcon className="w-5 h-5 text-indigo-400" />
                                <span className="text-base md:text-lg font-mono">{new Date(activeTask.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                            <a 
                                href={activeTask.live_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group/btn relative px-8 py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-xl transition-all hover:scale-105 flex items-center gap-3 overflow-hidden active:scale-95"
                            >
                                <PlayIcon className="w-6 h-6 fill-current" />
                                <span className="relative z-10">观看详情</span>
                            </a>
                        </div>
                    </div>
                </div>

                {isUpcoming && (
                    <div className="absolute bottom-12 right-12 z-20 animate-in fade-in zoom-in duration-1000 hidden lg:block">
                        <div className="bg-black/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Starting In</p>
                            <Countdown targetDate={activeTask.start_time} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
