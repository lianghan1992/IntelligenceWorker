import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { InfoItem, SystemSource, SearchResult } from '../../types';
import { searchArticlesFiltered, getSources } from '../../api';
import { SearchIcon, DownloadIcon } from '../icons';

// Centralized function to build a clean API payload
const buildApiPayload = (
    filters: {
        query_text: string;
        source_names: string[];
        publish_date_start: string;
        publish_date_end: string;
        similarity_threshold: number;
    },
    page: number,
    limit: number
) => {
    const { query_text, source_names, publish_date_start, publish_date_end, similarity_threshold } = filters;
    const isSemanticSearch = query_text && query_text.trim() !== '';

    const payload: Record<string, any> = {
        query_text: isSemanticSearch ? query_text.trim() : '*',
        page,
        limit,
    };

    if (isSemanticSearch) {
        payload.similarity_threshold = similarity_threshold;
    }

    if (source_names && source_names.length > 0) {
        payload.source_names = source_names;
    }

    if (publish_date_start) {
        payload.publish_date_start = publish_date_start;
    }

    if (publish_date_end) {
        payload.publish_date_end = publish_date_end;
    }

    return payload;
};


export const IntelligenceDataManager: React.FC = () => {
    const [articles, setArticles] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
    
    // This state holds the immediate values from user input
    const [filters, setFilters] = useState({
        query_text: '',
        source_names: [] as string[],
        publish_date_start: '',
        publish_date_end: '',
        similarity_threshold: 0.5,
    });

    // These states hold the debounced values for search-related inputs that trigger API calls
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [debouncedThreshold, setDebouncedThreshold] = useState(0.5);

    const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
    const [sources, setSources] = useState<SystemSource[]>([]);
    
    // Debounce search query text
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(filters.query_text);
        }, 500);
        return () => clearTimeout(handler);
    }, [filters.query_text]);

    // Debounce similarity threshold slider
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedThreshold(filters.similarity_threshold);
        }, 500);
        return () => clearTimeout(handler);
    }, [filters.similarity_threshold]);

    // Consolidate final search parameters for the API call
    const searchParams = useMemo(() => ({
        query_text: debouncedQuery,
        similarity_threshold: debouncedThreshold,
        source_names: filters.source_names,
        publish_date_start: filters.publish_date_start,
        publish_date_end: filters.publish_date_end,
    }), [debouncedQuery, debouncedThreshold, filters.source_names, filters.publish_date_start, filters.publish_date_end]);

    // Reset pagination whenever the actual search parameters change (excluding initial load)
    const isInitialMount = React.useRef(true);
    useEffect(() => {
        if (!isInitialMount.current) {
            setPagination(p => ({ ...p, page: 1 }));
        } else {
            isInitialMount.current = false;
        }
    }, [searchParams]);

    const loadArticles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const payload = buildApiPayload(searchParams, pagination.page, pagination.limit);
            const response = await searchArticlesFiltered(payload);
            setArticles(response.items || []);
            setPagination(prev => ({...prev, total: response.total}));
        } catch (err) {
            setError(err instanceof Error ? `请求失败: ${err.message}` : '获取文章失败');
        } finally {
            setIsLoading(false);
        }
    }, [searchParams, pagination.page, pagination.limit]);

    useEffect(() => {
        loadArticles();
    }, [loadArticles]);
    
    useEffect(() => {
        getSources().then(setSources).catch(() => setError("无法加载情报源列表"));
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const target = e.target as HTMLInputElement;
        setFilters(prev => ({
            ...prev,
            [name]: target.type === 'range' ? parseFloat(value) : value,
        }));
    };
    
    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, source_names: e.target.value ? [e.target.value] : [] }));
    };

    const handleExportCsv = async () => {
        if (pagination.total === 0) {
            alert("没有可导出的数据。");
            return;
        }

        setIsExporting(true);
        setError(null);
        try {
            // For export, use the immediate filters state for responsiveness, not the debounced one.
            const payload = buildApiPayload(filters, 1, 10000);
            
            const response = await searchArticlesFiltered(payload);
            const allArticles = response.items || [];

            if (allArticles.length === 0) {
                alert("根据当前筛选条件，没有可导出的数据。");
                setIsExporting(false);
                return;
            }

            const headers = ['序号', '标题', '发布日期', '文章内容'];
            
            const escapeCsvField = (field: string | number | null | undefined): string => {
                if (field === null || field === undefined) {
                    return '""';
                }
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            };

            const rows = allArticles.map((article, index) => [
                index + 1,
                article.title,
                article.publish_date ? new Date(article.publish_date).toLocaleDateString('zh-CN') : 'N/A',
                article.content
            ]);
            
            let csvContent = "\uFEFF"; // BOM for UTF-8
            csvContent += headers.join(',') + '\r\n';
            csvContent += rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `情报导出_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Export failed:", err);
            setError(err instanceof Error ? `导出失败: ${err.message}` : '导出失败，请重试。');
        } finally {
            setIsExporting(false);
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const isSearchActive = filters.query_text.trim() !== '';

    const handleRowClick = (articleId: string) => {
        setSelectedArticleId(prevId => (prevId === articleId ? null : articleId));
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 bg-white rounded-lg border mb-4 space-y-4">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="query_text" value={filters.query_text} onChange={handleFilterChange} placeholder="输入关键词进行向量搜索..." className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex items-center gap-4">
                    <label htmlFor="similarity_threshold" className={`text-sm font-medium whitespace-nowrap ${!isSearchActive ? 'text-gray-400' : 'text-gray-700'}`}>相似度阈值:</label>
                    <input 
                        type="range"
                        id="similarity_threshold"
                        name="similarity_threshold"
                        min="0"
                        max="1"
                        step="0.01"
                        value={filters.similarity_threshold}
                        onChange={handleFilterChange}
                        disabled={!isSearchActive}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={`font-semibold text-sm w-12 text-center ${!isSearchActive ? 'text-gray-400' : 'text-blue-600'}`}>
                        {filters.similarity_threshold.toFixed(2)}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <select name="source_names" value={filters.source_names[0] || ''} onChange={handleSourceChange} className="flex-1 bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">所有情报源</option>
                        {sources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                    </select>
                    <input type="date" name="publish_date_start" value={filters.publish_date_start} onChange={handleFilterChange} className="flex-1 bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="date" name="publish_date_end" value={filters.publish_date_end} onChange={handleFilterChange} className="flex-1 bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={handleExportCsv} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <DownloadIcon className="w-4 h-4"/>
                        <span>{isExporting ? '正在导出...' : '导出CSV'}</span>
                    </button>
                </div>
                {error && <div className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</div>}
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto flex-1">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-2/5">标题</th>
                            <th scope="col" className="px-6 py-3">情报源</th>
                            <th scope="col" className="px-6 py-3">情报点</th>
                            <th scope="col" className="px-6 py-3">发布日期</th>
                            <th scope="col" className="px-6 py-3">相似度</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={5} className="text-center py-10">加载中...</td></tr>)
                        : articles.length === 0 ? (<tr><td colSpan={5} className="text-center py-10">未找到任何文章。</td></tr>)
                        : (articles.map(article => (
                            <Fragment key={article.id}>
                                <tr className={`border-b hover:bg-gray-50 cursor-pointer ${selectedArticleId === article.id ? 'bg-blue-50' : ''}`} onClick={() => handleRowClick(article.id)}>
                                    <td className="px-6 py-4 font-medium text-gray-900">{article.title}</td>
                                    <td className="px-6 py-4">{article.source_name}</td>
                                    <td className="px-6 py-4">{article.point_name}</td>
                                    <td className="px-6 py-4">{new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN')}</td>
                                    <td className="px-6 py-4">{article.similarity_score ? article.similarity_score.toFixed(3) : '-'}</td>
                                </tr>
                                {selectedArticleId === article.id && (
                                    <tr className="bg-gray-50">
                                        <td colSpan={5} className="p-4">
                                            <div className="bg-white border rounded-lg p-4">
                                                <h4 className="font-semibold text-gray-800 mb-2">文章内容预览</h4>
                                                <div className="whitespace-pre-wrap text-xs text-gray-600 leading-relaxed max-h-40 overflow-y-auto p-3 bg-gray-100 rounded-md">
                                                    {article.content}
                                                </div>
                                                <div className="mt-3">
                                                    <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs font-semibold">
                                                        查看原文 &rarr;
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        )))}
                    </tbody>
                 </table>
            </div>

             <div className="flex justify-between items-center mt-4 text-sm flex-shrink-0">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPagination(p=>({...p, page: p.page-1}))} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span>第 {pagination.page} / {totalPages || 1} 页</span>
                    <button onClick={() => setPagination(p=>({...p, page: p.page+1}))} disabled={pagination.page >= totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>
        </div>
    );
};