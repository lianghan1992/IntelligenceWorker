
import React, { useState, useEffect, useRef } from 'react';
import { performCommonSearch, getCommonSearchStatus } from '../../../api/common';
import { CommonSearchItem, CommonSearchStatus } from '../../../types';
import { SearchIcon, GlobeIcon, RefreshIcon, ExternalLinkIcon, CloseIcon, ClockIcon, ShieldCheckIcon } from '../../icons';

interface CommonSearchProps {
    initialQuery?: string;
    placeholder?: string;
    onResult?: (items: CommonSearchItem[]) => void;
    maxResults?: number;
    region?: string;
    searchType?: 'text' | 'news';
    className?: string;
    hideResults?: boolean; // If parent wants to handle rendering
}

export const CommonSearch: React.FC<CommonSearchProps> = ({
    initialQuery = '',
    placeholder = '输入关键词检索全网情报...',
    onResult,
    maxResults = 10,
    region = 'cn-zh',
    searchType = 'text',
    className = '',
    hideResults = false
}) => {
    const [query, setQuery] = useState(initialQuery);
    const [items, setItems] = useState<CommonSearchItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<CommonSearchStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    // Fetch service status on mount
    useEffect(() => {
        getCommonSearchStatus().then(setStatus).catch(console.error);
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setIsBusy(false);

        try {
            const response = await performCommonSearch({
                query: query.trim(),
                region,
                max_results: maxResults,
                search_type: searchType
            });

            setItems(response.items || []);
            setStatus(response.meta);
            
            if (onResult) {
                onResult(response.items || []);
            }
        } catch (err: any) {
            console.error("Search failed:", err);
            // Handle 503 Busy specifically
            if (err.message?.includes('busy') || err.message?.includes('503')) {
                setIsBusy(true);
                setError('服务器繁忙，正在排队中...');
            } else {
                setError(err.message || '搜索请求失败，请稍后重试');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {/* Search Input Bar */}
            <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-0 bg-indigo-500/5 blur-xl group-focus-within:bg-indigo-500/10 transition-all rounded-full"></div>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm focus-within:shadow-md focus-within:border-indigo-400 transition-all">
                    <div className="pl-3 pr-2 text-slate-400">
                        {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin text-indigo-500" /> : <SearchIcon className="w-5 h-5" />}
                    </div>
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 h-10 px-1"
                        disabled={isLoading}
                    />
                    {query && !isLoading && (
                        <button 
                            type="button" 
                            onClick={() => setQuery('')}
                            className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="px-6 h-10 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        {isLoading ? '检索中' : '全网搜索'}
                    </button>
                </div>
            </form>

            {/* Service Status Hint */}
            {status && (status.queue_length > 0 || isBusy) && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all animate-in fade-in slide-in-from-top-1 ${isBusy ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <ClockIcon className={`w-3.5 h-3.5 ${isBusy ? 'animate-pulse' : ''}`} />
                    <span>系统状态: </span>
                    <span className="uppercase">{isBusy ? 'BUSY' : 'READY'}</span>
                    <span className="opacity-40">|</span>
                    <span>排队长度: {status.queue_length}</span>
                    {status.proxy_enabled && (
                        <>
                            <span className="opacity-40">|</span>
                            <span className="flex items-center gap-1"><ShieldCheckIcon className="w-3 h-3"/> PROXY ACTIVE</span>
                        </>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && !isBusy && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 animate-in shake-in">
                    {error}
                </div>
            )}

            {/* Results Display */}
            {!hideResults && items.length > 0 && (
                <div className="space-y-3 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Web Search Results</span>
                        <span className="text-[10px] text-slate-400">找到 {items.length} 条相关结果</span>
                    </div>
                    {items.map((item, idx) => (
                        <a 
                            key={idx}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-900/5 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1">
                                    {item.title}
                                </h4>
                                <ExternalLinkIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5 ml-3" />
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                {item.body}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                <GlobeIcon className="w-3 h-3" />
                                <span className="truncate max-w-xs">{new URL(item.href).hostname}</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && items.length === 0 && !error && query && (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2 opacity-60">
                    <GlobeIcon className="w-12 h-12 opacity-20" />
                    <p className="text-sm">没有找到与 "{query}" 相关的结果</p>
                </div>
            )}
        </div>
    );
};
