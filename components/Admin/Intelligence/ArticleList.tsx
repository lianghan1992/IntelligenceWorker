
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticles } from '../../../api/intelligence';
import { RefreshIcon, ExternalLinkIcon, ViewGridIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '../../icons';
import { ArticleDetailModal } from './ArticleDetailModal';

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

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">已采集文章 ({total})</h3>
                <button onClick={fetchArticles} className="p-2 hover:bg-gray-200 rounded text-gray-500"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0">
                        <tr>
                            <th className="px-6 py-3">标题</th>
                            <th className="px-6 py-3 w-24 text-center">原子化</th>
                            <th className="px-6 py-3">原始链接</th>
                            <th className="px-6 py-3">发布时间 (北京)</th>
                            <th className="px-6 py-3">采集时间 (北京)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {articles.length === 0 && !isLoading ? (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-400">暂无文章数据</td></tr>
                        ) : (
                            articles.map(article => (
                                <tr key={article.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <button 
                                            onClick={() => setSelectedArticleUuid(article.id)}
                                            className="text-left hover:text-indigo-600 hover:underline line-clamp-1 max-w-md"
                                        >
                                            {article.title}
                                        </button>
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
                                    <td className="px-6 py-4">
                                        <a href={article.original_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            <ExternalLinkIcon className="w-3 h-3"/> 查看
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono">{formatBeijingTime(article.publish_date)}</td>
                                    <td className="px-6 py-4 text-xs font-mono">{formatBeijingTime(article.created_at)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Simple Pagination */}
            <div className="p-3 border-t bg-gray-50 flex justify-between items-center">
                <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50">上一页</button>
                <span className="text-sm text-gray-600">Page {page}</span>
                <button disabled={articles.length < 20} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50">下一页</button>
            </div>

            {selectedArticleUuid && (
                <ArticleDetailModal 
                    articleUuid={selectedArticleUuid} 
                    onClose={() => setSelectedArticleUuid(null)} 
                />
            )}
        </div>
    );
};
