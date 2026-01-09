
import React, { useState, useEffect, useMemo } from 'react';
import { InfoItem } from '../../types';
import { DownloadIcon, ExternalLinkIcon, ChevronRightIcon, SparklesIcon } from '../icons';
import { getArticleHtml, downloadArticlePdf, getSpiderArticleDetail } from '../../api/intelligence';

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
    <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const unescapeUnicode = (str: string) => {
    return str.replace(/\\u([0-9a-fA-F]{4})/gi, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });
}

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ selectedArticle }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [fullContent, setFullContent] = useState<string>('');
    const [articleUrl, setArticleUrl] = useState<string>('');
    const [isHtmlLoading, setIsHtmlLoading] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (!selectedArticle) return;
        
        let active = true;
        setHtmlContent(null);
        setFullContent(selectedArticle.content || '');
        setArticleUrl(selectedArticle.original_url || ''); 
        
        const loadData = async () => {
            const needsDetail = !selectedArticle.original_url || !selectedArticle.content || selectedArticle.content.length < 100;

            if (needsDetail) {
                setIsContentLoading(true);
                try {
                    const detail = await getSpiderArticleDetail(selectedArticle.id);
                    if (active) {
                        if (detail.original_url) setArticleUrl(detail.original_url);
                        if (detail.content) setFullContent(detail.content);
                        if (detail.is_atomized) selectedArticle.is_atomized = true;
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
            alert('下载失败');
        } finally {
            setIsDownloading(false);
        }
    };
    
    const fallbackArticleHtml = useMemo(() => {
        if (!fullContent) return '';
        const decodedContent = unescapeUnicode(fullContent);

        if (window.marked && typeof window.marked.parse === 'function') {
            const markdownWithStyledImages = decodedContent.replace(
                /!\[(.*?)\]\((.*?)\)/g,
                '<figure class="my-6"><img src="$2" alt="$1" class="rounded-lg w-full object-cover shadow-sm"><figcaption class="text-center text-xs text-gray-500 mt-2">$1</figcaption></figure>'
            );
            return window.marked.parse(markdownWithStyledImages);
        }

        const escapedContent = decodedContent
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return escapedContent.split('\n').map(p => `<p>${p}</p>`).join('');

    }, [fullContent]);

    if (!selectedArticle) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFC]">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                    <span className="text-2xl opacity-20">📄</span>
                </div>
                <h3 className="font-bold text-lg text-slate-700 mb-1">Market Intelligence</h3>
                <p className="text-slate-400 text-sm">Select an item to view report</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden relative">
            {/* Reference Style Header */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="hover:text-indigo-600 cursor-pointer transition-colors">Intelligence</span>
                    <ChevronRightIcon className="w-3 h-3 text-slate-300" />
                    <span className="text-slate-900">Report View</span>
                </div>
                <div className="flex items-center gap-3">
                     {htmlContent && (
                        <button 
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                            {isDownloading ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                            Export PDF
                        </button>
                    )}
                     {articleUrl && (
                        <a 
                            href={articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                            Original
                        </a>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar">
                <div className="max-w-4xl mx-auto pb-20">
                    {/* Article Header */}
                    <div className="mb-8 border-b border-slate-200 pb-6">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-indigo-600 font-bold tracking-widest text-xs uppercase">{selectedArticle.source_name}</span>
                             {selectedArticle.is_atomized && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600">
                                    <SparklesIcon className="w-3 h-3" /> AI Processed
                                </span>
                             )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                            {selectedArticle.title}
                        </h1>
                        <p className="mt-4 text-xs font-mono text-slate-400 uppercase">
                            Published: {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleString()}
                        </p>
                    </div>

                    {/* Body */}
                    {(isHtmlLoading || isContentLoading) ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                            <p className="text-sm font-medium">Retrieving content...</p>
                        </div>
                    ) : htmlContent ? (
                         <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <iframe 
                                srcDoc={htmlContent} 
                                className="w-full min-h-[800px] border-none" 
                                title="Article Content"
                                sandbox="allow-scripts allow-same-origin"
                                onLoad={(e) => {
                                    // Adjust height to fit content
                                    const iframe = e.currentTarget;
                                    setTimeout(() => {
                                        if(iframe.contentWindow) {
                                            iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
                                        }
                                    }, 500);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                             <article 
                                className="prose prose-slate max-w-none 
                                    prose-headings:font-bold prose-headings:text-slate-900 prose-headings:tracking-tight
                                    prose-p:text-slate-600 prose-p:leading-7
                                    prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                                    prose-strong:text-slate-800 prose-strong:font-bold
                                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r
                                    prose-li:text-slate-600"
                                dangerouslySetInnerHTML={{ __html: fallbackArticleHtml }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
