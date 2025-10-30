import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchChunkResult, SystemSource } from '../../types';
import { searchChunks, getSources, exportChunks } from '../../api';
import { SearchIcon, DownloadIcon } from '../icons';

// A spinner component for loading states
const Spinner: React.FC = () => (
    <div className="flex items-center justify-center py-10">
        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

// Helper to decode base64 and handle UTF-8
const decodeBase64Utf8 = (base64: string): string => {
    try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        // If it's not valid base64, return as is. This handles cases where data might be plain text.
        return base64;
    }
};


// Helper to build API payload
const buildApiPayload = (
    filters: {
        query_text: string;
        source_names: string[];
        publish_date_start: string;
        publish_date_end: string;
        similarity_threshold: number;
        top_k: number;
    },
) => {
    const { query_text, source_names, publish_date_start, publish_date_end, similarity_threshold, top_k } = filters;
    const isSemanticSearch = query_text && query_text.trim() !== '' && query_text.trim() !== '*';

    const payload: Record<string, any> = {
        query_text: query_text.trim() || '*',
        top_k,
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
    
    payload.include_article_content = true;

    return payload;
};

export const IntelligenceChunkManager: React.FC = () => {
    const [chunks, setChunks] = useState<SearchChunkResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total_chunks: 0, total_articles: 0 });

    const [filters, setFilters] = useState({
        query_text: '',
        source_names: [] as string[],
        publish_date_start: '',
        publish_date_end: '',
        similarity_threshold: 0.5,
        top_k: 200
    });
    
    const [submittedFilters, setSubmittedFilters] = useState(filters);

    const [sources, setSources] = useState<SystemSource[]>([]);
    
    const isSearchActive = useMemo(() => {
        const query = submittedFilters.query_text.trim();
        return query !== '' && query !== '*';
    }, [submittedFilters.query_text]);


    const loadChunks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const payload = buildApiPayload(submittedFilters);
            const response = await searchChunks(payload);
            const results = response.results || [];
            
            if (isSearchActive) {
                results.sort((a, b) => b.similarity_score - a.similarity_score);
            } else {
                results.sort((a, b) => {
                    const dateA = a.article_publish_date ? new Date(a.article_publish_date).getTime() : 0;
                    const dateB = b.article_publish_date ? new Date(b.article_publish_date).getTime() : 0;
                    return dateB - dateA;
                });
            }

            setChunks(results);
            setPagination(prev => ({ 
                ...prev, 
                page: 1,
                total_chunks: response.total_chunks, 
                total_articles: response.total_articles 
            }));
        } catch (err) {
            setError(err instanceof Error ? `请求失败: ${err.message}` : '获取分段失败');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [submittedFilters, isSearchActive]);

    useEffect(() => {
        loadChunks();
    }, [loadChunks]);

    useEffect(() => {
        getSources().then(setSources).catch(() => setError("无法加载情报源列表"));
    }, []);
    
    const handleSearch = () => {
        setPagination(p => ({ ...p, page: 1 }));
        setSubmittedFilters(filters);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number = value;
        if (type === 'range' || type === 'number') {
            processedValue = Number(value);
        }

        setFilters(prev => ({
            ...prev,
            [name]: processedValue,
        }));
    };
    
    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, source_names: e.target.value ? [e.target.value] : [] }));
    };

    const paginatedChunks = useMemo(() => {
        const startIndex = (pagination.page - 1) * pagination.limit;
        return chunks.slice(startIndex, startIndex + pagination.limit);
    }, [chunks, pagination.page, pagination.limit]);

    const totalPages = Math.ceil(chunks.length / pagination.limit) || 1;

    const handleExportCsv = async () => {
        setIsExporting(true);
        setError(null);
        try {
            const payload = buildApiPayload(submittedFilters);
            const response = await exportChunks(payload);
            
            if (!response.export_data || response.export_data.length === 0) {
                alert("没有可导出的数据。");
                return;
            }
            
            const headers = ['原始标题', 'URL', '发布时间', '合并后的分段内容', '相似度'];
            const escapeCsvField = (field: any): string => {
                if (field == null) return '""';
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return `"${stringField}"`;
            };

            const rows = response.export_data.map(item => [
                item.article_title,
                item.article_url,
                item.article_publish_date,
                decodeBase64Utf8(item.merged_content),
                item.similarity_scores.map(s => s.toFixed(3)).join('; '),
            ]);
            
            let csvContent = "\uFEFF";
            csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';
            csvContent += rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `分段导出_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            setError(err.message || '导出失败');
        } finally {
            setIsExporting(false);
        }
    };
    
    const highlightQuery = (text: string) => {
        const query = submittedFilters.query_text;
        if (!query || !isSearchActive) return text;
        try {
            const parts = text.split(new RegExp(`(${query})`, 'gi'));
            return (
                <>
                    {parts.map((part, i) =>
                        part.toLowerCase() === query.toLowerCase() ? (
                            <mark key={i} className="bg-yellow-200 text-black px-0.5 rounded-sm">{part}</mark>
                        ) : (
                            part
                        )
                    )}
                </>
            );
        } catch (e) {
            return text;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 bg-white rounded-lg border mb-4">
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                    <div className="relative flex-grow sm:flex-grow-0" style={{minWidth: '250px'}}>
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" name="query_text" value={filters.query_text} onChange={handleFilterChange} placeholder="输入关键词进行向量搜索..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="top_k" className="text-sm font-medium whitespace-nowrap text-gray-700">Top K:</label>
                        <input type="number" id="top_k" name="top_k" value={filters.top_k} onChange={handleFilterChange} className="w-20 bg-white border border-gray-300 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="similarity_threshold" className={`text-sm font-medium whitespace-nowrap ${!isSearchActive ? 'text-gray-400' : 'text-gray-700'}`}>相似度:</label>
                        <input type="range" id="similarity_threshold" name="similarity_threshold" min="0" max="1" step="0.01" value={filters.similarity_threshold} onChange={handleFilterChange} disabled={!isSearchActive} className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"/>
                        <span className={`font-semibold text-sm w-10 text-center ${!isSearchActive ? 'text-gray-400' : 'text-blue-600'}`}>{filters.similarity_threshold.toFixed(2)}</span>
                    </div>
                    <select name="source_names" value={filters.source_names[0] || ''} onChange={handleSourceChange} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">所有情报源</option>
                        {sources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                        <input type="date" name="publish_date_start" value={filters.publish_date_start} onChange={handleFilterChange} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <span className="text-gray-500">-</span>
                        <input type="date" name="publish_date_end" value={filters.publish_date_end} onChange={handleFilterChange} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <button onClick={handleSearch} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition disabled:bg-blue-300">
                            检索
                        </button>
                        <button onClick={handleExportCsv} disabled={isExporting || chunks.length === 0} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition disabled:opacity-50">
                            <DownloadIcon className="w-4 h-4"/>
                            <span>{isExporting ? '导出中...' : '导出CSV'}</span>
                        </button>
                    </div>
                </div>
                {error && <div className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</div>}
            </div>

            <div className="flex-1 bg-white rounded-lg border overflow-y-auto">
                <table className="w-full table-fixed text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-16">序号</th>
                            <th scope="col" className="px-6 py-3 w-64">原始标题</th>
                            <th scope="col" className="px-6 py-3 w-28">URL</th>
                            <th scope="col" className="px-6 py-3 w-32">发布时间</th>
                            <th scope="col" className="px-6 py-3">分段内容</th>
                            <th scope="col" className="px-6 py-3 w-36">相似度</th>
                            <th scope="col" className="px-6 py-3 w-40">情报源</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={7}><Spinner /></td></tr>
                        ) : paginatedChunks.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-500">未找到任何分段。</td></tr>
                        ) : (
                            paginatedChunks.map((chunk, index) => {
                                const decodedChunkText = decodeBase64Utf8(chunk.chunk_text);
                                return (
                                <tr key={`${chunk.article_id}-${chunk.chunk_index}`} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-500">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 truncate" title={chunk.article_title}>{chunk.article_title}</td>
                                    <td className="px-6 py-4"><a href={chunk.article_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">原文链接</a></td>
                                    <td className="px-6 py-4">{chunk.article_publish_date ? new Date(chunk.article_publish_date).toLocaleDateString('zh-CN') : 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-800 break-words" title={decodedChunkText}>{highlightQuery(decodedChunkText)}</td>
                                    <td className="px-6 py-4 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span>{chunk.similarity_score ? chunk.similarity_score.toFixed(3) : '-'}</span>
                                            {chunk.similarity_score > 0 && (
                                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${chunk.similarity_score * 100}%` }}></div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{chunk.source_name}</td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

             <div className="flex-shrink-0 flex justify-between items-center mt-4 text-sm">
                <span className="text-gray-600">共 {chunks.length} 条分段 (来自 {pagination.total_articles} 篇文章)</span>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPagination(p=>({...p, page: p.page-1}))} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                        <span>第 {pagination.page} / {totalPages} 页</span>
                        <button onClick={() => setPagination(p=>({...p, page: p.page+1}))} disabled={pagination.page >= totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                    </div>
                )}
            </div>
        </div>
    );
};
