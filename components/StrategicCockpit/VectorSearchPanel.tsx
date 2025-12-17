
import React, { useState, useRef } from 'react';
import { searchSemanticSegments } from '../../api/intelligence';
import { InfoItem } from '../../types';
import { SearchIcon, CloseIcon, CalendarIcon, PuzzleIcon, DatabaseIcon, DownloadIcon } from '../icons';

interface VectorSearchPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectResult?: (item: InfoItem) => void;
}

export const VectorSearchPanel: React.FC<VectorSearchPanelProps> = ({ isOpen, onClose, onSelectResult }) => {
    const [query, setQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [results, setResults] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setHasSearched(true);
        try {
            const res = await searchSemanticSegments({
                query_text: query,
                page: 1,
                page_size: 50, // Hardcoded limit
                similarity_threshold: 0.3, // Hardcoded threshold
                max_segments: 50, // Hardcoded max segments
                start_date: startDate ? new Date(startDate).toISOString() : undefined,
                end_date: endDate ? new Date(endDate).toISOString() : undefined,
            });
            setResults(res.items || []);
        } catch (e) {
            console.error(e);
            alert('检索失败，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleExportMarkdown = () => {
        if (results.length === 0) return;
        setIsExporting(true);
        try {
            let markdownContent = `# 向量检索结果\n\n**检索关键词**: ${query}\n**时间范围**: ${startDate || '不限'} 至 ${endDate || '不限'}\n\n---\n\n`;
            
            results.forEach((item, index) => {
                const dateStr = item.publish_date ? new Date(item.publish_date).toLocaleDateString() : '未知日期';
                markdownContent += `### ${index + 1}. ${item.title}\n\n`;
                markdownContent += `> **来源**: ${item.source_name} | **日期**: ${dateStr} | **相似度**: ${((item.similarity || 0) * 100).toFixed(1)}%\n\n`;
                markdownContent += `${item.content}\n\n---\n\n`;
            });

            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vector_search_${new Date().toISOString().slice(0, 10)}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("导出失败");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`absolute inset-0 z-30 flex justify-end transition-all duration-300 pointer-events-none ${isOpen ? 'bg-black/20 backdrop-blur-sm pointer-events-auto' : 'bg-transparent'}`} onClick={onClose}>
            <div 
                className={`
                    w-full sm:w-[450px] h-full bg-slate-50 shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out pointer-events-auto
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                            <PuzzleIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-slate-800 block leading-none">向量检索</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Semantic Vector Search</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {results.length > 0 && (
                            <button 
                                onClick={handleExportMarkdown}
                                disabled={isExporting}
                                className="p-2 hover:bg-emerald-50 rounded-full text-emerald-600 transition-colors" 
                                title="导出为 Markdown"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Search Inputs */}
                <div className="p-5 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 space-y-3">
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-500 transition-all text-sm outline-none shadow-inner"
                            placeholder="输入关键词挖掘情报脉络..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input 
                                type="date" 
                                className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 outline-none focus:border-emerald-500"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                            <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-slate-300">-</span>
                        <div className="relative flex-1">
                            <input 
                                type="date" 
                                className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 outline-none focus:border-emerald-500"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                            <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <button 
                            onClick={handleSearch}
                            disabled={isLoading || !query.trim()}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {isLoading ? '...' : '检索'}
                        </button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50">
                    {!hasSearched ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
                            <DatabaseIcon className="w-12 h-12 text-slate-300" />
                            <p className="text-xs">输入关键词，探索情报库中的语义关联</p>
                        </div>
                    ) : results.length === 0 && !isLoading ? (
                        <div className="text-center py-20 text-slate-400 text-sm">
                            未找到相关内容片段
                        </div>
                    ) : (
                        results.map((item, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => onSelectResult && onSelectResult(item)}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors" title={item.title}>
                                        {item.title}
                                    </h4>
                                    <span className="flex-shrink-0 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                        {((item.similarity || 0) * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-2 font-sans">
                                    {item.content}
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-50 pt-2">
                                    <span>{item.source_name}</span>
                                    <span>{new Date(item.publish_date || item.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="py-10 flex justify-center">
                            <svg className="animate-spin h-6 w-6 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
