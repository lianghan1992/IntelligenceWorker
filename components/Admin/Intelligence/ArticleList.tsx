

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticles, getSpiderPoints, reviewSpiderArticle } from '../../../api/intelligence';
import { RefreshIcon, ExternalLinkIcon, CheckCircleIcon, QuestionMarkCircleIcon, SearchIcon, DocumentTextIcon, CloseIcon, SparklesIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ArticleDetailModal: React.FC<{ article: SpiderArticle; onClose: () => void }> = ({ article, onClose }) => (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex justify-between items-start bg-gray-50">
                <div className="pr-8">
                    <h3 className="text-xl font-bold text-gray-900 leading-snug">{article.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="bg-white border px-2 py-0.5 rounded font-mono">{article.point_id.slice(0,8)}</span>
                        <span>{article.publish_time || '未知时间'}</span>
                        <a href={article.original_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLinkIcon className="w-3 h-3"/> 原文
                        </a>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-6 h-6"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="prose prose-sm max-w-none text-slate-700">
                    <pre className="whitespace-pre-wrap font-sans">{article.content}</pre>
                </div>
            </div>
        </div>
    </div>
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
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-20">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 mr-2">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600"/> 
                        <span className="hidden sm:inline">采集文章库</span>
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{total}</span>
                    </h3>
                    
                    <select 
                        value={selectedPoint} 
                        onChange={e => setSelectedPoint(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 outline-none shadow-sm max-w-[150px]"
                    >
                        <option value="">所有采集点</option>
                        {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <select 
                        value={reviewStatus} 
                        onChange={e => setReviewStatus(e.target.value as any)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 outline-none shadow-sm"
                    >
                        <option value="all">全部状态</option>
                        <option value="unreviewed">待审核</option>
                        <option value="reviewed">已入库</option>
                    </select>

                    <div className="flex items-center gap-2 text-sm bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="outline-none text-gray-600" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="outline-none text-gray-600" />
                    </div>
                </div>
                
                <button onClick={() => fetchArticles(false)} className="p-2 hover:bg-gray-200 rounded text-gray-500 border bg-white shadow-sm flex-shrink-0">
                    <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-slate-50/30">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3">标题 / 摘要</th>
                            <th className="px-6 py-3 w-40">来源信息</th>
                            <th className="px-6 py-3 w-32">发布时间</th>
                            <th className="px-6 py-3 w-32">状态</th>
                            <th className="px-6 py-3 w-24 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {articles.length === 0 && !isLoading ? (
                            <tr><td colSpan={5} className="text-center py-20 text-gray-400">暂无符合条件的数据</td></tr>
                        ) : (
                            articles.map(article => (
                                <tr key={article.id} className="hover:bg-gray-50 group cursor-pointer" onClick={() => setViewingArticle(article)}>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 mb-1 line-clamp-1">{article.title}</div>
                                        <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed opacity-80">{article.content.slice(0, 150)}...</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-gray-700 truncate" title={points.find(p=>p.id===article.point_id)?.name}>{points.find(p=>p.id===article.point_id)?.name || '未知'}</span>
                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded w-fit">{article.point_id.slice(0,8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs align-top">
                                        <div className="font-medium text-gray-700">{article.publish_time || '-'}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">采集于 {new Date(article.collected_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        {article.is_reviewed ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-100">
                                                <SparklesIcon className="w-3 h-3"/> 已向量化
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-bold border border-yellow-100">
                                                <QuestionMarkCircleIcon className="w-3 h-3"/> 待审核
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right align-top">
                                        <div className="flex flex-col gap-2 items-end">
                                            {!article.is_reviewed && (
                                                <button 
                                                    onClick={(e) => handleReview(e, article)}
                                                    disabled={!!processingId}
                                                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {processingId === article.id ? <Spinner /> : <CheckCircleIcon className="w-3 h-3"/>}
                                                    入库
                                                </button>
                                            )}
                                            <a href={article.original_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                                                <ExternalLinkIcon className="w-3 h-3"/> 原文
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {hasMore && articles.length > 0 && (
                    <div className="p-4 text-center border-t border-gray-100 bg-white">
                        <button 
                            onClick={() => fetchArticles(true)} 
                            disabled={isLoading}
                            className="text-sm text-gray-500 hover:text-indigo-600 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? '加载中...' : '加载更多文章'}
                        </button>
                    </div>
                )}
            </div>

            {viewingArticle && <ArticleDetailModal article={viewingArticle} onClose={() => setViewingArticle(null)} />}
        </div>
    );
};
