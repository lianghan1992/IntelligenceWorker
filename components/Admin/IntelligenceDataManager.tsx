
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InfoItem, SystemSource } from '../../types';
import { getArticles, deleteArticles, getSources } from '../../api';
import { SearchIcon, TrashIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon } from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

export const IntelligenceDataManager: React.FC = () => {
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    
    const [filters, setFilters] = useState({
        source_name: '',
        point_name: '',
        publish_date_start: '',
        publish_date_end: '',
    });

    const [sources, setSources] = useState<SystemSource[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);

    // Load Sources for Filter
    useEffect(() => {
        getSources().then(setSources).catch(console.error);
    }, []);

    const loadArticles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getArticles({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });
            setArticles(response.items || []);
            setPagination(prev => ({
                ...prev,
                total: response.total,
                totalPages: Math.ceil(response.total / prev.limit) || 1
            }));
            // Reset selection on page change/reload
            setSelectedIds(new Set());
        } catch (err: any) {
            setError(err.message || '获取文章失败');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => {
        loadArticles();
    }, [loadArticles]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = articles.map(a => a.id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            await deleteArticles(Array.from(selectedIds));
            setShowDeleteConfirm(false);
            loadArticles();
        } catch (err: any) {
            alert(`删除失败: ${err.message}`);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 flex flex-wrap items-end gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">情报源</label>
                    <select name="source_name" value={filters.source_name} onChange={handleFilterChange} className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2.5 w-40 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">全部</option>
                        {sources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">发布日期 (开始)</label>
                    <input type="date" name="publish_date_start" value={filters.publish_date_start} onChange={handleFilterChange} className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2 w-40 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">发布日期 (结束)</label>
                    <input type="date" name="publish_date_end" value={filters.publish_date_end} onChange={handleFilterChange} className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2 w-40 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                
                <div className="flex-1"></div>

                {selectedIds.size > 0 && (
                    <button 
                        onClick={() => setShowDeleteConfirm(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold"
                    >
                        <TrashIcon className="w-4 h-4" />
                        删除选中 ({selectedIds.size})
                    </button>
                )}
                <button onClick={loadArticles} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors" title="刷新">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* List */}
                <div className={`flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${selectedArticle ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-4 w-10">
                                        <input type="checkbox" onChange={handleSelectAll} checked={articles.length > 0 && selectedIds.size === articles.length} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                    </th>
                                    <th scope="col" className="px-6 py-3">标题</th>
                                    <th scope="col" className="px-6 py-3">来源</th>
                                    <th scope="col" className="px-6 py-3">日期</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && articles.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10">加载中...</td></tr>
                                ) : articles.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10">无数据</td></tr>
                                ) : (
                                    articles.map(article => (
                                        <tr 
                                            key={article.id} 
                                            className={`border-b hover:bg-slate-50 cursor-pointer ${selectedArticle?.id === article.id ? 'bg-indigo-50' : 'bg-white'}`}
                                            onClick={() => setSelectedArticle(article)}
                                        >
                                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => handleSelectOne(article.id)} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-xs">{article.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded border border-slate-200">{article.source_name}</span>
                                            </td>
                                            <td className="px-6 py-4">{new Date(article.publish_date || article.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-sm">
                        <span className="text-slate-500">共 {pagination.total} 条</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page <= 1} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeftIcon className="w-4 h-4"/></button>
                            <span className="px-2 self-center">{pagination.page} / {pagination.totalPages}</span>
                            <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page >= pagination.totalPages} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRightIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>

                {/* Preview Sidebar */}
                {selectedArticle && (
                    <div className="w-full md:w-1/2 bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col overflow-hidden absolute md:relative inset-0 md:inset-auto z-20">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1">{selectedArticle.title}</h3>
                                <div className="text-xs text-slate-500 flex gap-3">
                                    <span>{selectedArticle.source_name}</span>
                                    <span>{new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedArticle(null)} className="p-2 hover:bg-slate-200 rounded-full">
                                <ChevronRightIcon className="w-5 h-5 md:hidden" /> {/* Close icon logic */}
                                <span className="hidden md:inline text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                                {selectedArticle.content}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <a href={selectedArticle.original_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm">
                                查看原文 <ChevronRightIcon className="w-3 h-3"/>
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {showDeleteConfirm && (
                <ConfirmationModal 
                    title="确认删除" 
                    message={`确定要永久删除选中的 ${selectedIds.size} 篇文章吗？此操作不可恢复。`}
                    onConfirm={handleBatchDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
};
