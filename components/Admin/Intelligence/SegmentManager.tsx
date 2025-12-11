
import React, { useState } from 'react';
import { searchSemanticSegments } from '../../../api/intelligence';
import { InfoItem } from '../../../types';
import { 
    SearchIcon, RefreshIcon, SparklesIcon, CalendarIcon, 
    DatabaseIcon, FilterIcon, ChevronLeftIcon, ChevronRightIcon 
} from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const SegmentManager: React.FC = () => {
    // Search Params
    const [queryText, setQueryText] = useState('');
    const [sourceUuid, setSourceUuid] = useState('');
    const [pointUuid, setPointUuid] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [maxSegments, setMaxSegments] = useState<number>(50);
    // Updated default similarity threshold to 0.1 as per successful backend test case
    const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.1);
    
    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 20;

    // Results State
    const [segments, setSegments] = useState<InfoItem[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (newPage: number = 1) => {
        if (!queryText.trim()) {
            alert("请输入检索关键词");
            return;
        }

        setIsLoading(true);
        setError(null);
        setHasSearched(true);
        setPage(newPage);

        try {
            // Build request object, excluding empty strings
            const requestData: any = {
                query_text: queryText,
                page: newPage,
                page_size: pageSize,
                max_segments: maxSegments,
                similarity_threshold: similarityThreshold
            };

            if (sourceUuid.trim()) requestData.source_uuid = sourceUuid.trim();
            if (pointUuid.trim()) requestData.point_uuid = pointUuid.trim();
            if (startDate) requestData.start_date = new Date(startDate).toISOString();
            if (endDate) requestData.end_date = new Date(endDate).toISOString();

            const res = await searchSemanticSegments(requestData);
            setSegments(res.items || []);
            setTotal(res.total || 0);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "检索失败");
            setSegments([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize) || 1;

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Control Panel */}
            <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0 shadow-sm z-10">
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-base outline-none shadow-inner"
                            placeholder="输入语义检索内容 (必填)..."
                            value={queryText}
                            onChange={e => setQueryText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch(1)}
                        />
                    </div>
                    <button 
                        onClick={() => handleSearch(1)}
                        disabled={isLoading || !queryText.trim()}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                        语义检索
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {/* Similarity & Max */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">
                            相似度阈值
                            <span className="text-indigo-600">{similarityThreshold}</span>
                        </label>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.05" 
                            value={similarityThreshold}
                            onChange={e => setSimilarityThreshold(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">最大分段数 (Max Segments)</label>
                        <input 
                            type="number" 
                            min="1" max="500" 
                            value={maxSegments}
                            onChange={e => setMaxSegments(parseInt(e.target.value))}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Time Range */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" /> 发布时间范围
                        </label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none" />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none" />
                        </div>
                    </div>

                    {/* IDs */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                            <FilterIcon className="w-3 h-3" /> 精确过滤 (UUID)
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Source UUID" 
                                value={sourceUuid} 
                                onChange={e => setSourceUuid(e.target.value)} 
                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none font-mono"
                            />
                            <input 
                                type="text" 
                                placeholder="Point UUID" 
                                value={pointUuid} 
                                onChange={e => setPointUuid(e.target.value)} 
                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                        <p>正在进行语义匹配...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-200 flex items-center gap-2">
                            <span className="text-xl">⚠️</span> {error}
                        </div>
                    </div>
                ) : !hasSearched ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60 gap-4">
                        <DatabaseIcon className="w-20 h-20 text-gray-200" />
                        <p className="text-lg font-medium">配置参数并点击检索以查看分段数据</p>
                    </div>
                ) : segments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <p className="text-lg">未找到匹配的分段</p>
                        <p className="text-sm text-gray-400 mt-1">请尝试降低相似度阈值或更换关键词</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-5xl mx-auto">
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                            <span>找到 {total} 个相关片段 (Page {page}/{totalPages})</span>
                        </div>
                        
                        {segments.map((seg, idx) => (
                            <div key={`${seg.id}-${idx}`} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h4 className="font-bold text-gray-800 text-lg mb-1 truncate" title={seg.title}>
                                            {seg.title || '无标题'}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-medium">{seg.source_name || 'Unknown Source'}</span>
                                            <span className="font-mono text-gray-400">ID: {seg.id.slice(0,8)}</span>
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3"/>
                                                {new Date(seg.publish_date || seg.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className={`flex flex-col items-end flex-shrink-0 px-3 py-1.5 rounded-lg border ${
                                        (seg.similarity || 0) > 0.8 ? 'bg-green-50 border-green-200 text-green-700' :
                                        (seg.similarity || 0) > 0.6 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                        'bg-gray-50 border-gray-200 text-gray-600'
                                    }`}>
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">相似度</span>
                                        <span className="text-lg font-mono font-bold">{((seg.similarity || 0) * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                                    {seg.content}
                                </div>
                            </div>
                        ))}

                        {/* Pagination */}
                        <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                            <button 
                                onClick={() => handleSearch(page - 1)}
                                disabled={page <= 1}
                                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                            >
                                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <span className="text-sm font-medium text-gray-600">
                                {page} / {totalPages}
                            </span>
                            <button 
                                onClick={() => handleSearch(page + 1)}
                                disabled={page >= totalPages}
                                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                            >
                                <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
