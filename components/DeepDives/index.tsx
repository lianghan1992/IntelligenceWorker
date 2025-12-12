
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories, fetchDeepInsightCover } from '../../api/deepInsight';
import { SearchIcon, DocumentTextIcon, RefreshIcon, ClockIcon, FilterIcon, CloudIcon } from '../icons';
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
        month: 'short',
        day: 'numeric'
    });
};

// --- Components ---

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'completed') return null;
    
    const config = {
        pending: { text: '等待中', bg: 'bg-amber-500/90', textCol: 'text-white', animate: '' },
        processing: { text: 'AI解析中', bg: 'bg-indigo-500/90', textCol: 'text-white', animate: 'animate-pulse' },
        failed: { text: '解析失败', bg: 'bg-red-500/90', textCol: 'text-white', animate: '' },
    }[status] || { text: status, bg: 'bg-slate-500/90', textCol: 'text-white', animate: '' };

    return (
        <div className={`absolute top-3 right-3 ${config.bg} ${config.textCol} backdrop-blur-sm text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg z-20 flex items-center gap-1.5 border border-white/10 ${config.animate}`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-white ${status === 'processing' ? 'animate-ping' : ''}`}></div>
            {config.text}
        </div>
    );
};

const InsightCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        let active = true;
        if (task.status === 'completed' || task.status === 'processing') {
            fetchDeepInsightCover(task.id).then(url => {
                if (active && url) setCoverUrl(url);
            });
        }
        return () => { 
            active = false; 
            if (coverUrl) URL.revokeObjectURL(coverUrl); 
        };
    }, [task.id, task.status]);

    return (
        <div 
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative flex flex-col bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] border border-slate-200/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden h-full"
        >
            {/* Aspect Ratio Container - mimicking A4 paper ratio approx 3:4 */}
            <div className="relative aspect-[3/4] bg-slate-50 overflow-hidden border-b border-slate-100">
                <StatusBadge status={task.status} />
                
                {/* Category Label */}
                {categoryName && (
                    <div className="absolute top-3 left-3 z-20">
                        <span className="inline-block px-2.5 py-1 bg-white/90 backdrop-blur-md text-[10px] font-bold text-slate-700 rounded-md shadow-sm border border-slate-200/50 uppercase tracking-wide">
                            {categoryName}
                        </span>
                    </div>
                )}

                {/* Cover Image or Placeholder */}
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
                    {coverUrl ? (
                        <img 
                            src={coverUrl} 
                            alt={task.file_name} 
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 relative">
                            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
                            <div className="relative z-10 w-16 h-20 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center transform group-hover:-rotate-3 transition-transform duration-300">
                                <DocumentTextIcon className="w-8 h-8 text-indigo-200" />
                            </div>
                            <div className="relative z-0 w-16 h-20 bg-indigo-50 rounded-lg border border-indigo-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-6 opacity-60"></div>
                        </div>
                    )}
                    
                    {/* Hover Overlay Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6`}>
                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <span className="inline-flex items-center justify-center px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold rounded-lg hover:bg-white/30 transition-colors w-full">
                                立即阅读
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex-1 min-h-[3rem]">
                    <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors" title={task.file_name}>
                        {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                    </h3>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        <span className="font-medium">{task.total_pages > 0 ? `${task.total_pages} 页` : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>{formatDate(task.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FilterPill: React.FC<{ label: string; count?: number; isActive: boolean; onClick: () => void }> = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            group relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border flex items-center gap-2 whitespace-nowrap
            ${isActive 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
            <header className="bg-white border-b border-slate-200/60 sticky top-0 z-30 flex-shrink-0">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* Title & Search */}
                        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <DocumentTextIcon className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">深度洞察库</h1>
                                    <p className="text-xs text-slate-500 hidden sm:block">AI 重构的高价值行业研报集合</p>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="relative w-full md:max-w-md group">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="搜索报告标题、关键词..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={loadData} 
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 hover:border-indigo-100 transition-all shadow-sm"
                                title="刷新列表"
                            >
                                <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                        <FilterIcon className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                        <FilterPill 
                            label="全部" 
                            count={tasks.length} 
                            isActive={selectedCategoryId === null} 
                            onClick={() => setSelectedCategoryId(null)} 
                        />
                        {categories.map(cat => (
                            <FilterPill 
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
                <div className="max-w-[1600px] mx-auto">
                    {isLoading && tasks.length === 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="aspect-[3/4] bg-white rounded-xl border border-slate-200 p-4 space-y-4 animate-pulse">
                                    <div className="w-full h-2/3 bg-slate-100 rounded-lg"></div>
                                    <div className="w-3/4 h-4 bg-slate-100 rounded"></div>
                                    <div className="w-1/2 h-3 bg-slate-100 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTasks.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 pb-20">
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
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <CloudIcon className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">暂无相关报告</h3>
                            <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
                                尝试调整搜索关键词或筛选条件，或者等待新的报告生成。
                            </p>
                            <button 
                                onClick={() => { setSelectedCategoryId(null); setSearchQuery(''); }}
                                className="mt-6 px-6 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                清除筛选
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
