
import React, { useState, useEffect, useCallback } from 'react';
import { PendingArticle } from '../../types';
import { getPendingArticles, confirmPendingArticles, deletePendingArticles } from '../../api';
import { CheckCircleIcon, TrashIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            setSelectedIds(new Set()); // Reset selection
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(articles.map(a => a.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleConfirm = async () => {
        if (selectedIds.size === 0) return;
        setProcessing(true);
        try {
            await confirmPendingArticles(Array.from(selectedIds));
            fetchArticles();
        } catch (e) {
            alert('确认入库失败');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`确定要删除选中的 ${selectedIds.size} 篇文章吗？`)) return;
        setProcessing(true);
        try {
            await deletePendingArticles(Array.from(selectedIds));
            fetchArticles();
        } catch (e) {
            alert('删除失败');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden bg-gray-50/50">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">待确认文章 (Pending Review)</h3>
                <div className="flex gap-3">
                    <button onClick={fetchArticles} className="p-2 text-gray-500 bg-white border rounded-lg shadow-sm hover:text-indigo-600"><RefreshIcon className={`w-5 h-5 ${isLoading?'animate-spin':''}`}/></button>
                    <button 
                        onClick={handleDelete} 
                        disabled={selectedIds.size === 0 || processing}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg shadow-sm hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                    >
                        <TrashIcon className="w-4 h-4" /> 删除 ({selectedIds.size})
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={selectedIds.size === 0 || processing}
                        className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {processing ? <Spinner /> : <CheckCircleIcon className="w-4 h-4" />} 
                        确认入库 ({selectedIds.size})
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-12"><input type="checkbox" onChange={handleSelectAll} checked={articles.length > 0 && selectedIds.size === articles.length} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>
                                <th className="px-6 py-3">来源信息</th>
                                <th className="px-6 py-3 w-1/3">标题 / 链接</th>
                                <th className="px-6 py-3">发布时间</th>
                                <th className="px-6 py-3">采集元数据</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? <tr><td colSpan={5} className="py-20 text-center"><Spinner /></td></tr> :
                             articles.length === 0 ? <tr><td colSpan={5} className="py-20 text-center text-gray-400">暂无待确认文章</td></tr> :
                             articles.map(article => (
                                <tr key={article.id} className={`hover:bg-gray-50 ${selectedIds.has(article.id) ? 'bg-indigo-50/30' : ''}`}>
                                    <td className="p-4"><input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => handleSelect(article.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{article.source_name}</div>
                                        <div className="text-xs text-gray-500">{article.point_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-indigo-900 mb-1">{article.title}</div>
                                        <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                            查看原文
                                            <ExternalLinkIcon className="w-3 h-3" />
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                                        {new Date(article.publish_date).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-400 font-mono bg-gray-100 p-2 rounded max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                            {JSON.stringify(article.crawl_metadata)}
                                        </div>
                                    </td>
                                </tr>
                             ))
                            }
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500">共 {total} 条</span>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50">上一页</button>
                        <span className="text-xs font-medium self-center">{page}</span>
                        <button disabled={articles.length < 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50">下一页</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
