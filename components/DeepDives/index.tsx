
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories, fetchDeepInsightCover } from '../../api/deepInsight';
import { SearchIcon, DocumentTextIcon, RefreshIcon, SparklesIcon, ClockIcon } from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// Helper: Format Date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
};

// Helper: Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = status.toLowerCase();
    if (s === 'completed') return null;
    
    let config = { text: s, bg: 'bg-gray-500/80', icon: null as React.ReactNode };
    
    if (['pending', 'queued'].includes(s)) {
        config = { text: '排队中', bg: 'bg-yellow-500/90', icon: <ClockIcon className="w-3 h-3" /> };
    } else if (['processing', 'running'].includes(s)) {
        config = { text: 'AI解析中', bg: 'bg-indigo-500/90 animate-pulse', icon: <SparklesIcon className="w-3 h-3" /> };
    } else if (s === 'failed') {
        config = { text: '处理失败', bg: 'bg-red-500/90', icon: null };
    }

    return (
        <div className={`absolute top-3 right-3 ${config.bg} backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg z-20 flex items-center gap-1 border border-white/10`}>
            {config.icon}
            <span>{config.text}</span>
        </div>
    );
};

// Component: Insight Card (16:9 Aspect Ratio)
const InsightCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        // Try to fetch cover for all tasks to show potential placeholders or first page previews
        fetchDeepInsightCover(task.id).then(url => {
            if (active && url) setCoverUrl(url);
        });
        return () => { 
            active = false; 
            if (coverUrl) URL.revokeObjectURL(coverUrl); 
        };
    }, [task.id]);

    return (
        <div 
            onClick={onClick}
            className="group relative bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
        >
            {/* 16:9 Image Area */}
            <div className="aspect-video w-full relative bg-slate-100 overflow-hidden">
                {coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt={task.file_name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
                        <DocumentTextIcon className="w-16 h-16 opacity-30" />
                    </div>
                )}
                
                {/* Gradient Overlay for Text Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-70 transition-opacity"></div>

                <StatusBadge status={task.status} />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
                    {categoryName && (
                        <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] font-medium mb-2 border border-white/10">
                            {categoryName}
                        </span>
                    )}
                    <h3 className="text-base md:text-lg font-bold leading-snug line-clamp-2 drop-shadow-md group-hover:text-indigo-100 transition-colors" title={task.file_name}>
                        {task.file_name}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-[10px] md:text-xs text-slate-300 font-medium">
                        <div className="flex items-center gap-2">
                            <span>{formatDate(task.created_at)}</span>
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                            <span>{task.file_type.toUpperCase()}</span>
                        </div>
                        {task.total_pages > 0 && (
                            <span className="bg-black/30 px-1.5 py-0.5 rounded">{task.total_pages} 页</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component: Filter Chip
const FilterChip: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-1.5 text-xs md:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
            isActive 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
        {label}
    </button>
);

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
                getDeepInsightTasks({ limit: 100 }) // Fetch latest 100 tasks
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

    return (
        <div className="min-h-full bg-slate-50/50 p-4 md:p-8 font-sans flex flex-col">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto w-full mb-6 md:mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">深度洞察库</h1>
                        <p className="text-sm md:text-base text-slate-500 mt-1">
                            行业高价值报告与原始文档一站式获取
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-grow md:flex-grow-0 md:w-64 group">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="搜索报告..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={loadData} 
                            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm flex-shrink-0"
                            title="刷新"
                        >
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Categories (Scrollable on Mobile) */}
                <div className="mt-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar mask-gradient-right">
                    <FilterChip 
                        label="全部" 
                        isActive={selectedCategoryId === null} 
                        onClick={() => setSelectedCategoryId(null)} 
                    />
                    {categories.map(cat => (
                        <FilterChip 
                            key={cat.id} 
                            label={cat.name} 
                            isActive={selectedCategoryId === cat.id} 
                            onClick={() => setSelectedCategoryId(cat.id)} 
                        />
                    ))}
                </div>
            </div>

            {/* Grid Section */}
            <div className="max-w-7xl mx-auto w-full flex-1">
                {isLoading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredTasks.length > 0 ? (
                    // 16:9 Cards Layout: Mobile 1 col, Tablet 2 cols, Large 3 cols
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-10">
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
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                        <DocumentTextIcon className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium text-sm">暂无相关深度报告</p>
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
