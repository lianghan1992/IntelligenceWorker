
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { 
    getDeepInsightTasks, 
    getDeepInsightCategories, 
    getDeepInsightTasksStats
} from '../../api';
import { 
    SearchIcon, RefreshIcon, ArrowRightIcon, SparklesIcon,
    ChartIcon, LightningBoltIcon, ClockIcon, ViewGridIcon,
    DocumentTextIcon, ChipIcon, GlobeIcon,
    ServerIcon, DatabaseIcon, CubeIcon, ShieldCheckIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Visual Generative Engine ---

// 1. Pseudo-random number generator for deterministic visuals based on Task ID
const createRNG = (seedString: string) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < seedString.length; i++) {
        h ^= seedString.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return function() {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h >>> 0) / 4294967296;
    }
};

// 2. Vibrant & Vivid Themes (High Saturation)
const themes = [
    { name: 'Electric Blue', from: 'from-blue-600', via: 'via-indigo-500', to: 'to-cyan-400', accent: 'text-white/30', glow: 'shadow-blue-500/50', particle: 'bg-white' },
    { name: 'Neon Purple', from: 'from-violet-600', via: 'via-fuchsia-500', to: 'to-purple-400', accent: 'text-white/30', glow: 'shadow-fuchsia-500/50', particle: 'bg-fuchsia-100' },
    { name: 'Sunset Blvd', from: 'from-orange-500', via: 'via-rose-500', to: 'to-pink-500', accent: 'text-white/30', glow: 'shadow-orange-500/50', particle: 'bg-yellow-100' },
    { name: 'Cyber Mint', from: 'from-emerald-500', via: 'via-teal-500', to: 'to-cyan-500', accent: 'text-white/30', glow: 'shadow-emerald-500/50', particle: 'bg-emerald-50' },
    { name: 'Royal Gold', from: 'from-amber-500', via: 'via-orange-500', to: 'to-yellow-400', accent: 'text-white/30', glow: 'shadow-amber-500/50', particle: 'bg-white' },
    { name: 'Crimson Flux', from: 'from-red-600', via: 'via-rose-500', to: 'to-orange-500', accent: 'text-white/30', glow: 'shadow-red-500/50', particle: 'bg-rose-100' },
    { name: 'Deep Ocean', from: 'from-indigo-600', via: 'via-blue-600', to: 'to-sky-500', accent: 'text-white/30', glow: 'shadow-indigo-500/50', particle: 'bg-sky-100' },
    { name: 'Aurora', from: 'from-green-400', via: 'via-cyan-500', to: 'to-blue-500', accent: 'text-white/30', glow: 'shadow-cyan-500/50', particle: 'bg-white' },
];

const icons = [ChipIcon, GlobeIcon, ServerIcon, LightningBoltIcon, DatabaseIcon, ChartIcon, CubeIcon, ShieldCheckIcon];

// 3. Generative Particle Component (Enhanced Visibility)
const ParticleFlow: React.FC<{ rng: () => number, particleClass: string }> = ({ rng, particleClass }) => {
    // Generate 15-25 particles with random properties
    const particles = useMemo(() => {
        const count = 15 + Math.floor(rng() * 10);
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.floor(rng() * 100),
            y: Math.floor(rng() * 100),
            size: 3 + rng() * 4, // Larger particles
            duration: 2 + rng() * 4, // Faster animation
            delay: rng() * 2,
            opacity: 0.4 + rng() * 0.5 // Higher opacity
        }));
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className={`absolute rounded-full animate-float-up ${particleClass} shadow-sm`}
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        opacity: p.opacity,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `-${p.delay}s`,
                        filter: 'blur(0.5px)'
                    }}
                />
            ))}
            <style>{`
                @keyframes float-up {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    20% { opacity: 0.8; }
                    80% { opacity: 0.6; }
                    100% { transform: translateY(-120px) scale(0); opacity: 0; }
                }
                .animate-float-up {
                    animation: float-up linear infinite;
                }
            `}</style>
        </div>
    );
};

// 4. Holographic Grid Background (Brighter)
const HolographicGrid: React.FC = () => (
    <div 
        className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay"
        style={{ 
            backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), 
                linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
            `, 
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(20deg) scale(1.1)',
            transformOrigin: 'bottom'
        }}
    >
        {/* Scanline - Stronger */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent h-[30%] w-full animate-scan"></div>
        <style>{`
            @keyframes scan {
                0% { top: -30%; }
                100% { top: 130%; }
            }
            .animate-scan {
                animation: scan 3s linear infinite;
            }
        `}</style>
    </div>
);

// --- Main Smart Cover Component ---
const SmartTechCover: React.FC<{ task: DeepInsightTask; className?: string }> = ({ task, className = "" }) => {
    const rng = useMemo(() => createRNG(task.id + (task.file_name || '')), [task.id]);
    
    // Select Theme & Icon deterministically
    const themeIndex = Math.floor(rng() * themes.length);
    const theme = themes[themeIndex];
    
    const iconIndex = Math.floor(rng() * icons.length);
    const BigIcon = icons[iconIndex];

    return (
        <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${theme.from} ${theme.via} ${theme.to} ${className}`}>
            
            {/* 1. Vivid Aurora Blobs (Background Movement) */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-40 animate-spin-slow origin-center mix-blend-screen">
                <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-transparent to-white/40 blur-3xl"></div>
                <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-transparent to-white/30 blur-3xl"></div>
            </div>

            {/* 2. Holographic Grid */}
            <HolographicGrid />

            {/* 3. Particle Flow System - Prominent */}
            <ParticleFlow rng={rng} particleClass={theme.particle} />
            
            {/* 4. Abstract Geometric Decor (Generated SVG) - White Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" viewBox="0 0 400 300">
                <path 
                    d={`M ${rng()*400} ${rng()*300} L ${rng()*400} ${rng()*300} L ${rng()*400} ${rng()*300} Z`} 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    className="animate-pulse"
                />
                <circle cx={rng()*400} cy={rng()*300} r={20 + rng()*50} stroke="white" strokeWidth="1" fill="none" opacity="0.6" />
                <path d={`M 0,${rng()*300} Q 200,${rng()*300} 400,${rng()*300}`} stroke="white" strokeWidth="1.5" fill="none" strokeDasharray="5,5" opacity="0.5" />
            </svg>

            {/* 5. Huge Watermark Icon (Rotated) */}
            <div className={`absolute -bottom-8 -right-8 transform -rotate-12 opacity-20 ${theme.accent} mix-blend-overlay`}>
                <BigIcon className="w-64 h-64" />
            </div>

            {/* 6. Foreground Content (Type Badge) */}
            <div className="absolute top-3 left-3 z-20">
                <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center backdrop-blur-md bg-white/20 border border-white/40 rounded px-2.5 py-1 text-[10px] font-mono text-white font-black uppercase tracking-widest shadow-lg ${theme.glow}`}>
                        {task.file_type || 'DOC'}
                    </span>
                    {task.total_pages > 50 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-white bg-black/30 rounded w-fit backdrop-blur-sm border border-white/10">
                            DEEP DIVE
                        </span>
                    )}
                </div>
            </div>

            {/* Processing Overlay */}
            {task.status === 'processing' && (
                <div className="absolute inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-30">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin shadow-lg"></div>
                        <span className="text-xs font-black tracking-widest animate-pulse text-white drop-shadow-md">
                            AI 解析中...
                        </span>
                    </div>
                </div>
            )}

            <style>{`
                .animate-spin-slow {
                    animation: spin 20s linear infinite;
                }
            `}</style>
        </div>
    );
};

// 2. Stat Card (Unchanged but using updated icon imports if needed)
const StatCard: React.FC<{ 
    title: string; 
    value: number | string; 
    change?: string; 
    isPositive?: boolean; 
    icon: React.ReactNode;
    color: string;
    progress: number;
}> = ({ title, value, change, isPositive, icon, color, progress }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
            <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
                <div className="text-xl font-extrabold text-slate-800 mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</div>
            </div>
            <div className={`p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors`}>
                {icon}
            </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
            <div 
                className={`h-full ${color} transition-all duration-1000`} 
                style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
            ></div>
        </div>
    </div>
);

// 3. Hero Card
const HeroCard: React.FC<{ task: DeepInsightTask | null; isLoading: boolean; onClick: () => void }> = ({ task, isLoading, onClick }) => {
    if (isLoading) {
        return (
            <div className="w-full h-[320px] rounded-2xl bg-slate-100 animate-pulse border border-slate-200 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                    <SparklesIcon className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-bold">LOADING INTELLIGENCE...</span>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="w-full h-[320px] rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl flex items-center justify-center relative overflow-hidden group border border-white/20">
                <SmartTechCover task={{ id: 'demo', file_name: 'AUTO INSIGHT DEMO', file_type: 'SYSTEM', status: 'completed', total_pages: 0 } as any} className="absolute inset-0 opacity-80 mix-blend-overlay" />
                <div className="relative z-10 text-center max-w-lg px-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/40 text-white group-hover:scale-110 transition-transform duration-500 shadow-lg">
                        <DocumentTextIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">开启深度洞察</h2>
                    <p className="text-white/90 text-sm mb-8 drop-shadow-md font-medium">上传行业报告，AI 将自动构建知识图谱与深度分析。</p>
                    <button onClick={onClick} className="px-8 py-3 bg-white text-indigo-700 rounded-full text-sm font-bold hover:bg-indigo-50 transition-colors shadow-xl shadow-indigo-900/20 flex items-center gap-2 mx-auto">
                        <ArrowRightIcon className="w-4 h-4" /> 立即上传
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className="group relative w-full h-[320px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer border border-white/20 ring-1 ring-black/5"
        >
            {/* Generative Background */}
            <SmartTechCover task={task} className="absolute inset-0" />
            
            {/* Gradient Overlay for Text Readability - Updated for vibrant bg */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-10 flex flex-col items-start">
                <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-lg border border-white/20">
                        Featured Insight
                    </span>
                    <span className="text-[10px] text-white/80 font-mono bg-black/20 px-2 py-0.5 rounded backdrop-blur-sm">ID: {task.id.slice(0,8)}</span>
                </div>
                
                <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-4 line-clamp-2 max-w-3xl drop-shadow-lg group-hover:text-white transition-colors">
                    {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                </h1>
                
                <div className="flex items-center gap-6 text-xs font-medium text-white">
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 hover:bg-black/30 transition-colors">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        {task.total_pages} 页深度解析
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 hover:bg-black/30 transition-colors">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {new Date(task.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 text-white group-hover:translate-x-1 transition-transform ml-auto font-bold drop-shadow-md">
                        开始阅读 <ArrowRightIcon className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---

export const DeepDives: React.FC = () => {
    // Data State
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [stats, setStats] = useState<{ total: number; completed: number; failed: number; processing: number; pending: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [readerTask, setReaderTask] = useState<DeepInsightTask | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cats, tasksRes, statsRes] = await Promise.all([
                getDeepInsightCategories().catch(() => []),
                getDeepInsightTasks({ limit: 50, page: 1 }).catch(() => ({ items: [], total: 0 })),
                getDeepInsightTasksStats().catch(() => ({ total: 0, completed: 0, processing: 0, pending: 0, failed: 0 }))
            ]);
            setCategories(cats);
            const items = Array.isArray(tasksRes) ? tasksRes : (tasksRes.items || []);
            setTasks(items);
            setStats(statsRes);
        } catch (error) {
            console.error("Failed to load Deep Insight data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesCategory = selectedCategoryId ? task.category_id === selectedCategoryId : true;
            const matchesSearch = searchQuery 
                ? task.file_name.toLowerCase().includes(searchQuery.toLowerCase()) 
                : true;
            return matchesCategory && matchesSearch;
        });
    }, [tasks, selectedCategoryId, searchQuery]);

    const featuredTask = useMemo(() => {
        if (tasks.length === 0) return null;
        // Prioritize completed, then processing, then any
        return tasks.find(t => t.status === 'completed') || tasks.find(t => t.status === 'processing') || tasks[0];
    }, [tasks]);

    const handleHeroAction = () => {
        if (featuredTask) {
            setReaderTask(featuredTask);
        } else {
            loadData();
        }
    };

    return (
        <div className="relative min-h-full bg-slate-50 font-sans text-slate-900 pb-20">
            
            {/* Header / Filter Bar */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                            <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800">深度洞察.HUB</h1>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                selectedCategoryId === null 
                                ? 'bg-slate-800 text-white border-slate-800' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            全部
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    selectedCategoryId === cat.id 
                                    ? 'bg-slate-800 text-white border-slate-800' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-lg pl-9 pr-4 py-1.5 text-sm transition-all" 
                            placeholder="搜索报告..." 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 pt-6 space-y-10">
                
                {/* Hero Section */}
                <section>
                    <HeroCard task={featuredTask} isLoading={isLoading} onClick={handleHeroAction} />
                </section>

                {/* Stats */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                        title="知识库总量" 
                        value={stats?.total || 0} 
                        icon={<ChartIcon className="w-5 h-5"/>} 
                        color="bg-indigo-600" 
                        progress={70} 
                    />
                    <StatCard 
                        title="解析完成" 
                        value={stats?.completed || 0} 
                        icon={<LightningBoltIcon className="w-5 h-5"/>} 
                        color="bg-emerald-500" 
                        progress={stats?.total ? (stats.completed / stats.total) * 100 : 0} 
                    />
                    <StatCard 
                        title="正在处理" 
                        value={stats?.processing || 0} 
                        icon={<SparklesIcon className="w-5 h-5"/>} 
                        color="bg-amber-500" 
                        progress={40} 
                    />
                    <StatCard 
                        title="待处理" 
                        value={stats?.pending || 0} 
                        icon={<ClockIcon className="w-5 h-5"/>} 
                        color="bg-rose-500" 
                        progress={20} 
                    />
                </section>

                {/* Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <ViewGridIcon className="w-5 h-5 text-indigo-600" />
                            报告列表
                        </h3>
                        <span className="text-xs text-slate-500">共 {filteredTasks.length} 份报告</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTasks.map((task) => {
                            const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                            return (
                                <div 
                                    key={task.id} 
                                    onClick={() => setReaderTask(task)}
                                    className="group relative aspect-[16/10] bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ring-1 ring-black/5"
                                >
                                    {/* Generative Cover Background */}
                                    <div className="absolute inset-0 z-0">
                                        <SmartTechCover task={task} className="transform transition-transform duration-700 group-hover:scale-105" />
                                    </div>

                                    {/* Gradient & Content Overlay - Updated for readability on bright bg */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 flex flex-col justify-end p-5">
                                        <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-bold text-white/90 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded border border-white/20 shadow-sm">
                                                    {categoryName}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mb-2 drop-shadow-md group-hover:text-white transition-colors">
                                                {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                                            </h3>
                                            
                                            <div className="flex items-center justify-between text-[10px] font-medium text-white/80 border-t border-white/20 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                                    <span className="w-1 h-1 rounded-full bg-white/60"></span>
                                                    <span>{task.total_pages} 页</span>
                                                </div>
                                                
                                                {task.status === 'completed' ? (
                                                    <span className="text-emerald-300 flex items-center gap-1 font-bold">
                                                        <SparklesIcon className="w-3 h-3" /> Ready
                                                    </span>
                                                ) : (
                                                    <span className="text-blue-300 flex items-center gap-1 font-bold">
                                                        <RefreshIcon className="w-3 h-3 animate-spin" /> {task.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredTasks.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <SearchIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-base font-bold text-slate-600">暂无相关报告</h3>
                            <p className="text-slate-400 text-xs mt-1">尝试调整筛选条件或上传新文档</p>
                            <button onClick={loadData} className="mt-4 text-indigo-600 font-bold text-xs hover:underline">
                                刷新列表
                            </button>
                        </div>
                    )}
                </section>
            </div>

            {/* Reader Modal */}
            {readerTask && (
                <DeepDiveReader 
                    task={readerTask} 
                    onClose={() => setReaderTask(null)} 
                />
            )}
        </div>
    );
};
