
import React, { useState, useEffect, useMemo } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon, ExternalLinkIcon, ClockIcon, ChevronLeftIcon, ShieldCheckIcon, ArrowRightIcon, GlobeIcon, LinkIcon } from '../icons';
import { getSpiderArticleDetail } from '../../api/intelligence';
import { marked } from 'marked';

interface EvidenceTrailProps {
    selectedArticle: InfoItem | null;
    onBack?: () => void;
}

// Helper to unescape unicode characters in content
const unescapeUnicode = (str: string) => {
    return str.replace(/\\u([0-9a-fA-F]{4})/gi, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });
}

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ selectedArticle, onBack }) => {
    const [fullContent, setFullContent] = useState<string>('');
    const [articleUrl, setArticleUrl] = useState<string>('');
    const [displayTitle, setDisplayTitle] = useState<string>('');
    const [isRefined, setIsRefined] = useState<boolean>(false);
    const [isContentLoading, setIsContentLoading] = useState(false);

    // Fetch Content logic
    useEffect(() => {
        if (!selectedArticle) return;
        
        let active = true;
        
        // Initial set from list object
        setArticleUrl(selectedArticle.original_url || ''); 
        setDisplayTitle(selectedArticle.refined_title || selectedArticle.title);
        
        // Use refined_content if available, otherwise content
        if (selectedArticle.refined_content) {
            setFullContent(selectedArticle.refined_content);
            setIsRefined(true);
        } else {
            setFullContent(selectedArticle.content || '');
            setIsRefined(false);
        }
        
        const loadData = async () => {
            // Check if we need to fetch details (content missing/short or need to check for refined content on server)
            const needsDetail = !selectedArticle.original_url || 
                                (!selectedArticle.refined_content && (!selectedArticle.content || selectedArticle.content.length < 100));

            if (needsDetail) {
                setIsContentLoading(true);
                try {
                    const detail = await getSpiderArticleDetail(selectedArticle.id);
                    if (active) {
                        if (detail.original_url) setArticleUrl(detail.original_url);
                        
                        // Update title/content logic based on detail
                        // Prioritize refined fields
                        const titleToUse = detail.refined_title || detail.title;
                        const contentToUse = detail.refined_content || detail.content || '';
                        
                        setDisplayTitle(titleToUse);
                        setFullContent(contentToUse);
                        setIsRefined(!!detail.refined_content);
                    }
                } catch(e) {
                    console.error("Failed to fetch article detail", e);
                } finally {
                    if (active) setIsContentLoading(false);
                }
            }
        };

        loadData();

        return () => { active = false; };
    }, [selectedArticle]);
    
    const renderedMarkdown = useMemo(() => {
        if (!fullContent) return '';

        // Unescape unicode characters
        const decodedContent = unescapeUnicode(fullContent);

        try {
            // Use marked to parse markdown
            return marked.parse(decodedContent) as string;
        } catch (e) {
             // Fallback for simple text display if parsing fails
             return `<p>${decodedContent}</p>`;
        }
    }, [fullContent]);

    if (!selectedArticle) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/50 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-slate-100 border border-slate-100">
                    <DocumentTextIcon className="w-10 h-10 text-slate-300 opacity-60" />
                </div>
                <h3 className="font-bold text-xl text-slate-700 mb-2 font-serif">情报详情预览</h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed font-medium">
                    请从左侧列表选择一篇文章，AI 将为您展示深度解析内容。
                </p>
            </div>
        );
    }

    const formattedDate = new Date(selectedArticle.publish_date || selectedArticle.created_at)
        .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\//g, '.');

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden relative shadow-2xl z-30 font-serif">
             
            {/* --- Compact Header (High Efficiency) --- */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 z-10 px-8 py-6 md:px-10 md:py-8">
                
                {/* Top Row: Meta & Actions */}
                <div className="flex items-center justify-between mb-4 font-sans">
                    <div className="flex items-center gap-3">
                         {/* Mobile Back */}
                        {onBack && (
                            <button onClick={onBack} className="md:hidden mr-1 p-1 -ml-2 text-slate-500">
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                        )}
                        
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md text-[11px] uppercase tracking-wide">
                            {selectedArticle.source_name}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 font-bold text-[11px] tracking-wide">
                            {formattedDate}
                        </span>
                        
                        {isRefined && (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100" title="内容已由AI重构，规避版权风险">
                                <ShieldCheckIcon className="w-3 h-3" />
                                <span className="text-[10px] uppercase tracking-wider">AI Refined</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {articleUrl && (
                            <a 
                                href={articleUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200"
                            >
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">原文</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Main Title - Elegant Serif */}
                <h1 className="font-serif font-bold text-2xl md:text-3xl lg:text-4xl text-slate-900 leading-tight tracking-tight">
                    {displayTitle}
                </h1>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white overflow-hidden relative">
                {isContentLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 font-sans">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                        <p className="text-xs font-bold tracking-widest uppercase animate-pulse">Loading Content...</p>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-8 md:px-12 md:py-10 custom-scrollbar bg-white scroll-smooth">
                        <article 
                            className="
                                prose prose-lg md:prose-xl max-w-4xl mx-auto
                                text-[#334155] 
                                font-serif 
                                leading-loose 
                                tracking-normal
                                prose-headings:font-bold prose-headings:text-slate-900 prose-headings:font-sans prose-headings:tracking-tight prose-headings:mt-10 prose-headings:mb-6
                                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                                prose-p:mb-6 prose-p:leading-[2] prose-p:text-slate-700
                                prose-li:leading-[1.8] prose-li:text-slate-700
                                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline hover:prose-a:text-indigo-700
                                prose-strong:font-bold prose-strong:text-slate-900
                                prose-img:rounded-2xl prose-img:shadow-xl prose-img:my-10 prose-img:border prose-img:border-slate-100
                                prose-blockquote:border-l-4 prose-blockquote:border-indigo-300 prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-slate-500 prose-blockquote:bg-slate-50/50 prose-blockquote:rounded-r-lg
                                prose-code:font-mono prose-code:text-sm prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-indigo-600
                                prose-hr:border-slate-100 prose-hr:my-12
                            "
                            style={{ fontFamily: '"Songti SC", "STSong", "SimSun", "Times New Roman", serif' }}
                            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                        />
                         <div className="mt-20 pt-10 border-t border-slate-50 text-center pb-10 font-sans flex items-center justify-center gap-4">
                             <div className="w-12 h-px bg-slate-200"></div>
                             <p className="text-[10px] text-slate-300 uppercase tracking-[0.3em] font-bold">End of Document</p>
                             <div className="w-12 h-px bg-slate-200"></div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
