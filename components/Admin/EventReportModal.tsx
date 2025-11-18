import React, { useMemo, useState, useEffect } from 'react';
import { LivestreamTask } from '../../types';
import { CloseIcon, DocumentTextIcon } from '../icons';
import { getTaskSummary } from '../../api';

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
    const [reportContent, setReportContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState('一键复制');

    useEffect(() => {
        if (!event?.id) return;

        const fetchReport = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const content = await getTaskSummary(event.id);
                setReportContent(content);
            } catch (err) {
                setError(err instanceof Error ? err.message : '加载报告失败');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReport();
    }, [event]);

    const reportHtml = useMemo(() => {
        if (isLoading || error || !reportContent) {
            return '';
        }
    
        if (window.marked && typeof window.marked.parse === 'function') {
            return window.marked.parse(reportContent);
        }
        
        console.error("marked.js is not loaded or is not a function. Falling back to pre-formatted text.");
        const escapedContent = reportContent
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
            
        return `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 1rem;">${escapedContent}</pre>`;
    }, [reportContent, isLoading, error]);

    const formattedDate = new Date(event.start_time).toLocaleString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    const handleCopy = () => {
        if (reportContent) {
            navigator.clipboard.writeText(reportContent);
            setCopyStatus('已复制!');
            setTimeout(() => setCopyStatus('一键复制'), 2000);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center p-8 text-gray-500">正在加载报告内容...</div>;
        }
        if (error) {
            return <div className="text-center p-8 text-red-500">错误: {error}</div>;
        }
        if (!reportContent) {
             return <div className="text-center p-8 text-gray-500">报告内容为空。</div>;
        }
        return (
             <article 
                className="prose prose-slate max-w-none prose-h2:font-bold prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6 prose-p:leading-relaxed prose-strong:font-semibold prose-li:my-1 prose-ul:pl-5 prose-headings:text-gray-800"
                dangerouslySetInnerHTML={{ __html: reportHtml }}
            />
        );
    };

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
                    {renderContent()}
                </div>

                 {/* Footer */}
                <div className="px-6 py-4 bg-white border-t flex justify-end gap-3">
                    <button onClick={handleCopy} disabled={!reportContent || isLoading} className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50">
                        {copyStatus}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};