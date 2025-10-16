import React from 'react';
import { CloseIcon } from './icons';
// FIX: Replace non-existent `AppEvent` with `LivestreamTask`
import { LivestreamTask } from '../types';

interface EventReportModalProps {
  event: LivestreamTask | null;
  onClose: () => void;
}

export const EventReportModal: React.FC<EventReportModalProps> = ({ event, onClose }) => {
    if (!event) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">{event.title}</h3>
                        <p className="text-sm text-gray-500">事件总结报告</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-50 overflow-y-auto">
                    {event.reportContentHtml ? (
                        <article 
                            className="prose prose-slate max-w-none p-6 lg:p-8 
                                       prose-h1:font-extrabold prose-h1:border-b prose-h1:pb-4 prose-h1:mb-6
                                       prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                                       prose-p:leading-relaxed
                                       prose-strong:font-semibold prose-strong:text-slate-900
                                       prose-ul:space-y-1 prose-ol:space-y-1"
                            dangerouslySetInnerHTML={{ __html: event.reportContentHtml }}
                        />
                    ) : (
                        <div className="p-6 flex items-center justify-center h-full">
                           <p className="text-gray-500">该事件的报告正在生成中或不可用。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};