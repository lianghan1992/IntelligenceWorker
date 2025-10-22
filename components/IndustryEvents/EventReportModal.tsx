import React, { useMemo } from 'react';
import { CloseIcon } from '../icons';
import { LivestreamTask } from '../../types';

interface EventReportModalProps {
  event: LivestreamTask | null;
  onClose: () => void;
}

const markdownToHtml = (markdown: string | null): string => {
    if (!markdown) return '<p>该事件的报告正在生成中或不可用。</p>';

    let inList = false;
    let listType = ''; // 'ul' or 'ol'
    
    const lines = markdown.split('\n');
    let html = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Process inline markdown first, for any line
        line = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" class="rounded-lg shadow-md my-4" />')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Now process block-level markdown
        if (line.match(/^### /)) {
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<h3>${line.substring(4)}</h3>`;
        } else if (line.match(/^## /)) {
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<h2>${line.substring(3)}</h2>`;
        } else if (line.match(/^# /)) {
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<h1>${line.substring(2)}</h1>`;
        } else if (line.match(/^(\*|-|\+) /)) {
            if (!inList || listType !== 'ul') {
                if (inList) html += `</${listType}>`;
                html += '<ul>';
                inList = true;
                listType = 'ul';
            }
            html += `<li>${line.substring(2)}</li>`;
        } else if (line.match(/^\d+\. /)) {
            if (!inList || listType !== 'ol') {
                if (inList) html += `</${listType}>`;
                html += '<ol>';
                inList = true;
                listType = 'ol';
            }
            html += `<li>${line.replace(/^\d+\. /, '')}</li>`;
        } else if (line.trim() === '') {
             if (inList) { html += `</${listType}>`; inList = false; }
        } else {
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<p>${line}</p>`;
        }
    }

    if (inList) {
        html += `</${listType}>`;
    }

    return html;
};

export const EventReportModal: React.FC<EventReportModalProps> = ({ event, onClose }) => {
    if (!event) return null;
    
    const reportHtml = useMemo(() => markdownToHtml(event.summary_report), [event.summary_report]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">{event.livestream_name}</h3>
                        <p className="text-sm text-gray-500">事件总结报告</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-50 overflow-y-auto">
                    <article 
                        className="prose prose-slate max-w-none p-6 lg:p-8 
                                   prose-h1:font-extrabold prose-h1:border-b prose-h1:pb-4 prose-h1:mb-6
                                   prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                                   prose-p:leading-relaxed
                                   prose-strong:font-semibold prose-strong:text-slate-900
                                   prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-1 
                                   prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-1"
                        dangerouslySetInnerHTML={{ __html: reportHtml }}
                    />
                </div>
            </div>
        </div>
    );
};