import React, { useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { CloseIcon, DocumentTextIcon } from '../icons';

interface EventReportModalProps {
    event: LivestreamTask;
    onClose: () => void;
}

// A simple markdown to HTML converter for the report content
const markdownToHtml = (markdown: string | null): string => {
    if (!markdown) return '<p>报告内容为空。</p>';
    
    let html = markdown
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
            if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
            if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
            if (line.startsWith('- ') || line.startsWith('* ')) return `<li>${line.substring(2)}</li>`;
            return `<p>${line}</p>`;
        })
        .join('');
    
    // Wrap consecutive li elements in ul
    html = html.replace(/<li>/g, '<ul><li>').replace(/<\/li>/g, '</li></ul>').replace(/<\/ul><ul>/g, '');

    return html;
};


export const EventReportModal: React.FC<EventReportModalProps> = ({ event, onClose }) => {
    const reportHtml = useMemo(() => markdownToHtml(event.summary_report), [event.summary_report]);

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
                            <h2 className="text-lg font-bold text-gray-900 truncate">{event.livestream_name} - AI解读报告</h2>
                            <p className="text-sm text-gray-500">{event.host_name} &nbsp;&nbsp;|&nbsp;&nbsp; {formattedDate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-50/70 overflow-y-auto p-8">
                    <article 
                        className="prose prose-slate max-w-none prose-h2:font-bold prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6 prose-p:leading-relaxed prose-strong:font-semibold"
                        dangerouslySetInnerHTML={{ __html: reportHtml }}
                    />
                </div>

                 {/* Footer */}
                <div className="px-6 py-4 bg-white border-t flex justify-end">
                     <a href={event.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                        查看回放
                     </a>
                </div>
            </div>
        </div>
    );
};
