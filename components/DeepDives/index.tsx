import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories } from '../../api/deepInsight';
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

// Component: Insight Card
const InsightCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => (
    <div 
        onClick={onClick}
        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
    >
        {/* Decorative Header Background */}
        <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                <DocumentTextIcon className="w-16 h-16 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            </div>
            {/* Category Badge */}
            {categoryName && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm border border-white/50">
                    {categoryName}
                </div>
            )}
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                {task.file_name}
            </h3>
            
            <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{task.file_type.toUpperCase()}</span>
                    <span>{task.total_pages} 页</span>
                </div>
                <span>{formatDate(task.updated_at)}</span>
            </div>
        </div>
    </div>
);

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
                getDeepInsightTasks({ limit: 100 }) // Fetch latest 100 tasks for now
            ]);
            setCategories(cats);
            // Filter for completed tasks only for the end-user view
            // And map category names if possible
            const allTasks = tasksRes.items || [];
            const validTasks = allTasks.filter(t => t.status === 'completed');
            setTasks(validTasks);
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
                            汇聚行业高价值报告，AI 深度重构，让知识流动起来。
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
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
