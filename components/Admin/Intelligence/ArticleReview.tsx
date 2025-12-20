
import React, { useState, useEffect } from 'react';
import { PendingArticle } from '../../../types';
import { getSpiderPendingArticles, approveSpiderArticles } from '../../../api/intelligence';
import { CheckIcon, RefreshIcon, ExternalLinkIcon, CheckCircleIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ArticleReview: React.FC = () => {
    const [articles, setArticles] = useState<PendingArticle[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    const fetchArticles = async () => {
        setIsLoading(true);
        try {
            const res: any = await getSpiderPendingArticles();
            // Handle both array and paginated response formats
            const items = Array.isArray(res) ? res : (res.items || []);
            setArticles(items.filter((a: any) => a.status === 'pending') as PendingArticle[]);
            setSelectedIds(new Set());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchArticles(); }, []);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === articles.length && articles.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(articles.map(a => a.id)));
    };

    const handleApprove = async () => {
        if (selectedIds.size === 0) return;
        setIsApproving(true);
        try {
            const res = await approveSpiderArticles(Array.from(selectedIds));
            if (res.ok) {
                // Remove approved from list locally
                setArticles(prev => prev.filter(a => !selectedIds.has(a.id)));
                setSelectedIds(new Set());
                alert(`成功入库 ${res.processed} 篇文章`);
            }
        } catch (e) { alert('操作失败'); }
        finally { setIsApproving(false); }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-orange-600"/> 待审核文章
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{articles.length}</span>
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button 
                            onClick={handleApprove}
                            disabled={isApproving}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isApproving ? <Spinner /> : <CheckCircleIcon className="w-4 h-4"/>}
                            审核通过并入库 ({selectedIds.size})
                        </button>
                    )}
                    <button onClick={fetchArticles} className="p-2 hover:bg-gray-200 rounded text-gray-500 border bg-white"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0">
                        <tr>
                            <th className="p-4 w-10">
                                <input type="checkbox" checked={articles.length > 0 && selectedIds.size === articles.length} onChange={toggleAll} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                            </th>
                            <th className="px-6 py-3">标题</th>
                            <th className="px-6 py-3">来源</th>
                            <th className="px-6 py-3">原始链接</th>
                            <th className="px-6 py-3">状态</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {articles.length === 0 && !isLoading ? (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-400">暂无待审核内容</td></tr>
                        ) : (
                            articles.map(article => (
                                <tr key={article.id} className={`hover:bg-gray-50 ${selectedIds.has(article.id) ? 'bg-indigo-50/50' : ''}`} onClick={() => toggleSelect(article.id)}>
                                    <td className="p-4 w-10">
                                        <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => toggleSelect(article.id)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer pointer-events-none" />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{article.title}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-gray-700">{article.source_name}</div>
                                        <div className="text-xs text-gray-500">{article.point_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={article.original_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline flex items-center gap-1">
                                            <ExternalLinkIcon className="w-3 h-3"/> 原文
                                        </a>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{article.status}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
