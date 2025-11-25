
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories, fetchDeepInsightCover } from '../../api/deepInsight';
import { SearchIcon, DocumentTextIcon, RefreshIcon } from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// Helper: Format Date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Helper: Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'completed') return null;
    
    const config = {
        pending: { text: '等待处理', bg: 'bg-yellow-500', icon: '⏳' },
        processing: { text: 'AI解析中', bg: 'bg-blue-500 animate-pulse', icon: '⚡' },
        failed: { text: '处理失败', bg: 'bg-red-500', icon: '⚠️' },
    }[status] || { text: status, bg: 'bg-gray-500', icon: '' };

    return (
        <div className={`absolute top-3 right-3 ${config.bg} text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-20 flex items-center gap-1`}>
            <span>{config.icon}</span>
            <span>{config.text}</span>
        </div>
    );
};

// Component: Insight Card
const InsightCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        // Try to fetch cover regardless of status, as some might have initial covers
        // or fallback to placeholder
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
            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
        >
            {/* Status Overlay */}
            <StatusBadge status={task.status} />

            {/* Cover Image / Header Background */}
            <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden border-b border-slate-100">
                {coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt={task.file_name} 
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
                        <DocumentTextIcon className="w-16 h-16 opacity-50" />
                        <span className="text-xs mt-2 font-medium uppercase tracking-wider opacity-60">
                            {task.status === 'pending' ? 'Pending' : task.file_type}
                        </span>
                    </div>
                )}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

                {/* Category Badge */}
                {categoryName && (
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 shadow-sm border border-white/50 z-10">
                        {categoryName}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-grow bg-white relative">
                <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2" title={task.file_name}>
                    {task.file_name}
                </h3>
                
                <div className="mt-auto pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        <span>{task.total_pages > 0 ? `${task.total_pages} 页` : '解析中'}</span>
                    </div>
                    <span>{formatDate(task.updated_at)}</span>
                </div>
            </div>
        </div>
    );
};

// Component: Filter Chip
const FilterChip: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 border ${
            isActive 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
            // Show all tasks regardless of status to allow access to raw PDFs
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
        <div className="min-h-full bg-slate-50/50 p-4 md:p-8 font-sans">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-8 md:mb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">深度洞察库</h1>
                        <p className="text-slate-500 mt-2 text-lg">
                            汇聚行业高价值报告，原始文档一键直达，AI 深度重构助力高效阅读。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="搜索报告..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={loadData} 
                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                            title="刷新"
                        >
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="mt-8 flex flex-wrap gap-3">
                    <FilterChip 
                        label="全部报告" 
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
            <div className="max-w-7xl mx-auto">
                {isLoading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredTasks.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
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
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <DocumentTextIcon className="w-12 h-12 mb-3 opacity-50" />
                        <p className="font-medium">暂无相关深度报告</p>
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
