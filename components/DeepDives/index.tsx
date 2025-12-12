
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories } from '../../api/deepInsight';
import { SearchIcon, DocumentTextIcon, RefreshIcon, CloudIcon, ArrowRightIcon, SparklesIcon, ClockIcon, CloseIcon, ChipIcon } from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Helpers ---

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
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
    // 移除封面图背景逻辑，改用纯净的 CSS 样式
    
    return (
        <div 
            onClick={onClick}
            className="group relative w-full aspect-[16/10] bg-slate-900 rounded-xl border border-slate-800 hover:border-indigo-500/50 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between p-5"
        >
            {/* Background Decor: Abstract Icon Watermark */}
            <div className="absolute -right-6 -bottom-6 text-slate-800 group-hover:text-indigo-900/20 transition-colors duration-500 pointer-events-none transform rotate-12 group-hover:rotate-0 group-hover:scale-110">
                <DocumentTextIcon className="w-32 h-32 opacity-50" />
            </div>

            {/* Background Decor: Subtle Gradient Mesh on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500 pointer-events-none"></div>

            {/* Top Section */}
            <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors uppercase tracking-wider">
                        {categoryName || 'REPORT'}
                    </span>
                    {task.status === 'processing' && (
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/20 text-[10px] text-indigo-300 font-medium animate-pulse">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                            解析中
                        </span>
                    )}
                </div>
                
                {/* PDF Icon Badge */}
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">
                    <DocumentTextIcon className="w-4 h-4" />
                </div>
            </div>

            {/* Middle Section: Title */}
            <div className="relative z-10 mt-auto mb-4">
                <h3 className="text-base md:text-lg font-bold text-slate-100 leading-snug line-clamp-3 group-hover:text-white transition-colors">
                    {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                </h3>
            </div>

            {/* Bottom Section: Meta */}
            <div className="relative z-10 pt-4 border-t border-slate-800 group-hover:border-slate-700/50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
                    <span className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {formatDate(task.updated_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <ChipIcon className="w-3.5 h-3.5" />
                        {task.total_pages || '-'}P
                    </span>
                </div>
                
                <div className="text-indigo-500 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRightIcon className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
};

const FilterTab: React.FC<{ label: string; count?: number; isActive: boolean; onClick: () => void }> = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            relative px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 rounded-lg whitespace-nowrap flex-shrink-0 select-none
            ${isActive 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-1 ring-indigo-600' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
            }
        `}
    >
        {label}
        {count !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
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
                getDeepInsightTasks({ limit: 100 })
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
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            
            {/* Header Section */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 flex-shrink-0 shadow-sm">
                <div className="max-w-[1920px] mx-auto px-4 md:px-8 py-3 md:py-4">
                    
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-4 h-10">
                        {/* Title - Auto hides on mobile when search open */}
                        <div className={`transition-opacity duration-200 flex items-center gap-3 ${isMobileSearchOpen ? 'opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto w-0 md:w-auto' : 'opacity-100 w-auto'}`}>
                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                <DocumentTextIcon className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap">深度洞察库</h1>
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
                                <SparklesIcon className="w-3 h-3" /> AI Refined
                            </span>
                        </div>

                        {/* Search & Actions */}
                        <div className={`flex items-center gap-2 transition-all duration-300 ${isMobileSearchOpen ? 'flex-1 justify-end' : ''}`}>
                            
                            {/* Desktop Search */}
                            <div className="hidden md:block relative group w-64 lg:w-80">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="搜索报告关键词..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Mobile Search Input (Expands) */}
                            {isMobileSearchOpen ? (
                                <div className="flex-1 flex items-center animate-in fade-in slide-in-from-right-5">
                                    <input 
                                        type="text" 
                                        placeholder="搜索报告..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-4 pr-10 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                                        autoFocus
                                    />
                                    <button onClick={() => setIsMobileSearchOpen(false)} className="absolute right-0 p-2 text-slate-400">
                                        <CloseIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsMobileSearchOpen(true)}
                                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <SearchIcon className="w-5 h-5" />
                                </button>
                            )}

                            <button 
                                onClick={loadData} 
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                                title="刷新列表"
                            >
                                <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs - Horizontal Scroll */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-4 -mx-4 px-4 md:mx-0 md:px-0">
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
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                <div className="max-w-[1920px] mx-auto">
                    {isLoading && tasks.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="aspect-[16/10] bg-white rounded-xl border border-slate-200 p-5 animate-pulse shadow-sm flex flex-col justify-between">
                                    <div className="w-16 h-4 bg-slate-100 rounded"></div>
                                    <div className="space-y-2">
                                        <div className="w-full h-4 bg-slate-100 rounded"></div>
                                        <div className="w-2/3 h-4 bg-slate-100 rounded"></div>
                                    </div>
                                    <div className="flex justify-between mt-4">
                                        <div className="w-10 h-3 bg-slate-100 rounded"></div>
                                        <div className="w-10 h-3 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTasks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
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
                            <h3 className="text-lg font-bold text-slate-800">暂无相关报告</h3>
                            <p className="text-slate-500 mt-2 text-sm">尝试调整筛选条件</p>
                            <button 
                                onClick={() => { setSelectedCategoryId(null); setSearchQuery(''); }}
                                className="mt-6 px-6 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                重置筛选
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
