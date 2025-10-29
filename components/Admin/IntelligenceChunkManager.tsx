import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchChunkResult, SystemSource } from '../../types';
import { searchChunks, getSources, exportChunks } from '../../api';
import { SearchIcon, DownloadIcon } from '../icons';

export const IntelligenceChunkManager: React.FC = () => {
    const [results, setResults] = useState<SearchChunkResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [filters, setFilters] = useState({
        query_text: '',
        similarity_threshold: 0.5,
        top_k: 20,
        source_names: [] as string[],
        publish_date_start: '',
        publish_date_end: '',
        chunk_size_filter: '',
    });

    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [sources, setSources] = useState<SystemSource[]>([]);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(filters.query_text);
        }, 500);
        return () => clearTimeout(handler);
    }, [filters.query_text]);

    const searchParams = useMemo(() => ({
        ...filters,
        query_text: debouncedQuery,
    }), [filters, debouncedQuery]);

    const loadChunks = useCallback(async () => {
        if (!searchParams.query_text.trim()) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const payload: Record<string, any> = {
                query_text: searchParams.query_text,
                similarity_threshold: searchParams.similarity_threshold,
                top_k: searchParams.top_k,
            };
            if (searchParams.source_names.length > 0) payload.source_names = searchParams.source_names;
            if (searchParams.publish_date_start) payload.publish_date_start = searchParams.publish_date_start;
            if (searchParams.publish_date_end) payload.publish_date_end = searchParams.publish_date_end;
            if (searchParams.chunk_size_filter) payload.chunk_size_filter = searchParams.chunk_size_filter;
            
            const response = await searchChunks(payload);
            setResults(response.results || []);
        } catch (err) {
            setError(err instanceof Error ? `请求失败: ${err.message}` : '获取分段失败');
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        loadChunks();
    }, [loadChunks]);
    
    useEffect(() => {
        getSources().then(setSources).catch(() => setError("无法加载情报源列表"));
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: e.target.type === 'range' || e.target.type === 'number' ? parseFloat(value) : value,
        }));
    };
    
    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, source_names: e.target.value ? [e.target.value] : [] }));
    };

    const handleExportCsv = async () => {
        if (!filters.query_text.trim()) {
            alert("请输入关键词后再导出。");
            return;
        }
        setIsExporting(true);
        setError(null);
        
        try {
            const payload: Record<string, any> = {
                query_text: filters.query_text,
                similarity_threshold: filters.similarity_threshold,
                top_k: 1000, // Export more results
            };
            if (filters.source_names.length > 0) payload.source_names = filters.source_names;
            if (filters.publish_date_start) payload.publish_date_start = filters.publish_date_start;
            if (filters.publish_date_end) payload.publish_date_end = filters.publish_date_end;
            if (filters.chunk_size_filter) payload.chunk_size_filter = filters.chunk_size_filter;

            const response = await exportChunks(payload);
            
            if (!response.export_data || response.export_data.length === 0) {
                alert("没有可导出的数据。");
                setIsExporting(false);
                return;
            }

            const headers = ['文章标题', '发布日期', '合并内容', '原始URL', '相关分段数', '相似度得分'];
            
            const escapeCsvField = (field: any): string => {
                if (field === null || field === undefined) return '""';
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            };

            const rows = response.export_data.map(item => [
                item.article_title,
                item.article_publish_date,
                item.merged_content,
                item.article_url,
                item.chunk_count,
                item.similarity_scores.map(s => s.toFixed(3)).join('; ')
            ]);
            
            let csvContent = "\uFEFF"; // BOM for UTF-8
            csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';
            csvContent += rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `分段导出_${filters.query_text}_${new Date().toISOString().slice(0,10)}.csv`);
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

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 bg-white rounded-lg border mb-4 space-y-4">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="query_text" value={filters.query_text} onChange={handleFilterChange} placeholder="输入关键词进行分段向量搜索..." className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                     <div className="flex items-center gap-2">
                        <label htmlFor="similarity_threshold" className="text-sm font-medium text-gray-700 whitespace-nowrap">相似度:</label>
                        <input type="range" id="similarity_threshold" name="similarity_threshold" min="0" max="1" step="0.01" value={filters.similarity_threshold} onChange={handleFilterChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        <span className="font-semibold text-sm w-12 text-center text-blue-600">{filters.similarity_threshold.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="top_k" className="text-sm font-medium text-gray-700">返回数量:</label>
                        <input type="number" id="top_k" name="top_k" value={filters.top_k} onChange={handleFilterChange} min="1" max="100" className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3"/>
                    </div>
                     <select name="chunk_size_filter" value={filters.chunk_size_filter} onChange={handleFilterChange} className="bg-white border border-gray-300 rounded-lg py-2 px-3">
                        <option value="">所有分段大小</option>
                        <option value="short">小分段 (&lt;200)</option>
                        <option value="medium">中分段 (200-800)</option>
                        <option value="long">大分段 (&gt;800)</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-4">
                    <select name="source_names" value={filters.source_names[0] || ''} onChange={handleSourceChange} className="flex-1 bg-white border border-gray-300 rounded-lg py-2 px-3">
                        <option value="">所有情报源</option>
                        {sources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                    </select>
                    <input type="date" name="publish_date_start" value={filters.publish_date_start} onChange={handleFilterChange} className="flex-1 bg-white border border-gray-300 rounded-lg py-2 px-3" />
                    <input type="date" name="publish_date_end" value={filters.publish_date_end} onChange={handleFilterChange} className="flex-1 bg-white border border-gray-300 rounded-lg py-2 px-3" />
                    <button onClick={handleExportCsv} disabled={isExporting || !filters.query_text.trim()} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <DownloadIcon className="w-4 h-4"/>
                        <span>{isExporting ? '导出中...' : '导出CSV'}</span>
                    </button>
                </div>
                {error && <div className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</div>}
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto flex-1">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-2/5">分段内容</th>
                            <th scope="col" className="px-6 py-3">相似度</th>
                            <th scope="col" className="px-6 py-3">文章标题</th>
                            <th scope="col" className="px-6 py-3">情报源</th>
                            <th scope="col" className="px-6 py-3">发布日期</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={5} className="text-center py-10">加载中...</td></tr>)
                        : results.length === 0 ? (<tr><td colSpan={5} className="text-center py-10">输入关键词以开始检索。</td></tr>)
                        : (results.map(item => (
                            <tr key={`${item.article_id}-${item.chunk_index}`} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-800" title={item.chunk_text}>
                                    <p className="line-clamp-3">{item.chunk_text}</p>
                                </td>
                                <td className="px-6 py-4 font-semibold text-blue-600">{item.similarity_score.toFixed(4)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900"><a href={item.article_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.article_title}</a></td>
                                <td className="px-6 py-4">{item.source_name} / {item.point_name}</td>
                                <td className="px-6 py-4">{new Date(item.article_publish_date).toLocaleDateString('zh-CN')}</td>
                            </tr>
                        )))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};