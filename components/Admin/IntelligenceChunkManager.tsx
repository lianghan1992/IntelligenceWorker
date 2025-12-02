
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchChunkResult, SystemSource } from '../../types';
import { searchChunks, getSources, exportChunks } from '../../api';
import { SearchIcon, DownloadIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const decodeBase64Utf8 = (base64: string): string => {
    try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) { return base64; }
};

export const IntelligenceChunkManager: React.FC = () => {
    const [chunks, setChunks] = useState<SearchChunkResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [filters, setFilters] = useState({ query_text: '', source_names: [] as string[], similarity_threshold: 0.5, top_k: 50 });
    const [sources, setSources] = useState<SystemSource[]>([]);

    useEffect(() => { getSources().then(setSources).catch(console.error); }, []);

    const handleSearch = async () => {
        if (!filters.query_text.trim()) return;
        setIsLoading(true);
        try {
            const res = await searchChunks({ ...filters, include_article_content: true });
            setChunks(res.results || []);
        } catch (e) { alert('检索失败'); } finally { setIsLoading(false); }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const res = await exportChunks({ ...filters, include_article_content: true });
            const blob = new Blob([JSON.stringify(res.export_data)], { type: 'application/json' }); // Simplified export for demo
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'chunks_export.json'; a.click();
        } catch (e) { alert('导出失败'); } finally { setIsExporting(false); }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" 
                            placeholder="输入关键词进行语义检索..." 
                            value={filters.query_text} 
                            onChange={e => setFilters({...filters, query_text: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <button onClick={handleSearch} disabled={isLoading || !filters.query_text} className="px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                        {isLoading ? <Spinner /> : <SearchIcon className="w-5 h-5"/>} 检索
                    </button>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">相似度阈值: {filters.similarity_threshold}</span>
                        <input type="range" min="0" max="1" step="0.05" value={filters.similarity_threshold} onChange={e => setFilters({...filters, similarity_threshold: parseFloat(e.target.value)})} className="w-32 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Top K:</span>
                        <input type="number" value={filters.top_k} onChange={e => setFilters({...filters, top_k: parseInt(e.target.value)})} className="w-16 bg-slate-50 border rounded px-2 py-1 outline-none focus:border-indigo-500" />
                    </div>
                    <button onClick={handleExport} disabled={isExporting || chunks.length === 0} className="ml-auto text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 disabled:opacity-50">
                        {isExporting ? <Spinner /> : <DownloadIcon className="w-4 h-4"/>} 导出结果
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 custom-scrollbar">
                {chunks.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">请输入关键词并检索以获取结果</div>
                ) : (
                    <div className="grid gap-4">
                        {chunks.map((chunk, idx) => (
                            <div key={`${chunk.article_id}-${idx}`} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors text-base line-clamp-1">{chunk.article_title}</h4>
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{(chunk.similarity_score * 100).toFixed(1)}%</span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-3">{decodeBase64Utf8(chunk.chunk_text)}</p>
                                <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-50 pt-3">
                                    <span>{chunk.source_name} • {chunk.article_publish_date ? new Date(chunk.article_publish_date).toLocaleDateString() : 'N/A'}</span>
                                    <a href={chunk.article_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">查看原文</a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
