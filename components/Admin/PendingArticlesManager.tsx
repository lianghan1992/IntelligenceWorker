
import React, { useState, useEffect, useCallback } from 'react';
import { PendingArticlePublic, getPendingArticles, confirmPendingArticles, rejectPendingArticles } from '../../api/intelligence';
import { CheckCircleIcon, TrashIcon, RefreshIcon, ExternalLinkIcon, ClockIcon, EyeIcon, CloseIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Filter Button Component ---
const FilterButton: React.FC<{ 
    label: string; 
    value: string; 
    isActive: boolean; 
    count?: number;
    onClick: (val: string) => void;
    colorClass: string;
}> = ({ label, value, isActive, count, onClick, colorClass }) => (
    <button
        onClick={() => onClick(value)}
        className={`
            relative px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap
            ${isActive 
                ? `bg-white shadow-sm ring-1 ${colorClass}` 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }
        `}
    >
        {label}
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[20px] text-center ${isActive ? 'bg-slate-100' : 'bg-slate-200 text-slate-500'}`}>
            {count !== undefined ? count : '-'}
        </span>
    </button>
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
    
    const [statusFilter, setStatusFilter] = useState(''); 
    const [counts, setCounts] = useState({ all: 0, pending: 0, rejected: 0 });
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);
    
    const [viewingArticle, setViewingArticle] = useState<PendingArticlePublic | null>(null);

    // Fetch counts for all categories independently to show on buttons
    const fetchCounts = useCallback(async () => {
        try {
            const [allRes, pendingRes, rejectedRes] = await Promise.all([
                getPendingArticles({ limit: 1 }), // Get total for all
                getPendingArticles({ limit: 1, status: 'pending' }),
                getPendingArticles({ limit: 1, status: 'rejected' })
            ]);
            setCounts({
                all: allRes.total || 0,
                pending: pendingRes.total || 0,
                rejected: rejectedRes.total || 0
            });
        } catch (e) {
            console.error("Failed to fetch counts", e);
        }
    }, []);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getPendingArticles({ page, limit: 20, status: statusFilter || undefined });
            setArticles(res.items || []);
            setTotal(res.total || 0);
            setSelectedIds(new Set());
            // Refresh counts as well whenever we fetch list, to keep numbers in sync
            fetchCounts();
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [page, statusFilter, fetchCounts]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const handleAction = async (action: 'confirm' | 'reject', ids?: string[]) => {
        const targetIds = ids || Array.from(selectedIds);
        if (targetIds.length === 0) return;
        setProcessing(true);
        try {
            if (action === 'confirm') await confirmPendingArticles(targetIds);
            else await rejectPendingArticles(targetIds);
            fetchArticles(); // Reload list and counts
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
            case 'confirmed': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-6 py-3 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
                <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                        <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs font-mono border border-orange-200">AUDIT</span>
                        待审核文章
                    </h3>
                    
                    {/* Pill Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full md:w-auto bg-slate-50 p-1 rounded-full border border-slate-100">
                        <FilterButton 
                            label="全部" 
                            value="" 
                            isActive={statusFilter === ''} 
                            count={counts.all}
                            onClick={(val) => { setStatusFilter(val); setPage(1); }} 
                            colorClass="text-slate-700 ring-slate-200"
                        />
                        <FilterButton 
                            label="待处理" 
                            value="pending" 
                            isActive={statusFilter === 'pending'} 
                            count={counts.pending}
                            onClick={(val) => { setStatusFilter(val); setPage(1); }} 
                            colorClass="text-orange-700 ring-orange-200"
                        />
                        <FilterButton 
                            label="已排除" 
                            value="rejected" 
                            isActive={statusFilter === 'rejected'} 
                            count={counts.rejected}
                            onClick={(val) => { setStatusFilter(val); setPage(1); }} 
                            colorClass="text-red-700 ring-red-200"
                        />
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <button onClick={fetchArticles} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
                        <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>
                    </button>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={() => handleAction('reject')} disabled={processing} className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                                {processing ? <Spinner /> : <TrashIcon className="w-3.5 h-3.5"/>} 排除 ({selectedIds.size})
                            </button>
                            <button onClick={() => handleAction('confirm')} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-md hover:-translate-y-0.5 whitespace-nowrap">
                                {processing ? <Spinner /> : <CheckCircleIcon className="w-3.5 h-3.5"/>} 入库 ({selectedIds.size})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/30 p-4 md:p-6 custom-scrollbar">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 w-10">
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                onChange={toggleAll} 
                                                checked={articles.length > 0 && selectedIds.size === articles.length} 
                                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" 
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3">文章标题</th>
                                    <th className="px-6 py-3 w-48">来源 / 采集点</th>
                                    <th className="px-6 py-3 w-28">状态</th>
                                    <th className="px-6 py-3 w-40">抓取时间</th>
                                    <th className="px-6 py-3 w-24 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading && articles.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-slate-400">加载中...</td></tr>
                                ) : articles.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-slate-400">暂无数据</td></tr>
                                ) : (
                                    articles.map(article => (
                                        <tr 
                                            key={article.id} 
                                            className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${selectedIds.has(article.id) ? 'bg-indigo-50/40' : 'bg-white'}`}
                                            onClick={() => toggleSelect(article.id)}
                                        >
                                            <td className="p-4 w-10">
                                                <div className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIds.has(article.id)} 
                                                        onChange={() => {}} // handled by row click
                                                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 pointer-events-none" 
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div 
                                                    className="font-bold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setViewingArticle(article); }}
                                                >
                                                    {article.title}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                    <a href={article.original_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="hover:text-blue-500 hover:underline flex items-center gap-0.5">
                                                        <ExternalLinkIcon className="w-3 h-3"/> 原文
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-700 font-medium">{article.source_name}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[120px]" title={article.point_name}>
                                                    {article.point_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(article.status || 'pending')}`}>
                                                    {article.status || 'PENDING'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                                {article.created_at ? new Date(article.created_at).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setViewingArticle(article); }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="查看详情"
                                                >
                                                    <EyeIcon className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {total > 0 && (
                        <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-white">
                            <span className="text-xs text-slate-400">共 {total} 条记录</span>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page <= 1} 
                                    onClick={() => setPage(p => p - 1)} 
                                    className="p-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600"
                                >
                                    <ChevronLeftIcon className="w-4 h-4"/>
                                </button>
                                <span className="px-3 py-1.5 bg-slate-50 border rounded-lg text-xs font-bold text-slate-700">{page}</span>
                                <button 
                                    disabled={articles.length < 20} 
                                    onClick={() => setPage(p => p + 1)} 
                                    className="p-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600"
                                >
                                    <ChevronRightIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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
