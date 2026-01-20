
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
    fileType?: string;
    timeLimit?: string;
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
    fileType = '',
    timeLimit = '',
    className = '',
    hideResults = false
}) => {
    const [query, setQuery] = useState(initialQuery);
    const [items, setItems] = useState<CommonSearchItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<CommonSearchStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyInfo, setBusyInfo] = useState<{ isBusy: boolean; queueLength: number | null }>({ isBusy: false, queueLength: null });

    // 定期同步服务状态
    useEffect(() => {
        const updateStatus = () => {
            getCommonSearchStatus().then(setStatus).catch(console.error);
        };
        updateStatus();
        const timer = setInterval(updateStatus, 10000);
        return () => clearInterval(timer);
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setBusyInfo({ isBusy: false, queueLength: null });

        try {
            const response = await performCommonSearch({
                query: query.trim(),
                region,
                max_results: maxResults,
                search_type: searchType,
                file_type: fileType || undefined,
                time_limit: timeLimit || undefined
            });

            setItems(response.items || []);
            setStatus(response.meta);
            
            if (onResult) {
                onResult(response.items || []);
            }
        } catch (err: any) {
            // 处理 503 Service Busy 错误
            if (err.message?.includes('503') || err.message?.toLowerCase().includes('busy')) {
                // 尝试解析 detail 对象
                const queueLen = err.detail?.queue_length || status?.queue_length || 0;
                setBusyInfo({ isBusy: true, queueLength: queueLen });
                setError('服务器繁忙，正在排队中...');
            } else {
                setError(err.message || '检索失败，请稍后重试');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {/* 搜索栏主体 */}
            <form onSubmit={handleSearch} className="relative group">
                <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all shadow-sm">
                    <div className="pl-3 pr-2 text-slate-400">
                        {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin text-indigo-500" /> : <SearchIcon className="w-5 h-5" />}
                    </div>
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 h-10 font-medium"
                        disabled={isLoading}
                    />
                    {query && !isLoading && (
                        <button type="button" onClick={() => setQuery('')} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="px-6 h-10 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-md active:scale-95 ml-1"
                    >
                        {isLoading ? '检索中' : '全网搜索'}
                    </button>
                </div>
            </form>

            {/* 忙碌与状态提示 */}
            {(status || busyInfo.isBusy) && (
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold border transition-all animate-in fade-in slide-in-from-top-1 ${busyInfo.isBusy ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <ClockIcon className={`w-3.5 h-3.5 ${busyInfo.isBusy ? 'animate-pulse' : ''}`} />
                    <div className="flex items-center gap-2">
                        <span>系统负载: {busyInfo.isBusy ? '繁忙 (BUSY)' : '正常 (READY)'}</span>
                        <span className="opacity-30">|</span>
                        <span>等待队列: {busyInfo.queueLength ?? status?.queue_length ?? 0}</span>
                        {status?.proxy_enabled && (
                            <>
                                <span className="opacity-30">|</span>
                                <span className="flex items-center gap-1 text-indigo-600">
                                    <ShieldCheckIcon className="w-3 h-3"/> 动态代理已就绪
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 错误提示 */}
            {error && !busyInfo.isBusy && (
                <div className="bg-red-50 text-red-600 text-xs p-4 rounded-xl border border-red-100 flex items-center gap-2 animate-in shake-in">
                    <ShieldCheckIcon className="w-4 h-4 rotate-180" />
                    {error}
                </div>
            )}

            {/* 搜索结果渲染 */}
            {!hideResults && items.length > 0 && (
                <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Results</span>
                        <span className="text-[10px] text-slate-400 font-bold">FOUND {items.length} ITEMS</span>
                    </div>
                    {items.map((item, idx) => (
                        <a 
                            key={idx}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-900/5 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2.5">
                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1 flex-1">{item.title}</h4>
                                <ExternalLinkIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors ml-4 shrink-0" />
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 opacity-90">{item.body}</p>
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                                <GlobeIcon className="w-3 h-3" />
                                <span className="truncate">{new URL(item.href).hostname}</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};
