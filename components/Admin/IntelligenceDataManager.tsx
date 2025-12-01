
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InfoItem, SystemSource } from '../../types';
import { getArticles, deleteArticles, getSources } from '../../api';
import { SearchIcon, TrashIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon, CloseIcon, CheckCircleIcon, DownloadIcon } from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const IntelligenceDataManager: React.FC = () => {
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    
    const [filters, setFilters] = useState({
        source_name: '',
        publish_date_start: '',
        publish_date_end: '',
    });

    const [sources, setSources] = useState<SystemSource[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);

    // Export State
    const [isExporting, setIsExporting] = useState(false);
    const [exportCount, setExportCount] = useState(0);

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
            setSelectedArticle(null);
        } catch (err: any) {
            alert(`删除失败: ${err.message}`);
        }
    };

    const handleExportCsv = async () => {
        if (isExporting) return;
        setIsExporting(true);
        setExportCount(0);

        try {
            const BATCH_SIZE = 50;
            let currentPage = 1;
            let allItems: InfoItem[] = [];
            let totalItems = 0;

            // 1. Loop to fetch all data
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const response = await getArticles({
                    ...filters,
                    page: currentPage,
                    limit: BATCH_SIZE
                });

                const newItems = response.items || [];
                allItems = [...allItems, ...newItems];
                totalItems = response.total;
                setExportCount(allItems.length);

                // Stop if we fetched fewer than limit (last page) or reached total
                if (newItems.length < BATCH_SIZE || allItems.length >= totalItems) {
                    break;
                }
                currentPage++;
            }

            if (allItems.length === 0) {
                alert("当前筛选条件下无数据可导出");
                return;
            }

            // 2. Generate CSV Content
            const headers = ['标题', '发布日期', '来源', '正文内容'];
            
            // Helper to escape CSV fields
            const escape = (text: string | null | undefined) => {
                if (!text) return '""';
                // Replace double quotes with two double quotes, and wrap in quotes
                return `"${String(text).replace(/"/g, '""')}"`; 
            };

            const csvRows = [headers.join(',')];

            for (const item of allItems) {
                const dateStr = item.publish_date
                    ? new Date(item.publish_date).toLocaleDateString()
                    : new Date(item.created_at).toLocaleDateString();

                const row = [
                    escape(item.title),
                    escape(dateStr),
                    escape(item.source_name),
                    escape(item.content)
                ];
                csvRows.push(row.join(','));
            }

            // Add BOM for Excel to recognize Chinese characters correctly
            const csvString = '\uFEFF' + csvRows.join('\n');

            // 3. Trigger Download
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `文章库导出_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (err: any) {
            alert(`导出失败: ${err.message}`);
        } finally {
            setIsExporting(false);
            setExportCount(0);
        }
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            {/* Filters Bar */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center gap-4 flex-shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <select 
                        name="source_name" 
                        value={filters.source_name} 
                        onChange={handleFilterChange} 
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 min-w-[140px]"
                    >
                        <option value="">所有来源</option>
                        {sources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <input type="date" name="publish_date_start" value={filters.publish_date_start} onChange={handleFilterChange} className="bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    <span>至</span>
                    <input type="date" name="publish_date_end" value={filters.publish_date_end} onChange={handleFilterChange} className="bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                
                <div className="flex-1"></div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border shadow-sm transition-all ${
                            isExporting 
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200'
                        }`}
                        title="导出当前筛选结果为CSV"
                    >
                        {isExporting ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                        <span>{isExporting ? `正在导出 (${exportCount})...` : '导出 CSV'}</span>
                    </button>

                    <button onClick={loadArticles} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Main Content Split View */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* List Area */}
                <div className={`flex-1 flex flex-col bg-white transition-all duration-300 ${selectedArticle ? 'w-1/2 border-r border-slate-200 hidden md:flex' : 'w-full'}`}>
                    {/* Batch Action Bar */}
                    {selectedIds.size > 0 && (
                        <div className="bg-indigo-50 px-6 py-2 text-sm text-indigo-700 flex justify-between items-center animate-in slide-in-from-top-2">
                            <span className="font-medium">已选择 {selectedIds.size} 项</span>
                            <button 
                                onClick={() => setShowDeleteConfirm(true)} 
                                className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-md transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                                批量删除
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-4 w-12">
                                        <div className="flex items-center">
                                            <input type="checkbox" onChange={handleSelectAll} checked={articles.length > 0 && selectedIds.size === articles.length} className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500" />
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3">标题</th>
                                    <th scope="col" className="px-6 py-3 w-32">来源</th>
                                    <th scope="col" className="px-6 py-3 w-32">发布日期</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && articles.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-20"><div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div></td></tr>
                                ) : articles.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-20 text-slate-400">暂无数据</td></tr>
                                ) : (
                                    articles.map(article => (
                                        <tr 
                                            key={article.id} 
                                            className={`border-b hover:bg-slate-50 cursor-pointer transition-colors ${selectedArticle?.id === article.id ? 'bg-indigo-50/60' : 'bg-white'}`}
                                            onClick={() => setSelectedArticle(article)}
                                        >
                                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center">
                                                    <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => handleSelectOne(article.id)} className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-md">{article.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded border border-slate-200">{article.source_name}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{new Date(article.publish_date || article.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm bg-white">
                        <span className="text-slate-500">共 {pagination.total} 条</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page <= 1} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600"><ChevronLeftIcon className="w-4 h-4"/></button>
                            <span className="px-2 self-center font-medium text-slate-700">{pagination.page} / {pagination.totalPages}</span>
                            <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page >= pagination.totalPages} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600"><ChevronRightIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>

                {/* Preview Sidebar */}
                {selectedArticle && (
                    <div className="w-full md:w-1/2 bg-white border-l border-slate-200 shadow-xl flex flex-col absolute md:relative inset-0 z-20 animate-in slide-in-from-right-10 duration-300">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50/50">
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2 mb-2 text-xs">
                                    <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                        {selectedArticle.source_name}
                                    </span>
                                    <span className="text-slate-400 font-mono">
                                        {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 leading-snug">{selectedArticle.title}</h3>
                            </div>
                            <button onClick={() => setSelectedArticle(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-white">
                            <article className="prose prose-sm md:prose-base max-w-none text-slate-700">
                                {selectedArticle.content.split('\n').map((paragraph, index) => (
                                    paragraph.trim() ? <p key={index}>{paragraph}</p> : <br key={index}/>
                                ))}
                            </article>
                        </div>
                        
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                            <button 
                                onClick={() => {
                                    setSelectedIds(new Set([selectedArticle.id]));
                                    setShowDeleteConfirm(true);
                                }}
                                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                            >
                                <TrashIcon className="w-4 h-4" /> 删除此文
                            </button>
                            <a href={selectedArticle.original_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm">
                                查看原文 <ChevronRightIcon className="w-3 h-3"/>
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {showDeleteConfirm && (
                <ConfirmationModal 
                    title="确认删除" 
                    message={`确定要永久删除选中的 ${selectedIds.size} 篇文章吗？此操作不可恢复，同时会删除相关的向量索引。`}
                    onConfirm={handleBatchDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmText="永久删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
