
import React, { useState, useEffect, useMemo } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon, ArrowRightIcon, DownloadIcon, SparklesIcon, SearchIcon, CalendarIcon, CloseIcon, BrainIcon } from '../icons';
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
    onSearch?: (keywords: string, startDate?: string, endDate?: string) => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- AI Search Modal Placeholder ---
const AiSearchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-3xl h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-wide">AI 智能情报检索</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Body Placeholder */}
                <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                        <BrainIcon className="w-12 h-12 text-indigo-400" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 mb-2">AI 对话接口即将上线</h4>
                    <p className="text-slate-500 max-w-sm">正在接入大模型 API，届时您可以通过自然语言对话，深度挖掘情报库中的隐性关联与趋势。</p>
                </div>
            </div>
        </div>
    );
};

// --- Top Control Bar Component ---
const ControlBar: React.FC<{ onSearch?: (k: string, s: string, e: string) => void, onOpenAi: () => void }> = ({ onSearch, onOpenAi }) => {
    const [keywords, setKeywords] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleSearch = () => {
        if (onSearch) onSearch(keywords, startDate, endDate);
    };

    return (
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-4 shadow-sm z-20">
            <div className="flex flex-col xl:flex-row gap-3">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={keywords}
                        onChange={e => setKeywords(e.target.value)}
                        placeholder="输入关键词，多个词组以顿号 (、) 隔开"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent text-sm text-slate-600 outline-none w-28 cursor-pointer" 
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent text-sm text-slate-600 outline-none w-28 cursor-pointer" 
                        />
                    </div>
                    <button 
                        onClick={handleSearch}
                        className="px-5 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                    >
                        检索
                    </button>
                </div>
            </div>
            
            <button 
                onClick={onOpenAi}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group"
            >
                <SparklesIcon className="w-4 h-4 text-yellow-300 group-hover:animate-spin-slow" />
                <span className="tracking-wide">AI 深度洞察检索</span>
            </button>
        </div>
    );
};

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ selectedArticle, onSearch }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [fullContent, setFullContent] = useState<string>('');
    const [isHtmlLoading, setIsHtmlLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isReconstructing, setIsReconstructing] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    // Fetch HTML content or trigger generation on article select
    useEffect(() => {
        if (!selectedArticle) return;
        
        let active = true;
        setHtmlContent(null);
        setFullContent(selectedArticle.content || ''); // Start with what we have
        setIsHtmlLoading(true);
        setIsReconstructing(false);

        const loadData = async () => {
            try {
                // 1. Try to fetch existing HTML
                const htmlRes = await getArticleHtml(selectedArticle.id).catch(() => null);
                
                if (active) {
                    if (htmlRes && htmlRes.html_content && htmlRes.html_content.trim().length > 0) {
                        // Success: Show HTML
                        setHtmlContent(htmlRes.html_content);
                        setIsHtmlLoading(false);
                    } else {
                        // Fail: HTML not ready
                        // a. Mark as reconstructing
                        setIsReconstructing(true);
                        
                        // b. Trigger generation in background (fire and forget)
                        generateArticleHtml(selectedArticle.id).catch(e => console.warn("Auto-generation trigger failed", e));
                        
                        // c. Fetch full original content details to ensure we have the complete text
                        try {
                            const detail = await getSpiderArticleDetail(selectedArticle.id);
                            if (active && detail.content) {
                                setFullContent(detail.content);
                            }
                        } catch (err) {
                            console.warn("Failed to fetch full article detail", err);
                        } finally {
                            if (active) setIsHtmlLoading(false);
                        }
                    }
                }
            } catch (error) {
                // Fallback
                if (active) setIsHtmlLoading(false);
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

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Top Control Bar (Search & AI) */}
            <ControlBar onSearch={onSearch} onOpenAi={() => setIsAiModalOpen(true)} />

            {/* AI Modal */}
            {isAiModalOpen && <AiSearchModal onClose={() => setIsAiModalOpen(false)} />}

            {/* Empty State */}
            {!selectedArticle && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                        <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="font-bold text-xl text-slate-800 mb-2">请选择一篇情报</h3>
                    <p className="text-slate-500 text-sm max-w-xs">点击左侧列表查看详情，或使用上方工具进行检索</p>
                </div>
            )}

            {/* Article Viewer */}
            {selectedArticle && (
                <>
                    {/* Compact Meta Header */}
                    <div className="flex-shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur z-10 px-6 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded text-xs">
                                        {selectedArticle.source_name}
                                    </span>
                                    <span className="text-slate-400 text-xs flex items-center gap-1">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric'})}
                                    </span>
                                    {isReconstructing && (
                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1 animate-pulse">
                                            <SparklesIcon className="w-3 h-3" /> AI重构中
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg leading-snug" title={selectedArticle.title}>
                                    {selectedArticle.title}
                                </h3>
                            </div>

                            <div className="flex flex-col gap-2">
                                {htmlContent && (
                                    <button 
                                        onClick={handleDownloadPdf}
                                        disabled={isDownloading}
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                        title="下载 PDF 报告"
                                    >
                                        {isDownloading ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                                        PDF
                                    </button>
                                )}
                                <a 
                                    href={selectedArticle.original_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-colors"
                                >
                                    原文 <ArrowRightIcon className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-white overflow-hidden relative">
                        {isHtmlLoading ? (
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
                </>
            )}
        </aside>
    );
};
