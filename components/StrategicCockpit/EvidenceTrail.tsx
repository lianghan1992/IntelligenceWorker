import React, { useMemo, useEffect } from 'react';
import { InfoItem } from '../../types';
import { DocumentTextIcon } from '../icons';

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
                '<figure><img src="$2" alt="$1" class="rounded-lg border shadow-sm my-4"><figcaption class="text-center text-xs text-gray-500 mt-2">$1</figcaption></figure>'
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

    return (
        <aside className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-200 flex-shrink-0 flex justify-between items-center min-h-[77px]">
                {selectedArticle ? (
                    <>
                        <div className="flex-1 overflow-hidden pr-4">
                             <h3 className="font-bold text-slate-800 text-base truncate" title={selectedArticle.title}>
                                {selectedArticle.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {selectedArticle.source_name} &nbsp;&nbsp;|&nbsp;&nbsp; {new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleString('zh-CN')}
                            </p>
                        </div>
                        <a href={selectedArticle.original_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                            查看原文
                        </a>
                    </>
                ) : (
                    <div>
                        <h3 className="font-semibold text-slate-800">情报详情</h3>
                        <p className="text-xs text-slate-500">在此深入阅读情报内容</p>
                    </div>
                )}
            </div>
            {selectedArticle ? (
                <div ref={contentRef} className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <article 
                        className="prose prose-sm max-w-none prose-headings:font-bold prose-p:text-slate-700 prose-p:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: articleHtml }}
                    />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-4">
                    <DocumentTextIcon className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="font-semibold">未选择情报</p>
                    <p className="text-sm">请在中间列表中选择一篇情报以查看详情。</p>
                </div>
            )}
        </aside>
    );
};