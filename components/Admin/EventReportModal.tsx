import React, { useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { CloseIcon, DocumentTextIcon } from '../icons';

// 为从CDN加载的 `marked` 库提供类型声明
declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

interface EventReportModalProps {
    event: LivestreamTask;
    onClose: () => void;
}

export const EventReportModal: React.FC<EventReportModalProps> = ({ event, onClose }) => {
    const reportHtml = useMemo(() => {
        if (!event.summary_report) {
            return '<p>报告内容为空。</p>';
        }
    
        // 直接从 window 对象访问 marked，确保库已加载
        if (window.marked && typeof window.marked.parse === 'function') {
            return window.marked.parse(event.summary_report);
        }
        
        console.error("marked.js is not loaded or is not a function. Falling back to pre-formatted text.");
        // 如果 marked.js 加载失败，提供一个可读性更好的回退方案
        const escapedContent = event.summary_report
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
            
        return `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 1rem;">${escapedContent}</pre>`;
    }, [event.summary_report]);

    const formattedDate = new Date(event.start_time).toLocaleString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                         <div className="p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
                            <DocumentTextIcon className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{event.task_name} - AI解读报告</h2>
                            <p className="text-sm text-gray-500">{formattedDate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-50/70 overflow-y-auto p-8">
                    <article 
                        className="prose prose-slate max-w-none prose-h2:font-bold prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6 prose-p:leading-relaxed prose-strong:font-semibold prose-li:my-1 prose-ul:pl-5 prose-headings:text-gray-800"
                        dangerouslySetInnerHTML={{ __html: reportHtml }}
                    />
                </div>

                 {/* Footer */}
                <div className="px-6 py-4 bg-white border-t flex justify-end">
                     <a href={event.live_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                        查看回放
                     </a>
                </div>
            </div>
        </div>
    );
};