
import React, { useMemo } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon, ArrowRightIcon } from '../icons';

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

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ selectedArticle }) => {
    
    const fallbackArticleHtml = useMemo(() => {
        if (!selectedArticle || !selectedArticle.content) {
            return '';
        }

        if (window.marked && typeof window.marked.parse === 'function') {
            const markdownWithStyledImages = selectedArticle.content.replace(
                /!\[(.*?)\]\((.*?)\)/g,
                '<figure class="my-6"><img src="$2" alt="$1" class="rounded-lg w-full object-cover shadow-sm"><figcaption class="text-center text-xs text-gray-500 mt-2">$1</figcaption></figure>'
            );
            return window.marked.parse(markdownWithStyledImages);
        }

        const escapedContent = selectedArticle.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return escapedContent.split('\n').map(p => `<p>${p}</p>`).join('');

    }, [selectedArticle]);

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
                            {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric'})}
                        </span>
                        
                        {/* Title (Truncated) */}
                        <h3 className="font-bold text-slate-900 text-base truncate" title={selectedArticle.title}>
                            {selectedArticle.title}
                        </h3>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <a 
                            href={selectedArticle.original_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="阅读原文"
                        >
                            <ArrowRightIcon className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Mobile View: Stacked Layout */}
                <div className="md:hidden flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                {selectedArticle.source_name}
                            </span>
                            <span className="text-slate-400">
                                {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'})}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <a 
                                href={selectedArticle.original_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                        {selectedArticle.title}
                    </h3>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white overflow-hidden relative">
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
            </div>
        </aside>
    );
};
