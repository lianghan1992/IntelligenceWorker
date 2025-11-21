
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
                '<figure class="my-6"><img src="$2" alt="$1" class="rounded-2xl w-full object-cover shadow-sm border border-gray-100"><figcaption class="text-center text-xs text-gray-500 mt-2 font-medium">$1</figcaption></figure>'
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
            <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <DocumentTextIcon className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="font-medium text-xl text-gray-800 mb-2">选择情报查看详情</h3>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                    点击左侧列表中的任意卡片，在此处查看完整的文章内容、来源及分析。
                </p>
            </div>
        );
    }

    return (
        <aside className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header Area */}
            <div className="px-8 pt-8 pb-4 bg-white flex-shrink-0">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                                {selectedArticle.source_name}
                            </span>
                            <span className="text-xs font-medium text-gray-400">
                                {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-2xl leading-tight">
                            {selectedArticle.title}
                        </h3>
                    </div>
                </div>
                <div className="mt-6 border-b border-gray-100"></div>
            </div>

            {/* Content Area */}
            <div ref={contentRef} className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
                <article 
                    className="prose prose-slate max-w-none 
                        prose-headings:font-bold prose-headings:text-gray-900 
                        prose-p:text-gray-600 prose-p:leading-7 prose-p:mb-5 prose-p:text-[16px]
                        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-gray-800 prose-strong:font-bold
                        prose-blockquote:border-l-4 prose-blockquote:border-blue-200 prose-blockquote:bg-blue-50/30 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-700
                        prose-li:marker:text-gray-400 prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
                
                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
                     <a 
                        href={selectedArticle.original_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-all group"
                    >
                        访问原始链接 <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>
            </div>
        </aside>
    );
};
