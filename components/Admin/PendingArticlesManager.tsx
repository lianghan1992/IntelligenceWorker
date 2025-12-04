
import React, { useState, useEffect, useCallback } from 'react';
import { PendingArticlePublic, getPendingArticles, confirmPendingArticles, rejectPendingArticles } from '../../api/intelligence';
import { CheckCircleIcon, TrashIcon, RefreshIcon, ExternalLinkIcon, ClockIcon, EyeIcon, CloseIcon, CheckIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PendingArticleDetailModal: React.FC<{ 
    article: PendingArticlePublic; 
    onClose: () => void; 
    onAction: (id: string, action: 'confirm' | 'reject') => void;
}> = ({ article, onClose, onAction }) => {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div className="pr-8">
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{article.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">{article.source_name}</span>
                            <span className="font-mono text-slate-400">{article.point_name}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <a href={article.original_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                <ExternalLinkIcon className="w-3 h-3"/> 原文链接
                            </a>
                            {article.publish_date && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3"/> {new Date(article.publish_date).toLocaleString()}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="w-6 h-6"/></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-0 bg-slate-50/30 flex flex-col md:flex-row h-full">
                    {/* Main Content */}
                    <div className="flex-1 bg-white p-8 border-r border-slate-200 shadow-sm overflow-auto custom-scrollbar">
                        <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">文章正文</h4>
                        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                            {article.content ? article.content : <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200"><p>内容为空或未抓取正文</p></div>}
                        </div>
                    </div>

                    {/* Sidebar Metadata */}
                    <div className="w-full md:w-80 flex-shrink-0 bg-slate-50/50 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 基础信息
                            </h4>
                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-400">ID</span>
                                    <span className="font-mono text-slate-600 select-all">{article.id.substring(0,8)}...</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-400">状态</span>
                                    <span className="font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded">{article.status || 'Pending'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">抓取时间</span>
                                    <span className="text-slate-600">{new Date(article.created_at || '').toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 z-10">
                    <button onClick={() => onAction(article.id, 'reject')} className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold border border-red-200 transition-colors flex items-center gap-2">
                        <TrashIcon className="w-4 h-4"/> 拒绝并排除
                    </button>
                    <button onClick={() => onAction(article.id, 'confirm')} className="px-6 py-2.5 text-white bg-green-600 hover:bg-green-700 rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                        <CheckIcon className="w-4 h-4"/> 确认入库
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PendingArticlesManager: React.FC = () => {
    const [articles, setArticles] = useState<PendingArticlePublic[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);
    
    const [viewingArticle, setViewingArticle] = useState<PendingArticlePublic | null>(null);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getPendingArticles({ page, limit: 20 });
            setArticles(res.items || []);
            setTotal(res.total || 0);
            setSelectedIds(new Set());
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [page]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const handleAction = async (action: 'confirm' | 'reject', ids?: string[]) => {
        const targetIds = ids || Array.from(selectedIds);
        if (targetIds.length === 0) return;
        setProcessing(true);
        try {
            if (action === 'confirm') await confirmPendingArticles(targetIds);
            else await rejectPendingArticles(targetIds);
            fetchArticles();
            if (viewingArticle && targetIds.includes(viewingArticle.id)) setViewingArticle(null);
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
                    <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs font-mono border border-orange-200">PENDING</span>
                    待确认文章 <span className="text-slate-400 font-normal text-sm">({total})</span>
                </h3>
                <div className="flex gap-3">
                    <button onClick={fetchArticles} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
                        <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>
                    </button>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={() => handleAction('reject')} disabled={processing} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5">
                                {processing ? <Spinner /> : <TrashIcon className="w-3.5 h-3.5"/>} 排除 ({selectedIds.size})
                            </button>
                            <button onClick={() => handleAction('confirm')} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-md hover:-translate-y-0.5">
                                {processing ? <Spinner /> : <CheckCircleIcon className="w-3.5 h-3.5"/>} 入库 ({selectedIds.size})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50/50 custom-scrollbar">
                <div className="space-y-4">
                    {articles.length > 0 && (
                        <div className="flex items-center gap-3 px-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                <input type="checkbox" onChange={toggleAll} checked={articles.length > 0 && selectedIds.size === articles.length} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                                <span className="text-xs text-slate-500 font-bold group-hover:text-indigo-600 transition-colors">全选当前页</span>
                            </label>
                        </div>
                    )}
                    
                    {isLoading && articles.length === 0 ? <div className="text-center py-20 text-slate-400">加载中...</div> :
                     articles.length === 0 ? <div className="text-center py-20 text-slate-400">暂无待确认数据</div> :
                     articles.map(article => (
                        <div key={article.id} onClick={() => toggleSelect(article.id)} className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 group hover:shadow-md ${selectedIds.has(article.id) ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-300'}`}>
                            <div className="flex items-start pt-1">
                                <input type="checkbox" checked={selectedIds.has(article.id)} readOnly className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 pointer-events-none" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 text-sm md:text-base leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">{article.title}</h4>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 whitespace-nowrap ml-3">{article.source_name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3 font-medium">
                                    {article.publish_date && <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5"/> {new Date(article.publish_date).toLocaleString()}</span>}
                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                    <a href={article.original_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors">
                                        查看原文 <ExternalLinkIcon className="w-3 h-3"/>
                                    </a>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-mono text-slate-400 max-w-md truncate">
                                        {article.point_name}
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewingArticle(article); }}
                                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                        <EyeIcon className="w-3.5 h-3.5"/> 详情
                                    </button>
                                </div>
                            </div>
                        </div>
                     ))
                    }
                </div>
                
                {/* Pagination */}
                {total > 0 && (
                    <div className="mt-6 flex justify-center gap-3">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">上一页</button>
                        <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-600">{page}</span>
                        <button disabled={articles.length < 20} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">下一页</button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {viewingArticle && (
                <PendingArticleDetailModal 
                    article={viewingArticle}
                    onClose={() => setViewingArticle(null)}
                    onAction={(id, action) => handleAction(action, [id])}
                />
            )}
        </div>
    );
};
