
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderArticle } from '../../../types';
import { 
    getSpiderArticles, 
    deleteSpiderArticle, 
    generateArticleHtml, 
    getArticleHtml, 
    downloadArticlePdf,
    checkIntelGeminiStatus,
    updateIntelGeminiCookies,
    toggleIntelHtmlGeneration,
    toggleRetrospectiveHtmlGeneration
} from '../../../api/intelligence';
import { RefreshIcon, DocumentTextIcon, SparklesIcon, EyeIcon, CloseIcon, TrashIcon, ClockIcon, PlayIcon, StopIcon } from '../../icons';
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

    // --- Gemini Engine State ---
    const [geminiStatus, setGeminiStatus] = useState<{ valid: boolean; message: string } | null>(null);
    const [isCheckingGemini, setIsCheckingGemini] = useState(false);
    const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
    const [cookieForm, setCookieForm] = useState({ secure_1psid: '', secure_1psidts: '' });
    const [isUpdatingCookie, setIsUpdatingCookie] = useState(false);
    const [isHtmlSettingsOpen, setIsHtmlSettingsOpen] = useState(false);
    const [isTogglingHtml, setIsTogglingHtml] = useState(false);
    const [isRetroSettingsOpen, setIsRetroSettingsOpen] = useState(false);
    const [isTogglingRetro, setIsTogglingRetro] = useState(false);

    // --- Gemini Actions ---
    const fetchGeminiStatus = async () => {
        setIsCheckingGemini(true);
        try {
            const res = await checkIntelGeminiStatus();
            setGeminiStatus(res);
        } catch (e) {
            setGeminiStatus({ valid: false, message: 'Check failed' });
        } finally {
            setIsCheckingGemini(false);
        }
    };

    useEffect(() => {
        fetchGeminiStatus();
    }, []);

    const handleUpdateCookie = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cookieForm.secure_1psid || !cookieForm.secure_1psidts) {
            alert('请填写所有必填项');
            return;
        }
        setIsUpdatingCookie(true);
        try {
            await updateIntelGeminiCookies(cookieForm);
            setIsCookieModalOpen(false);
            setCookieForm({ secure_1psid: '', secure_1psidts: '' });
            fetchGeminiStatus();
            alert('Cookie 更新成功');
        } catch (e: any) {
            alert('更新失败: ' + (e.message || '未知错误'));
        } finally {
            setIsUpdatingCookie(false);
        }
    };

    const handleHtmlToggle = async (enabled: boolean) => {
        setIsTogglingHtml(true);
        try {
            const res = await toggleIntelHtmlGeneration(enabled);
            alert(`操作成功: ${res.message}`);
            setIsHtmlSettingsOpen(false);
        } catch (e: any) {
            alert(`操作失败: ${e.message}`);
        } finally {
            setIsTogglingHtml(false);
        }
    };

    const handleRetroToggle = async (enabled: boolean) => {
        setIsTogglingRetro(true);
        try {
            const res = await toggleRetrospectiveHtmlGeneration(enabled);
            alert(`操作成功: ${res.message}`);
            setIsRetroSettingsOpen(false);
        } catch (e: any) {
            alert(`操作失败: ${e.message}`);
        } finally {
            setIsTogglingRetro(false);
        }
    };

    // --- Articles Actions ---
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
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
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
            
            {/* Gemini Engine Toolbar - 直接在 ArticleList 中实现，无需导入 ServiceStatus */}
            <div className="px-4 py-3 border-b bg-purple-50/50 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-gray-700">Gemini 引擎 (v3.1)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${geminiStatus?.valid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {geminiStatus?.valid ? 'Cookie 有效' : 'Cookie 无效'}
                    </span>
                    <button onClick={fetchGeminiStatus} className="text-gray-400 hover:text-gray-600">
                        <RefreshIcon className={`w-3.5 h-3.5 ${isCheckingGemini ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setIsHtmlSettingsOpen(true)}
                        className="text-xs px-3 py-1.5 bg-white border border-purple-100 text-purple-700 rounded-lg hover:bg-purple-50 font-bold transition-colors shadow-sm flex items-center gap-1"
                    >
                        <DocumentTextIcon className="w-3.5 h-3.5"/> HTML 生成
                    </button>
                    <button 
                        onClick={() => setIsRetroSettingsOpen(true)}
                        className="text-xs px-3 py-1.5 bg-white border border-orange-100 text-orange-700 rounded-lg hover:bg-orange-50 font-bold transition-colors shadow-sm flex items-center gap-1"
                    >
                        <ClockIcon className="w-3.5 h-3.5"/> HTML 追溯
                    </button>
                    <button 
                        onClick={() => setIsCookieModalOpen(true)}
                        className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold transition-colors shadow-sm"
                    >
                        更新 Cookie
                    </button>
                </div>
            </div>

            {/* Article List Header */}
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-600"/> 采集文章 ({total})
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

            {/* Gemini Modals */}
            {isCookieModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-purple-600" /> 更新 Gemini Cookie
                            </h3>
                            <button onClick={() => setIsCookieModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCookie} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">__Secure-1PSID</label>
                                <input 
                                    type="password"
                                    value={cookieForm.secure_1psid}
                                    onChange={e => setCookieForm({...cookieForm, secure_1psid: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="输入 __Secure-1PSID 值..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">__Secure-1PSIDTS</label>
                                <input 
                                    type="password"
                                    value={cookieForm.secure_1psidts}
                                    onChange={e => setCookieForm({...cookieForm, secure_1psidts: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="输入 __Secure-1PSIDTS 值..."
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isUpdatingCookie}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isUpdatingCookie ? <WhiteSpinner /> : '保存更新'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isHtmlSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-blue-600" /> HTML 生成管理
                            </h3>
                            <button onClick={() => setIsHtmlSettingsOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                开启后，系统将在爬取文章时自动调用 LLM 将 Markdown 内容转换为美化的 HTML 格式。这可能会增加 Token 消耗。
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={() => handleHtmlToggle(true)}
                                    disabled={isTogglingHtml}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTogglingHtml ? <WhiteSpinner /> : <PlayIcon className="w-4 h-4" />}
                                    开启生成
                                </button>
                                <button 
                                    onClick={() => handleHtmlToggle(false)}
                                    disabled={isTogglingHtml}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTogglingHtml ? <WhiteSpinner /> : <StopIcon className="w-4 h-4" />}
                                    停止生成
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isRetroSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-orange-600" /> HTML 历史追溯
                            </h3>
                            <button onClick={() => setIsRetroSettingsOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                开启后，系统将在后台对历史已采集但未生成HTML的文章进行追溯生成。这会消耗额外的 Token 额度。
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => handleRetroToggle(true)}
                                    disabled={isTogglingRetro}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTogglingRetro ? <WhiteSpinner /> : <PlayIcon className="w-4 h-4" />}
                                    开启追溯
                                </button>
                                <button
                                    onClick={() => handleRetroToggle(false)}
                                    disabled={isTogglingRetro}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTogglingRetro ? <WhiteSpinner /> : <StopIcon className="w-4 h-4" />}
                                    停止追溯
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
