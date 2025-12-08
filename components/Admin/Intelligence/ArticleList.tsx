
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticles, getSpiderPoints, reviewSpiderArticle } from '../../../api/intelligence';
import { RefreshIcon, ExternalLinkIcon, CheckCircleIcon, QuestionMarkCircleIcon, SearchIcon, DocumentTextIcon, CloseIcon, SparklesIcon, ChevronLeftIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ArticleList: React.FC = () => {
    const [articles, setArticles] = useState<SpiderArticle[]>([]);
    const [points, setPoints] = useState<{id: string, name: string}[]>([]);
    
    // Filters
    const [selectedPoint, setSelectedPoint] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [reviewStatus, setReviewStatus] = useState<'all' | 'reviewed' | 'unreviewed'>('all');
    
    // Pagination & Loading
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const limit = 20;

    // Action State
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [viewingArticle, setViewingArticle] = useState<SpiderArticle | null>(null);

    useEffect(() => {
        getSpiderPoints().then(res => {
            setPoints(res.map(p => ({ id: p.id, name: p.point_name })));
        });
    }, []);

    const fetchArticles = useCallback(async (isLoadMore = false) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const currentPage = isLoadMore ? page + 1 : 1;
            const res = await getSpiderArticles({ 
                point_id: selectedPoint || undefined,
                start_time: dateRange.start || undefined,
                end_time: dateRange.end || undefined,
                is_reviewed: reviewStatus === 'all' ? undefined : (reviewStatus === 'reviewed'),
                page: currentPage,
                limit
            });
            
            if (isLoadMore) {
                setArticles(prev => [...prev, ...res.items]);
                setPage(currentPage);
            } else {
                setArticles(res.items);
                setPage(1);
            }
            
            setTotal(res.total);
            setHasMore(articles.length + res.items.length < res.total && res.items.length > 0);
            
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [selectedPoint, dateRange, reviewStatus, page, articles.length]);

    // Initial load and filter change reset
    useEffect(() => {
        fetchArticles(false);
    }, [selectedPoint, dateRange, reviewStatus]);

    const handleReview = async (e: React.MouseEvent, article: SpiderArticle) => {
        e.stopPropagation();
        if (article.is_reviewed) return;
        
        setProcessingId(article.id);
        try {
            await reviewSpiderArticle(article.id, true);
            // Optimistic update
            setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_reviewed: true } : a));
        } catch (e) {
            alert('审核失败');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
            {/* Filter Header */}
            <div className="p-3 md:p-4 border-b bg-gray-50 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                        <select 
                            value={selectedPoint} 
                            onChange={e => setSelectedPoint(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 md:py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-auto md:min-w-[150px]"
                        >
                            <option value="">所有采集点</option>
                            {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select
                            value={reviewStatus}
                            onChange={e => setReviewStatus(e.target.value as any)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 md:py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-auto"
                        >
                            <option value="all">全部状态</option>
                            <option value="unreviewed">待审核</option>
                            <option value="reviewed">已入库</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full md:w-auto">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="outline-none text-gray-600 bg-transparent w-full" />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="outline-none text-gray-600 bg-transparent w-full" />
                        </div>
                        <button onClick={() => fetchArticles(false)} className="p-2 bg-white border rounded-lg text-gray-500 hover:text-indigo-600 flex-shrink-0">
                            <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto bg-slate-50/30 custom-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                            <th className="px-4 py-3 md:px-6 md:py-3">标题</th>
                            <th className="px-4 py-3 md:px-6 md:py-3 hidden md:table-cell w-32">采集点</th>
                            <th className="px-4 py-3 md:px-6 md:py-3 hidden md:table-cell w-32">发布时间</th>
                            <th className="px-4 py-3 md:px-6 md:py-3 w-24 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {articles.length === 0 && !isLoading ? (
                            <tr><td colSpan={4} className="text-center py-20 text-gray-400">暂无数据</td></tr>
                        ) : (
                            articles.map(article => (
                                <tr key={article.id} className="bg-white hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => setViewingArticle(article)}>
                                    <td className="px-4 py-3 md:px-6 md:py-4">
                                        <div className="font-bold text-gray-800 line-clamp-2 mb-1">{article.title}</div>
                                        <div className="flex items-center gap-2 text-xs md:hidden text-gray-400">
                                            <span className="font-mono bg-gray-100 px-1.5 rounded">{article.point_id.slice(0,6)}</span>
                                            <span>{article.publish_time?.split(' ')[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <a href={article.original_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                                                <ExternalLinkIcon className="w-3 h-3"/> 原文
                                            </a>
                                            {article.is_reviewed ? (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                    <CheckCircleIcon className="w-3 h-3"/> 已入库
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                    <QuestionMarkCircleIcon className="w-3 h-3"/> 待审核
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 md:px-6 md:py-4 hidden md:table-cell text-xs font-mono text-gray-500">{article.point_id.slice(0,8)}</td>
                                    <td className="px-4 py-3 md:px-6 md:py-4 hidden md:table-cell text-xs text-gray-500 whitespace-nowrap">{article.publish_time}</td>
                                    <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                                        {!article.is_reviewed ? (
                                            <button 
                                                onClick={(e) => handleReview(e, article)}
                                                disabled={processingId === article.id}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {processingId === article.id ? <Spinner /> : '入库'}
                                            </button>
                                        ) : (
                                            <span className="text-gray-300"><CheckCircleIcon className="w-5 h-5 mx-auto"/></span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {hasMore && (
                    <div className="p-4 text-center">
                        <button onClick={() => fetchArticles(true)} disabled={isLoading} className="text-sm text-gray-500 hover:text-indigo-600">
                            {isLoading ? '加载中...' : '加载更多'}
                        </button>
                    </div>
                )}
            </div>

            {/* Detail View (Overlay for Mobile, Modal for Desktop) */}
            {viewingArticle && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b bg-gray-50 flex items-start gap-3 flex-shrink-0 shadow-sm">
                        <button onClick={() => setViewingArticle(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors mt-0.5">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 leading-snug line-clamp-2">{viewingArticle.title}</h3>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="bg-white border px-2 py-0.5 rounded font-mono">{viewingArticle.point_id.slice(0,8)}</span>
                                <span>{viewingArticle.publish_time}</span>
                                <a href={viewingArticle.original_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                    <ExternalLinkIcon className="w-3 h-3"/> 原文
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50/30">
                        <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
                            <div className="prose prose-sm max-w-none text-slate-700 font-sans leading-relaxed whitespace-pre-wrap break-words">
                                {viewingArticle.content}
                            </div>
                        </div>
                    </div>

                    {!viewingArticle.is_reviewed && (
                        <div className="p-4 border-t bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button 
                                onClick={(e) => { handleReview(e, viewingArticle); }}
                                disabled={processingId === viewingArticle.id}
                                className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2"
                            >
                                {processingId === viewingArticle.id ? <Spinner /> : <SparklesIcon className="w-4 h-4"/>}
                                审核并入库 (生成向量)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
