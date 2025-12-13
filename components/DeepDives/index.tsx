
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { 
    getDeepInsightTasks, 
    getDeepInsightCategories, 
    getDeepInsightTasksStats,
    fetchDeepInsightCover
} from '../../api';
import { 
    SearchIcon, RefreshIcon, ArrowRightIcon, SparklesIcon,
    ChartIcon, LightningBoltIcon, ClockIcon, ViewGridIcon,
    DocumentTextIcon, EyeIcon, CubeIcon, ChipIcon, GlobeIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Assets & Utilities ---

// 精选 Unsplash 高清科技/汽车/抽象图源 (免费开源)
// 关键词: Futuristic Car, HUD, Abstract Tech, Wireframe, Blueprint
const THEMED_BACKGROUNDS = [
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80', // 抽象几何汽车
    'https://images.unsplash.com/photo-1518020382325-ce47716c80c5?auto=format&fit=crop&w=800&q=80', // 赛博朋克数据流
    'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80', // 深色豪华车侧影
    'https://images.unsplash.com/photo-1519389950476-2953d6313295?auto=format&fit=crop&w=800&q=80', // 芯片/电路板/算力
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80', // 科技隧道/速度感
    'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=800&q=80', // 抽象点阵/全息
    'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=800&q=80', // 极简黑夜车灯
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80', // 3D 渲染/金属质感
];

// Generate a deterministic index from a string ID
const getThemeIndex = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % THEMED_BACKGROUNDS.length;
};

// --- Smart Art Cover Component ---
const SmartArtCover: React.FC<{ task: DeepInsightTask; className?: string }> = ({ task, className }) => {
    const [realCoverUrl, setRealCoverUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const bgImage = THEMED_BACKGROUNDS[getThemeIndex(task.id)];

    useEffect(() => {
        let active = true;
        // Only try to fetch cover if task is completed
        if (task.status === 'completed') {
            fetchDeepInsightCover(task.id).then(url => {
                if (active) {
                    if (url) setRealCoverUrl(url);
                    setLoading(false);
                }
            }).catch(() => {
                if (active) setLoading(false);
            });
        } else {
            setLoading(false);
        }

        return () => { 
            active = false; 
            if (realCoverUrl) URL.revokeObjectURL(realCoverUrl); 
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task.id, task.status]);

    return (
        <div className={`relative overflow-hidden w-full h-full bg-slate-900 ${className}`}>
            {/* 1. Base High-Quality Image Layer */}
            <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-80 mix-blend-luminosity group-hover:mix-blend-normal"
                style={{ backgroundImage: `url('${realCoverUrl || bgImage}')` }}
            ></div>
            
            {/* 2. "Blueprint" Wireframe Overlay Effect */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" 
                 style={{ 
                     backgroundImage: `
                        linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
                     `,
                     backgroundSize: '20px 20px'
                 }}>
            </div>

            {/* 3. Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-indigo-900/20 mix-blend-multiply"></div>
            
            {/* 4. Abstract Geometric Shapes (Tech Accents) */}
            <div className="absolute top-0 right-0 p-4 opacity-40">
                <div className="w-16 h-16 border-t-2 border-r-2 border-blue-400/50 rounded-tr-xl"></div>
            </div>
            
            {/* 5. Type Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="backdrop-blur-md bg-white/10 border border-white/20 rounded px-2 py-0.5 text-[10px] font-mono text-white font-bold uppercase tracking-widest shadow-sm">
                    {task.file_type}
                </span>
                {task.status === 'processing' && (
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                )}
            </div>
        </div>
    );
};

// --- Sub Components ---

const StatCard: React.FC<{ 
    title: string; 
    value: number | string; 
    change?: string; 
    isPositive?: boolean; 
    icon: React.ReactNode;
    color: string;
    progress: number;
}> = ({ title, value, change, isPositive, icon, color, progress }) => (
    <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] p-5 rounded-2xl relative overflow-hidden group hover:border-[#2b4bee]/40 transition-all hover:shadow-lg">
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity text-[#2b4bee]">
            {icon}
        </div>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</span>
            {change && (
                <span className={`${isPositive ? 'text-emerald-500 bg-emerald-50' : 'text-orange-500 bg-orange-50'} text-xs font-bold flex items-center px-1.5 py-0.5 rounded-full`}>
                    {isPositive ? '↑' : '↓'} {change}
                </span>
            )}
        </div>
        <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div 
                className={`h-full ${color} shadow-[0_0_8px_rgba(43,75,238,0.4)] transition-all duration-1000`} 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

const HeroCard: React.FC<{ task: DeepInsightTask | null; isLoading: boolean; onClick: () => void }> = ({ task, isLoading, onClick }) => {
    if (isLoading) {
        return (
            <div className="relative w-full h-[360px] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 animate-pulse flex items-center justify-center">
                <div className="text-slate-400 font-bold flex flex-col items-center gap-2">
                    <SparklesIcon className="w-8 h-8 animate-spin" />
                    <span>加载推荐内容...</span>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="relative w-full h-[360px] rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xl flex items-center justify-center text-center p-8 group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-blue-900/40"></div>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                <div className="relative z-10 max-w-xl">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform">
                        <DocumentTextIcon className="w-8 h-8 text-blue-200" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">开启深度洞察之旅</h1>
                    <p className="text-blue-200/70 text-sm mb-8 leading-relaxed">上传您的第一份行业报告，AI 将自动为您构建知识图谱与深度分析。</p>
                    <button onClick={onClick} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 mx-auto">
                        <ArrowRightIcon className="w-4 h-4" /> 立即上传
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className="relative w-full h-[360px] rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xl transition-all duration-500 hover:shadow-blue-900/20 group cursor-pointer"
        >
            <div className="absolute inset-0">
                <SmartArtCover task={task} className="opacity-60" />
            </div>
            
            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent"></div>
            
            <div className="relative h-full flex flex-col justify-end p-8 md:p-12 z-10">
                <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                        今日精选
                    </span>
                    <span className="w-8 h-[1px] bg-white/30"></span>
                    <span className="text-[10px] text-blue-200 font-mono tracking-wider opacity-80">REF: {task.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight max-w-4xl drop-shadow-lg line-clamp-2">
                    {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                </h1>
                <div className="flex flex-wrap items-center gap-6 mt-2">
                    <button className="relative overflow-hidden group/btn bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all hover:bg-blue-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 flex items-center gap-2">
                        开始阅读 <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4 text-xs font-medium text-white/70">
                        <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>{task.processed_pages} 页解析</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>{new Date(task.updated_at || task.created_at).toLocaleDateString()}</span>
                        </div>
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
        <div className="relative min-h-full bg-[#f8fafc] font-sans text-slate-900 overflow-x-hidden selection:bg-indigo-500 selection:text-white pb-20">
            
            {/* 1. Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #6366f10a 1px, transparent 1px), linear-gradient(to bottom, #6366f10a 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
            </div>

            {/* 2. Content Container */}
            <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="self-start">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <DocumentTextIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                    深度洞察 <span className="text-indigo-600 opacity-80">.HUB</span>
                                </h1>
                                <p className="text-slate-500 text-xs font-medium tracking-wide">AI DRIVEN RESEARCH & ANALYSIS</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex-1 md:flex-none flex items-center bg-white/80 backdrop-blur rounded-xl px-4 h-11 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all md:w-72 group shadow-sm">
                            <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 w-full ml-2 outline-none font-medium" 
                                placeholder="搜索报告..." 
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button onClick={loadData} className="w-11 h-11 rounded-xl bg-white hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-center transition-all border border-slate-200 text-slate-500 shadow-sm active:scale-95">
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Hero Section */}
                <section className="mb-12">
                    <HeroCard task={featuredTask} isLoading={isLoading} onClick={handleHeroAction} />
                </section>

                {/* Stats Grid - Cleaner Look */}
                <section className="mb-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard 
                            title="知识库总量" 
                            value={stats?.total || 0} 
                            change="Total" isPositive 
                            icon={<ChartIcon className="w-5 h-5"/>} 
                            color="bg-indigo-600" 
                            progress={70} 
                        />
                        <StatCard 
                            title="解析完成" 
                            value={stats?.completed || 0} 
                            change="Done" isPositive 
                            icon={<LightningBoltIcon className="w-5 h-5"/>} 
                            color="bg-emerald-500" 
                            progress={stats?.total ? (stats.completed / stats.total) * 100 : 0} 
                        />
                        <StatCard 
                            title="正在处理" 
                            value={stats?.processing || 0} 
                            change="Active" isPositive={false} 
                            icon={<SparklesIcon className="w-5 h-5"/>} 
                            color="bg-amber-500" 
                            progress={40} 
                        />
                        <StatCard 
                            title="待处理队列" 
                            value={stats?.pending || 0} 
                            change="Queue" isPositive={false} 
                            icon={<ClockIcon className="w-5 h-5"/>} 
                            color="bg-rose-500" 
                            progress={20} 
                        />
                    </div>
                </section>

                {/* Filter Tabs */}
                <section className="mb-8 overflow-x-auto pb-1 scrollbar-hide">
                    <div className="flex gap-3 min-w-max">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold tracking-wide transition-all border ${
                                selectedCategoryId === null 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                            }`}
                        >
                            <ViewGridIcon className="w-4 h-4" />
                            全部分类
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold tracking-wide transition-all border ${
                                    selectedCategoryId === cat.id 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                                }`}
                            >
                                <CubeIcon className="w-4 h-4"/>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Cards Grid - The "Exquisite Compact" Look */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTasks.map((task, idx) => {
                        const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                        
                        return (
                            <div 
                                key={task.id} 
                                onClick={() => setReaderTask(task)}
                                className="group relative aspect-[16/10] bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                            >
                                {/* Background Art Layer */}
                                <div className="absolute inset-0 z-0">
                                    <SmartArtCover task={task} className="transform transition-transform duration-700 group-hover:scale-105" />
                                </div>

                                {/* Content Layer - Glassmorphism Overlay */}
                                <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent p-5 flex flex-col justify-end z-10">
                                    <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                                        
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm border border-white/10">
                                                {categoryName}
                                            </span>
                                            {/* Estimated Size Badge (Simulated) */}
                                            <span className="text-[10px] text-white/50 font-mono">
                                                {(task.total_pages * 0.5).toFixed(1)} MB
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-white leading-tight mb-2 line-clamp-2 drop-shadow-md group-hover:text-blue-100 transition-colors">
                                            {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                                        </h3>
                                        
                                        <div className="flex items-center gap-3 text-xs text-slate-300 font-medium pt-2 border-t border-white/10">
                                            <span className="flex items-center gap-1.5">
                                                <ClockIcon className="w-3.5 h-3.5 opacity-70" />
                                                {new Date(task.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                            <span>{task.total_pages} 页</span>
                                            
                                            {task.status === 'completed' ? (
                                                <span className="ml-auto text-emerald-400 flex items-center gap-1">
                                                    <SparklesIcon className="w-3 h-3" /> Ready
                                                </span>
                                            ) : (
                                                <span className="ml-auto text-blue-400 flex items-center gap-1">
                                                    <RefreshIcon className="w-3 h-3 animate-spin" /> {task.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {filteredTasks.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <SearchIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">暂无相关报告</h3>
                        <p className="text-slate-500 mt-2 text-sm">尝试调整筛选条件或搜索关键词</p>
                        <button onClick={loadData} className="mt-6 px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm">
                            刷新列表
                        </button>
                    </div>
                )}
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
