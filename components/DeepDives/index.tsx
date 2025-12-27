
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { 
    getDeepInsightTasks, 
    getDeepInsightCategories
} from '../../api';
import { 
    SearchIcon, DocumentTextIcon, CalendarIcon, 
    SparklesIcon, DownloadIcon,
    CloudIcon, ClockIcon, EyeIcon, 
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
    FilterIcon, LightningBoltIcon, GlobeIcon, ShieldCheckIcon, TruckIcon,
    ViewGridIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Visual Constants ---
const GRADIENTS = [
    'from-blue-500 to-cyan-500',
    'from-indigo-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500'
];

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
    '默认': DocumentTextIcon,
    '自动驾驶': TruckIcon,
    '动力电池': LightningBoltIcon,
    '智能座舱': DocumentTextIcon, // Fallback
    '车联网': GlobeIcon,
    '政策法规': ShieldCheckIcon
};

// Correct file size formatting based on backend bytes
const formatFileSize = (bytes?: number) => {
    if (bytes === 0 || bytes === undefined) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- Sub-components ---

const HeroSection: React.FC<{ tasks: DeepInsightTask[]; onRead: (task: DeepInsightTask) => void }> = ({ tasks, onRead }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-rotate logic
    useEffect(() => {
        if (tasks.length <= 1 || isHovered) return;
        
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % tasks.length);
        }, 5000); // 5 seconds per slide

        return () => clearInterval(interval);
    }, [tasks.length, isHovered]);

    if (!tasks || tasks.length === 0) return null;

    const currentTask = tasks[currentIndex];

    return (
        <section 
            className="w-full bg-white relative overflow-hidden border-b border-slate-200"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#136dec 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-10 lg:py-16 relative z-20 w-full transition-opacity duration-500">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center" key={currentTask.id}>
                    {/* Text Content */}
                    <div className="flex-1 flex flex-col gap-6 items-start z-20 max-w-2xl animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider">最新发布 · {new Date(currentTask.created_at).getFullYear()}</span>
                        </div>
                        <div className="flex flex-col gap-3 text-left">
                            <h1 className="text-slate-900 text-3xl md:text-5xl font-black leading-tight tracking-tight line-clamp-2" title={currentTask.file_name}>
                                {currentTask.file_name.replace(/\.[^/.]+$/, "")}
                                <br/>
                            </h1>
                            <h2 className="text-slate-500 text-base md:text-lg font-normal leading-relaxed max-w-xl line-clamp-3">
                                {currentTask.summary || `本报告利用 AI 深度解析技术，为您提炼核心观点、数据图表及行业趋势。${currentTask.processed_pages > 0 ? `包含 ${currentTask.processed_pages} 页精读内容。` : ''}`}
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4 w-full md:w-auto">
                            <button 
                                onClick={() => onRead(currentTask)}
                                className="flex items-center justify-center gap-2 rounded-lg h-12 px-8 bg-blue-600 hover:bg-blue-700 transition-all text-white text-base font-bold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:scale-95 w-full md:w-auto"
                            >
                                <EyeIcon className="w-5 h-5" />
                                <span>立即阅读</span>
                            </button>
                        </div>
                    </div>

                    {/* Visual Cover */}
                    <div className="flex-1 w-full h-[240px] sm:h-[300px] md:h-[400px] rounded-2xl overflow-hidden relative shadow-2xl shadow-slate-200 border border-white group cursor-pointer animate-in fade-in zoom-in-95 duration-500" onClick={() => onRead(currentTask)}>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 transition-transform duration-700 group-hover:scale-105 flex items-center justify-center">
                            {currentTask.cover_image ? (
                                <img src={currentTask.cover_image} alt="Cover" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="text-center p-8 opacity-50">
                                    <DocumentTextIcon className="w-32 h-32 mx-auto text-slate-300 mb-4" />
                                    <div className="text-4xl font-black text-slate-300 uppercase tracking-widest">{currentTask.file_type}</div>
                                </div>
                            )}
                        </div>
                        
                        {/* Overlay Info */}
                        <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-xl max-w-[240px] hidden md:block animate-in slide-in-from-bottom-4 duration-700 delay-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500 font-medium">AI 提炼知识点</span>
                                    <span className="text-slate-900 font-bold text-lg">High Value</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-tight">点击阅读，即刻获取结构化情报摘要</p>
                        </div>
                    </div>
                </div>

                {/* Indicators */}
                {tasks.length > 1 && (
                    <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                        {tasks.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 md:w-8 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                            />
                        ))}
                    </div>
                )}
                
                {/* Arrows */}
                 {tasks.length > 1 && (
                    <>
                        <button 
                            onClick={() => setCurrentIndex(prev => (prev - 1 + tasks.length) % tasks.length)}
                            className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50 hover:bg-white text-slate-500 hover:text-blue-600 backdrop-blur-sm border border-slate-200 shadow-sm transition-all z-30 opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setCurrentIndex(prev => (prev + 1) % tasks.length)}
                            className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50 hover:bg-white text-slate-500 hover:text-blue-600 backdrop-blur-sm border border-slate-200 shadow-sm transition-all z-30 opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    </>
                 )}
            </div>
        </section>
    );
};

const ReportCard: React.FC<{ 
    task: DeepInsightTask; 
    categoryName: string;
    onRead: () => void;
}> = ({ task, categoryName, onRead }) => {
    const isCompleted = task.status === 'completed';
    // Deterministic gradient based on id
    const gradientIdx = (task.id.charCodeAt(0) || 0) % GRADIENTS.length;
    const bgGradient = GRADIENTS[gradientIdx];

    return (
        <article className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-visible hover:border-blue-300/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 h-full relative z-0 hover:z-10">
            {/* Cover Area */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 rounded-t-xl group-cursor-pointer" onClick={isCompleted ? onRead : undefined}>
                {task.cover_image ? (
                     <img 
                        src={task.cover_image} 
                        alt={task.file_name} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                     />
                ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-10 group-hover:opacity-20 transition-opacity`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <DocumentTextIcon className={`w-16 h-16 text-slate-300 group-hover:scale-110 transition-transform duration-500`} />
                        </div>
                    </div>
                )}
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur text-xs font-bold text-slate-700 border border-slate-200 shadow-sm flex items-center gap-1">
                       {categoryName}
                    </span>
                </div>

                {/* Status Overlay */}
                {!isCompleted && (
                     <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-500 flex items-center gap-2">
                            <ClockIcon className="w-3.5 h-3.5 animate-spin" /> 处理中...
                        </span>
                     </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-5 flex flex-col flex-1 gap-4">
                <div className="flex-1 cursor-pointer" onClick={isCompleted ? onRead : undefined}>
                    <h3 className="text-slate-900 text-lg font-bold leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors" title={task.file_name}>
                        {task.file_name.replace(/\.[^/.]+$/, "")}
                    </h3>
                    
                    {/* Summary with Hover Tooltip */}
                    <div className="relative group/summary">
                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                            {task.summary || (isCompleted ? 'AI 已完成深度解析，点击查看结构化报告内容。' : '正在进行 OCR 识别与语义分析...')}
                        </p>
                        {/* Hover Popup for full summary - Hidden on mobile, visible on hover desktop */}
                        {task.summary && (
                            <div className="hidden md:block absolute left-0 bottom-full mb-2 w-72 p-4 bg-white text-slate-700 text-xs leading-relaxed rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover/summary:opacity-100 group-hover/summary:visible transition-all duration-200 z-50 pointer-events-none transform translate-y-2 group-hover/summary:translate-y-0">
                                <div className="font-bold mb-1 text-slate-900 flex items-center gap-1">
                                    <SparklesIcon className="w-3 h-3 text-indigo-500"/>
                                    摘要预览
                                </div>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                    {task.summary}
                                </div>
                                {/* Arrow */}
                                <div className="absolute left-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white drop-shadow-sm"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-3 text-slate-400 text-xs border-t border-slate-100 pt-3 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="font-mono">{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        <span className="font-mono">{task.total_pages}P</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <CloudIcon className="w-3.5 h-3.5" />
                        <span className="font-mono">{formatFileSize(task.file_size)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(isCompleted) onRead(); }}
                        disabled={!isCompleted}
                        className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-bold shadow-md shadow-blue-200 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                        <EyeIcon className="w-4 h-4" />
                        <span>立即阅读</span>
                    </button>
                </div>
            </div>
        </article>
    );
};

// --- Main Page ---

export const DeepDives: React.FC = () => {
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [readerTask, setReaderTask] = useState<DeepInsightTask | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 12;

    // Initial Load
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Parallel fetch categories and tasks
            const [cats, tasksRes] = await Promise.all([
                getDeepInsightCategories().catch(() => []),
                getDeepInsightTasks({ 
                    limit, 
                    page, 
                    category_id: selectedCategoryId, 
                    search: searchQuery 
                }).catch(() => ({ items: [], total: 0 }))
            ]);
            setCategories(cats);
            const items = Array.isArray(tasksRes) ? tasksRes : (tasksRes.items || []);
            setTasks(items);
            // Handle total from API response
            setTotal((tasksRes as any).total || 0);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategoryId, searchQuery, page]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [selectedCategoryId, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    // Derived Data - Client-side sort if API doesn't support
    // (If API supports sort, pass it to getDeepInsightTasks instead)
    const sortedTasks = useMemo(() => {
        let sorted = [...tasks];
        if (sortOption === 'newest') {
            sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortOption === 'size') {
            sorted.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
        }
        return sorted;
    }, [tasks, sortOption]);

    // Carousel Items (Top 5)
    // In a real app, you might want to fetch 'featured' separately or use the first few of the first page
    const featuredTasks = useMemo(() => sortedTasks.slice(0, 5), [sortedTasks]);

    // Pagination Logic
    const totalPages = Math.ceil(total / limit);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            // Scroll to top of grid area if needed, but not whole page to keep hero visible
             const gridElement = document.getElementById('report-grid-section');
             if (gridElement) {
                 gridElement.scrollIntoView({ behavior: 'smooth' });
             }
        }
    };

    // Generate page numbers for display (e.g., 1, 2, ..., 10)
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first, last, current, and surrounding
            if (page <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
            }
        }
        return pages;
    };


    return (
        <div className="relative min-h-screen bg-[#f8fafc] font-sans text-slate-900 flex flex-col">
            
            {/* Header Removed as requested */}

            <main className="flex-1 flex flex-col items-center w-full">
                
                {/* 1. Hero Section (Carousel) */}
                {!isLoading && featuredTasks.length > 0 && <HeroSection tasks={featuredTasks} onRead={setReaderTask} />}

                {/* 2. Filter Section */}
                <section className="w-full max-w-[1440px] px-4 md:px-10 py-8" id="report-grid-section">
                    <div className="flex flex-col gap-6">
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-slate-900 text-sm font-bold mr-2">热门领域:</span>
                            <button 
                                onClick={() => setSelectedCategoryId(null)}
                                className={`flex h-9 items-center justify-center gap-x-2 rounded-full px-4 transition-all cursor-pointer group shadow-sm ${selectedCategoryId === null ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'}`}
                            >
                                <ViewGridIcon className="w-4 h-4" />
                                <span className="text-sm font-medium">全部</span>
                            </button>
                            {categories.map(cat => {
                                const Icon = CATEGORY_ICONS[cat.name] || DocumentTextIcon;
                                const isSelected = selectedCategoryId === cat.id;
                                return (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`flex h-9 items-center justify-center gap-x-2 rounded-full px-4 transition-all cursor-pointer group shadow-sm ${isSelected ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'}`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Toolbar - Combined Search and Filters */}
                        <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-wrap gap-4 flex-1 w-full lg:w-auto">
                                <label className="flex items-center gap-2 min-w-[200px] w-full md:w-auto">
                                    <SearchIcon className="w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="搜索报告标题..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-3 text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                    />
                                </label>
                                <label className="flex items-center gap-3 min-w-[200px] w-full md:w-auto">
                                    <span className="text-slate-500 text-sm whitespace-nowrap font-medium">发布时间</span>
                                    <div className="relative w-full">
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-10 text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="选择日期范围" type="date"/>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 min-w-[180px] w-full md:w-auto">
                                    <span className="text-slate-500 text-sm whitespace-nowrap font-medium">排序方式</span>
                                    <div className="relative w-full">
                                        <select 
                                            value={sortOption}
                                            onChange={e => setSortOption(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-colors"
                                        >
                                            <option value="newest">最新发布</option>
                                            <option value="size">文件大小</option>
                                        </select>
                                        <ChevronDownIcon className="absolute right-2 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
                                    </div>
                                </label>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 w-full lg:w-auto justify-end">
                                <span>共找到 <span className="text-blue-600 font-bold text-base">{total}</span> 份报告</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Grid Section */}
                <section className="w-full max-w-[1440px] px-4 md:px-10 pb-20">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 h-[380px] animate-pulse flex flex-col overflow-hidden">
                                    <div className="h-48 bg-slate-100"></div>
                                    <div className="p-5 flex-1 space-y-4">
                                        <div className="h-6 bg-slate-100 rounded w-3/4"></div>
                                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                                        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                                        <div className="mt-auto h-10 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                                <CloudIcon className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">暂无报告数据</h3>
                            <p className="text-slate-400 text-sm max-w-sm">
                                请调整筛选条件或联系管理员上传新的报告。
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedTasks.map((task) => {
                                const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                                return (
                                    <ReportCard
                                        key={task.id}
                                        task={task}
                                        categoryName={categoryName}
                                        onRead={() => setReaderTask(task)}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination - Server Side */}
                    {!isLoading && totalPages > 1 && (
                        <div className="flex justify-center mt-12">
                            <nav className="flex items-center gap-2">
                                <button 
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                                
                                {getPageNumbers().map((p, i) => (
                                    typeof p === 'number' ? (
                                        <button
                                            key={i}
                                            onClick={() => handlePageChange(p)}
                                            className={`flex items-center justify-center w-9 h-9 rounded-lg font-bold text-sm shadow-sm transition-all ${
                                                page === p 
                                                ? 'bg-blue-600 text-white shadow-blue-200' 
                                                : 'border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ) : (
                                        <span key={i} className="text-slate-400 px-1 select-none">...</span>
                                    )
                                ))}

                                <button 
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </nav>
                        </div>
                    )}
                </section>

            </main>

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
