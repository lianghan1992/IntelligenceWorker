
import React, { useState, useEffect } from 'react';
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
    hideResults?: boolean; 
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
            if (err.message?.includes('503') || err.message?.toLowerCase().includes('busy')) {
                setIsBusy(true);
                setError('服务器繁忙，正在排队中...');
            } else {
                setError(err.message || '搜索失败，请稍后重试');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <div className="pl-3 pr-2 text-slate-400">
                        {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin text-indigo-500" /> : <SearchIcon className="w-5 h-5" />}
                    </div>
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 h-10"
                        disabled={isLoading}
                    />
                    {query && !isLoading && (
                        <button type="button" onClick={() => setQuery('')} className="p-2 text-slate-300 hover:text-slate-500">
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="px-6 h-10 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                    >
                        {isLoading ? '搜索中' : '全网搜索'}
                    </button>
                </div>
            </form>

            {status && (status.queue_length > 0 || isBusy) && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${isBusy ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <ClockIcon className={`w-3.5 h-3.5 ${isBusy ? 'animate-pulse' : ''}`} />
                    <span>系统状态: {isBusy ? '繁忙 (BUSY)' : '正常'}</span>
                    <span className="opacity-30">|</span>
                    <span>队列长度: {status.queue_length}</span>
                </div>
            )}

            {error && !isBusy && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 animate-in shake-in">
                    {error}
                </div>
            )}

            {!hideResults && items.length > 0 && (
                <div className="space-y-3 animate-in fade-in duration-500">
                    {items.map((item, idx) => (
                        <a 
                            key={idx}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{item.title}</h4>
                                <ExternalLinkIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2">{item.body}</p>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <GlobeIcon className="w-3 h-3" />
                                <span>{new URL(item.href).hostname}</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};
