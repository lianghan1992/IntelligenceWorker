
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

// 2. Rich Cyberpunk Themes
const themes = [
    { name: 'Neon Tokyo', from: 'from-fuchsia-900', via: 'via-purple-900', to: 'to-indigo-900', accent: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/50', particle: '#e879f9' },
    { name: 'Cyber Blue', from: 'from-blue-900', via: 'via-cyan-900', to: 'to-slate-900', accent: 'text-cyan-400', glow: 'shadow-cyan-500/50', particle: '#22d3ee' },
    { name: 'Matrix', from: 'from-emerald-900', via: 'via-green-900', to: 'to-slate-900', accent: 'text-emerald-400', glow: 'shadow-emerald-500/50', particle: '#34d399' },
    { name: 'Solar Flare', from: 'from-orange-900', via: 'via-red-900', to: 'to-slate-900', accent: 'text-orange-400', glow: 'shadow-orange-500/50', particle: '#fbbf24' },
    { name: 'Deep Space', from: 'from-indigo-950', via: 'via-slate-900', to: 'to-black', accent: 'text-indigo-400', glow: 'shadow-indigo-500/50', particle: '#818cf8' },
    { name: 'Synthwave', from: 'from-violet-900', via: 'via-pink-900', to: 'to-slate-900', accent: 'text-pink-400', glow: 'shadow-pink-500/50', particle: '#f472b6' },
    { name: 'Arctic', from: 'from-sky-900', via: 'via-slate-800', to: 'to-gray-900', accent: 'text-sky-300', glow: 'shadow-sky-500/50', particle: '#7dd3fc' },
    { name: 'Crimson', from: 'from-rose-900', via: 'via-red-950', to: 'to-black', accent: 'text-rose-500', glow: 'shadow-rose-500/50', particle: '#fb7185' },
];

const icons = [ChipIcon, GlobeIcon, ServerIcon, LightningBoltIcon, DatabaseIcon, ChartIcon, CubeIcon, ShieldCheckIcon];

// 3. Generative Particle Component
const ParticleFlow: React.FC<{ rng: () => number, color: string }> = ({ rng, color }) => {
    // Generate 15-25 particles with random properties
    const particles = useMemo(() => {
        const count = 15 + Math.floor(rng() * 10);
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.floor(rng() * 100),
            y: Math.floor(rng() * 100),
            size: 1 + rng() * 2,
            duration: 3 + rng() * 5,
            delay: rng() * 2,
            opacity: 0.3 + rng() * 0.5
        }));
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full animate-float-up"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: color,
                        opacity: p.opacity,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `-${p.delay}s`,
                        boxShadow: `0 0 ${p.size * 2}px ${color}`
                    }}
                />
            ))}
            <style>{`
                @keyframes float-up {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(-100px) scale(0); opacity: 0; }
                }
                .animate-float-up {
                    animation: float-up linear infinite;
                }
            `}</style>
        </div>
    );
};

// 4. Holographic Grid Background
const HolographicGrid: React.FC<{ accentColor: string }> = ({ accentColor }) => (
    <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ 
            backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `, 
            backgroundSize: '30px 30px',
            transform: 'perspective(500px) rotateX(20deg) scale(1.2)',
            transformOrigin: 'bottom'
        }}
    >
        {/* Scanline */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent h-[20%] w-full animate-scan"></div>
        <style>{`
            @keyframes scan {
                0% { top: -20%; }
                100% { top: 120%; }
            }
            .animate-scan {
                animation: scan 4s linear infinite;
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
            
            {/* 1. Dynamic Aurora Blobs (Background Movement) */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-30 animate-spin-slow origin-center">
                <div className={`absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-transparent to-${theme.accent.split('-')[1]}-500/30 blur-3xl`}></div>
                <div className={`absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-gradient-to-r from-transparent to-white/10 blur-3xl`}></div>
            </div>

            {/* 2. Holographic Grid */}
            <HolographicGrid accentColor={theme.particle} />

            {/* 3. Particle Flow System */}
            <ParticleFlow rng={rng} color={theme.particle} />
            
            {/* 4. Abstract Geometric Decor (Generated SVG) */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 400 300">
                <path 
                    d={`M ${rng()*400} ${rng()*300} L ${rng()*400} ${rng()*300} L ${rng()*400} ${rng()*300} Z`} 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="1" 
                    className="animate-pulse"
                />
                <circle cx={rng()*400} cy={rng()*300} r={20 + rng()*50} stroke="white" strokeWidth="0.5" fill="none" opacity="0.5" />
            </svg>

            {/* 5. Huge Watermark Icon (Rotated) */}
            <div className={`absolute -bottom-10 -right-10 transform -rotate-12 opacity-10 ${theme.accent}`}>
                <BigIcon className="w-56 h-56" />
            </div>

            {/* 6. Foreground Content (Type Badge) */}
            <div className="absolute top-3 left-3 z-20">
                <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center backdrop-blur-md bg-white/10 border border-white/20 rounded px-2.5 py-1 text-[10px] font-mono text-white font-bold uppercase tracking-widest shadow-lg ${theme.glow}`}>
                        {task.file_type || 'DOC'}
                    </span>
                    {task.total_pages > 50 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-white/70 bg-black/20 rounded w-fit">
                            DEEP DIVE
                        </span>
                    )}
                </div>
            </div>

            {/* Processing Overlay */}
            {task.status === 'processing' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-30">
                    <div className="flex flex-col items-center gap-3">
                        <div className={`w-12 h-12 border-4 ${theme.accent.replace('text', 'border')} border-t-transparent rounded-full animate-spin`}></div>
                        <span className={`text-xs font-bold tracking-widest animate-pulse ${theme.accent}`}>
                            ANALYZING DATA...
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
            <div className="w-full h-[320px] rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-center relative overflow-hidden group">
                <SmartTechCover task={{ id: 'demo', file_name: 'AUTO INSIGHT DEMO', file_type: 'SYSTEM', status: 'completed', total_pages: 0 } as any} className="absolute inset-0 opacity-50" />
                <div className="relative z-10 text-center max-w-lg px-6">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20 text-white group-hover:scale-110 transition-transform duration-500 shadow-lg">
                        <DocumentTextIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">开启深度洞察</h2>
                    <p className="text-slate-200 text-sm mb-8 drop-shadow-md">上传行业报告，AI 将自动构建知识图谱与深度分析。</p>
                    <button onClick={onClick} className="px-8 py-3 bg-white text-slate-900 rounded-full text-sm font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10 flex items-center gap-2 mx-auto">
                        <ArrowRightIcon className="w-4 h-4" /> 立即上传
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className="group relative w-full h-[320px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer border border-slate-200/20"
        >
            {/* Generative Background */}
            <SmartTechCover task={task} className="absolute inset-0" />
            
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent/10"></div>
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-10 flex flex-col items-start">
                <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-lg shadow-indigo-600/20 border border-white/10">
                        Featured Insight
                    </span>
                    <span className="text-[10px] text-indigo-200 font-mono bg-black/30 px-2 py-0.5 rounded">ID: {task.id.slice(0,8)}</span>
                </div>
                
                <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-4 line-clamp-2 max-w-3xl drop-shadow-xl group-hover:text-indigo-100 transition-colors">
                    {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                </h1>
                
                <div className="flex items-center gap-6 text-xs font-medium text-white/90">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        {task.total_pages} 页深度解析
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {new Date(task.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-300 group-hover:translate-x-1 transition-transform ml-auto font-bold">
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
                                    className="group relative aspect-[16/10] bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                                >
                                    {/* Generative Cover Background */}
                                    <div className="absolute inset-0 z-0">
                                        <SmartTechCover task={task} className="transform transition-transform duration-700 group-hover:scale-105" />
                                    </div>

                                    {/* Gradient & Content Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent z-10 flex flex-col justify-end p-5">
                                        <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-bold text-white/80 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 shadow-sm">
                                                    {categoryName}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mb-2 drop-shadow-md group-hover:text-indigo-200 transition-colors">
                                                {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                                            </h3>
                                            
                                            <div className="flex items-center justify-between text-[10px] font-medium text-slate-300 border-t border-white/10 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                                    <span>{task.total_pages} 页</span>
                                                </div>
                                                
                                                {task.status === 'completed' ? (
                                                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                                        <SparklesIcon className="w-3 h-3" /> Ready
                                                    </span>
                                                ) : (
                                                    <span className="text-blue-400 flex items-center gap-1 font-bold">
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
