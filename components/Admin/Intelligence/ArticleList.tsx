
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticles, deleteSpiderArticle, generateArticleHtml } from '../../../api/intelligence';
import { RefreshIcon, ExternalLinkIcon, CheckCircleIcon, QuestionMarkCircleIcon, TrashIcon, DocumentTextIcon, RssIcon, TagIcon, SparklesIcon } from '../../icons';
import { ArticleDetailModal } from './ArticleDetailModal';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const formatBeijingTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
};

export const ArticleList: React.FC = () => {
    const [articles, setArticles] = useState<SpiderArticle[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedArticleUuid, setSelectedArticleUuid] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // HTML Generation State
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderArticles({ page, limit: 20 });
            setArticles(res.items);
            setTotal(res.total);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [page]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

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
            alert('HTML 生成触发失败');
        } finally {
            setGeneratingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-indigo-600"/> 文章库 ({total})
                </h3>
                <button onClick={fetchArticles} className="p-2 hover:bg-gray-200 rounded text-gray-500 border bg-white shadow-sm transition-all"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-6 custom-scrollbar">
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-bold">文章标题</th>
                                <th className="px-6 py-4 w-48 font-bold">来源 / 频道</th>
                                <th className="px-6 py-4 w-24 text-center font-bold">原子化</th>
                                <th className="px-6 py-4 w-40 font-bold">发布时间</th>
                                <th className="px-6 py-4 w-40 font-bold">采集时间</th>
                                <th className="px-6 py-4 w-32 text-center font-bold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {articles.length === 0 && !isLoading ? (
                                <tr><td colSpan={6} className="text-center py-20 text-gray-400">暂无文章数据</td></tr>
                            ) : (
                                articles.map(article => (
                                    <tr key={article.id} className="hover:bg-gray-50 group transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <button 
                                                onClick={() => setSelectedArticleUuid(article.id)}
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
                                            {article.is_atomized ? (
                                                <span title="已原子化" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </span>
                                            ) : (
                                                <span title="未原子化" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400">
                                                    <QuestionMarkCircleIcon className="w-4 h-4" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">{formatBeijingTime(article.publish_date).split(' ')[0]}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">{formatBeijingTime(article.created_at).split(' ')[0]}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleGenerateHtml(article)}
                                                    disabled={generatingId === article.id}
                                                    className="text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded p-1.5 transition-colors disabled:opacity-50"
                                                    title="原子化 (生成 HTML)"
                                                >
                                                    {generatingId === article.id ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteId(article.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1.5 transition-colors"
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
                            <div key={article.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2">
                                    {article.is_atomized ? (
                                        <CheckCircleIcon className="w-5 h-5 text-green-500 opacity-20" />
                                    ) : (
                                        <QuestionMarkCircleIcon className="w-5 h-5 text-gray-300 opacity-20" />
                                    )}
                                </div>
                                <div onClick={() => setSelectedArticleUuid(article.id)} className="cursor-pointer">
                                    <div className="flex justify-between items-start gap-2 pr-6">
                                        <h4 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">
                                            {article.title}
                                        </h4>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold">{article.source_name || 'Unknown'}</span>
                                        <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{article.point_name}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400 font-mono">
                                        发布: {formatBeijingTime(article.publish_date).split(' ')[0]}
                                    </div>
                                </div>
                                
                                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        {article.tags && article.tags.split(',').slice(0,2).map(tag => (
                                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag.trim()}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleGenerateHtml(article)}
                                            disabled={generatingId === article.id}
                                            className="text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {generatingId === article.id ? <Spinner /> : <SparklesIcon className="w-3.5 h-3.5" />} 原子化
                                        </button>
                                        <button 
                                            onClick={() => setDeleteId(article.id)}
                                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg"
                                        >
                                            删除
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
