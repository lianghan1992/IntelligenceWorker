
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories, fetchDeepInsightCover } from '../../api/deepInsight';
import { SearchIcon, DocumentTextIcon, RefreshIcon, ClockIcon, FilterIcon, CloudIcon, ArrowRightIcon } from '../icons';
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

// Generates a deterministic gradient based on string hash
const generateGradient = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
        ['from-blue-400 to-indigo-600', 'text-blue-50'],
        ['from-emerald-400 to-teal-600', 'text-emerald-50'],
        ['from-orange-400 to-red-600', 'text-orange-50'],
        ['from-purple-400 to-pink-600', 'text-purple-50'],
        ['from-cyan-400 to-blue-600', 'text-cyan-50'],
        ['from-rose-400 to-orange-500', 'text-rose-50'],
        ['from-violet-400 to-fuchsia-600', 'text-violet-50'],
        ['from-slate-600 to-slate-800', 'text-slate-200'],
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

// --- Components ---

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'completed') return null;
    
    const config = {
        pending: { text: '排队中', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
        processing: { text: 'AI解析中', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' },
        failed: { text: '解析失败', bg: 'bg-red-100 text-red-700 border-red-200' },
    }[status] || { text: status, bg: 'bg-slate-100 text-slate-600' };

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.bg} flex-shrink-0`}>
            {config.text}
        </span>
    );
};

const InsightCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [gradientClass, textClass] = useMemo(() => generateGradient(task.id), [task.id]);

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
            className="group relative flex flex-col w-full cursor-pointer perspective-1000"
        >
            {/* Document "Paper" Container */}
            <div className="relative bg-white rounded-t-lg rounded-br-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] group-hover:shadow-[0_20px_30px_-10px_rgba(0,0,0,0.15)] group-hover:-translate-y-2 transition-all duration-500 ease-out border border-slate-200 overflow-hidden">
                
                {/* 1. Cover Area (A4 Ratio approx) */}
                <div className="relative aspect-[210/260] overflow-hidden bg-slate-100">
                    {/* Category Tag */}
                    {categoryName && (
                        <div className="absolute top-3 left-3 z-20">
                            <span className="inline-block px-2 py-0.5 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white rounded-md shadow-sm tracking-wide border border-white/20">
                                {categoryName}
                            </span>
                        </div>
                    )}

                    {/* Image or Generative Placeholder */}
                    {coverUrl ? (
                        <img 
                            src={coverUrl} 
                            alt={task.file_name} 
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            loading="lazy"
                        />
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex flex-col p-6 relative`}>
                            {/* Abstract Pattern overlay */}
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:20px_20px]"></div>
                            
                            <div className="mt-auto relative z-10">
                                <div className={`w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-3 ${textClass}`}>
                                    <DocumentTextIcon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-white font-bold text-lg leading-tight line-clamp-3 drop-shadow-md">
                                    {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                                </h3>
                            </div>
                        </div>
                    )}

                    {/* Glossy Overlay (Shine) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    
                    {/* Dark Overlay on Hover for Text Visibility if image */}
                    {coverUrl && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    )}

                    {/* Action Button (Floats up) */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center translate-y-10 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                        <span className="px-5 py-2 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 hover:bg-white hover:scale-105 transition-all">
                            阅读报告 <ArrowRightIcon className="w-3 h-3" />
                        </span>
                    </div>
                </div>

                {/* 2. Info Body (Clean & Minimal) */}
                <div className="p-4 bg-white relative z-10">
                    {/* If coverUrl exists, show title here because it's not on the image */}
                    {coverUrl ? (
                        <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 mb-3 h-[2.5em] group-hover:text-indigo-600 transition-colors">
                            {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                        </h3>
                    ) : (
                        // If generative cover, title is on cover, show summary or just spacer
                        <div className="h-[2.5em] flex items-center">
                             <p className="text-xs text-slate-400 line-clamp-2">
                                AI 深度解析报告，点击查看完整内容与关键数据提取。
                             </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                                <DocumentTextIcon className="w-3 h-3" />
                                {task.total_pages || '-'} 页
                            </span>
                            <span className="w-px h-3 bg-slate-200"></span>
                            <span>{formatDate(task.updated_at)}</span>
                        </div>
                        <StatusBadge status={task.status} />
                    </div>
                </div>
            </div>
            
            {/* "Stacked Paper" Effect beneath the card */}
            <div className="absolute inset-x-2 bottom-0 h-2 bg-slate-200 rounded-b-lg -z-10 group-hover:translate-y-1 transition-transform duration-500 ease-out shadow-sm"></div>
            <div className="absolute inset-x-4 bottom-[-4px] h-2 bg-slate-100 rounded-b-lg -z-20 group-hover:translate-y-2 transition-transform duration-500 ease-out shadow-sm"></div>
        </div>
    );
};

const FilterTab: React.FC<{ label: string; count?: number; isActive: boolean; onClick: () => void }> = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            relative px-4 py-2.5 text-sm font-bold transition-all duration-200 flex items-center gap-2
            ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}
        `}
    >
        {label}
        {count !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                {count}
            </span>
        )}
        {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
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
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 flex-shrink-0 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                <div className="max-w-[1920px] mx-auto px-4 md:px-8 pt-6 pb-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                        
                        {/* Title & Description */}
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                深度洞察库
                                <span className="text-xs font-normal text-slate-500 px-2 py-1 bg-slate-100 rounded-full border border-slate-200 hidden sm:inline-block">
                                    AI Refined Reports
                                </span>
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                已收录 <span className="font-bold text-indigo-600">{tasks.length}</span> 份行业高价值研报，实时重构知识点。
                            </p>
                        </div>

                        {/* Search & Actions */}
                        <div className="flex items-center gap-3">
                            <div className="relative group w-full md:w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="搜索报告..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <button 
                                onClick={loadData} 
                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                title="刷新列表"
                            >
                                <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-transparent">
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 md:gap-8">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="aspect-[210/297] bg-white rounded-xl border border-slate-200 p-4 space-y-4 animate-pulse shadow-sm">
                                    <div className="w-full h-1/2 bg-slate-100 rounded-lg mb-4"></div>
                                    <div className="w-3/4 h-4 bg-slate-100 rounded"></div>
                                    <div className="w-1/2 h-3 bg-slate-100 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTasks.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 md:gap-10 pb-20">
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
