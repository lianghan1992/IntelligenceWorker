
import React, { useState, useEffect, useCallback } from 'react';
import { PendingArticle } from '../../types';
import { getPendingArticles, confirmPendingArticles, deletePendingArticles } from '../../api';
import { CheckCircleIcon, TrashIcon, RefreshIcon, ExternalLinkIcon, ClockIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const PendingArticlesManager: React.FC = () => {
    const [articles, setArticles] = useState<PendingArticle[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getPendingArticles({ page, limit: 20 });
            setArticles(res.items);
            setTotal(res.total);
            setSelectedIds(new Set());
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [page]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const handleAction = async (action: 'confirm' | 'delete') => {
        if (selectedIds.size === 0) return;
        setProcessing(true);
        try {
            if (action === 'confirm') await confirmPendingArticles(Array.from(selectedIds));
            else await deletePendingArticles(Array.from(selectedIds));
            fetchArticles();
        } catch (e) { alert('操作失败'); } finally { setProcessing(false); }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === articles.length && articles.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(articles.map(a => a.id)));
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs">Pending</span>
                    待确认文章 ({total})
                </h3>
                <div className="flex gap-2">
                    <button onClick={fetchArticles} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={() => handleAction('delete')} disabled={processing} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1">
                                {processing ? <Spinner /> : <TrashIcon className="w-3 h-3"/>} 删除 ({selectedIds.size})
                            </button>
                            <button onClick={() => handleAction('confirm')} disabled={processing} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1 shadow-sm">
                                {processing ? <Spinner /> : <CheckCircleIcon className="w-3 h-3"/>} 入库 ({selectedIds.size})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50/50 custom-scrollbar">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 mb-2">
                        <input type="checkbox" onChange={toggleAll} checked={articles.length > 0 && selectedIds.size === articles.length} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-xs text-slate-500 font-bold">全选当前页</span>
                    </div>
                    
                    {isLoading && articles.length === 0 ? <div className="text-center py-10 text-slate-400">加载中...</div> :
                     articles.length === 0 ? <div className="text-center py-10 text-slate-400">暂无待确认数据</div> :
                     articles.map(article => (
                        <div key={article.id} onClick={() => toggleSelect(article.id)} className={`bg-white p-4 rounded-xl border transition-all cursor-pointer flex gap-4 group ${selectedIds.has(article.id) ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-200 shadow-sm'}`}>
                            <div className="flex items-start pt-1">
                                <input type="checkbox" checked={selectedIds.has(article.id)} readOnly className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-700 transition-colors">{article.title}</h4>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap ml-2">{article.source_name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3"/> {new Date(article.publish_date).toLocaleString()}</span>
                                    <span>•</span>
                                    <a href={article.original_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 hover:underline flex items-center gap-1">
                                        原文 <ExternalLinkIcon className="w-3 h-3"/>
                                    </a>
                                </div>
                                <div className="bg-slate-50 p-2 rounded text-xs font-mono text-slate-500 break-all border border-slate-100">
                                    {JSON.stringify(article.crawl_metadata)}
                                </div>
                            </div>
                        </div>
                     ))
                    }
                </div>
                
                {/* Pagination */}
                <div className="mt-4 flex justify-center gap-4">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-1 bg-white border rounded text-xs font-medium disabled:opacity-50">上一页</button>
                    <span className="text-xs font-bold self-center text-slate-500">Page {page}</span>
                    <button disabled={articles.length < 20} onClick={() => setPage(p => p + 1)} className="px-4 py-1 bg-white border rounded text-xs font-medium disabled:opacity-50">下一页</button>
                </div>
            </div>
        </div>
    );
};
