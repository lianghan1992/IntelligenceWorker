
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

// --- Visual Engine ---

// Deterministic RNG for consistent visuals per task
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

// Dark Cyberpunk Themes based on reference
const darkThemes = [
    { 
        name: 'Midnight Indigo', 
        bg: 'bg-gradient-to-br from-[#1e1b4b] via-[#172554] to-[#0f172a]', // Indigo to Slate
        accent: 'text-indigo-500', 
        badge: 'bg-[#4338ca]/30 text-indigo-100 border-indigo-500/30',
        icon: LightningBoltIcon
    },
    { 
        name: 'Deep Teal', 
        bg: 'bg-gradient-to-br from-[#0f3d3e] via-[#042f2e] to-[#020617]', // Teal to Black
        accent: 'text-teal-500', 
        badge: 'bg-[#115e59]/30 text-teal-100 border-teal-500/30',
        icon: ChipIcon
    },
    { 
        name: 'Void Purple', 
        bg: 'bg-gradient-to-br from-[#2e1065] via-[#1e1b4b] to-[#020617]', // Violet to Black
        accent: 'text-purple-500', 
        badge: 'bg-[#581c87]/30 text-purple-100 border-purple-500/30',
        icon: DatabaseIcon
    },
    { 
        name: 'Slate Command', 
        bg: 'bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]', // Slate to Black
        accent: 'text-blue-500', 
        badge: 'bg-[#1e40af]/30 text-blue-100 border-blue-500/30',
        icon: ServerIcon
    },
    { 
        name: 'Crimson Ops', 
        bg: 'bg-gradient-to-br from-[#450a0a] via-[#1c1917] to-[#000000]', // Red to Black
        accent: 'text-red-500', 
        badge: 'bg-[#7f1d1d]/30 text-red-100 border-red-500/30',
        icon: ChartIcon
    }
];

const icons = [ChipIcon, GlobeIcon, ServerIcon, LightningBoltIcon, DatabaseIcon, ChartIcon, CubeIcon, ShieldCheckIcon];

// --- Dark Card Component ---
const DarkTechCard: React.FC<{ 
    task: DeepInsightTask; 
    categoryName: string;
    onClick: () => void; 
}> = ({ task, categoryName, onClick }) => {
    const rng = useMemo(() => createRNG(task.id), [task.id]);
    const themeIndex = Math.floor(rng() * darkThemes.length);
    const theme = darkThemes[themeIndex];
    const iconIndex = Math.floor(rng() * icons.length);
    const BigIcon = icons[iconIndex];

    const isCompleted = task.status === 'completed';
    const dateStr = new Date(task.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');

    return (
        <div 
            onClick={onClick}
            className={`
                group relative w-full aspect-[16/10] md:aspect-[2/1] overflow-hidden rounded-xl cursor-pointer
                border border-white/5 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] hover:border-white/10
                ${theme.bg}
            `}
        >
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Large Faded Icon */}
                <div className={`absolute -bottom-6 -right-6 opacity-[0.08] transform -rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0 ${theme.accent}`}>
                    <BigIcon className="w-48 h-48" />
                </div>
                
                {/* Subtle Grid */}
                <div className="absolute inset-0 opacity-[0.03]" 
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                {/* Abstract Line */}
                <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
                    <path d={`M0,${200 + rng() * 100} Q${200 + rng() * 100},${50 + rng() * 100} ${500},${200 + rng() * 100}`} fill="none" stroke="white" strokeWidth="2" />
                </svg>
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                {/* Top Row: File Type Badge */}
                <div className="flex justify-between items-start">
                    <span className={`
                        inline-flex items-center justify-center w-10 h-10 rounded-lg text-[10px] font-black uppercase tracking-wider
                        bg-white/5 border border-white/10 text-white/80 backdrop-blur-md shadow-sm
                    `}>
                        {task.file_type || 'PDF'}
                    </span>
                    
                    {/* Status Dot (if processing) */}
                    {task.status === 'processing' && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-full border border-white/10">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] text-blue-200">处理中</span>
                        </div>
                    )}
                </div>

                {/* Bottom Area: Info */}
                <div className="flex flex-col gap-1.5">
                    {/* Category Tag */}
                    <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-white/60 bg-white/10 border border-white/5 backdrop-blur-sm">
                            {categoryName}
                        </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base md:text-lg font-bold text-white leading-snug line-clamp-2 drop-shadow-md group-hover:text-indigo-100 transition-colors">
                        {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                    </h3>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10 text-[10px] font-medium text-white/50">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                {dateStr}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            <span className="flex items-center gap-1">
                                {task.total_pages} 页
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                            {isCompleted ? (
                                <>
                                    <SparklesIcon className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400 font-bold">Ready</span>
                                </>
                            ) : (
                                <span className="text-white/40">{task.status}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. Stat Card (Clean Style)
const StatCard: React.FC<{ 
    title: string; 
    value: number | string; 
    icon: React.ReactNode;
    color: string;
}> = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100 flex-shrink-0`}>
            {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${color.replace('bg-', 'text-')}` })}
        </div>
        <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
            <div className="text-xl font-extrabold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</div>
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
                <DarkTechCard task={{ id: 'demo', file_name: 'AUTO INSIGHT DEMO', file_type: 'SYSTEM', status: 'completed', total_pages: 0 } as any} categoryName="DEMO" onClick={() => {}} />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center px-6">
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

    // Reuse DarkTechCard but bigger for Hero
    return (
        <div className="w-full h-[320px]">
             <DarkTechCard 
                task={task} 
                categoryName="Featured Insight" 
                onClick={onClick} 
            />
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
                getDeepInsightTasks({ limit: 100, page: 1 }).catch(() => ({ items: [], total: 0 })),
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
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="bg-slate-900 p-2 rounded-lg text-white">
                            <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">深度洞察.HUB</h1>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                selectedCategoryId === null 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            全部
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                    selectedCategoryId === cat.id 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-full pl-9 pr-4 py-2 text-sm transition-all shadow-inner" 
                            placeholder="搜索报告..." 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 pt-8 space-y-8">
                
                {/* Hero Section */}
                <section>
                    <HeroCard task={featuredTask} isLoading={isLoading} onClick={handleHeroAction} />
                </section>

                {/* Stats Row */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <StatCard 
                        title="知识库总量" 
                        value={stats?.total || 0} 
                        icon={<ChartIcon />} 
                        color="bg-indigo-600" 
                    />
                    <StatCard 
                        title="解析完成" 
                        value={stats?.completed || 0} 
                        icon={<LightningBoltIcon />} 
                        color="bg-emerald-500" 
                    />
                    <StatCard 
                        title="正在处理" 
                        value={stats?.processing || 0} 
                        icon={<SparklesIcon />} 
                        color="bg-amber-500" 
                    />
                    <StatCard 
                        title="待处理" 
                        value={stats?.pending || 0} 
                        icon={<ClockIcon />} 
                        color="bg-rose-500" 
                    />
                </section>

                {/* Card Grid */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <ViewGridIcon className="w-5 h-5 text-indigo-600" />
                            报告列表
                        </h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{filteredTasks.length} 份报告</span>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-[16/10] md:aspect-[2/1] rounded-xl bg-slate-200 animate-pulse"></div>
                            ))}
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <SearchIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-base font-bold text-slate-600">暂无相关报告</h3>
                            <button onClick={loadData} className="mt-4 text-indigo-600 font-bold text-xs hover:underline">
                                刷新列表
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTasks.map((task) => {
                                const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                                return (
                                    <DarkTechCard 
                                        key={task.id} 
                                        task={task} 
                                        categoryName={categoryName}
                                        onClick={() => setReaderTask(task)} 
                                    />
                                );
                            })}
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
