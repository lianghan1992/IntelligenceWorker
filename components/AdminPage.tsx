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
  searchArticlesFiltered,
} from '../api';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { InfoDetailModal } from './InfoDetailModal';
import { UserManager } from './UserManager'; // Import the new component
import { PlusIcon, TrashIcon, LightBulbIcon, UsersIcon, DiveIcon, VideoCameraIcon, ChevronDownIcon, CloseIcon } from './icons';

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

const formatToBeijingTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
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

const DateRangePicker: React.FC<{
    value: { startDate: string; endDate: string };
    onChange: (value: { startDate: string; endDate: string }) => void;
}> = ({ value, onChange }) => {
    const { startDate, endDate } = value;
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(startDate ? new Date(startDate) : new Date());
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const formatDate = (date: Date | null) => date ? date.toISOString().split('T')[0] : '';
    
    const handleDateClick = (day: Date) => {
        if (!start || (start && end)) {
            onChange({ startDate: formatDate(day), endDate: '' });
        } else if (start && !end) {
            if (day < start) {
                onChange({ startDate: formatDate(day), endDate: formatDate(start) });
            } else {
                onChange({ startDate: formatDate(start), endDate: formatDate(day) });
            }
            setIsOpen(false);
        }
    };

    const generateMonthGrid = (date: Date) => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();

        const grid: (Date | null)[] = [];
        for (let i = 0; i < startDayOfWeek; i++) grid.push(null);
        for (let i = 1; i <= daysInMonth; i++) grid.push(new Date(year, month, i));
        while (grid.length % 7 !== 0) grid.push(null);
        return grid;
    };
    
    const isSameDay = (d1: Date | null, d2: Date | null) => d1 && d2 && d1.toDateString() === d2.toDateString();
    
    const renderMonth = (dateToRender: Date, isPrimary: boolean) => {
        const grid = generateMonthGrid(dateToRender);
        const monthName = dateToRender.toLocaleString('zh-CN', { month: 'long', year: 'numeric' });
        
        const changeMonth = (amount: number) => {
            setViewDate(d => new Date(d.getFullYear(), d.getMonth() + amount, 1));
        };
        
        return (
            <div className="p-2">
                <div className="flex justify-between items-center mb-2 px-2">
                     <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full">{'<'}</button>
                    <span className="text-center font-semibold">{monthName}</span>
                     <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full">{'>'}</button>
                </div>
                <div className="grid grid-cols-7 text-xs text-center text-gray-500 mb-1">
                    {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="w-8 h-8 flex items-center justify-center">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {grid.map((day, i) => {
                        if (!day) return <div key={i} className="w-8 h-8"></div>;

                        const isSelectedStart = isSameDay(day, start);
                        const isSelectedEnd = isSameDay(day, end);
                        const isInRange = start && end && day > start && day < end;
                        const isHoverInRange = start && !end && hoverDate && day > start && day <= hoverDate;

                        const getRangeClasses = () => {
                            if (isSelectedStart && isSelectedEnd) return 'rounded-full';
                            if (isSelectedStart) return 'rounded-l-full';
                            if (isSelectedEnd) return 'rounded-r-full';
                            if (isInRange || isHoverInRange) return 'rounded-none';
                            return 'rounded-full';
                        };

                        return (
                             <button
                                key={i}
                                onClick={() => handleDateClick(day)}
                                onMouseEnter={() => setHoverDate(day)}
                                onMouseLeave={() => setHoverDate(null)}
                                className={`w-8 h-8 text-sm transition-colors relative flex items-center justify-center
                                    ${(isInRange || isHoverInRange) ? 'bg-blue-100 text-blue-800' : ''}
                                    ${(isSelectedStart || isSelectedEnd) ? 'bg-blue-600 text-white font-bold' : ''}
                                    ${!isSelectedStart && !isSelectedEnd && !(isInRange || isHoverInRange) ? 'hover:bg-gray-200' : ''}
                                    ${getRangeClasses()}
                                `}
                            >
                                 <span className="relative z-10">{day.getDate()}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    const displayValue = startDate && endDate ? `${startDate} - ${endDate}` : startDate ? `${startDate} - 结束日期` : '开始日期 - 结束日期';

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full h-10 mt-1 p-2 bg-white border border-gray-300 rounded-lg text-left flex justify-between items-center cursor-pointer">
                 <span className={startDate ? "text-gray-800" : "text-gray-400"}>{displayValue}</span>
                 { (startDate || endDate) && <CloseIcon onClick={(e) => { e.stopPropagation(); onChange({ startDate: '', endDate: '' }); }} className="w-4 h-4 text-gray-500 hover:text-red-600" />}
            </div>
            {isOpen && (
                <div className="absolute z-30 top-full mt-2 bg-white border rounded-lg shadow-xl p-2 flex">
                    {renderMonth(viewDate, true)}
                    {renderMonth(nextMonth, false)}
                </div>
            )}
        </div>
    );
};

const ArticleListManager: React.FC<{
    allSources: SystemSource[];
    pointsBySource: Record<string, Subscription[]>;
}> = ({ allSources, pointsBySource: pointsBySourceForFilter }) => {
    const [articles, setArticles] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalArticles, setTotalArticles] = useState(0);
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const initialFilters = {
        searchQuery: '',
        similarityThreshold: 0.50,
        selectedSourceNames: [] as string[],
        selectedPointIds: [] as string[],
        dateRange: { startDate: '', endDate: '' },
    };
    const [filters, setFilters] = useState(initialFilters);
    const [activeFilters, setActiveFilters] = useState(initialFilters);
    const ARTICLES_PER_PAGE = 20;

    const loadArticles = useCallback(async (isNewFilter = false) => {
        const currentPage = isNewFilter ? 1 : page;
        if (isNewFilter) setPage(1);
    
        setIsLoading(true);
        setError('');
        
        try {
            const allPointIds = Array.from(new Set(allSources.flatMap(s => (pointsBySourceForFilter[s.name] || []).map(p => p.id))));
            let pointIdsToQuery: string[] = activeFilters.selectedPointIds;

            // If no points selected, but sources are, get all points from those sources
            if (pointIdsToQuery.length === 0 && activeFilters.selectedSourceNames.length > 0) {
                pointIdsToQuery = activeFilters.selectedSourceNames.flatMap(name => (pointsBySourceForFilter[name] || []).map(p => p.id));
            }
            // If no sources selected either, query all available points
            if (pointIdsToQuery.length === 0) {
                 pointIdsToQuery = allPointIds;
            }

            if (activeFilters.searchQuery.trim()) {
                const { items, total, totalPages: newTotalPages } = await searchArticlesFiltered({
                    query_text: activeFilters.searchQuery,
                    similarity_threshold: activeFilters.similarityThreshold,
                    point_ids: pointIdsToQuery.length > 0 ? pointIdsToQuery : undefined,
                    publish_date_start: activeFilters.dateRange.startDate || undefined,
                    publish_date_end: activeFilters.dateRange.endDate || undefined,
                    page: currentPage,
                    limit: ARTICLES_PER_PAGE,
                });
                setArticles(items);
                setTotalArticles(total);
                setTotalPages(newTotalPages > 0 ? newTotalPages : 1);
            } else {
                 const { items, total, totalPages: newTotalPages } = await getArticles(pointIdsToQuery, { 
                    page: currentPage, 
                    limit: ARTICLES_PER_PAGE,
                    publish_date_start: activeFilters.dateRange.startDate || undefined,
                    publish_date_end: activeFilters.dateRange.endDate || undefined
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
        loadArticles(true);
    }, [activeFilters]);

    useEffect(() => {
        const isInitialMount = page === 1 && articles.length === 0 && !isLoading;
        if (!isInitialMount) {
            loadArticles(false);
        }
    }, [page]);

    useEffect(() => {
        const validPointIds = new Set(
            filters.selectedSourceNames.flatMap(name => (pointsBySourceForFilter[name] || []).map(p => p.id))
        );
        const newSelectedPointIds = filters.selectedPointIds.filter(id => validPointIds.has(id));
        if (newSelectedPointIds.length !== filters.selectedPointIds.length) {
            setFilters(prev => ({ ...prev, selectedPointIds: newSelectedPointIds }));
        }
    }, [filters.selectedSourceNames, pointsBySourceForFilter, filters.selectedPointIds]);

    const handleApplyFilters = () => setActiveFilters(filters);
    const handleClearFilters = () => { setFilters(initialFilters); setActiveFilters(initialFilters); };
    
    const availablePointsForFilter = useMemo(() => {
        if (filters.selectedSourceNames.length === 0) return [];
        return filters.selectedSourceNames.flatMap(name => pointsBySourceForFilter[name] || []);
    }, [filters.selectedSourceNames, pointsBySourceForFilter]);

    const handleExport = async () => { /* ... */ };
    
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
                <button onClick={() => setIsOpen(!isOpen)} disabled={disabled} className="w-full h-10 mt-1 p-2 bg-white border border-gray-300 rounded-lg text-left flex justify-between items-center disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <span className={selected.length > 0 ? "text-gray-800" : "text-gray-400"}>{selectedText}</span>
                    <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
        <div className="mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">已采集文章</h3>
            {error && <p className="text-sm text-red-600 mb-2 p-2 bg-red-50 rounded-md">{error}</p>}
            
            <div className="bg-gray-50/70 backdrop-blur-sm p-5 rounded-xl border flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-grow w-full">
                        <label className="text-xs font-medium text-gray-500">语义搜索</label>
                        <input type="text" value={filters.searchQuery} onChange={e => setFilters(f => ({...f, searchQuery: e.target.value}))} placeholder="例如：特斯拉最新技术动态" className="w-full mt-1 p-2 h-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="w-full md:w-72 flex-shrink-0">
                        <label className="text-xs font-medium text-gray-500">相似度阈值: {filters.similarityThreshold.toFixed(2)}</label>
                        <input type="range" min="0" max="1" step="0.05" value={filters.similarityThreshold} onChange={e => setFilters(f => ({...f, similarityThreshold: parseFloat(e.target.value)}))} className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-xs font-medium text-gray-500">情报源</label>
                        <MultiSelectDropdown 
                            options={allSources.map(s => ({id: s.name, name: s.name}))}
                            selected={filters.selectedSourceNames}
                            onToggle={(sourceName) => setFilters(f => ({...f, selectedSourceNames: f.selectedSourceNames.includes(sourceName) ? f.selectedSourceNames.filter(s => s !== sourceName) : [...f.selectedSourceNames, sourceName]}))}
                            placeholder="所有情报源"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">情报点</label>
                        <MultiSelectDropdown 
                            options={availablePointsForFilter.map(p => ({id: p.id, name: p.point_name}))}
                            selected={filters.selectedPointIds}
                            onToggle={(pointId) => setFilters(f => ({...f, selectedPointIds: f.selectedPointIds.includes(pointId) ? f.selectedPointIds.filter(p => p !== pointId) : [...f.selectedPointIds, pointId]}))}
                            placeholder={filters.selectedSourceNames.length === 0 ? "请先选择情报源" : "所有情报点"}
                            disabled={filters.selectedSourceNames.length === 0}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">发布日期范围</label>
                        <DateRangePicker 
                           value={filters.dateRange}
                           onChange={(dateRange) => setFilters(f => ({...f, dateRange }))}
                        />
                    </div>
                </div>
                 <div className="flex justify-end items-center gap-2 pt-3 border-t border-gray-200/80 mt-2">
                    <button onClick={handleClearFilters} className="h-9 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-semibold text-sm hover:bg-gray-100 transition-colors">清空筛选</button>
                    <button onClick={handleApplyFilters} disabled={isLoading} className="h-9 px-5 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 flex items-center justify-center disabled:bg-blue-300">
                        {isLoading ? <Spinner className="h-4 w-4 text-white" /> : '筛选'}
                    </button>
                    <button onClick={handleExport} disabled={isExporting} className="h-9 px-5 py-2 bg-emerald-500 text-white rounded-md font-semibold text-sm hover:bg-emerald-600 disabled:bg-emerald-300 flex items-center justify-center">
                       {isExporting ? <Spinner className="h-4 w-4 text-white" /> : '导出CSV'}
                    </button>
                </div>
            </div>

            <div className="text-sm text-gray-600 mb-4 font-semibold">
                找到 {totalArticles.toLocaleString()} 条相关文章
            </div>

            <div className="overflow-x-auto border rounded-lg bg-white">
                 <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50/50">
                        <tr>
                            <th className="px-4 py-3">标题</th>
                            <th className="px-4 py-3">情报源</th>
                            <th className="px-4 py-3">情报点</th>
                            <th className="px-4 py-3">发布日期</th>
                            <th className="px-4 py-3">相似度</th>
                            <th className="px-4 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={6} className="text-center py-8"><Spinner /></td></tr>}
                        {!isLoading && articles.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">无匹配的文章</td></tr>}
                        
                        {articles.map((article) => (
                            <tr key={article.id} className="bg-white border-b hover:bg-gray-50/50 last:border-b-0">
                                <td className="px-4 py-3 font-semibold max-w-sm xl:max-w-md">
                                    <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-blue-600 hover:underline line-clamp-2" title={article.title}>{article.title}</a>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{article.source_name}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{article.point_name}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN', {timeZone: 'Asia/Shanghai'})}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {article.similarity_score != null && (
                                        <span className="px-2 py-0.5 font-bold text-blue-800 bg-blue-100 rounded-full text-xs">
                                           {article.similarity_score.toFixed(3)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <button onClick={() => setSelectedArticle(article)} className="font-semibold text-blue-600 hover:underline">查看内容</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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


const IntelligenceManager: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'articles'>('tasks');
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [pointsBySource, setPointsBySource] = useState<Record<string, Subscription[]>>({});
    const [tasks, setTasks] = useState<ProcessingTask[]>([]);
    const [taskStats, setTaskStats] = useState<{[key: string]: number} | null>(null);
    const [openSources, setOpenSources] = useState<Set<string>>(new Set());
    
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isMutationLoading, setIsMutationLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isPointsSectionCollapsed, setIsPointsSectionCollapsed] = useState(true);

    // Task list specific states
    const [taskPage, setTaskPage] = useState(1);
    const [taskTotalPages, setTaskTotalPages] = useState(1);
    const [taskTotal, setTaskTotal] = useState(0);
    const TASKS_PER_PAGE = 20;
    const [statusFilter, setStatusFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [pointFilter, setPointFilter] = useState('');

    const loadInitialData = useCallback(async () => {
        setIsLoadingData(true);
        setError(null);
        try {
            // Step 1: Get all sources
            const allSources = await getSources();
            setSources(allSources);
    
            // Step 2: Get all points for all sources sequentially for robustness against concurrency issues.
            const pointsMap: Record<string, Subscription[]> = {};
            const failedSources: string[] = [];
    
            for (const source of allSources) {
                try {
                    const points = await getPointsBySourceName(source.name);
                    pointsMap[source.name] = points;
                } catch (err) {
                    console.error(`Failed to load points for source "${source.name}":`, err);
                    pointsMap[source.name] = []; // Ensure key exists with empty array on error
                    failedSources.push(source.name);
                }
            }
    
            setPointsBySource(pointsMap);
    
            if (failedSources.length > 0) {
                setError(`无法加载以下情报源的数据点: ${failedSources.join(', ')}。请联系管理员检查后端服务。`);
            }
    
        } catch (err: any) {
            setError(err.message || "无法加载情报管理模块的核心数据，请刷新页面重试。");
            console.error("Critical data loading failure:", err);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const fetchTasksAndStats = useCallback(async () => {
        try {
            const params: any = { page: taskPage, limit: TASKS_PER_PAGE };
            if (statusFilter) params.status = statusFilter;
            if (sourceFilter) params.source_name = sourceFilter;
            if (pointFilter) params.point_name = pointFilter;
            
            const [statsData, tasksData] = await Promise.all([
                getProcessingTasksStats(),
                getProcessingTasks(params)
            ]);
            
            setTaskStats(statsData);
            setTasks(tasksData.tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setTaskTotalPages(tasksData.totalPages > 0 ? tasksData.totalPages : 1);
            setTaskTotal(tasksData.total);
        } catch (err: any) {
            setError(prev => prev ? `${prev}\n无法加载任务数据: ${err.message}` : `无法加载任务数据: ${err.message}`);
        }
    }, [taskPage, statusFilter, sourceFilter, pointFilter]);
    
    useEffect(() => {
        if (activeSubTab === 'tasks' && !isLoadingData) {
            fetchTasksAndStats();
        }
    }, [activeSubTab, isLoadingData, fetchTasksAndStats]);

    const handleSaveNewPoint = async (newPointData: Omit<Subscription, 'id'|'keywords'|'newItemsCount'|'is_active'|'last_triggered_at'|'created_at'|'updated_at'|'source_id'>) => {
        setIsMutationLoading(true);
        try {
            await addPoint(newPointData);
            await loadInitialData(); 
            setIsAddModalOpen(false);
        } catch (err: any) {
            setError('添加失败: ' + err.message);
        } finally {
            setIsMutationLoading(false);
        }
    };
    
    const handleDeleteSelected = async () => {
        setIsMutationLoading(true);
        try {
            await deletePoints(Array.from(selectedPointIds));
            await loadInitialData();
            setOpenSources(new Set());
            setSelectedPointIds(new Set());
            setIsDeleteConfirmOpen(false);
        } catch (err: any) {
            setError('删除失败: ' + err.message);
        } finally {
            setIsMutationLoading(false);
        }
    };

    const handleSelectPoint = (id: string) => {
        const newSelection = new Set(selectedPointIds);
        newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        setSelectedPointIds(newSelection);
    };
    
    const handleSelectSource = (sourceName: string, checked: boolean) => {
        const newSelection = new Set(selectedPointIds);
        const sourcePoints = pointsBySource[sourceName] || [];
        const sourcePointIds = Array.isArray(sourcePoints) ? sourcePoints.map(p => p.id) : [];
        if (checked) {
            sourcePointIds.forEach(id => newSelection.add(id));
        } else {
            sourcePointIds.forEach(id => newSelection.delete(id));
        }
        setSelectedPointIds(newSelection);
    };

    const toggleSource = (sourceName: string) => {
        const newOpenSources = new Set(openSources);
        newOpenSources.has(sourceName) ? newOpenSources.delete(sourceName) : newOpenSources.add(sourceName);
        setOpenSources(newOpenSources);
    };

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTaskPage(1);
        setter(e.target.value);
    };

    const uniqueSourcesForFilter = useMemo(() => sources.map(s => s.name), [sources]);
    const availablePointsForFilter = useMemo(() => {
        if (!sourceFilter) return [];
        return Array.from(new Set((pointsBySource[sourceFilter] || []).map(p => p.point_name)));
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

            {error && <div className="p-4 bg-red-100 text-red-700 rounded-md whitespace-pre-wrap">{error}</div>}

            {isLoadingData && <div className="text-center p-8"><Spinner /> 正在加载情报管理模块...</div>}

            {!isLoadingData && activeSubTab === 'tasks' && (
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
                                
                                <div className="border rounded-lg overflow-hidden">
                                     {sources.map(({ name: sourceName, points_count }) => {
                                        const isOpen = openSources.has(sourceName);
                                        const safeSourcePoints = pointsBySource[sourceName] || [];
                                        const isSourceSelected = safeSourcePoints.length > 0 && safeSourcePoints.every(p => selectedPointIds.has(p.id));
                                        return (
                                            <div key={sourceName} className="border-t first:border-t-0">
                                                <div className="flex items-center p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleSource(sourceName)}>
                                                    <input type="checkbox" className="mr-4 accent-blue-600" checked={isSourceSelected} onChange={(e) => handleSelectSource(sourceName, e.target.checked)} onClick={e => e.stopPropagation()} />
                                                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 mr-2 ${isOpen ? 'rotate-180' : ''}`} />
                                                    <h4 className="font-semibold text-gray-800">{sourceName}</h4>
                                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">{points_count}</span>
                                                </div>
                                                {isOpen && (
                                                    <div className="bg-white">
                                                        {safeSourcePoints.length > 0 ? (
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                            {allStatKeys.map(key =>(
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
                                   {tasks.length === 0 ? (
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
                            <span className="text-sm text-gray-600">共 {taskTotal} 条记录</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setTaskPage(1)} disabled={taskPage === 1} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">首页</button>
                                <button onClick={() => setTaskPage(p => p - 1)} disabled={taskPage === 1} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
                                <span className="text-sm font-semibold">第 {taskPage} / {taskTotalPages} 页</span>
                                <button onClick={() => setTaskPage(p => p + 1)} disabled={taskPage >= taskTotalPages} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
                                <button onClick={() => setTaskPage(taskTotalPages)} disabled={taskPage >= taskTotalPages} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">尾页</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {!isLoadingData && activeSubTab === 'articles' && (
                <div className="animate-in fade-in-0 duration-300">
                    <ArticleListManager allSources={sources} pointsBySource={pointsBySource} />
                </div>
            )}
            
            {isAddModalOpen && <AddSubscriptionModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveNewPoint} isLoading={isMutationLoading} />}
            {isDeleteConfirmOpen && (
                <ConfirmationModal
                    title="确认删除"
                    message={`您确定要删除选中的 ${selectedPointIds.size} 个情报点吗？此操作无法撤销。`}
                    onConfirm={handleDeleteSelected}
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                    isLoading={isMutationLoading}
                />
            )}
        </div>
    );
};

const PlaceholderManager: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center justify-center h-full bg-white rounded-xl border border-dashed">
        <p className="text-gray-500">{title} 模块正在开发中...</p>
    </div>
);

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
                return <UserManager />;
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
            <div className="flex-1 flex flex-col overflow-hidden">
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