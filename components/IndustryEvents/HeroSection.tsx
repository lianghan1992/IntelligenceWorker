
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/20 text-red-100 border border-red-500/30 text-[10px] sm:text-xs font-bold rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                LIVE 直播中
            </span>
        );
    }
    if (['listening', 'scheduled', 'pending'].includes(s)) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/20 text-blue-100 border border-blue-500/30 text-[10px] sm:text-xs font-bold rounded-full">
                <ClockIcon className="w-3.5 h-3.5 text-blue-400" />
                即将开始
            </span>
        );
    }
    if (s === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 text-[10px] sm:text-xs font-bold rounded-full">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                AI生成中
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-700/50 text-slate-300 border border-slate-600/50 text-[10px] sm:text-xs font-bold rounded-full">
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
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (d > 0) return `${d}天 ${h}小时 ${m}分`;
            return `${h}小时 ${m}分 ${s}秒`;
        };
        setTimeLeft(calc());
        const timer = setInterval(() => setTimeLeft(calc()), 1000);
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
        }, 8000); // Slower rotation
        return () => clearInterval(interval);
    }, [hasMultiple, isHovered, playlist.length]);

    if (!activeTask) return null;

    const activeImage = getSafeImageSrc(activeTask.cover_image_b64);
    const isUpcoming = ['listening', 'scheduled', 'pending'].includes(activeTask.status.toLowerCase());

    return (
        <div 
            className="relative w-full rounded-2xl md:rounded-3xl bg-[#0F172A] shadow-2xl mb-6 md:mb-10 group overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* === Mobile View (Stacked Card) === */}
            <div className="md:hidden relative h-[400px] flex flex-col">
                 <div className="absolute inset-0">
                    {activeImage ? (
                        <img src={activeImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center"><FilmIcon className="w-12 h-12 text-slate-600"/></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/70 to-transparent" />
                 </div>
                 
                 <div className="relative z-10 p-5 mt-auto flex flex-col h-full justify-end">
                     <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={activeTask.status} />
                        <span className="text-white/80 text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 backdrop-blur border border-white/10">{activeTask.company}</span>
                     </div>
                     <h2 className="text-2xl font-extrabold text-white leading-tight mb-2 line-clamp-2">{activeTask.task_name}</h2>
                     <div className="flex items-center gap-3 text-slate-300 text-xs font-medium mb-4">
                        <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{new Date(activeTask.start_time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                        </div>
                        {isUpcoming && (
                            <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                <ClockIcon className="w-3.5 h-3.5" />
                                <Countdown targetDate={activeTask.start_time} />
                            </div>
                        )}
                     </div>
                     
                     <div className="flex gap-2">
                        <a href={activeTask.live_url} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg">
                            <PlayIcon className="w-4 h-4" /> 观看
                        </a>
                        {['finished', 'completed'].includes(activeTask.status.toLowerCase()) && (
                            <button onClick={() => onViewReport(activeTask)} className="flex-1 py-2.5 bg-white/10 text-white text-sm font-bold rounded-lg border border-white/10 flex items-center justify-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" /> 报告
                            </button>
                        )}
                     </div>
                 </div>
            </div>

            {/* === Desktop View (Split Layout 35% | 65%) === */}
            <div className="hidden md:flex h-[420px] lg:h-[450px]">
                {/* Left Column: Info & Actions */}
                <div className="w-[35%] lg:w-[32%] bg-[#0F172A] relative z-20 flex flex-col justify-center px-8 lg:px-10 py-8 border-r border-white/5">
                     <div className="space-y-6">
                         <div className="flex items-center gap-3">
                            <StatusBadge status={activeTask.status} />
                            <span className="text-slate-400 text-xs font-bold tracking-wider uppercase border border-slate-700/50 bg-slate-800/50 px-2.5 py-0.5 rounded-full">
                                {activeTask.company}
                            </span>
                         </div>
                         
                         <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-[1.15] tracking-tight line-clamp-3">
                            {activeTask.task_name}
                         </h1>
                         
                         <div className="space-y-2">
                            <div className="flex items-center gap-2.5 text-slate-300 text-sm font-medium">
                                <div className="p-1.5 rounded-md bg-slate-800">
                                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                                </div>
                                <span>{new Date(activeTask.start_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <span className="text-slate-600">|</span>
                                <span className="font-mono">{new Date(activeTask.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {isUpcoming && (
                                <div className="flex items-center gap-2.5 text-amber-300 text-sm font-medium">
                                    <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                        <ClockIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-mono tracking-wide">
                                        <Countdown targetDate={activeTask.start_time} />
                                    </span>
                                </div>
                            )}
                         </div>

                         <div className="pt-4 flex flex-wrap gap-3">
                            <a 
                                href={activeTask.live_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 flex items-center gap-2"
                            >
                                <PlayIcon className="w-5 h-5 fill-current" />
                                {['recording', 'downloading'].includes(activeTask.status.toLowerCase()) ? '进入直播' : '观看详情'}
                            </a>
                            
                            {['finished', 'completed'].includes(activeTask.status.toLowerCase()) && (
                                <button 
                                    onClick={() => onViewReport(activeTask)}
                                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-xl font-semibold backdrop-blur-sm transition-all flex items-center gap-2"
                                >
                                    <DocumentTextIcon className="w-5 h-5 text-slate-300" />
                                    查看报告
                                </button>
                            )}
                         </div>
                     </div>
                </div>

                {/* Right Column: Image & Visuals */}
                <div className="flex-1 relative overflow-hidden bg-black group">
                     {/* Image */}
                     {activeImage ? (
                        <div className="absolute inset-0 transition-transform duration-[20s] ease-linear group-hover:scale-110">
                            <img 
                                src={activeImage} 
                                className="w-full h-full object-cover" 
                                alt="Event Cover"
                            />
                        </div>
                     ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-700 bg-slate-900">
                            <FilmIcon className="w-24 h-24 opacity-20" />
                        </div>
                     )}
                     
                     {/* Gradient Overlay for Left Edge Blending */}
                     <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0F172A] to-transparent z-10 pointer-events-none"></div>
                     
                     {/* General Darkening for text contrast if needed */}
                     <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>

                     {/* Countdown Overlay (Centered if Upcoming) */}
                     {isUpcoming && (
                         <div className="absolute inset-0 flex items-center justify-center z-20">
                             <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-6 text-center shadow-2xl transform transition-transform duration-500 hover:scale-105">
                                 <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.25em] mb-2 drop-shadow-sm">距离开始还有</p>
                                 <div className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-lg">
                                    <Countdown targetDate={activeTask.start_time} />
                                 </div>
                             </div>
                         </div>
                     )}
                     
                     {/* Navigation (Bottom Right) */}
                     {hasMultiple && (
                         <div className="absolute bottom-6 right-6 flex gap-2 z-30">
                             <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-3 bg-black/40 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all border border-white/10 hover:border-white">
                                 <ChevronLeftIcon className="w-5 h-5" />
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-3 bg-black/40 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all border border-white/10 hover:border-white">
                                 <ChevronRightIcon className="w-5 h-5" />
                             </button>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
};
