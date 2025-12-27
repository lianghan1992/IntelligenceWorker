
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

const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + '' + sizes[i];
};

// --- Sub-components ---

const HeroSection: React.FC<{ featuredTask: DeepInsightTask | null; onRead: (task: DeepInsightTask) => void }> = ({ featuredTask, onRead }) => {
    if (!featuredTask) return null;

    return (
        <section className="w-full bg-white relative overflow-hidden border-b border-slate-200">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#136dec 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-10 lg:py-16 relative z-20 w-full">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                    {/* Text Content */}
                    <div className="flex-1 flex flex-col gap-6 items-start z-20 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider">最新发布 · {new Date(featuredTask.created_at).getFullYear()}</span>
                        </div>
                        <div className="flex flex-col gap-3 text-left">
                            <h1 className="text-slate-900 text-3xl md:text-5xl font-black leading-tight tracking-tight">
                                {featuredTask.file_name.replace(/\.[^/.]+$/, "")}
                                <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">深度洞察报告</span>
                            </h1>
                            <h2 className="text-slate-500 text-base md:text-lg font-normal leading-relaxed max-w-xl line-clamp-3">
                                {featuredTask.summary || `本报告利用 AI 深度解析技术，为您提炼核心观点、数据图表及行业趋势。${featuredTask.processed_pages > 0 ? `包含 ${featuredTask.processed_pages} 页精读内容。` : ''}`}
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4">
                            <button 
                                onClick={() => onRead(featuredTask)}
                                className="flex items-center justify-center gap-2 rounded-lg h-12 px-8 bg-blue-600 hover:bg-blue-700 transition-all text-white text-base font-bold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:scale-95"
                            >
                                <DocumentTextIcon className="w-5 h-5" />
                                <span>立即阅读</span>
                            </button>
                            <button className="flex items-center justify-center gap-2 rounded-lg h-12 px-8 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-200 text-slate-700 transition-all text-base font-bold shadow-sm">
                                <EyeIcon className="w-5 h-5 text-slate-400" />
                                <span>查看详情</span>
                            </button>
                        </div>
                    </div>

                    {/* Visual Cover */}
                    <div className="flex-1 w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden relative shadow-2xl shadow-slate-200 border border-white group cursor-pointer" onClick={() => onRead(featuredTask)}>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 transition-transform duration-700 group-hover:scale-105 flex items-center justify-center">
                            {featuredTask.cover_image ? (
                                <img src={featuredTask.cover_image} alt="Cover" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="text-center p-8 opacity-50">
                                    <DocumentTextIcon className="w-32 h-32 mx-auto text-slate-300 mb-4" />
                                    <div className="text-4xl font-black text-slate-300 uppercase tracking-widest">{featuredTask.file_type}</div>
                                </div>
                            )}
                        </div>
                        
                        {/* Overlay Info */}
                        <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-xl max-w-[240px] hidden md:block animate-in slide-in-from-bottom-4 duration-700">
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
        <article className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-300/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 h-full">
            {/* Cover Area */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 group-cursor-pointer" onClick={isCompleted ? onRead : undefined}>
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
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                        {task.summary || (isCompleted ? 'AI 已完成深度解析，点击查看结构化报告内容。' : '正在进行 OCR 识别与语义分析...')}
                    </p>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-3 text-slate-400 text-xs border-t border-slate-100 pt-3">
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
                <div className="flex gap-3 mt-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(isCompleted) onRead(); }}
                        disabled={!isCompleted}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-sm font-bold border border-blue-100 hover:border-blue-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span>AI 解读</span>
                    </button>
                    <button 
                        className="flex items-center justify-center h-9 w-9 rounded-lg bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all border border-slate-200"
                        title="下载源文件"
                    >
                        <DownloadIcon className="w-5 h-5" />
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

    // Initial Load
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cats, tasksRes] = await Promise.all([
                getDeepInsightCategories().catch(() => []),
                getDeepInsightTasks({ 
                    limit: 100, 
                    page: 1, 
                    category_id: selectedCategoryId, 
                    search: searchQuery 
                }).catch(() => ({ items: [], total: 0 }))
            ]);
            setCategories(cats);
            const items = Array.isArray(tasksRes) ? tasksRes : (tasksRes.items || []);
            setTasks(items);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategoryId, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    // Derived Data
    const sortedTasks = useMemo(() => {
        let sorted = [...tasks];
        if (sortOption === 'newest') {
            sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortOption === 'size') {
            sorted.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
        }
        return sorted;
    }, [tasks, sortOption]);

    const featuredTask = sortedTasks.length > 0 ? sortedTasks[0] : null;

    return (
        <div className="relative min-h-screen bg-[#f8fafc] font-sans text-slate-900 flex flex-col">
            
            {/* 1. Header (Sticky) */}
            <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3 lg:px-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="size-8 flex items-center justify-center text-blue-600 bg-blue-50 rounded-lg">
                            <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">智能汽车报告库</h2>
                    </div>
                </div>

                <div className="flex flex-1 justify-end gap-4 items-center">
                    <div className="hidden md:flex flex-col min-w-40 h-10 max-w-64 group relative">
                        <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 bg-slate-50 group-focus-within:border-blue-500 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-blue-500/10 transition-all">
                            <div className="text-slate-400 flex items-center justify-center pl-3">
                                <SearchIcon className="w-5 h-5" />
                            </div>
                            <input 
                                className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 px-3 text-sm text-slate-700 placeholder:text-slate-400" 
                                placeholder="搜索报告标题..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center w-full">
                
                {/* 2. Hero Section */}
                {!isLoading && tasks.length > 0 && <HeroSection featuredTask={featuredTask} onRead={setReaderTask} />}

                {/* 3. Filter Section */}
                <section className="w-full max-w-[1440px] px-4 md:px-10 py-8">
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

                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-wrap gap-4 flex-1 w-full md:w-auto">
                                <label className="flex items-center gap-3 min-w-[200px]">
                                    <span className="text-slate-500 text-sm whitespace-nowrap font-medium">发布时间</span>
                                    <div className="relative w-full">
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-10 text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="选择日期范围" type="date"/>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 min-w-[180px]">
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
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>共找到 <span className="text-blue-600 font-bold text-base">{tasks.length}</span> 份报告</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Grid Section */}
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

                    {/* Pagination (Static for now as per example, but logic is easy to add) */}
                    {!isLoading && tasks.length > 0 && (
                        <div className="flex justify-center mt-12">
                            <nav className="flex items-center gap-2">
                                <button className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                                <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-200">1</button>
                                <button className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 transition-all text-sm font-medium shadow-sm">2</button>
                                <span className="text-slate-400 px-1">...</span>
                                <button className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 transition-all shadow-sm">
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
