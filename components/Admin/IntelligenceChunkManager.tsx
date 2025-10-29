import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SearchChunkResult, SystemSource } from '../../types';
import { searchChunks, getSources, exportChunks } from '../../api';
import { SearchIcon, DownloadIcon, DocumentTextIcon } from '../icons';

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <strong key={i} className="bg-yellow-200 font-semibold">{part}</strong>
                ) : (
                    part
                )
            )}
        </>
    );
};

const ResultCard: React.FC<{
    item: SearchChunkResult;
    query: string;
    isSelected: boolean;
    onClick: () => void;
}> = ({ item, query, isSelected, onClick }) => {
    const score = item.similarity_score * 100;
    const circumference = 2 * Math.PI * 14; // 2 * pi * r
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div
            onClick={onClick}
            className={`p-4 border-l-4 transition-all duration-200 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
        >
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                        <circle
                            className="text-gray-200"
                            strokeWidth="3"
                            stroke="currentColor"
                            fill="transparent"
                            r="14"
                            cx="16"
                            cy="16"
                        />
                        <circle
                            className="text-blue-500"
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="14"
                            cx="16"
                            cy="16"
                        />
                    </svg>
                    <div className="text-center text-xs font-bold text-blue-600 mt-1">{score.toFixed(1)}</div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                        <Highlight text={item.chunk_text} query={query} />
                    </p>
                    <div className="mt-2 text-xs text-gray-500 truncate">
                        <a href={item.article_url} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold text-gray-600">
                            {item.article_title}
                        </a>
                    </div>
                     <div className="mt-1 text-xs text-gray-400">
                        {item.source_name} &nbsp;&middot;&nbsp; {new Date(item.article_publish_date).toLocaleDateString('zh-CN')}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SkeletonCard: React.FC = () => (
    <div className="p-4 border-l-4 border-transparent">
        <div className="flex items-start gap-4 animate-pulse">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div className="h-3 w-8 bg-gray-200 rounded mt-1"></div>
            </div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
        </div>
    </div>
);

const ContextViewer: React.FC<{ chunk: SearchChunkResult | null }> = ({ chunk }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chunk && contentRef.current) {
            const element = contentRef.current.querySelector('#highlighted-chunk');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                 contentRef.current.scrollTop = 0;
            }
        }
    }, [chunk]);
    
    if (!chunk) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                <DocumentTextIcon className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">上下文阅读器</h3>
                <p>在左侧选择一条检索结果，此处将展示其原文，并高亮对应分段。</p>
            </div>
        );
    }
    
    const fullContent = chunk.article_content || chunk.article_summary || '（无完整内容）';
    const parts = fullContent.split(chunk.chunk_text);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="font-bold text-gray-800 text-base leading-tight truncate">{chunk.article_title}</h3>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">{chunk.source_name} &nbsp;|&nbsp; {new Date(chunk.article_publish_date).toLocaleString('zh-CN')}</p>
                    <a href={chunk.article_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                        查看原文 &rarr;
                    </a>
                </div>
            </div>
            <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
                <article className="prose prose-sm max-w-none prose-p:text-gray-700 prose-p:leading-relaxed">
                   <p>
                        {parts[0]}
                        <mark id="highlighted-chunk" className="bg-yellow-200 text-black px-1 rounded">
                            {chunk.chunk_text}
                        </mark>
                        {parts.slice(1).join(chunk.chunk_text)}
                    </p>
                </article>
            </div>
        </div>
    );
};


export const IntelligenceChunkManager: React.FC = () => {
    const [results, setResults] = useState<SearchChunkResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedChunk, setSelectedChunk] = useState<SearchChunkResult | null>(null);
    
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
            setSelectedChunk(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const payload: Record<string, any> = {
                query_text: searchParams.query_text,
                similarity_threshold: searchParams.similarity_threshold,
                top_k: searchParams.top_k,
                include_article_content: true, // Always include content for context view
            };
            if (searchParams.source_names.length > 0) payload.source_names = searchParams.source_names;
            if (searchParams.publish_date_start) payload.publish_date_start = searchParams.publish_date_start;
            if (searchParams.publish_date_end) payload.publish_date_end = searchParams.publish_date_end;
            if (searchParams.chunk_size_filter) payload.chunk_size_filter = searchParams.chunk_size_filter;
            
            const response = await searchChunks(payload);
            const res = response.results || [];
            setResults(res);
            setSelectedChunk(res.length > 0 ? res[0] : null);
        } catch (err) {
            setError(err instanceof Error ? `请求失败: ${err.message}` : '获取分段失败');
            setResults([]);
            setSelectedChunk(null);
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
                top_k: 1000, 
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
            
            let csvContent = "\uFEFF";
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
            {/* Main grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
                {/* Left Column: Filters & Results */}
                <div className="flex flex-col h-full bg-white rounded-lg border">
                    <div className="p-4 border-b space-y-4 flex-shrink-0">
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
                                <label htmlFor="top_k" className="text-sm font-medium text-gray-700">返回:</label>
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
                                <span>{isExporting ? '导出中...' : '导出'}</span>
                            </button>
                        </div>
                        {error && <div className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</div>}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />))
                        : results.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <p className="font-semibold">
                                    {debouncedQuery.trim() ? "未找到相关分段" : "输入关键词以开始检索"}
                                </p>
                                <p className="text-sm mt-1">
                                    {debouncedQuery.trim() ? "请尝试调整关键词或筛选条件。" : "AI将为您找到最相关的情报片段。"}
                                </p>
                            </div>
                        )
                        : (
                            <div className="divide-y divide-gray-100">
                                {results.map(item => (
                                    <ResultCard 
                                        key={`${item.article_id}-${item.chunk_index}`}
                                        item={item}
                                        query={debouncedQuery}
                                        isSelected={selectedChunk?.article_id === item.article_id && selectedChunk?.chunk_index === item.chunk_index}
                                        onClick={() => setSelectedChunk(item)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Context Viewer */}
                <div className="hidden lg:flex flex-col h-full bg-white rounded-lg border">
                    <ContextViewer chunk={selectedChunk} />
                </div>
            </div>
        </div>
    );
};
