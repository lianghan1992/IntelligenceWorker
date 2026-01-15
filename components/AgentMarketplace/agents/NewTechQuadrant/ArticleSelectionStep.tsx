
import React, { useState, useEffect, useCallback } from 'react';
import { getArticles, getSpiderSources } from '../../../../api/intelligence';
import { ArticlePublic, SpiderSource } from '../../../../types';
import { 
    SearchIcon, RefreshIcon, CheckCircleIcon, ArrowRightIcon, 
    FilterIcon, CalendarIcon, ServerIcon, TrashIcon, 
    ChevronLeftIcon, ChevronRightIcon, LockClosedIcon, CheckIcon, CloseIcon
} from '../../../../components/icons';

interface ArticleSelectionStepProps {
    onConfirm: (articles: ArticlePublic[]) => void;
    onClose: () => void;
    resetTrigger?: number;
}

const STORAGE_KEY = 'auto_insight_analyzed_articles';

export const ArticleSelectionStep: React.FC<ArticleSelectionStepProps> = ({ onConfirm, onClose, resetTrigger }) => {
    // Data States
    const [articles, setArticles] = useState<ArticlePublic[]>([]);
    const [sources, setSources] = useState<SpiderSource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Selection & Cache States
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [analyzedIds, setAnalyzedIds] = useState<Set<string>>(new Set());
    const [allowOverwrite, setAllowOverwrite] = useState(false); // 是否允许重新分析已处理的文章

    // Filter & Pagination States
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({
        sourceId: '',
        dateStart: '',
        dateEnd: '',
        keyword: '' 
    });

    // --- 1. Initialization ---
    useEffect(() => {
        // Load Metadata
        getSpiderSources({ size: 100 }).then(res => setSources(res.items || [])).catch(console.error);
        
        // Load Cache
        loadAnalyzedCache();
    }, []);

    // Listen to reset trigger
    useEffect(() => {
        if (resetTrigger && resetTrigger > 0) {
            setSelectedIds(new Set());
            // Reload to refresh analyzed status visual if needed
            loadArticles();
        }
    }, [resetTrigger]);

    // Load Articles when filters/page change
    useEffect(() => {
        loadArticles();
    }, [pagination.page, filters.sourceId, filters.dateStart, filters.dateEnd]);

    // --- 2. Logic Helpers ---

    const loadAnalyzedCache = () => {
        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                setAnalyzedIds(new Set(JSON.parse(cached)));
            }
        } catch (e) {
            console.error("Failed to load analyzed history", e);
        }
    };

    const clearAnalyzedCache = () => {
        if (confirm('确定要清除本地的“已分析”标记记录吗？所有文章将恢复为可选状态。')) {
            localStorage.removeItem(STORAGE_KEY);
            setAnalyzedIds(new Set());
        }
    };

    const loadArticles = async () => {
        setIsLoading(true);
        try {
            const res = await getArticles({
                page: pagination.page,
                limit: pagination.limit,
                source_id: filters.sourceId || undefined,
                start_date: filters.dateStart || undefined,
                end_date: filters.dateEnd || undefined,
            });
            setArticles(res.items || []);
            setPagination(prev => ({
                ...prev,
                total: res.total,
                totalPages: Math.ceil(res.total / prev.limit) || 1
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAllOnPage = () => {
        const selectableArticles = articles.filter(a => allowOverwrite || !analyzedIds.has(a.id));
        const allSelectableIds = selectableArticles.map(a => a.id);
        
        const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every(id => selectedIds.has(id));

        if (isAllSelected) {
            const newSet = new Set(selectedIds);
            allSelectableIds.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            allSelectableIds.forEach(id => newSet.add(id));
            setSelectedIds(newSet);
        }
    };

    const handleConfirm = () => {
        const selected = articles.filter(a => selectedIds.has(a.id));
        
        // 1. Update Cache
        const newAnalyzed = new Set(analyzedIds);
        selected.forEach(a => newAnalyzed.add(a.id));
        setAnalyzedIds(newAnalyzed); // Immediately update local state
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newAnalyzed)));
        
        // 2. Proceed
        onConfirm(selected);
    };

    return (
        <div className="flex flex-col h-full w-full bg-white relative">
            
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900">选择分析素材</h2>
                    <p className="text-sm text-slate-500 mt-1">从文章库中选择技术文档，AI 将自动提取其中的创新技术点。</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Cache Controls */}
                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-2 px-2 py-1 cursor-pointer select-none text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={allowOverwrite} 
                                onChange={e => setAllowOverwrite(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            允许重复分析
                        </label>
                        <div className="w-px h-4 bg-slate-300"></div>
                        <button 
                            onClick={clearAnalyzedCache}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-600 transition-colors"
                            title="清除本地的“已分析”标记记录"
                        >
                            <TrashIcon className="w-3.5 h-3.5" /> 清除历史
                        </button>
                    </div>

                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex-shrink-0 p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Source Filter */}
                    <div className="relative min-w-[160px]">
                        <ServerIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            value={filters.sourceId}
                            onChange={e => handleFilterChange('sourceId', e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            <option value="">所有情报源</option>
                            {sources.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronRightIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        <input 
                            type="date" 
                            className="text-sm text-slate-600 outline-none bg-transparent"
                            value={filters.dateStart}
                            onChange={e => handleFilterChange('dateStart', e.target.value)}
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                            type="date" 
                            className="text-sm text-slate-600 outline-none bg-transparent"
                            value={filters.dateEnd}
                            onChange={e => handleFilterChange('dateEnd', e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadArticles} 
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200 hover:shadow-sm"
                        title="刷新列表"
                    >
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="text-xs uppercase text-slate-500 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    onChange={toggleAllOnPage}
                                    checked={
                                        articles.length > 0 && 
                                        articles.filter(a => allowOverwrite || !analyzedIds.has(a.id)).every(a => selectedIds.has(a.id))
                                    }
                                />
                            </th>
                            <th className="p-4">文章标题</th>
                            <th className="p-4 w-40">来源</th>
                            <th className="p-4 w-40">发布时间</th>
                            <th className="p-4 w-28 text-center">状态</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading && articles.length === 0 ? (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-400">加载中...</td></tr>
                        ) : articles.length === 0 ? (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-400">暂无文章</td></tr>
                        ) : (
                            articles.map(article => {
                                const isAnalyzed = analyzedIds.has(article.id);
                                const isDisabled = isAnalyzed && !allowOverwrite;
                                const isSelected = selectedIds.has(article.id);

                                return (
                                    <tr 
                                        key={article.id} 
                                        className={`
                                            transition-colors 
                                            ${isDisabled ? 'bg-slate-50 opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}
                                            ${isSelected ? 'bg-indigo-50/60' : ''}
                                        `}
                                        onClick={() => !isDisabled && toggleSelection(article.id)}
                                    >
                                        <td className="p-4 text-center">
                                            {isDisabled ? (
                                                <LockClosedIcon className="w-4 h-4 text-slate-300 mx-auto" />
                                            ) : (
                                                <div className={`w-5 h-5 mx-auto rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                                    {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium text-slate-900">
                                            {article.title}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 border border-slate-200">{article.source_name}</span>
                                        </td>
                                        <td className="p-4 text-slate-400 font-mono text-xs">
                                            {new Date(article.publish_date || article.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            {isAnalyzed ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                                                    已提取
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                                                    未提取
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Pagination & Action */}
            <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                
                {/* Pagination */}
                <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="hidden sm:inline">第 {pagination.page} / {pagination.totalPages} 页</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                            disabled={pagination.page <= 1 || isLoading}
                            className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))}
                            disabled={pagination.page >= pagination.totalPages || isLoading}
                            className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">已选择 <strong className="text-indigo-600">{selectedIds.size}</strong> 篇</span>
                    <button 
                        onClick={handleConfirm}
                        disabled={selectedIds.size === 0}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 active:scale-95"
                    >
                        下一步：提取技术点 <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
