
import React, { useState, useEffect, useMemo } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticleDetail } from '../../../api/intelligence';
import { CloseIcon, ExternalLinkIcon, ClockIcon } from '../../icons';
import { marked } from 'marked';

interface ArticleDetailModalProps {
    articleUuid: string;
    onClose: () => void;
}

const formatBeijingTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
};

// Helper to unescape unicode characters
const unescapeUnicode = (str: string) => {
    return str.replace(/\\u([0-9a-fA-F]{4})/gi, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ articleUuid, onClose }) => {
    const [article, setArticle] = useState<SpiderArticle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetail = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await getSpiderArticleDetail(articleUuid);
                setArticle(data);
            } catch (err: any) {
                setError(err.message || '加载文章详情失败');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [articleUuid]);

    const contentHtml = useMemo(() => {
        if (!article?.content) return '';
        
        const decodedContent = unescapeUnicode(article.content);
        
        try {
            return marked.parse(decodedContent) as string;
        } catch (e) {
            return `<pre class="whitespace-pre-wrap font-sans text-gray-700">${decodedContent}</pre>`;
        }
    }, [article]);

    const renderContent = () => {
        if (isLoading) return <div className="p-10 text-center text-gray-500">加载中...</div>;
        if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
        if (!article) return <div className="p-10 text-center text-gray-500">未找到文章</div>;

        return (
            <div className="flex flex-col h-full">
                <div className="p-6 border-b bg-white flex justify-between items-start">
                    <div className="pr-8">
                        <h2 className="text-xl font-bold text-gray-900 leading-snug">{article.title}</h2>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                            {article.publish_date && (
                                <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                    <ClockIcon className="w-3 h-3" /> 发布: {formatBeijingTime(article.publish_date)}
                                </span>
                            )}
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                <ClockIcon className="w-3 h-3" /> 采集: {formatBeijingTime(article.created_at)}
                            </span>
                            <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                <ExternalLinkIcon className="w-3 h-3"/> 原文链接
                            </a>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    <article className="prose prose-sm md:prose-base max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: contentHtml }} />
                </div>
            </div>
        );
    };

    // Removed bg-black/50 backdrop-blur-sm, kept positioning and centering.
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-gray-200">
                {renderContent()}
            </div>
        </div>
    );
};
