
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories, fetchDeepInsightCover } from '../../api/deepInsight';
import { SearchIcon, DocumentTextIcon, RefreshIcon, CloudIcon, ArrowRightIcon, SparklesIcon, ClockIcon, FilterIcon, CloseIcon } from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Helpers ---

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // If within 24 hours, show "X hours ago"
    if (diff < 24 * 60 * 60 * 1000) {
        if (diff < 60 * 60 * 1000) return '刚刚';
        return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
    }
    
    return d.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
    });
};

// --- Components ---

const InsightCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        let currentUrl: string | null = null;

        // Try to fetch cover if task is processed
        if (['processing', 'completed'].includes(task.status)) {
            fetchDeepInsightCover(task.id).then(url => {
                if (active && url) {
                    setCoverUrl(url);
                    currentUrl = url;
                }
            });
        }
        return () => { 
            active = false;
            if (currentUrl) URL.revokeObjectURL(currentUrl);
        };
    }, [task.id, task.status]);

    return (
        <div 
            onClick={onClick}
            className="group relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 ease-out hover:-translate-y-1.5 border border-slate-200/50 hover:border-indigo-500/30 bg-slate-900"
        >
            {/* 1. Background Image Layer (The First Page) */}
            <div className="absolute inset-0 bg-slate-800 overflow-hidden">
                {coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt="" 
                        className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 opacity-0 ${isImageLoaded ? 'opacity-100' : ''}`}
                        onLoad={() => setIsImageLoaded(true)}
                    />
                ) : (
                    // Fallback abstract pattern if no image yet
                    <div className="w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400 via-slate-900 to-black"></div>
                )}
            </div>

            {/* 2. Brand Tone Overlay (Semi-transparent cover) */}
            {/* Uses a mix of Indigo/Violet/Slate to match the project theme, ensuring text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-slate-900/85 to-violet-900/90 mix-blend-hard-light opacity-95 transition-opacity duration-500 group-hover:opacity-85 backdrop-blur-[1px] group-hover:backdrop-blur-none"></div>
            
            {/* 3. Gradient for Bottom Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* 4. Content Layer */}
            <div className="relative h-full flex flex-col justify-between p-5 z-20">
                {/* Header: Tag & Status */}
                <div className="flex justify-between items-start">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white shadow-sm group-hover:bg-white/20 transition-colors tracking-wide">
                        {categoryName || '未分类'}
                    </span>
                    
                    {task.status === 'processing' && (
                        <div className="flex items-center gap-1.5 bg-indigo-500/40 backdrop-blur-md px-2 py-1 rounded-full border border-indigo-400/30">
                            <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse"></span>
                            <span className="text-[9px] text-white font-medium">解析中</span>
                        </div>
                    )}
                </div>

                {/* Body: Title & Meta */}
                <div className="space-y-3 mt-auto">
                    <h3 className="text-lg md:text-xl font-bold text-white leading-snug line-clamp-2 drop-shadow-md group-hover:text-indigo-100 transition-colors tracking-tight">
                        {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                    </h3>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/10 group-hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-4 text-xs text-white/70 font-medium font-mono">
                            <span className="flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5 opacity-80" />
                                {formatDate(task.updated_at)}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <DocumentTextIcon className="w-3.5 h-3.5 opacity-80" />
                                {task.total_pages || '-'} P
                            </span>
                        </div>
                        
                        {/* Interactive Arrow */}
                        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
                            <ArrowRightIcon className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* 5. Subtle Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform -translate-x-full group-hover:translate-x-full ease-in-out"></div>
        </div>
    );
};

const FilterTab: React.FC<{ label: string; count?: number; isActive: boolean; onClick: () => void }> = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            relative px-4 py-2 text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-2 rounded-xl whitespace-nowrap flex-shrink-0
            ${isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
            }
        `}
    >
        {label}
        {count !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
            </span>
        )}
    </button>
);

// --- Main Page Component ---

export const DeepDives: React.FC = () => {
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [readerTask, setReaderTask] = useState<DeepInsightTask | null>(null);
    
    // Mobile UI States
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cats, tasksRes] = await Promise.all([
                getDeepInsightCategories(),
                getDeepInsightTasks({ limit: 100 }) // Fetch latest 100
            ]);
            setCategories(cats);
            setTasks(tasksRes.items || []);
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

    const getCategoryName = (id?: string) => {
        if (!id) return undefined;
        return categories.find(c => c.id === id)?.name;
    };

    // Calculate counts for categories
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            if (t.category_id) {
                counts[t.category_id] = (counts[t.category_id] || 0) + 1;
            }
        });
        return counts;
    }, [tasks]);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans">
            
            {/* Header Section */}
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 flex-shrink-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
                <div className="max-w-[1920px] mx-auto px-4 md:px-8 py-3 md:py-5">
                    
                    {/* Top Row: Title & Actions */}
                    <div className="flex items-center justify-between gap-4 relative">
                        
                        {/* Title (Hidden on mobile if search is open) */}
                        <div className={`transition-opacity duration-200 ${isMobileSearchOpen ? 'opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'opacity-100'}`}>
                            <h1 className="text-lg md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                                <DocumentTextIcon className="w-5 h-5 md:w-7 md:h-7 text-indigo-600" />
                                深度洞察库
                                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
                                    <SparklesIcon className="w-3 h-3" />
                                    AI Refined
                                </span>
                            </h1>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 md:gap-4">
                            {/* Desktop Search Bar */}
                            <div className="hidden md:block relative group w-64 lg:w-80">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="搜索报告关键词..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Mobile Search Toggle */}
                            <button 
                                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                {isMobileSearchOpen ? <CloseIcon className="w-6 h-6" /> : <SearchIcon className="w-6 h-6" />}
                            </button>

                            <button 
                                onClick={loadData} 
                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                                title="刷新列表"
                            >
                                <RefreshIcon className={`w-5 h-5 md:w-5 md:h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Mobile Expanded Search Bar Overlay */}
                        {isMobileSearchOpen && (
                            <div className="absolute inset-0 md:hidden flex items-center pr-12 animate-in fade-in slide-in-from-right-5 duration-200 z-50 bg-white">
                                <SearchIcon className="absolute left-3 w-5 h-5 text-indigo-500" />
                                <input 
                                    type="text" 
                                    placeholder="搜索报告..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    {/* Filter Tabs - Horizontal Scroll */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0 mask-image-r">
                        <FilterTab 
                            label="全部" 
                            count={tasks.length} 
                            isActive={selectedCategoryId === null} 
                            onClick={() => setSelectedCategoryId(null)} 
                        />
                        {categories.map(cat => (
                            <FilterTab 
                                key={cat.id} 
                                label={cat.name} 
                                count={categoryCounts[cat.id]}
                                isActive={selectedCategoryId === cat.id} 
                                onClick={() => setSelectedCategoryId(cat.id)} 
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* Content Grid */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50/50">
                <div className="max-w-[1920px] mx-auto">
                    {isLoading && tasks.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-8">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="aspect-video bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse shadow-sm flex flex-col justify-between">
                                    <div className="flex justify-between">
                                        <div className="w-16 h-4 bg-slate-100 rounded"></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-full h-4 bg-slate-100 rounded"></div>
                                        <div className="w-2/3 h-4 bg-slate-100 rounded"></div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="w-10 h-3 bg-slate-100 rounded"></div>
                                        <div className="w-16 h-3 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTasks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-8 pb-20">
                            {filteredTasks.map(task => (
                                <InsightCard 
                                    key={task.id} 
                                    task={task} 
                                    categoryName={getCategoryName(task.category_id || undefined)}
                                    onClick={() => setReaderTask(task)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                <CloudIcon className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">暂无相关报告</h3>
                            <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
                                尝试调整搜索关键词或筛选条件，或者等待新的报告生成。
                            </p>
                            <button 
                                onClick={() => { setSelectedCategoryId(null); setSearchQuery(''); }}
                                className="mt-8 px-6 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
                            >
                                清除所有筛选
                            </button>
                        </div>
                    )}
                </div>
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
