
import React, { useMemo, useEffect } from 'react';
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
    
    const contentRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [selectedArticle]);

    const articleHtml = useMemo(() => {
        if (!selectedArticle || !selectedArticle.content) {
            return '';
        }

        if (window.marked && typeof window.marked.parse === 'function') {
            const markdownWithStyledImages = selectedArticle.content.replace(
                /!\[(.*?)\]\((.*?)\)/g,
                '<figure class="my-6"><img src="$2" alt="$1" class="rounded-2xl w-full object-cover shadow-sm"><figcaption class="text-center text-xs text-gray-500 mt-2">$1</figcaption></figure>'
            );
            return window.marked.parse(markdownWithStyledImages);
        }

        console.warn("marked.js is not available. Falling back to plain text with line breaks.");
        const escapedContent = selectedArticle.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return escapedContent.split('\n').map(p => `<p>${p}</p>`).join('');

    }, [selectedArticle]);

    if (!selectedArticle) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <DocumentTextIcon className="w-10 h-10 text-gray-300 opacity-50" />
                </div>
                <h3 className="font-medium text-xl text-gray-800 mb-2">阅读详情</h3>
                <p className="text-sm text-gray-500 max-w-[200px] leading-relaxed">
                    点击左侧列表中的任意卡片，在此处查看完整情报内容。
                </p>
            </div>
        );
    }

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden transition-all duration-500">
            {/* Header Area with Material Surface Color */}
            <div className="p-8 bg-gray-50/50 flex-shrink-0 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                {selectedArticle.source_name}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                                {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN')}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-2xl leading-tight line-clamp-3">
                            {selectedArticle.title}
                        </h3>
                    </div>
                </div>
                <div className="mt-6">
                     <a 
                        href={selectedArticle.original_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        访问原始链接 <ArrowRightIcon className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Content Area */}
            <div ref={contentRef} className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
                <article 
                    className="prose prose-slate max-w-none 
                        prose-headings:font-bold prose-headings:text-gray-900 
                        prose-p:text-gray-600 prose-p:leading-8 prose-p:mb-6 prose-p:text-base
                        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-gray-800 prose-strong:font-semibold
                        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                        prose-li:marker:text-blue-500"
                    dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
            </div>
        </aside>
    );
};
