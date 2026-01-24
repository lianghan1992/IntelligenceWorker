
import React, { useState, useEffect, useMemo } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon, ExternalLinkIcon, ClockIcon, ChevronLeftIcon, ShieldCheckIcon, ArrowRightIcon, GlobeIcon } from '../icons';
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

    const formattedDate = new Date(selectedArticle.publish_date || selectedArticle.created_at)
        .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\//g, '.');

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden relative shadow-xl z-30 font-serif">
             
            {/* --- Poster Style Header --- */}
            <div className="flex-shrink-0 relative overflow-hidden bg-slate-50 border-b border-slate-200">
                {/* Background Decor */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
                     style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>
                <div className="absolute -right-10 -top-10 text-slate-200 pointer-events-none opacity-20 transform rotate-12 z-0">
                    <DocumentTextIcon className="w-64 h-64" />
                </div>
                
                {/* Mobile Back */}
                {onBack && (
                    <button 
                        onClick={onBack} 
                        className="md:hidden absolute top-4 left-4 p-2 bg-white/80 backdrop-blur border border-slate-200 rounded-full shadow-sm z-20"
                    >
                        <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
                    </button>
                )}

                <div className="relative z-10 px-8 py-10 md:p-12 flex flex-col gap-6">
                    {/* Meta Top Line */}
                    <div className="flex flex-wrap items-center gap-4 font-sans">
                        <span className="bg-slate-900 text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-md">
                            {selectedArticle.source_name}
                        </span>
                        <div className="h-px w-8 bg-slate-300"></div>
                        <span className="flex items-center gap-1.5 text-slate-500 font-mono text-xs font-bold tracking-widest">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formattedDate}
                        </span>
                        {isRefined && (
                            <div className="ml-auto md:ml-4 flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                                <ShieldCheckIcon className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-wider">AI Refined</span>
                            </div>
                        )}
                    </div>

                    {/* Main Title - Serif & Huge */}
                    <h1 className="font-serif font-black text-3xl md:text-4xl lg:text-5xl text-slate-900 leading-[1.2] tracking-tight drop-shadow-sm">
                        {displayTitle}
                    </h1>

                    {/* Action Line */}
                    <div className="pt-6 border-t border-slate-200/60 flex items-center justify-between font-sans">
                        <div className="flex items-center gap-2">
                             {articleUrl ? (
                                <a 
                                    href={articleUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors border-b-2 border-transparent hover:border-indigo-600 pb-0.5"
                                >
                                    <GlobeIcon className="w-4 h-4" />
                                    <span>READ ORIGINAL SOURCE</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                                </a>
                            ) : (
                                <span className="text-xs text-slate-300 cursor-not-allowed flex items-center gap-2">
                                    <ExternalLinkIcon className="w-3.5 h-3.5"/> 链接已失效
                                </span>
                            )}
                        </div>
                        
                        {/* ID or Tag */}
                        <div className="hidden md:block font-mono text-[9px] text-slate-300">
                            ID: {selectedArticle.id.slice(0, 8)}
                        </div>
                    </div>
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
                    <div className="h-full overflow-y-auto p-6 md:px-12 md:py-10 custom-scrollbar bg-white scroll-smooth">
                        <article 
                            className="
                                prose prose-base md:prose-lg max-w-3xl mx-auto
                                text-[#1a202c] 
                                font-serif 
                                leading-loose 
                                tracking-normal
                                prose-headings:font-bold prose-headings:text-slate-900 prose-headings:font-sans prose-headings:tracking-tight
                                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                                prose-p:mb-6 prose-p:leading-[2] prose-p:text-slate-700
                                prose-li:leading-[1.8] prose-li:text-slate-700
                                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline hover:prose-a:text-indigo-700
                                prose-strong:font-bold prose-strong:text-slate-900
                                prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8 prose-img:border prose-img:border-slate-100
                                prose-blockquote:border-l-4 prose-blockquote:border-slate-200 prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-slate-500 prose-blockquote:bg-slate-50 prose-blockquote:rounded-r-lg
                                prose-code:font-mono prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-slate-600
                                prose-hr:border-slate-100 prose-hr:my-10
                            "
                            style={{ fontFamily: '"Songti SC", "STSong", "SimSun", "Times New Roman", serif' }}
                            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                        />
                         <div className="mt-16 pt-10 border-t border-slate-100 text-center pb-12 font-sans">
                             <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-300 mb-2">
                                <DocumentTextIcon className="w-4 h-4" />
                             </div>
                             <p className="text-[10px] text-slate-300 uppercase tracking-widest">End of Document</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
