import React, { useMemo } from 'react';
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
    const articleHtml = useMemo(() => {
        if (!selectedArticle || !selectedArticle.content) {
            return '';
        }

        if (window.marked && typeof window.marked.parse === 'function') {
            return window.marked.parse(selectedArticle.content);
        }

        console.warn("marked.js is not available. Falling back to plain text with line breaks.");
        const escapedContent = selectedArticle.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return escapedContent.split('\n').map(p => `<p>${p}</p>`).join('');

    }, [selectedArticle]);

    return (
        <aside className="lg:col-span-4 h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
                <h3 className="font-semibold text-slate-800">情报详情</h3>
                <p className="text-xs text-slate-500">在此深入阅读情报内容</p>
            </div>
            {selectedArticle ? (
                <>
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        <div className='mb-6'>
                            <h2 className='text-xl font-bold text-slate-900'>{selectedArticle.title}</h2>
                            <div className='text-xs text-slate-500 mt-2'>
                                <span>{selectedArticle.source_name}</span> / <span>{new Date(selectedArticle.publish_date || selectedArticle.created_at).toLocaleString('zh-CN')}</span>
                            </div>
                        </div>
                        
                        <article 
                            className="prose prose-sm max-w-none prose-headings:font-bold prose-p:text-slate-700 prose-p:leading-relaxed prose-img:rounded-lg prose-img:border"
                            dangerouslySetInnerHTML={{ __html: articleHtml }}
                        />
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t flex justify-end flex-shrink-0">
                        <a href={selectedArticle.original_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                            查看原文
                        </a>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-4">
                    <DocumentTextIcon className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="font-semibold">未选择情报</p>
                    <p className="text-sm">请在左侧列表中选择一篇情报以查看详情。</p>
                </div>
            )}
        </aside>
    );
};