
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticles, deleteSpiderArticle, generateArticleHtml, getArticleHtml, downloadArticlePdf } from '../../../api/intelligence';
import { RefreshIcon, DocumentTextIcon, SparklesIcon, EyeIcon, CloseIcon, TrashIcon } from '../../icons';
import { ArticleDetailModal } from './ArticleDetailModal';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const WhiteSpinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const formatBeijingTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
};

const HtmlViewerModal: React.FC<{ articleId: string; onClose: () => void }> = ({ articleId, onClose }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHtml = async () => {
            setIsLoading(true);
            try {
                const res = await getArticleHtml(articleId);
                setHtmlContent(res.html_content);
            } catch (err: any) {
                setError(err.message || '获取HTML失败');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHtml();
    }, [articleId]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-600"/> HTML 预览
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex-1 bg-white relative overflow-hidden">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>
                    ) : error ? (
                        <div className="absolute inset-0 flex items-center justify-center text-red-500">{error}</div>
                    ) : (
                        <iframe 
                            srcDoc={htmlContent || ''} 
                            className="w-full h-full border-none" 
                            title="HTML Preview"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export const ArticleList: React.FC = () => {
    const [articles, setArticles] = useState<SpiderArticle[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedArticleUuid, setSelectedArticleUuid] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);

    // HTML Generation State
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [viewingHtmlId, setViewingHtmlId] = useState<string | null>(null);
    const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderArticles({ page, limit: 20 });
            setArticles(res.items);
            setTotal(res.total);
            setSelectedIds(new Set()); // Reset selection on page change
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [page]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === articles.length && articles.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(articles.map(a => a.id)));
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteSpiderArticle(deleteId);
            setArticles(prev => prev.filter(a => a.id !== deleteId));
            setDeleteId(null);
        } catch (e: any) {
            alert('删除失败');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleGenerateHtml = async (article: SpiderArticle) => {
        if (generatingId) return;
        setGeneratingId(article.id);
        try {
            await generateArticleHtml(article.id);
            // Optimistically update
            setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_atomized: true } : a));
            alert('HTML 生成任务已触发');
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : 'HTML 生成触发失败';
            alert(msg);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleBatchGenerate = async () => {
        if (selectedIds.size === 0) return;
        setIsBatchGenerating(true);
        try {
            // Since the batch API is generic (process next N), we iterate selected IDs to ensure specific targeting
            const ids = Array.from(selectedIds);
            const promises = ids.map(id => generateArticleHtml(id));
            await Promise.all(promises);
            
            // Optimistically update UI
            setArticles(prev => prev.map(a => selectedIds.has(a.id) ? { ...a, is_atomized: true } : a));
            alert(`已触发 ${ids.length} 篇文章的原子化任务`);
            setSelectedIds(new Set());
        } catch (e: any) {
            alert('批量触发失败，部分任务可能未启动');
        } finally {
            setIsBatchGenerating(false);
        }
    };

    const handleDownloadPdf = async (article: SpiderArticle) => {
        if (pdfDownloadingId === article.id) return;
        setPdfDownloadingId(article.id);
        try {
            const blob = await downloadArticlePdf(article.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${article.title}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            const message = e instanceof Error ? e.message : 'PDF 下载失败';
            alert(message);
        } finally {
            setPdfDownloadingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-600"/> 文章库 ({total})
                    </h3>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <span className="text-xs text-gray-500 font-medium bg-white border px-2 py-1 rounded">已选 {selectedIds.size} 项</span>
                            <button 
                                onClick={handleBatchGenerate}
                                disabled={isBatchGenerating}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70"
                            >
                                {isBatchGenerating ? <WhiteSpinner /> : <SparklesIcon className="w-3.5 h-3.5" />}
                                批量原子化
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={fetchArticles} className="p-2 hover:bg-gray-200 rounded text-gray-500 border bg-white shadow-sm transition-all"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-6 custom-scrollbar">
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 w-10 text-center">
                                    <input type="checkbox" checked={articles.length > 0 && selectedIds.size === articles.length} onChange={toggleAll} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                                </th>
                                <th className="px-6 py-4 font-bold">文章标题</th>
                                <th className="px-6 py-4 w-48 font-bold">来源 / 频道</th>
                                <th className="px-6 py-4 w-28 text-center font-bold">原子化</th>
                                <th className="px-6 py-4 w-40 font-bold">发布时间</th>
                                <th className="px-6 py-4 w-40 font-bold">采集时间</th>
                                <th className="px-6 py-4 w-40 text-center font-bold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {articles.length === 0 && !isLoading ? (
                                <tr><td colSpan={7} className="text-center py-20 text-gray-400">暂无文章数据</td></tr>
                            ) : (
                                articles.map(article => (
                                    <tr key={article.id} className={`hover:bg-gray-50 group transition-colors ${selectedIds.has(article.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => toggleSelect(article.id)}>
                                        <td className="p-4 text-center">
                                            <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => toggleSelect(article.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedArticleUuid(article.id); }}
                                                className="text-left hover:text-indigo-600 hover:underline line-clamp-1 max-w-md font-bold text-sm"
                                                title={article.title}
                                            >
                                                {article.title}
                                            </button>
                                            {article.tags && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    {article.tags.split(',').map(tag => (
                                                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{tag.trim()}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-700">{article.source_name || 'Unknown'}</span>
                                                <span className="text-[10px] text-gray-400">{article.point_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {generatingId === article.id ? (
                                                <div className="flex justify-center"><Spinner /></div>
                                            ) : article.is_atomized ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setViewingHtmlId(article.id); }}
                                                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    title="查看 HTML"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleGenerateHtml(article); }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                    title="生成 HTML"
                                                >
                                                    <SparklesIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">{formatBeijingTime(article.publish_date).split(' ')[0]}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">{formatBeijingTime(article.created_at).split(' ')[0]}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {article.is_atomized && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(article); }}
                                                        disabled={pdfDownloadingId === article.id}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1.5 transition-colors disabled:opacity-50"
                                                        title="下载 PDF"
                                                    >
                                                        {pdfDownloadingId === article.id ? <Spinner /> : <DocumentTextIcon className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeleteId(article.id); }}
                                                    className="text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded p-1.5 transition-colors"
                                                    title="删除文章"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {articles.length === 0 && !isLoading ? (
                        <div className="text-center py-12 text-gray-400">暂无文章数据</div>
                    ) : (
                        articles.map(article => (
                            <div key={article.id} className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 relative overflow-hidden ${selectedIds.has(article.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''}`} onClick={() => toggleSelect(article.id)}>
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => toggleSelect(article.id)} className="w-5 h-5 text-indigo-600 rounded" />
                                </div>
                                
                                <div onClick={(e) => { e.stopPropagation(); setSelectedArticleUuid(article.id); }} className="cursor-pointer pr-8">
                                    <h4 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">
                                        {article.title}
                                    </h4>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold">{article.source_name || 'Unknown'}</span>
                                        <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{article.point_name}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400 font-mono">
                                        发布: {formatBeijingTime(article.publish_date).split(' ')[0]}
                                    </div>
                                </div>
                                
                                <div className="pt-3 border-t border-gray-100 flex justify-between items-center" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                        {article.tags && article.tags.split(',').slice(0,2).map(tag => (
                                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag.trim()}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {article.is_atomized ? (
                                            <button 
                                                onClick={() => setViewingHtmlId(article.id)}
                                                className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 border border-indigo-100"
                                                title="查看 HTML"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleGenerateHtml(article)}
                                                disabled={generatingId === article.id}
                                                className="p-1.5 rounded-lg text-slate-400 bg-slate-50 hover:text-purple-600 hover:bg-purple-50"
                                                title="生成 HTML"
                                            >
                                                {generatingId === article.id ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                            </button>
                                        )}
                                        
                                        {article.is_atomized && (
                                            <button 
                                                onClick={() => handleDownloadPdf(article)}
                                                disabled={pdfDownloadingId === article.id}
                                                className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 rounded-lg disabled:opacity-50"
                                                title="下载 PDF"
                                            >
                                                {pdfDownloadingId === article.id ? <Spinner /> : <DocumentTextIcon className="w-4 h-4" />}
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => setDeleteId(article.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                                            title="删除"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <button 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)} 
                    className="px-4 py-2 border rounded-lg bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    上一页
                </button>
                <span className="text-sm font-medium text-gray-600">第 {page} 页</span>
                <button 
                    disabled={articles.length < 20} 
                    onClick={() => setPage(p => p + 1)} 
                    className="px-4 py-2 border rounded-lg bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    下一页
                </button>
            </div>

            {selectedArticleUuid && (
                <ArticleDetailModal 
                    articleUuid={selectedArticleUuid} 
                    onClose={() => setSelectedArticleUuid(null)} 
                />
            )}

            {viewingHtmlId && (
                <HtmlViewerModal 
                    articleId={viewingHtmlId} 
                    onClose={() => setViewingHtmlId(null)} 
                />
            )}

            {deleteId && (
                <ConfirmationModal
                    title="删除文章"
                    message="确定要永久删除这篇文章吗？此操作将同时清除相关的向量数据且不可撤销。"
                    confirmText="确认删除"
                    variant="destructive"
                    isLoading={isDeleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                />
            )}
        </div>
    );
};
