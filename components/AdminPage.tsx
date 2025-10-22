import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Subscription, ProcessingTask, AdminView, SystemSource, InfoItem, SearchResult, ApiProcessingTask } from '../types';
import {
  addPoint,
  updatePoint,
  deletePoints,
  getProcessingTasks,
  getSources,
  getPointsBySourceName,
  getProcessingTasksStats,
  searchArticlesFiltered,
} from '../api';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { InfoDetailModal } from './InfoDetailModal';
import { UserManager } from './UserManager'; // Import the new component
import { LivestreamTaskManager } from './LivestreamTaskManager';
import { PlusIcon, TrashIcon, LightBulbIcon, UsersIcon, DiveIcon, VideoCameraIcon, ChevronDownIcon, CloseIcon, PencilIcon, SearchIcon } from './icons';

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
    '0 0 * * *': '每天',
    '0 0 * * 0': '每周',
};

const formatToBeijingTime = (dateString: string): string => {
    if (!dateString) return 'N/A';

    let parsableDateString = dateString;

    // Handle potential microseconds (more than 3 digits after dot) which JS Date struggles with.
    const dotIndex = parsableDateString.indexOf('.');
    if (dotIndex !== -1) {
        // Find end of fractional part (either Z, +, -, or end of string)
        const timeZoneIndex = parsableDateString.substring(dotIndex).search(/[Z+-]/);
        const endOfFractional = timeZoneIndex !== -1 ? dotIndex + timeZoneIndex : parsableDateString.length;
        
        // If there are more than 3 fractional digits (milliseconds), truncate them.
        if (endOfFractional > dotIndex + 4) { 
            parsableDateString = parsableDateString.substring(0, dotIndex + 4) + parsableDateString.substring(endOfFractional);
        }
    }
    
    const date = new Date(parsableDateString);

    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    return date.toLocaleString('zh-CN', {
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
            // FIX: Replaced flatMap with a safer reduce to avoid TypeScript type inference issues.
            const allPointIds = Array.from(new Set(
                // FIX: Replaced flatMap with a safer reduce to avoid TypeScript type inference issues.
                allSources.reduce((acc, s) => acc.concat((pointsBySourceForFilter[s.name] || []).map(p => p.id)), [] as string[])
            ));
            let pointIdsToQuery: string[] = activeFilters.selectedPointIds;

            if (pointIdsToQuery.length === 0 && activeFilters.selectedSourceNames.length > 0) {
                // FIX: Replaced flatMap with reduce to ensure proper type inference and avoid 'unknown[]' errors.
                pointIdsToQuery = activeFilters.selectedSourceNames.reduce((acc, name) => {
                    const points = pointsBySourceForFilter[name] || [];
                    return acc.concat(points.map(p => p.id));
                }, [] as string[]);
            }
            
            if (pointIdsToQuery.length === 0 && activeFilters.selectedSourceNames.length === 0) {
                 pointIdsToQuery = allPointIds;
            }

            const params: { [key: string]: any } = {
                page: currentPage,
                limit: ARTICLES_PER_PAGE,
                point_ids: pointIdsToQuery.length > 0 ? pointIdsToQuery : undefined,
                publish_date_start: activeFilters.dateRange.startDate || undefined,
                publish_date_end: activeFilters.dateRange.endDate || undefined,
            };

            if (activeFilters.searchQuery.trim()) {
                params.query_text = activeFilters.searchQuery;
                params.similarity_threshold = activeFilters.similarityThreshold;
            } else {
                params.query_text = '*';
            }
            
            const { items, total } = await searchArticlesFiltered(params);
            
            setArticles(items);
            setTotalArticles(total);
            const calculatedTotalPages = Math.ceil(total / ARTICLES_PER_PAGE);
            setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);

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
        // FIX: Replaced a problematic .flatMap().map() chain with .reduce().map() to ensure
        // correct type inference by TypeScript and prevent 'unknown[]' type errors.
        const validPointIds = new Set(
            filters.selectedSourceNames
                .reduce((acc, name) => acc.concat(pointsBySourceForFilter[name] || []), [] as Subscription[])
                .map(p => p.id)
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
        // FIX: Replaced flatMap with reduce to avoid type inference issues.
        return filters.selectedSourceNames.reduce((acc, name) => acc.concat(pointsBySourceForFilter[name] || []), [] as Subscription[]);
    }, [filters.selectedSourceNames, pointsBySourceForFilter]);

    const escapeCsvField = (field: any): string => {
        const str = String(field ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const handleExport = async () => {
        setIsExporting(true);
        setError('');
        try {
            // Build base parameters
            // FIX: Replaced flatMap with a safer reduce to avoid TypeScript type inference issues.
            const allPointIds = Array.from(new Set(
                // FIX: Replaced flatMap with a safer reduce to avoid TypeScript type inference issues.
                allSources.reduce((acc, s) => acc.concat((pointsBySourceForFilter[s.name] || []).map(p => p.id)), [] as string[])
            ));
            let pointIdsToQuery: string[] = activeFilters.selectedPointIds;
            if (pointIdsToQuery.length === 0 && activeFilters.selectedSourceNames.length > 0) {
                // FIX: Replaced flatMap with reduce to ensure proper type inference and avoid 'unknown[]' errors.
                pointIdsToQuery = activeFilters.selectedSourceNames.reduce((acc, name) => acc.concat((pointsBySourceForFilter[name] || []).map(p => p.id)), [] as string[]);
            }
            if (pointIdsToQuery.length === 0 && activeFilters.selectedSourceNames.length === 0) {
                pointIdsToQuery = allPointIds;
            }
    
            const baseParams: { [key: string]: any } = {
                limit: 100, // Use the max allowed limit by the API
                point_ids: pointIdsToQuery.length > 0 ? pointIdsToQuery : undefined,
                publish_date_start: activeFilters.dateRange.startDate || undefined,
                publish_date_end: activeFilters.dateRange.endDate || undefined,
            };
    
            if (activeFilters.searchQuery.trim()) {
                baseParams.query_text = activeFilters.searchQuery;
                baseParams.similarity_threshold = activeFilters.similarityThreshold;
            } else {
                baseParams.query_text = '*';
            }
    
            // Paginated fetching to get all items
            let allItems: SearchResult[] = [];
            let currentPage = 1;
            let totalPagesToFetch = 1;
    
            // First request to get total count and first page
            const firstPageResponse = await searchArticlesFiltered({ ...baseParams, page: currentPage });
            allItems = allItems.concat(firstPageResponse.items);
            
            if (firstPageResponse.total > 0) {
                totalPagesToFetch = Math.ceil(firstPageResponse.total / baseParams.limit);
            }
    
            // Fetch subsequent pages if necessary
            if (totalPagesToFetch > 1) {
                const promises = [];
                for (currentPage = 2; currentPage <= totalPagesToFetch; currentPage++) {
                    promises.push(searchArticlesFiltered({ ...baseParams, page: currentPage }));
                }
                const responses = await Promise.all(promises);
                for (const response of responses) {
                    allItems = allItems.concat(response.items);
                }
            }
    
            if (allItems.length === 0) {
                alert("没有可导出的数据。");
                return;
            }
    
            // Generate CSV content
            const headers = ['标题', '发布日期', '情报来源', '文章内容', '原文链接'];
            const rows = allItems.map(article => [
                article.title,
                new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN'),
                `${article.source_name} - ${article.point_name}`,
                article.content,
                article.original_url
            ].map(escapeCsvField));
    
            let csvContent = "\uFEFF"; // BOM for Excel UTF-8 compatibility
            csvContent += headers.join(',') + '\r\n';
            csvContent += rows.map(row => row.join(',')).join('\r\n');
    
            // Trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `情报导出_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
    
        } catch (err: any) {
            setError('导出失败: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };
    
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
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800">已采集文章</h3>
            {error && <p className="text-sm text-red-600 mb-2 p-2 bg-red-50 rounded-md">{error}</p>}
            
            <div className="bg-gray-50/70 backdrop-blur-sm p-5 rounded-xl border flex flex-col gap-4">
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

            {selectedArticle && <InfoDetailModal item={selectedArticle} allItems={articles} onClose={() => setSelectedArticle(null)} />}
        </div>
    );
};


const PointListManager: React.FC<{
    allPoints: Subscription[];
    allSources: SystemSource[];
    onAdd: () => void;
    onEdit: (point: Subscription) => void;
    onDelete: (ids: string[]) => void;
    isMutationLoading: boolean;
}> = ({ allPoints, allSources, onAdd, onEdit, onDelete, isMutationLoading }) => {
    
    const [filters, setFilters] = useState({ source: '', status: '', searchTerm: '' });
    const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const POINTS_PER_PAGE = 15;

    const filteredPoints = useMemo(() => {
        return allPoints.filter(point => {
            const status = point.is_active ? 'active' : 'inactive';
            const matchesSource = !filters.source || point.source_name === filters.source;
            const matchesStatus = !filters.status || status === filters.status;
            const matchesSearch = !filters.searchTerm.trim() ||
                point.point_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                point.point_url.toLowerCase().includes(filters.searchTerm.toLowerCase());
            return matchesSource && matchesStatus && matchesSearch;
        });
    }, [allPoints, filters]);

    const totalPages = Math.ceil(filteredPoints.length / POINTS_PER_PAGE);
    const paginatedPoints = useMemo(() => {
        const start = (page - 1) * POINTS_PER_PAGE;
        return filteredPoints.slice(start, start + POINTS_PER_PAGE);
    }, [filteredPoints, page]);

    const handleSelectPoint = (id: string) => {
        const newSelection = new Set(selectedPointIds);
        newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        setSelectedPointIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPointIds(new Set(paginatedPoints.map(p => p.id)));
        } else {
            setSelectedPointIds(new Set());
        }
    };
    
    const isAllSelected = paginatedPoints.length > 0 && paginatedPoints.every(p => selectedPointIds.has(p.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h3 className="text-xl font-bold text-gray-800">情报点管理</h3>
                <div className="flex items-center space-x-2 self-end sm:self-center">
                    {selectedPointIds.size > 0 && (
                        <button onClick={() => onDelete(Array.from(selectedPointIds))} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 transition">
                            <TrashIcon className="w-4 h-4" /> <span>删除 ({selectedPointIds.size})</span>
                        </button>
                    )}
                    <button onClick={onAdd} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                        <PlusIcon className="w-4 h-4" /> <span>添加情报点</span>
                    </button>
                </div>
            </div>

             <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                         <label className="text-xs font-medium text-gray-600">搜索名称或URL</label>
                        <SearchIcon className="absolute left-3 top-9 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={filters.searchTerm}
                            onChange={e => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
                            placeholder="搜索..."
                            className="w-full mt-1 bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4"
                        />
                    </div>
                     <div>
                        <label className="text-xs font-medium text-gray-600">情报源</label>
                        <select value={filters.source} onChange={e => setFilters(f => ({...f, source: e.target.value}))} className="w-full mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md">
                            <option value="">所有情报源</option>
                            {allSources.map(source => <option key={source.id} value={source.name}>{source.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600">状态</label>
                         <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-full mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md">
                            <option value="">所有状态</option>
                            <option value="active">启用</option>
                            <option value="inactive">禁用</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
                 <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="p-4 w-12"><input type="checkbox" className="accent-blue-600" onChange={handleSelectAll} checked={isAllSelected}/></th>
                            <th className="px-4 py-3">情报点名称</th>
                            <th className="px-4 py-3">所属情报源</th>
                            <th className="px-4 py-3">URL</th>
                            <th className="px-4 py-3">刷新周期</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPoints.map(point => (
                             <tr key={point.id} className="border-b hover:bg-gray-50">
                                <td className="p-4"><input type="checkbox" className="accent-blue-600" onChange={() => handleSelectPoint(point.id)} checked={selectedPointIds.has(point.id)} /></td>
                                <td className="px-4 py-4 font-semibold text-gray-800">{point.point_name}</td>
                                <td className="px-4 py-4">{point.source_name}</td>
                                <td className="px-4 py-4 max-w-xs truncate" title={point.point_url}>{point.point_url}</td>
                                <td className="px-4 py-4">{formatCron(point.cron_schedule)}</td>
                                <td className="px-4 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${point.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${point.is_active ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                        {point.is_active ? '启用' : '禁用'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <button onClick={() => onEdit(point)} className="font-semibold text-blue-600 hover:underline">编辑</button>
                                </td>
                            </tr>
                        ))}
                         {paginatedPoints.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-500">没有找到匹配的情报点</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                 <span className="text-sm text-gray-600">共 {filteredPoints.length} 条记录</span>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">首页</button>
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span className="text-sm font-semibold">第 {page} / {totalPages > 0 ? totalPages : 1} 页</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">下一页</button>
                     <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">尾页</button>
                </div>
            </div>
        </div>
    );
};


const TaskListManager: React.FC = () => {
    const [tasks, setTasks] = useState<ApiProcessingTask[]>([]);
    const [stats, setStats] = useState<{ [key: string]: number }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({ status: '', source: '', point: '' });
    const TASKS_PER_PAGE = 20;

    const loadTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const params: any = { page, limit: TASKS_PER_PAGE };
            if (filters.status) params.status = filters.status;
            if (filters.source) params.source_name = filters.source;
            if (filters.point) params.point_name = filters.point;

            const [taskData, statData] = await Promise.all([
                getProcessingTasks(params),
                getProcessingTasksStats()
            ]);
            
            setTasks(taskData.items);
            const calculatedTotalPages = Math.ceil(taskData.total / TASKS_PER_PAGE);
            setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
            setStats(statData);
        } catch (err: any) {
            setError(err.message || '无法加载任务');
        } finally {
            setIsLoading(false);
        }
    }, [page, filters]);
    
    useEffect(() => { loadTasks(); }, [loadTasks]);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800">任务队列</h3>
             {error && <p className="text-sm text-red-600 mb-2 p-2 bg-red-50 rounded-md">{error}</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['completed', 'processing', 'failed', 'pending_jina'].map(statusKey => (
                     <div key={statusKey} className="bg-white p-4 rounded-xl border">
                        <p className="text-sm text-gray-500">{statusKey}</p>
                        <p className="text-2xl font-bold">{stats[statusKey]?.toLocaleString() || 0}</p>
                    </div>
                ))}
            </div>
             <div className="overflow-x-auto border rounded-lg bg-white">
                 <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50/50">
                        <tr>
                            <th className="px-4 py-3">URL</th>
                            <th className="px-4 py-3">情报点</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3">创建时间</th>
                            <th className="px-4 py-3">更新时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={5} className="text-center py-8"><Spinner /></td></tr>}
                        {!isLoading && tasks.map((task) => (
                            <tr key={task.id} className="bg-white border-b hover:bg-gray-50/50">
                                <td className="px-4 py-3 max-w-sm truncate" title={task.url}>{task.url}</td>
                                <td className="px-4 py-3">{task.source_name} / {task.point_name}</td>
                                <td className="px-4 py-3">{getStatusChip(task.status)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{formatToBeijingTime(task.created_at)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{formatToBeijingTime(task.updated_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Refactored IntelligenceManager ---
const IntelligenceManager: React.FC = () => {
    const [allSources, setAllSources] = useState<SystemSource[]>([]);
    const [pointsBySource, setPointsBySource] = useState<Record<string, Subscription[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isMutationLoading, setIsMutationLoading] = useState(false);
    const [error, setError] = useState('');

    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit'; point?: Subscription } | null>(null);
    const [pointsToDelete, setPointsToDelete] = useState<string[] | null>(null);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const sources = await getSources();
            setAllSources(sources);

            const pointsPromises = sources.map(source =>
                getPointsBySourceName(source.name).catch(err => {
                    console.error(`Failed to fetch points for ${source.name}:`, err);
                    return [];
                })
            );
            const pointsArrays = await Promise.all(pointsPromises);

            const pointsMap: Record<string, Subscription[]> = {};
            sources.forEach((source, index) => {
                pointsMap[source.name] = pointsArrays[index];
            });
            setPointsBySource(pointsMap);

        } catch (err: any) {
            setError(err.message || '无法加载数据');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const handleSavePoint = async (data: Partial<Subscription>) => {
        setIsMutationLoading(true);
        setError('');
        try {
            if (modalState?.mode === 'add') {
                await addPoint(data);
            } else if (modalState?.mode === 'edit' && modalState.point?.id) {
                await updatePoint(modalState.point.id, data);
            }
            setModalState(null);
            await loadInitialData();
        } catch (err: any) {
            setError(err.message || '保存失败');
        } finally {
            setIsMutationLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!pointsToDelete) return;
        setIsMutationLoading(true);
        setError('');
        try {
            await deletePoints(pointsToDelete);
            setPointsToDelete(null);
            await loadInitialData();
        } catch (err: any) {
            setError(err.message || '删除失败');
        } finally {
            setIsMutationLoading(false);
        }
    };

    const allPoints = useMemo(() => Object.values(pointsBySource).flat(), [pointsBySource]);

    if (isLoading) {
        return <div className="p-8 text-center"><Spinner className="h-8 w-8 text-gray-500 mx-auto" /></div>;
    }
    
    if (error && !isLoading) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="space-y-10">
            <PointListManager
                allPoints={allPoints}
                allSources={allSources}
                onAdd={() => setModalState({ mode: 'add' })}
                onEdit={(point) => setModalState({ mode: 'edit', point })}
                onDelete={(ids) => setPointsToDelete(ids)}
                isMutationLoading={isMutationLoading}
            />
            <TaskListManager />
            <ArticleListManager allSources={allSources} pointsBySource={pointsBySource} />
            
            {modalState?.mode && (
                <AddSubscriptionModal
                    mode={modalState.mode}
                    subscriptionToEdit={modalState.point}
                    onClose={() => setModalState(null)}
                    onSave={handleSavePoint}
                    isLoading={isMutationLoading}
                />
            )}
            {pointsToDelete && (
                <ConfirmationModal
                    title={`确认删除 ${pointsToDelete.length} 个情报点`}
                    message="您确定要删除选中的情报点吗？此操作无法撤销。"
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setPointsToDelete(null)}
                    isLoading={isMutationLoading}
                />
            )}
        </div>
    );
};


// --- Main AdminPage Component ---
export const AdminPage: React.FC = () => {
    const [activeView, setActiveView] = useState<AdminView>('intelligence');
    
    const navItems: { view: AdminView; label: string; icon: React.FC<any> }[] = [
        { view: 'intelligence', label: '情报管理', icon: LightBulbIcon },
        { view: 'users', label: '用户管理', icon: UsersIcon },
        { view: 'dives', label: '内容管理', icon: DiveIcon },
        { view: 'events', label: '事件分析', icon: VideoCameraIcon },
    ];
    
    const renderActiveView = () => {
        switch (activeView) {
            case 'intelligence': return <IntelligenceManager />;
            case 'users': return <UserManager />;
            case 'dives': return <div>内容管理 (开发中)</div>;
            case 'events': return <LivestreamTaskManager />;
            default: return <IntelligenceManager />;
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-gray-50/50 min-h-full">
            <div className="max-w-screen-xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                     <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">后台管理</h1>
                    <div className="mt-4 sm:mt-0 bg-white border rounded-lg p-1 flex space-x-1 shadow-sm">
                        {navItems.map(item => (
                            <button 
                                key={item.view}
                                onClick={() => setActiveView(item.view)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                                    activeView === item.view ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <item.icon className="w-5 h-5"/>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
                    {renderActiveView()}
                </div>
            </div>
        </div>
    );
};