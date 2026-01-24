
import React, { useState, useEffect, useMemo } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon, ExternalLinkIcon, ClockIcon, ChevronLeftIcon, ShieldCheckIcon } from '../icons';
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
            // Basic sanitization should be handled by marked or a separate library if untrusted input
            return marked.parse(decodedContent) as string;
        } catch (e) {
             // Fallback for simple text display if parsing fails
             return `<p>${decodedContent}</p>`;
        }
    }, [fullContent]);

    if (!selectedArticle) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/50 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                    <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-2">情报详情预览</h3>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                    请从左侧列表选择一篇文章，AI 将为您展示深度解析内容。
                </p>
            </div>
        );
    }

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden relative shadow-xl z-30 font-serif">
             {/* Note: font-serif applied to container for heritage feel */}
             
            {/* Header - Modern & Clean */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-white z-20 font-sans">
                <div className="px-4 py-4 md:px-6 md:py-5 flex gap-3">
                    {/* Mobile Back Button */}
                    {onBack && (
                        <button 
                            onClick={onBack} 
                            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 h-fit"
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 text-xs">
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md uppercase tracking-wide font-sans">
                                {selectedArticle.source_name}
                            </span>
                            <span className="text-slate-400 flex items-center gap-1 font-medium font-sans">
                                <ClockIcon className="w-3.5 h-3.5" />
                                {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric'})}
                            </span>

                            {isRefined && (
                                <div className="flex items-center gap-1 text-green-600 font-bold ml-auto" title="内容已由AI重构，规避版权风险">
                                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase tracking-wider font-sans">AI Refined</span>
                                </div>
                            )}
                        </div>
                        
                        <h3 className="font-extrabold text-slate-900 text-lg md:text-xl md:text-2xl leading-tight line-clamp-3 md:line-clamp-none font-serif tracking-tight">
                            {displayTitle}
                        </h3>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-end font-sans">
                    {articleUrl ? (
                        <a 
                            href={articleUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            阅读原文 <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                    ) : (
                         <span className="text-xs text-slate-300 cursor-not-allowed">原文链接失效</span>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white overflow-hidden relative">
                {isContentLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 font-sans">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                        <p className="text-sm font-medium animate-pulse">正在加载深度内容...</p>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-6 md:px-10 md:py-8 custom-scrollbar bg-white scroll-smooth">
                        <article 
                            className="
                                prose prose-base md:prose-lg max-w-none 
                                text-[#1a202c] 
                                font-serif 
                                leading-loose 
                                tracking-normal
                                prose-headings:font-bold prose-headings:text-slate-900 prose-headings:font-sans
                                prose-p:mb-6 prose-p:leading-[2]
                                prose-li:leading-[1.8]
                                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                                prose-strong:font-bold prose-strong:text-slate-900
                                prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                                prose-blockquote:border-l-4 prose-blockquote:border-slate-200 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-500
                            "
                            style={{ fontFamily: '"Songti SC", "STSong", "SimSun", "Times New Roman", serif' }}
                            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                        />
                         <div className="mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-300 pb-8 font-sans">
                            — END OF DOCUMENT —
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
