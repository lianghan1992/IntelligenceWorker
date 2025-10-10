// src/components/AdminPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Subscription, ProcessingTask, AdminView, SystemSource, InfoItem, SearchResult } from '../types';
import {
  addPoint,
  deletePoints,
  getProcessingTasks,
  getSources,
  getPointsBySourceName,
  getProcessingTasksStats,
  getArticles,
  searchArticlesFiltered, // Import the new combined search API
} from '../api';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { InfoDetailModal } from './InfoDetailModal';
import { PlusIcon, TrashIcon, LightBulbIcon, UsersIcon, DiveIcon, VideoCameraIcon, ChevronDownIcon, CheckIcon, CloseIcon } from './icons';

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5 text-gray-500"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CRON_SCHEDULE_MAP: { [key: string]: string } = {
    '*/5 * * * *': '每5分钟',
    '*/30 * * * *': '每30分钟',
    '0 * * * *': '每1小时',
    '0 */2 * * *': '每2小时',
    '0 */3 * * *': '每3小时',
    '0 */6 * * *': '每6小时',
    '0 */12 * * *': '每12小时',
};

// Function to format timestamps to Beijing Time (UTC+8)
const formatToBeijingTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
    // Add 'Z' to indicate UTC if it's missing, to prevent incorrect local time conversion
    const ensureUTC = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    return new Date(ensureUTC).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/\//g, '-');
};


const formatCron = (schedule: string): string => {
    return CRON_SCHEDULE_MAP[schedule] || schedule;
};

const getStatusChip = (status: ProcessingTask['status']) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completed')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">完成</span>;
    if (statusLower.includes('processing') || statusLower.includes('jina')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 animate-pulse">处理中</span>;
    if (statusLower.includes('failed')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>;
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">待处理</span>;
};

// --- Article List Manager ---
const ArticleListManager: React.FC<{
    allSources: SystemSource[];
    pointsBySource: Record<string, {data: Subscription[], isLoading: boolean}>;
}> = ({ allSources, pointsBySource: pointsBySourceForFilter }) => {
    const [articles, setArticles] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalArticles, setTotalArticles] = useState(0);
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);

    // Export & Filter state
    const [isExporting, setIsExporting] = useState(false);
    const initialFilters = {
        searchQuery: '',
        similarityThreshold: 0.5,
        selectedSourceNames: [] as string[],
        selectedPointIds: [] as string[],
        startDate: '',
        endDate: '',
    };
    const [filters, setFilters] = useState(initialFilters);
    const [activeFilters, setActiveFilters] = useState(filters);
    const ARTICLES_PER_PAGE = 20;

    const loadArticles = useCallback(async (isNewFilter = false) => {
        const currentPage = isNewFilter ? 1 : page;
        setIsLoading(true);
        setError('');
        
        try {
            let pointIdsToQuery = activeFilters.selectedPointIds;
            if (pointIdsToQuery.length === 0 && activeFilters.selectedSourceNames.length > 0) {
                 pointIdsToQuery = activeFilters.selectedSourceNames.flatMap(name => pointsBySourceForFilter[name]?.data.map(p => p.id) || []);
            }
            if (pointIdsToQuery.length === 0 && activeFilters.selectedSourceNames.length === 0 && allSources.length > 0) {
                 pointIdsToQuery = allSources.flatMap(s => pointsBySourceForFilter[s.name]?.data.map(p => p.id) || []);
            }

            if (activeFilters.searchQuery.trim()) {
                // Use the new, powerful combined search and filter endpoint
                const { items, total, totalPages: newTotalPages } = await searchArticlesFiltered({
                    query_text: activeFilters.searchQuery,
                    similarity_threshold: activeFilters.similarityThreshold,
                    point_ids: pointIdsToQuery.length > 0 ? pointIdsToQuery : undefined,
                    source_names: activeFilters.selectedSourceNames.length > 0 ? activeFilters.selectedSourceNames : undefined,
                    publish_date_start: activeFilters.startDate || undefined,
                    publish_date_end: activeFilters.endDate || undefined,
                    page: currentPage,
                    limit: ARTICLES_PER_PAGE,
                });
                setArticles(items);
                setTotalArticles(total);
                setTotalPages(newTotalPages > 0 ? newTotalPages : 1);
            } else {
                // Use the standard filtering endpoint when there is no search query
                const { items, total, totalPages: newTotalPages } = await getArticles(pointIdsToQuery, { 
                    page: currentPage, 
                    limit: ARTICLES_PER_PAGE,
                    publish_date_start: activeFilters.startDate || undefined,
                    publish_date_end: activeFilters.endDate || undefined
                });
                
                setArticles(items);
                setTotalArticles(total);
                setTotalPages(newTotalPages > 0 ? newTotalPages : 1);
            }
        } catch (err: any) {
            setError(err.message || "无法加载文章");
        } finally {
            setIsLoading(false);
        }
    }, [page, activeFilters, pointsBySourceForFilter, allSources]);

    useEffect(() => {
        if (isNewFilter(activeFilters, initialFilters)) { // Check if it's not the initial empty load
            loadArticles(true); // Always treat active filter change as a new filter
        }
    }, [activeFilters]);
    
    // Helper to avoid initial double-load
    const isNewFilter = (current: typeof initialFilters, initial: typeof initialFilters) => {
        return JSON.stringify(current) !== JSON.stringify(initial);
    }

    useEffect(() => {
        // Initial load on component mount
        loadArticles(true);
    }, []);

    useEffect(() => {
        if(page > 1) { // Only load if page changes after the initial load
             loadArticles(false);
        }
    }, [page]);


    useEffect(() => {
        // When source filter changes, auto-update available points for dependent filter
        const validPointIds = new Set(
            filters.selectedSourceNames.flatMap(name => pointsBySourceForFilter[name]?.data.map(p => p.id) || [])
        );
        const newSelectedPointIds = filters.selectedPointIds.filter(id => validPointIds.has(id));
        if (newSelectedPointIds.length !== filters.selectedPointIds.length) {
            setFilters(prev => ({ ...prev, selectedPointIds: newSelectedPointIds }));
        }
    }, [filters.selectedSourceNames, pointsBySourceForFilter]);

    const handleApplyFilters = () => {
        setPage(1);
        setActiveFilters(filters);
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
        setPage(1);
        setActiveFilters(initialFilters);
    };
    
    const availablePointsForFilter = useMemo(() => {
        if (filters.selectedSourceNames.length === 0) return allSources.flatMap(s => pointsBySourceForFilter[s.name]?.data || []);
        return filters.selectedSourceNames.flatMap(name => pointsBySourceForFilter[name]?.data || []);
    }, [filters.selectedSourceNames, allSources, pointsBySourceForFilter]);

    const handleExport = async () => { /* ... (Export logic remains the same) ... */ };
    
    const MultiSelectDropdown: React.FC<{
        options: {id: string, name: string}[];
        selected: string[];
        onToggle: (id: string) => void;
        placeholder: string;
        disabled?: boolean;
    }> = ({ options, selected, onToggle, placeholder, disabled=false }) => {
        const [isOpen, setIsOpen] = useState(false);
        const ref = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [ref]);
        
        const selectedText = selected.length > 0 ? `${selected.length}项已选` : placeholder;

        return (
            <div className="relative w-full" ref={ref}>
                <button onClick={() => setIsOpen(!isOpen)} disabled={disabled} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md text-left flex justify-between items-center disabled:bg-gray-200 disabled:cursor-not-allowed h-10">
                    <span className={selected.length > 0 ? "text-gray-800" : "text-gray-500"}>{selectedText}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {options.map(option => (
                            <div key={option.id} onClick={() => onToggle(option.id)} className="p-2 hover:bg-gray-100 cursor-pointer flex items-center">
                                <input type="checkbox" readOnly checked={selected.includes(option.id)} className="mr-2 accent-blue-600" />
                                <span>{option.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">已采集文章</h3>
            {error && <p className="text-sm text-red-600 mb-2 p-2 bg-red-50 rounded-md">{error}</p>}
            
            <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <label className="text-xs font-medium text-gray-600">语义搜索</label>
                         <input type="text" value={filters.searchQuery} onChange={e => setFilters(f => ({...f, searchQuery: e.target.value}))} placeholder="例如：特斯拉最新技术动态" className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md h-10" />
                    </div>
                     <div>
                        <label className="text-xs font-medium text-gray-600">相似度阈值: {filters.similarityThreshold.toFixed(2)}</label>
                         <input type="range" min="0" max="1" step="0.05" value={filters.similarityThreshold} onChange={e => setFilters(f => ({...f, similarityThreshold: parseFloat(e.target.value)}))} className="w-full mt-1 h-10 accent-blue-600" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div>
                        <label className="text-xs font-medium text-gray-600">情报源</label>
                        <MultiSelectDropdown 
                            options={allSources.map(s => ({id: s.name, name: s.name}))}
                            selected={filters.selectedSourceNames}
                            onToggle={(sourceName) => setFilters(f => ({...f, selectedSourceNames: f.selectedSourceNames.includes(sourceName) ? f.selectedSourceNames.filter(s => s !== sourceName) : [...f.selectedSourceNames, sourceName]}))}
                            placeholder="所有情报源"
                        />
                    </div>
                     <div>
                        <label className="text-xs font-medium text-gray-600">情报点</label>
                        <MultiSelectDropdown 
                            options={availablePointsForFilter.map(p => ({id: p.id, name: `${p.source_name} - ${p.point_name}`}))}
                            selected={filters.selectedPointIds}
                            onToggle={(pointId) => setFilters(f => ({...f, selectedPointIds: f.selectedPointIds.includes(pointId) ? f.selectedPointIds.filter(p => p !== pointId) : [...f.selectedPointIds, pointId]}))}
                            placeholder="所有情报点"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600">发布开始日期</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md h-10" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600">发布结束日期</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md h-10" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center gap-2 pt-4 border-t mt-4">
                    <button onClick={handleClearFilters} className="h-10 px-4 py-2 bg-white border text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100">清空筛选</button>
                    <button onClick={handleApplyFilters} disabled={isLoading} className="h-10 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 flex items-center justify-center disabled:bg-blue-300">
                        {isLoading ? <Spinner className="h-4 w-4 text-white" /> : '筛选'}
                    </button>
                    <button onClick={handleExport} disabled={isExporting} className="h-10 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center">
                       {isExporting ? <Spinner className="h-4 w-4 text-white" /> : '导出CSV'}
                    </button>
                </div>
            </div>

             <div className="text-sm text-gray-600 mb-4 font-semibold">
                找到 {totalArticles} 条相关文章
            </div>

            <div className="space-y-3">
                {isLoading && <div className="text-center py-8"><Spinner /></div>}
                {!isLoading && articles.length === 0 && <div className="text-center py-8 text-gray-500">无匹配的文章</div>}
                
                {articles.map((article) => (
                    <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="p-4 border rounded-lg hover:shadow-md hover:border-blue-300 cursor-pointer transition relative"
                    >
                        {article.similarity_score != null && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold text-blue-800 bg-blue-100 rounded-full">
                               相似度: {article.similarity_score.toFixed(3)}
                            </div>
                        )}
                        <div className="flex justify-between items-start">
                             <a href={article.original_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-gray-800 hover:text-blue-600 hover:underline pr-24">{article.title}</a>
                             <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'})}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                           <span className="px-2 py-0.5 font-medium text-gray-700 bg-gray-100 rounded-full">{article.source_name}</span>
                           <span className="px-2 py-0.5 font-medium text-blue-700 bg-blue-100 rounded-full">{article.point_name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{article.content}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-600">共 {totalArticles} 条记录</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPage(1)} disabled={page === 1 || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">首页</button>
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1 || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
                    <span className="text-sm font-semibold">第 {page} / {totalPages} 页</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
                    <button onClick={() => setPage(totalPages)} disabled={page >= totalPages || isLoading} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">尾页</button>
                </div>
            </div>


            {selectedArticle && <InfoDetailModal item={selectedArticle} onClose={() => setSelectedArticle(null)} />}
        </div>
    );
};


// --- Intelligence Management Module ---
const IntelligenceManager: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'articles'>('tasks');

    const [sources, setSources] = useState<SystemSource[]>([]);
    const [pointsBySource, setPointsBySource] = useState<Record<string, {data: Subscription[], isLoading: boolean}>>({});
    const [tasks, setTasks] = useState<ProcessingTask[]>([]);
    const [taskStats, setTaskStats] = useState<{[key: string]: number} | null>(null);
    const [openSources, setOpenSources] = useState<Set<string>>(new Set());

    const [isLoading, setIsLoading] = useState({ sources: true, tasks: true, stats: true, points: false, mutation: false });
    const [error, setError] = useState({ sources: '', tasks: '', stats: '', points: '' });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isPointsSectionCollapsed, setIsPointsSectionCollapsed] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const TASKS_PER_PAGE = 20;

    const [statusFilter, setStatusFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [pointFilter, setPointFilter] = useState('');
    
    const fetchSourcesAndPoints = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, sources: true }));
        setError(prev => ({...prev, sources: ''}));
        try {
            const allSources = await getSources();
            setSources(allSources);
             // Pre-fetch all points for all sources for filtering purposes
            const pointsPromises = allSources.map(s => getPointsBySourceName(s.name).catch(e => {
                console.error(`Failed to fetch points for ${s.name}:`, e);
                return []; // Return empty array on failure for a specific source
            }));
            const pointsResults = await Promise.all(pointsPromises);
            const newPointsBySource = allSources.reduce((acc, source, index) => {
                acc[source.name] = { data: pointsResults[index], isLoading: false };
                return acc;
            }, {} as Record<string, {data: Subscription[], isLoading: boolean}>);
            setPointsBySource(newPointsBySource);
        } catch (err: any) {
            setError(prev => ({...prev, sources: "无法加载情报源: " + err.message }));
        } finally {
            setIsLoading(prev => ({...prev, sources: false}));
        }
    }, []);

    const fetchStats = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, stats: true }));
        setError(prev => ({ ...prev, stats: ''}));
        try {
            const statsData = await getProcessingTasksStats();
            setTaskStats(statsData);
        } catch (err: any) {
             setError(prev => ({ ...prev, stats: "无法加载任务统计: " + err.message }));
        } finally {
            setIsLoading(prev => ({...prev, stats: false }));
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, tasks: true }));
        setError(prev => ({ ...prev, tasks: ''}));
        try {
            const params: any = { page: currentPage, limit: TASKS_PER_PAGE };
            if (statusFilter) params.status = statusFilter;
            if (sourceFilter) params.source_name = sourceFilter;
            if (pointFilter) params.point_name = pointFilter;
            
            const { tasks: apiTasks, totalPages: apiTotalPages, total } = await getProcessingTasks(params);
            setTasks(apiTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setTotalPages(apiTotalPages > 0 ? apiTotalPages : 1);
            setTotalTasks(total);
        } catch (err: any) {
            setError(prev => ({ ...prev, tasks: err.message || '无法加载任务队列' }));
        } finally {
            setIsLoading(prev => ({ ...prev, tasks: false }));
        }
    }, [currentPage, statusFilter, sourceFilter, pointFilter]);
    
    useEffect(() => {
        fetchSourcesAndPoints();
    }, [fetchSourcesAndPoints]);

    useEffect(() => {
        if(activeSubTab === 'tasks') {
            fetchStats();
            fetchTasks();
        }
    }, [activeSubTab, fetchStats, fetchTasks]);

    const handleSaveNewPoint = async (newPointData: Omit<Subscription, 'id'|'keywords'|'newItemsCount'|'is_active'|'last_triggered_at'|'created_at'|'updated_at'|'source_id'>) => {
        setIsLoading(prev => ({ ...prev, mutation: true }));
        try {
            await addPoint(newPointData);
            await fetchSourcesAndPoints(); 
            setIsAddModalOpen(false);
        } catch (err: any) {
            setError(prev => ({ ...prev, points: '添加失败: ' + err.message }));
        } finally {
             setIsLoading(prev => ({ ...prev, mutation: false }));
        }
    };
    
    const handleDeleteSelected = async () => {
        setIsLoading(prev => ({ ...prev, mutation: true }));
        try {
            await deletePoints(Array.from(selectedPointIds));
            await fetchSourcesAndPoints(); // Refetch sources and their points
            setOpenSources(new Set());
            setSelectedPointIds(new Set());
            setIsDeleteConfirmOpen(false);
        } catch (err: any) {
             setError(prev => ({ ...prev, points: '删除失败: ' + err.message }));
        } finally {
            setIsLoading(prev => ({ ...prev, mutation: false }));
        }
    };

    const handleSelectPoint = (id: string) => {
        const newSelection = new Set(selectedPointIds);
        newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        setSelectedPointIds(newSelection);
    };
    
    const handleSelectSource = (sourceName: string, checked: boolean) => {
        const newSelection = new Set(selectedPointIds);
        const sourcePoints = pointsBySource[sourceName]?.data || [];
        const sourcePointIds = Array.isArray(sourcePoints) ? sourcePoints.map(p => p.id) : [];
        if (checked) {
            sourcePointIds.forEach(id => newSelection.add(id));
        } else {
            sourcePointIds.forEach(id => newSelection.delete(id));
        }
        setSelectedPointIds(newSelection);
    };

    const toggleSource = async (sourceName: string) => {
        const newOpenSources = new Set(openSources);
        if (newOpenSources.has(sourceName)) {
            newOpenSources.delete(sourceName);
        } else {
            newOpenSources.add(sourceName);
        }
        setOpenSources(newOpenSources);
    };

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentPage(1);
        setter(e.target.value);
    };

    const uniqueSourcesForFilter = useMemo(() => sources.map(s => s.name), [sources]);
    const availablePointsForFilter = useMemo(() => {
        if (!sourceFilter) return [];
        return Array.from(new Set(Object.values(pointsBySource).flatMap(p => p.data).filter(p => p.source_name === sourceFilter).map(p => p.point_name)));
    }, [pointsBySource, sourceFilter]);

    const taskStatusOptions = ['pending_jina', 'completed', 'failed', 'processing'];
    const allStatKeys = ['total', 'completed', 'pending_jina', 'processing', 'failed'];
    const statusColors: { [key: string]: string } = {
        completed: 'border-green-300 bg-green-50', failed: 'border-red-300 bg-red-50',
        processing: 'border-blue-300 bg-blue-50', pending_jina: 'border-yellow-300 bg-yellow-50',
        total: 'border-gray-300 bg-gray-100',
    };

    const TabButton: React.FC<{ tabKey: 'tasks' | 'articles'; label: string }> = ({ tabKey, label }) => (
        <button
            onClick={() => setActiveSubTab(tabKey)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSubTab === tabKey
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );
    
    return (
        <div className="space-y-6">
            <div className="flex space-x-2 border-b border-gray-200 pb-2">
                <TabButton tabKey="tasks" label="采集任务队列" />
                <TabButton tabKey="articles" label="已采集文章" />
            </div>

            {activeSubTab === 'tasks' && (
                <div className="animate-in fade-in-0 duration-300">
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPointsSectionCollapsed(prev => !prev)}>
                             <h3 className="text-lg font-bold text-gray-800">情报点管理</h3>
                             <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isPointsSectionCollapsed ? '' : 'rotate-180'}`} />
                        </div>

                        {!isPointsSectionCollapsed && (
                            <div className="mt-4 animate-in fade-in-0 duration-300">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                                    <p className="text-sm text-gray-500">管理系统的所有自动情报采集点。</p>
                                    <div className="flex items-center space-x-2 self-end sm:self-center">
                                        {selectedPointIds.size > 0 && (
                                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 transition">
                                                <TrashIcon className="w-4 h-4" /> <span>删除 ({selectedPointIds.size})</span>
                                            </button>
                                        )}
                                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                                            <PlusIcon className="w-4 h-4" /> <span>添加</span>
                                        </button>
                                    </div>
                                </div>
                                {error.points && <p className="text-sm text-red-600 mb-2">{error.points}</p>}
                                
                                <div className="border rounded-lg overflow-hidden">
                                     {isLoading.sources ? <div className="text-center py-8"><Spinner /></div> : 
                                     sources.map(({ name: sourceName, points_count }) => {
                                        const isOpen = openSources.has(sourceName);
                                        const sourcePointsData = pointsBySource[sourceName];
                                        const safeSourcePoints = sourcePointsData?.data || [];
                                        const isSourceSelected = safeSourcePoints.length > 0 && safeSourcePoints.every(p => selectedPointIds.has(p.id));
                                        return (
                                            <div key={sourceName} className="border-t">
                                                <div className="flex items-center p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleSource(sourceName)}>
                                                    <input type="checkbox" className="mr-4 accent-blue-600" checked={isSourceSelected} onChange={(e) => handleSelectSource(sourceName, e.target.checked)} onClick={e => e.stopPropagation()} disabled={!sourcePointsData} />
                                                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 mr-2 ${isOpen ? 'rotate-180' : ''}`} />
                                                    <h4 className="font-semibold text-gray-800">{sourceName}</h4>
                                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">{points_count}</span>
                                                    {sourcePointsData?.isLoading && <div className="ml-2"><Spinner /></div>}
                                                </div>
                                                {isOpen && (
                                                    <div className="bg-white">
                                                        {sourcePointsData?.isLoading ? <div className="text-center py-4"><Spinner/></div> : 
                                                        safeSourcePoints.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm text-left text-gray-600">
                                                                <tbody>
                                                                    {safeSourcePoints.map(point => (
                                                                    <tr key={point.id} className="border-t hover:bg-gray-50">
                                                                        <td className="p-4 w-12 text-center"><input type="checkbox" className="accent-blue-600" onChange={() => handleSelectPoint(point.id)} checked={selectedPointIds.has(point.id)} /></td>
                                                                        <td className="px-4 py-3">{point.point_name}</td>
                                                                        <td className="px-4 py-3 max-w-xs truncate"><a href={point.point_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{point.point_url}</a></td>
                                                                        <td className="px-4 py-3 text-xs">{formatCron(point.cron_schedule)}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${point.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{point.is_active ? '采集中' : '未知'}</span>
                                                                        </td>
                                                                    </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        ) : <div className="p-4 text-center text-gray-500 text-sm">此情报源下无情报点</div>}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                     })}
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">任务队列实时状态</h3>
                        {error.tasks && <p className="text-sm text-red-600 mb-2">{error.tasks}</p>}
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                            {isLoading.stats ? <div className="col-span-full text-center p-4"><Spinner /></div> : 
                             allStatKeys.map(key =>(
                                <div key={key} className={`p-4 rounded-lg border ${statusColors[key] || 'bg-gray-50'}`}>
                                    <p className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                                    <p className="text-2xl font-bold text-gray-800">{(taskStats && taskStats[key]) ?? 0}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600">状态</label>
                                <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">所有状态</option>
                                    {taskStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                                </select>
                            </div>
                             <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600">情报源</label>
                                <select value={sourceFilter} onChange={handleFilterChange(setSourceFilter)} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">所有情报源</option>
                                    {uniqueSourcesForFilter.map(source => <option key={source} value={source}>{source}</option>)}
                                </select>
                            </div>
                             <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600">情报点</label>
                                <select value={pointFilter} onChange={handleFilterChange(setPointFilter)} disabled={!sourceFilter} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200">
                                    <option value="">所有情报点</option>
                                    {availablePointsForFilter.map(point => <option key={point} value={point}>{point}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                     <tr>
                                        <th className="px-4 py-3">情报源/点</th>
                                        <th className="px-4 py-3">URL</th>
                                        <th className="px-4 py-3">状态</th>
                                        <th className="px-4 py-3">创建时间 (北京)</th>
                                        <th className="px-4 py-3">最后更新 (北京)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                   {isLoading.tasks ? (
                                        <tr><td colSpan={5} className="text-center py-8"><Spinner /></td></tr>
                                    ) : tasks.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">无匹配的任务</td></tr>
                                    ) : tasks.map(task => (
                                        <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium"><p>{task.source_name}</p><p className="text-xs text-gray-500">{task.point_name}</p></td>
                                            <td className="px-4 py-3 font-mono text-xs max-w-xs truncate" title={task.url}>{task.url}</td>
                                            <td className="px-4 py-3">{getStatusChip(task.status)}</td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap">{formatToBeijingTime(task.created_at)}</td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap">{formatToBeijingTime(task.updated_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                         <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                            <span className="text-sm text-gray-600">共 {totalTasks} 条记录</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || isLoading.tasks} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">首页</button>
                                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || isLoading.tasks} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
                                <span className="text-sm font-semibold">第 {currentPage} / {totalPages} 页</span>
                                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages || isLoading.tasks} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
                                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages || isLoading.tasks} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">尾页</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {activeSubTab === 'articles' && !isLoading.sources && (
                <div className="animate-in fade-in-0 duration-300">
                    <ArticleListManager allSources={sources} pointsBySource={pointsBySource} />
                </div>
            )}
            
            {isAddModalOpen && <AddSubscriptionModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveNewPoint} isLoading={isLoading.mutation} />}
            {isDeleteConfirmOpen && (
                <ConfirmationModal
                    title="确认删除"
                    message={`您确定要删除选中的 ${selectedPointIds.size} 个情报点吗？此操作无法撤销。`}
                    onConfirm={handleDeleteSelected}
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                    isLoading={isLoading.mutation}
                />
            )}
        </div>
    );
};

// --- Placeholder for other modules ---
const PlaceholderManager: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center justify-center h-full bg-white rounded-xl border border-dashed">
        <p className="text-gray-500">{title} 模块正在开发中...</p>
    </div>
);


// --- Main Admin Page Component ---
export const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminView>('intelligence');
    
    const navItems: { key: AdminView; label: string; icon: React.FC<any> }[] = [
        { key: 'intelligence', label: '情报管理', icon: LightBulbIcon },
        { key: 'users', label: '用户管理', icon: UsersIcon },
        { key: 'dives', label: '深度洞察', icon: DiveIcon },
        { key: 'events', label: '事件管理', icon: VideoCameraIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'intelligence':
                return <IntelligenceManager />;
            case 'users':
                return <PlaceholderManager title="用户管理" />;
            case 'dives':
                return <PlaceholderManager title="深度洞察管理" />;
            case 'events':
                return <PlaceholderManager title="事件管理" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full bg-gray-100">
            {/* Sidebar Navigation */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">管理中心</h2>
                <nav className="flex flex-col space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setActiveTab(item.key)}
                            className={`flex items-center space-x-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                                activeTab === item.key
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Navigation */}
                <div className="md:hidden p-4 border-b bg-white">
                    <label htmlFor="admin-nav" className="sr-only">选择管理模块</label>
                    <select
                        id="admin-nav"
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value as AdminView)}
                        className="w-full p-2.5 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {navItems.map(item => (
                            <option key={item.key} value={item.key}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
                 <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};