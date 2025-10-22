import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InfoItem, SystemSource, SearchResult } from '../../types';
import { searchArticlesFiltered, getSources } from '../../api';
import { SearchIcon, DownloadIcon } from '../icons';
import { IntelligenceArticleModal } from './IntelligenceArticleModal';

export const IntelligenceDataManager: React.FC = () => {
    const [articles, setArticles] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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

    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);
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
            const params = {
                ...searchParams,
                query_text: searchParams.query_text.trim() === '' ? '*' : searchParams.query_text,
                page: pagination.page,
                limit: pagination.limit,
            };
            const response = await searchArticlesFiltered(params);
            setArticles(response.items || []);
            setPagination(prev => ({...prev, total: response.total}));
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取文章失败');
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

    const handleExportCsv = () => {
        if (articles.length === 0) {
            alert("没有可导出的数据。");
            return;
        }
        const headers = ['ID', 'Source', 'Point', 'Title', 'URL', 'Publish Date'];
        const rows = articles.map(article => [
            article.id,
            `"${article.source_name.replace(/"/g, '""')}"`,
            `"${article.point_name.replace(/"/g, '""')}"`,
            `"${article.title.replace(/"/g, '""')}"`,
            article.original_url,
            article.publish_date
        ]);
        let csvContent = "\uFEFF"; // BOM for UTF-8
        csvContent += headers.join(',') + '\r\n';
        csvContent += rows.map(r => r.join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "intelligence_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const isSearchActive = filters.query_text.trim() !== '';

    return (
        <>
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
                    <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition"><DownloadIcon className="w-4 h-4"/>导出CSV</button>
                </div>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto flex-1">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">标题</th>
                            <th scope="col" className="px-6 py-3">来源/情报点</th>
                            <th scope="col" className="px-6 py-3">发布日期</th>
                            <th scope="col" className="px-6 py-3">相似度</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={4} className="text-center py-10">加载中...</td></tr>)
                        : error ? (<tr><td colSpan={4} className="text-center py-10 text-red-500">{error}</td></tr>)
                        : articles.length === 0 ? (<tr><td colSpan={4} className="text-center py-10">未找到任何文章。</td></tr>)
                        : (articles.map(article => (
                            <tr key={article.id} className="bg-white border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedArticle(article)}>
                                <td className="px-6 py-4 font-medium text-gray-900 max-w-md truncate">{article.title}</td>
                                <td className="px-6 py-4">{article.source_name} / {article.point_name}</td>
                                <td className="px-6 py-4">{new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN')}</td>
                                <td className="px-6 py-4">{article.similarity_score ? article.similarity_score.toFixed(3) : '-'}</td>
                            </tr>
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
        {selectedArticle && <IntelligenceArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />}
        </>
    );
};