
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
    DocumentTextIcon, EyeIcon, CubeIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Assets & Utilities ---

// Component to fetch and display the cover image from the API
const TaskCover: React.FC<{ taskId: string, className?: string, fallbackIconSize?: string }> = ({ taskId, className, fallbackIconSize = "w-12 h-12" }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        
        fetchDeepInsightCover(taskId).then(url => {
            if (active) {
                setCoverUrl(url);
                setLoading(false);
            }
        }).catch(() => {
            if (active) setLoading(false);
        });

        return () => { 
            active = false; 
            // Cleanup object URL when component unmounts or taskId changes
            if (coverUrl) URL.revokeObjectURL(coverUrl); 
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    if (loading) {
        return <div className={`bg-slate-800 animate-pulse ${className}`} />;
    }

    if (!coverUrl) {
        return (
            <div className={`bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center ${className}`}>
                <DocumentTextIcon className={`${fallbackIconSize} text-slate-700`} />
            </div>
        );
    }

    return (
        <div 
            className={`bg-cover bg-center transition-transform duration-700 ${className}`} 
            style={{ backgroundImage: `url('${coverUrl}')` }} 
        />
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
    <div className="bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] p-5 rounded-2xl relative overflow-hidden group hover:border-[#2b4bee]/40 transition-all hover:shadow-lg">
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
            <div className="relative w-full min-h-[400px] md:h-[500px] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 animate-pulse flex items-center justify-center">
                <div className="text-slate-400 font-bold flex flex-col items-center gap-2">
                    <SparklesIcon className="w-8 h-8 animate-spin" />
                    <span>加载推荐内容...</span>
                </div>
            </div>
        );
    }

    // Fallback if no tasks exist
    if (!task) {
        return (
            <div className="relative w-full min-h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xl flex items-center justify-center text-center p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black opacity-80"></div>
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">开启深度洞察之旅</h1>
                    <p className="text-slate-400 text-lg mb-8">上传您的第一份行业报告，AI 将自动为您构建知识图谱与深度分析。</p>
                    <button onClick={onClick} className="bg-[#2b4bee] text-white px-8 py-3 rounded-full font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30">
                        立即上传
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className="relative w-full min-h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl transition-all duration-700 hover:shadow-2xl hover:border-[#2b4bee]/20 group cursor-pointer perspective-1000"
        >
            {/* Background Image Layer */}
            <div className="absolute inset-0 bg-slate-900">
                <TaskCover 
                    taskId={task.id} 
                    className="w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-110 group-hover:scale-105 opacity-60 mix-blend-overlay" 
                    fallbackIconSize="w-32 h-32"
                />
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent opacity-90"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/40 to-transparent opacity-80"></div>
            
            {/* Tech UI Decorative Elements */}
            <div className="absolute top-10 right-10 w-32 h-32 border-t border-r border-white/10 rounded-tr-3xl opacity-30"></div>
            <div className="absolute bottom-10 left-10 w-32 h-32 border-b border-l border-white/10 rounded-bl-3xl opacity-30"></div>

            <div className="relative h-full flex flex-col justify-end p-8 md:p-16 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-2 py-0.5 rounded text-[12px] font-bold tracking-widest uppercase bg-[#2b4bee] text-white border border-[#2b4bee]/50 shadow-lg shadow-[#2b4bee]/20">
                        精选洞察
                    </span>
                    <span className="w-12 h-[1px] bg-white/40"></span>
                    <span className="text-xs text-blue-200 font-mono">ID: {task.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight max-w-4xl drop-shadow-md line-clamp-2">
                    {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                </h1>
                <p className="text-lg text-blue-100/80 max-w-2xl mb-8 font-light leading-relaxed line-clamp-2">
                    {task.file_type.toUpperCase()} 深度解析报告，包含 {task.total_pages} 页核心内容。
                    点击立即进入沉浸式阅读体验，探索行业前沿动态。
                </p>
                <div className="flex flex-wrap items-center gap-6">
                    <button className="relative overflow-hidden group/btn bg-white text-[#2b4bee] px-8 py-3 rounded-lg font-bold tracking-wide transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
                        <span className="relative z-10 flex items-center gap-2">
                            开始阅读
                            <ArrowRightIcon className="w-4 h-4" />
                        </span>
                    </button>
                    <div className="flex items-center gap-4 text-sm font-mono text-white/70">
                        <div className="flex items-center gap-2">
                            <EyeIcon className="w-4 h-4" />
                            <span>{task.processed_pages} / {task.total_pages} 页已解析</span>
                        </div>
                        <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
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
                // Fetch more items to ensure we fill the grid
                getDeepInsightTasks({ limit: 50, page: 1 }).catch(() => ({ items: [], total: 0 })),
                getDeepInsightTasksStats().catch(() => ({ total: 0, completed: 0, processing: 0, pending: 0, failed: 0 }))
            ]);
            setCategories(cats);
            
            // Ensure we handle both array response (if any legacy) and object response
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

    // Featured task: Prefer completed, then processing, then any.
    const featuredTask = useMemo(() => {
        if (tasks.length === 0) return null;
        return tasks.find(t => t.status === 'completed') || tasks.find(t => t.status === 'processing') || tasks[0];
    }, [tasks]);

    // Handle "Upload/Start" action from Hero card when no tasks
    const handleHeroAction = () => {
        if (featuredTask) {
            setReaderTask(featuredTask);
        } else {
            // Trigger a refresh or maybe open an upload modal if one existed here.
            // For now, reload data
            loadData();
        }
    };

    return (
        <div className="relative min-h-full bg-[#f3f5f9] font-sans text-slate-900 overflow-x-hidden selection:bg-[#2b4bee] selection:text-white pb-20">
            
            {/* 1. Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2b4bee]/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-300/10 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #2b4bee0d 1px, transparent 1px), linear-gradient(to bottom, #2b4bee0d 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
            </div>

            {/* 2. Content Container */}
            <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="self-start">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-[#2b4bee]/10 flex items-center justify-center border border-[#2b4bee]/20 text-[#2b4bee]">
                                <DocumentTextIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
                                    深度洞察 <span className="text-[#2b4bee] text-lg font-mono opacity-80">.HUB</span>
                                </h1>
                                <p className="text-slate-500 text-xs mt-0.5 font-medium tracking-wide">AI DRIVEN RESEARCH & ANALYSIS</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex-1 md:flex-none flex items-center bg-white/80 backdrop-blur rounded-full px-4 h-12 md:h-10 border border-slate-200 focus-within:border-[#2b4bee]/50 focus-within:bg-white transition-all md:w-80 group shadow-sm">
                            <SearchIcon className="w-5 h-5 text-slate-400 group-focus-within:text-[#2b4bee] transition-colors" />
                            <input 
                                className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 w-full ml-2 outline-none" 
                                placeholder="搜索报告标题..." 
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button onClick={loadData} className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-white hover:shadow-md hover:text-[#2b4bee] flex items-center justify-center transition-all border border-slate-200 text-slate-500">
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Hero Section */}
                <section className="mb-12">
                    <HeroCard task={featuredTask} isLoading={isLoading} onClick={handleHeroAction} />
                </section>

                {/* Stats Grid */}
                <section className="mb-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard 
                            title="知识库总量" 
                            value={stats?.total || 0} 
                            change="Total" isPositive 
                            icon={<ChartIcon className="w-5 h-5"/>} 
                            color="bg-[#2b4bee]" 
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
                            color="bg-orange-500" 
                            progress={40} 
                        />
                        <StatCard 
                            title="待处理队列" 
                            value={stats?.pending || 0} 
                            change="Queue" isPositive={false} 
                            icon={<ClockIcon className="w-5 h-5"/>} 
                            color="bg-purple-500" 
                            progress={20} 
                        />
                    </div>
                </section>

                {/* Filters */}
                <section className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex gap-4 min-w-max">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all border ${
                                selectedCategoryId === null 
                                ? 'bg-[#2b4bee] text-white border-[#2b4bee] shadow-lg shadow-[#2b4bee]/20' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-[#2b4bee]/30 hover:text-[#2b4bee] hover:shadow-md'
                            }`}
                        >
                            <ViewGridIcon className="w-4 h-4" />
                            全部分类
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all border ${
                                    selectedCategoryId === cat.id 
                                    ? 'bg-[#2b4bee] text-white border-[#2b4bee] shadow-lg shadow-[#2b4bee]/20' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#2b4bee]/30 hover:text-[#2b4bee] hover:shadow-md'
                                }`}
                            >
                                <CubeIcon className="w-4 h-4"/>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Cards Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.map((task, idx) => {
                        const categoryName = categories.find(c => c.id === task.category_id)?.name || '默认分类';
                        
                        return (
                            <div 
                                key={task.id} 
                                onClick={() => setReaderTask(task)}
                                className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-200 bg-slate-900"
                            >
                                {/* Active Border Effect */}
                                <div className="absolute inset-0 border border-white/10 group-hover:border-[#2b4bee]/50 transition-all duration-500 z-20 pointer-events-none rounded-2xl"></div>
                                
                                {/* Image Background with Async Loader */}
                                <div className="absolute inset-0 z-0">
                                    <TaskCover 
                                        taskId={task.id} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                                </div>
                                
                                {/* Content */}
                                <div className="absolute inset-0 p-6 flex flex-col justify-end z-30 transform transition-transform duration-500 group-hover:-translate-y-2">
                                    <div className="flex items-center gap-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#2b4bee] text-white rounded uppercase tracking-wider shadow-sm">
                                            {categoryName}
                                        </span>
                                        <span className="text-xs text-blue-200 font-mono bg-slate-800/50 px-2 py-0.5 rounded">
                                            {task.file_type.toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-blue-200 transition-colors line-clamp-2 drop-shadow-md">
                                        {task.file_name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-300 mt-1 font-medium">
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" />
                                            {new Date(task.created_at).toLocaleDateString()}
                                        </span>
                                        <span>{task.total_pages} 页</span>
                                        {task.status === 'completed' && (
                                            <span className="text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                                <SparklesIcon className="w-3 h-3" /> 已完成
                                            </span>
                                        )}
                                        {task.status === 'processing' && (
                                            <span className="text-blue-400 flex items-center gap-1 animate-pulse">
                                                <RefreshIcon className="w-3 h-3 animate-spin" /> 处理中
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-[2px] w-12 bg-white/30 group-hover:w-full group-hover:bg-[#2b4bee] transition-all duration-700 mt-4"></div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {filteredTasks.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                            <SearchIcon className="w-10 h-10 text-slate-300 opacity-50" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">暂无相关报告</h3>
                        <p className="text-slate-500 mt-2 text-sm">尝试调整筛选条件或搜索关键词</p>
                        <button onClick={loadData} className="mt-4 text-indigo-600 font-bold hover:underline">
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
