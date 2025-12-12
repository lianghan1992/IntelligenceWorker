
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories } from '../../api/deepInsight';
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

// Generates a deterministic sophisticated gradient based on string hash
const getCardStyle = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Curated gradients - High saturation, Low brightness for white text contrast
    const styles = [
        'bg-gradient-to-br from-slate-700 to-slate-900',
        'bg-gradient-to-br from-indigo-600 to-blue-900',
        'bg-gradient-to-br from-violet-700 to-purple-900',
        'bg-gradient-to-br from-emerald-600 to-teal-900',
        'bg-gradient-to-br from-rose-700 to-red-900',
        'bg-gradient-to-br from-amber-600 to-orange-900',
        'bg-gradient-to-br from-cyan-700 to-sky-900',
        'bg-gradient-to-br from-fuchsia-700 to-pink-900',
    ];
    
    const index = Math.abs(hash) % styles.length;
    return styles[index];
};

// --- Components ---

const InsightCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => {
    const bgClass = useMemo(() => getCardStyle(task.id), [task.id]);

    return (
        <div 
            onClick={onClick}
            className={`
                group relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1
                ${bgClass}
            `}
        >
            {/* Background Texture/Noise (Optional for premium feel) */}
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPjwvc3ZnPg==')]"></div>
            
            {/* Hover Gloss Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div className="relative h-full flex flex-col justify-between p-5 z-10">
                {/* Top Row: Category & Status */}
                <div className="flex justify-between items-start">
                    <span className="inline-block px-2.5 py-1 bg-white/10 backdrop-blur-md text-[10px] font-bold text-white/90 rounded-md border border-white/10">
                        {categoryName || '未分类'}
                    </span>
                    
                    {/* Status Dot */}
                    {task.status === 'processing' && (
                        <div className="flex items-center gap-1.5 bg-indigo-500/30 backdrop-blur px-2 py-1 rounded-full border border-indigo-400/30">
                            <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse"></span>
                            <span className="text-[9px] text-white/90 font-medium">解析中</span>
                        </div>
                    )}
                </div>

                {/* Middle: Title */}
                <div className="mt-2 mb-auto pt-2">
                    <h3 className="text-white font-bold text-lg leading-snug line-clamp-2 tracking-tight group-hover:text-white/90 transition-colors">
                        {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                    </h3>
                </div>

                {/* Bottom: Meta Info */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-2">
                    <div className="flex items-center gap-3 text-xs text-white/60 font-medium">
                        <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-3.5 h-3.5 opacity-70" />
                            {task.total_pages || '-'} 页
                        </span>
                        <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5 opacity-70" />
                            {formatDate(task.updated_at)}
                        </span>
                    </div>

                    {/* Hover Action Icon */}
                    <div className={`
                        w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center 
                        opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300
                    `}>
                        <ArrowRightIcon className="w-4 h-4 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const FilterTab: React.FC<{ label: string; count?: number; isActive: boolean; onClick: () => void }> = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            relative px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-bold transition-all duration-200 flex items-center gap-2 rounded-lg whitespace-nowrap flex-shrink-0
            ${isActive 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }
        `}
    >
        {label}
        {count !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
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
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 flex-shrink-0 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                <div className="max-w-[1920px] mx-auto px-4 md:px-8 py-3 md:py-5">
                    
                    {/* Top Row: Title & Actions */}
                    <div className="flex items-center justify-between gap-4 relative">
                        
                        {/* Title (Hidden on mobile if search is open) */}
                        <div className={`transition-opacity duration-200 ${isMobileSearchOpen ? 'opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'opacity-100'}`}>
                            <h1 className="text-lg md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                                <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                                深度洞察库
                                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                                    <SparklesIcon className="w-3 h-3" />
                                    AI Refined
                                </span>
                            </h1>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 md:gap-3">
                            {/* Desktop Search Bar */}
                            <div className="hidden md:block relative group w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="搜索报告..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Mobile Search Toggle */}
                            <button 
                                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                                {isMobileSearchOpen ? <CloseIcon className="w-5 h-5" /> : <SearchIcon className="w-5 h-5" />}
                            </button>

                            <button 
                                onClick={loadData} 
                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                title="刷新列表"
                            >
                                <RefreshIcon className={`w-4 h-4 md:w-5 md:h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Mobile Expanded Search Bar Overlay */}
                        {isMobileSearchOpen && (
                            <div className="absolute inset-0 md:hidden flex items-center pr-12 animate-in fade-in slide-in-from-right-5 duration-200">
                                <input 
                                    type="text" 
                                    placeholder="搜索报告..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-4 pr-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-lg"
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    {/* Filter Tabs - Horizontal Scroll */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-4 pb-1 -mx-4 px-4 md:mx-0 md:px-0">
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
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-50">
                <div className="max-w-[1920px] mx-auto">
                    {isLoading && tasks.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="aspect-video bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse shadow-sm flex flex-col justify-between">
                                    <div className="flex justify-between">
                                        <div className="w-16 h-4 bg-slate-100 rounded"></div>
                                    </div>
                                    <div className="space-y-2">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 pb-20">
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
                        <div className="flex flex-col items-center justify-center py-32 text-center">
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
