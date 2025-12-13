
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
    DocumentTextIcon, CalendarIcon, FilterIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Visual Themes (Extracted from User Reference) ---
const cardThemes = [
    {
        id: 'blue',
        bg: 'bg-gradient-to-r from-blue-900 to-slate-900',
        accent: 'bg-blue-500',
        blob1: 'bg-blue-500/20',
        blob2: 'bg-purple-500/10',
        tagBg: 'bg-blue-500/20',
        tagText: 'text-blue-200'
    },
    {
        id: 'emerald',
        bg: 'bg-gradient-to-r from-emerald-900 to-slate-900',
        accent: 'bg-emerald-500',
        blob1: 'bg-emerald-500/20',
        blob2: 'bg-teal-500/10',
        tagBg: 'bg-emerald-500/20',
        tagText: 'text-emerald-200'
    },
    {
        id: 'violet',
        bg: 'bg-gradient-to-r from-indigo-900 to-violet-900',
        accent: 'bg-indigo-500',
        blob1: 'bg-indigo-500/30',
        blob2: 'bg-pink-500/10',
        tagBg: 'bg-indigo-500/20',
        tagText: 'text-indigo-200'
    },
    {
        id: 'orange',
        bg: 'bg-gradient-to-r from-orange-900/90 to-slate-900',
        accent: 'bg-orange-500',
        blob1: 'bg-orange-500/20',
        blob2: 'bg-red-500/10',
        tagBg: 'bg-orange-500/20',
        tagText: 'text-orange-200'
    }
];

// Deterministic Theme Selector
const getTheme = (id: string) => {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return cardThemes[sum % cardThemes.length];
};

// --- Component: Insight Card (Reference Style) ---
const InsightCard: React.FC<{ 
    task: DeepInsightTask; 
    categoryName: string;
    onClick: () => void; 
}> = ({ task, categoryName, onClick }) => {
    const theme = useMemo(() => getTheme(task.id), [task.id]);
    
    // Formatting
    const dateStr = new Date(task.created_at).toISOString().split('T')[0];
    const isCompleted = task.status === 'completed';

    return (
        <div 
            onClick={onClick}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer h-full"
        >
            {/* 1. Upper Visual Area (Gradient Cover) */}
            {/* PC: Reduced height (h-32 -> h-28 or aspect ratio control in grid) */}
            <div className={`relative h-32 w-full overflow-hidden ${theme.bg}`}>
                
                {/* Abstract Blobs */}
                <div className={`absolute -right-10 -top-20 h-64 w-64 rounded-full blur-3xl ${theme.blob1}`}></div>
                <div className={`absolute -left-10 -bottom-20 h-64 w-64 rounded-full blur-3xl ${theme.blob2}`}></div>
                
                {/* Tech Pattern Overlay (Subtle) */}
                <div className="absolute inset-0 opacity-20" style={{ 
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)', 
                    backgroundSize: '20px 20px' 
                }}></div>

                {/* Content Layer */}
                <div className="relative z-10 flex flex-col justify-between h-full p-5">
                    <div className="flex justify-between items-start">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ring-white/10 backdrop-blur-md ${theme.tagBg} ${theme.tagText}`}>
                            {categoryName}
                        </span>
                        {task.file_type && (
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                                {task.file_type}
                            </span>
                        )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-white leading-snug line-clamp-2 drop-shadow-md group-hover:text-white/90 transition-colors">
                        {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                    </h3>
                </div>
            </div>

            {/* 2. Lower Info Area (Metadata) */}
            <div className="flex flex-col gap-2 p-4 bg-white flex-1 justify-end">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            {dateStr}
                        </span>
                        <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                            {task.total_pages}页
                        </span>
                    </div>
                    
                    <div className={`flex items-center gap-1 font-semibold transition-all duration-300 ${isCompleted ? 'text-indigo-600 group-hover:translate-x-1' : 'text-slate-400'}`}>
                        {isCompleted ? (
                            <>
                                阅读 <ArrowRightIcon className="w-3.5 h-3.5" />
                            </>
                        ) : (
                            <span className="flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> 处理中</span>
                        )}
                    </div>
                </div>
                
                {/* Progress Bar for Processing items */}
                {!isCompleted && task.total_pages > 0 && (
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                        <div 
                            className="h-full bg-indigo-500 transition-all duration-500" 
                            style={{ width: `${(task.processed_pages / task.total_pages) * 100}%` }}
                        ></div>
                    </div>
                )}
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

    return (
        <div className="relative min-h-full bg-slate-50 font-sans text-slate-900 pb-20">
            
            {/* Sticky Header / Filter Bar */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-3 shadow-sm transition-all">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm">
                            <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">深度洞察</h1>
                        <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">{filteredTasks.length}</span>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar mask-image-r pb-1 md:pb-0">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${
                                selectedCategoryId === null 
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <ViewGridIcon className="w-3 h-3" />
                            全部
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    selectedCategoryId === cat.id 
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64 group">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-full pl-9 pr-4 py-1.5 text-sm transition-all shadow-inner" 
                            placeholder="搜索报告..." 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 pt-6 space-y-8">
                
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                            <ChartIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">知识库总量</p>
                            <p className="text-2xl font-extrabold text-slate-800">{stats?.total || 0}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                            <LightningBoltIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">解析完成</p>
                            <p className="text-2xl font-extrabold text-slate-800">{stats?.completed || 0}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">正在处理</p>
                            <p className="text-2xl font-extrabold text-slate-800">{stats?.processing || 0}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">待处理</p>
                            <p className="text-2xl font-extrabold text-slate-800">{stats?.pending || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <section>
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="h-48 rounded-2xl bg-white border border-slate-200 p-4 space-y-4 animate-pulse">
                                    <div className="h-24 bg-slate-100 rounded-xl"></div>
                                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTasks.length === 0 ? (
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
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                            {filteredTasks.map((task) => {
                                const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                                return (
                                    <InsightCard
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
