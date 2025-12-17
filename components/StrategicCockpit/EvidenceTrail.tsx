
import React, { useState, useEffect, useMemo } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon, ArrowRightIcon, DownloadIcon, SparklesIcon, ExternalLinkIcon } from '../icons';
import { getArticleHtml, generateArticleHtml, downloadArticlePdf, getSpiderArticleDetail } from '../../api/intelligence';

// 为从CDN加载的 `marked` 库提供类型声明
declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

interface EvidenceTrailProps {
    selectedArticle: InfoItem | null;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ selectedArticle }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [fullContent, setFullContent] = useState<string>('');
    const [articleUrl, setArticleUrl] = useState<string>('');
    const [isHtmlLoading, setIsHtmlLoading] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch Content logic
    useEffect(() => {
        if (!selectedArticle) return;
        
        let active = true;
        setHtmlContent(null);
        setFullContent(selectedArticle.content || '');
        setArticleUrl(selectedArticle.original_url || ''); // Init from prop
        
        const loadData = async () => {
            // Always fetch detail if URL is missing or content is too short (likely summary from list)
            const needsDetail = !selectedArticle.original_url || !selectedArticle.content || selectedArticle.content.length < 100;

            if (needsDetail) {
                if (!selectedArticle.is_atomized) setIsContentLoading(true);
                try {
                    const detail = await getSpiderArticleDetail(selectedArticle.id);
                    if (active) {
                        if (detail.original_url) setArticleUrl(detail.original_url);
                        if (detail.content) setFullContent(detail.content);
                    }
                } catch(e) {
                    console.error("Failed to fetch article detail", e);
                } finally {
                    if (active) setIsContentLoading(false);
                }
            }

            if (selectedArticle.is_atomized) {
                setIsHtmlLoading(true);
                try {
                    const htmlRes = await getArticleHtml(selectedArticle.id);
                    if (active && htmlRes && htmlRes.html_content) {
                        setHtmlContent(htmlRes.html_content);
                    }
                } catch (error) {
                    console.error("Failed to load HTML", error);
                } finally {
                    if (active) setIsHtmlLoading(false);
                }
            }
        };

        loadData();

        return () => { active = false; };
    }, [selectedArticle]);

    const handleDownloadPdf = async () => {
        if (!selectedArticle) return;
        setIsDownloading(true);
        try {
            const blob = await downloadArticlePdf(selectedArticle.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedArticle.title}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            alert('下载失败: ' + (e.message || '系统繁忙，请稍后再试'));
        } finally {
            setIsDownloading(false);
        }
    };
    
    const fallbackArticleHtml = useMemo(() => {
        if (!fullContent) return '';

        if (window.marked && typeof window.marked.parse === 'function') {
            const markdownWithStyledImages = fullContent.replace(
                /!\[(.*?)\]\((.*?)\)/g,
                '<figure class="my-6"><img src="$2" alt="$1" class="rounded-lg w-full object-cover shadow-sm"><figcaption class="text-center text-xs text-gray-500 mt-2">$1</figcaption></figure>'
            );
            return window.marked.parse(markdownWithStyledImages);
        }

        const escapedContent = fullContent
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return escapedContent.split('\n').map(p => `<p>${p}</p>`).join('');

    }, [fullContent]);

    if (!selectedArticle) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-2">AI 智能研报</h3>
                <p className="text-slate-500 text-sm">请从左侧选择一项情报</p>
            </div>
        );
    }

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header - Ultra Compact */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur z-20 px-4 py-3 md:px-5 md:py-3">
                
                {/* Desktop View: Single Row Layout */}
                <div className="hidden md:flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        {/* Meta */}
                        <span className="flex-shrink-0 font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs">
                            {selectedArticle.source_name}
                        </span>
                        <span className="flex-shrink-0 text-slate-400 text-xs border-r border-slate-200 pr-3 mr-1">
                            {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                        </span>
                        
                        {/* Title (Truncated) */}
                        <h3 className="font-bold text-slate-900 text-base truncate" title={selectedArticle.title}>
                            {selectedArticle.title}
                        </h3>

                        {/* AI Status Badge */}
                        {selectedArticle.is_atomized && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 flex-shrink-0">
                                <SparklesIcon className="w-3 h-3 text-purple-600" />
                                <span className="text-[10px] font-bold text-purple-600">已原子化</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {htmlContent && (
                            <button 
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                title="下载 PDF 报告"
                            >
                                {isDownloading ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                                PDF
                            </button>
                        )}
                        <div className="h-4 w-px bg-slate-200 mx-1"></div>
                        
                        {articleUrl ? (
                            <a 
                                href={articleUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors text-xs font-bold"
                                title="阅读原文"
                            >
                                <ExternalLinkIcon className="w-3.5 h-3.5" />
                                阅读原文
                            </a>
                        ) : (
                            <button 
                                disabled
                                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 bg-slate-50 rounded-lg text-xs font-bold cursor-not-allowed"
                                title="链接不可用"
                            >
                                <ExternalLinkIcon className="w-3.5 h-3.5" />
                                暂无链接
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile View: Stacked Layout */}
                <div className="md:hidden flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                {selectedArticle.source_name}
                            </span>
                            {selectedArticle.is_atomized && (
                                <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                                    <SparklesIcon className="w-3 h-3" /> 原子化
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {htmlContent && (
                                <button 
                                    onClick={handleDownloadPdf}
                                    disabled={isDownloading}
                                    className="p-1.5 text-red-500 bg-red-50 rounded-lg disabled:opacity-50"
                                >
                                    {isDownloading ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                                </button>
                            )}
                            {articleUrl && (
                                <a 
                                    href={articleUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="p-1.5 text-slate-600 bg-slate-100 rounded-lg"
                                >
                                    <ArrowRightIcon className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                        {selectedArticle.title}
                    </h3>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white overflow-hidden relative">
                {(isHtmlLoading || isContentLoading) ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                        <p className="text-sm font-medium">正在加载内容...</p>
                    </div>
                ) : htmlContent ? (
                    <div className="h-full w-full bg-slate-50">
                        <iframe 
                            srcDoc={htmlContent} 
                            className="w-full h-full border-none" 
                            title="Article Content"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-6 md:px-10 md:py-8 custom-scrollbar bg-white">
                        <article 
                            className="prose prose-sm md:prose-base prose-slate max-w-none 
                                prose-headings:font-bold prose-headings:text-slate-900
                                prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-4
                                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                                prose-img:rounded-lg prose-img:shadow-sm
                                prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-indigo-800"
                            dangerouslySetInnerHTML={{ __html: fallbackArticleHtml }}
                        />
                    </div>
                )}
            </div>
        </aside>
    );
};
