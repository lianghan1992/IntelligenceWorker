
import React, { useState } from 'react';
import { IntelLlmTask } from '../../../types';
import { downloadIntelLlmTaskReport } from '../../../api/intelligence';
import { 
    CheckCircleIcon, ClockIcon, PlayIcon, ShieldExclamationIcon, 
    DownloadIcon, DocumentTextIcon 
} from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface TaskMessageBubbleProps {
    task: IntelLlmTask;
}

export const TaskMessageBubble: React.FC<TaskMessageBubbleProps> = ({ task }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const blob = await downloadIntelLlmTaskReport(task.uuid);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${task.uuid.slice(0, 8)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert("下载失败，请稍后重试");
        } finally {
            setIsDownloading(false);
        }
    };

    // User Message Bubble (The Prompt)
    const renderUserMessage = () => (
        <div className="flex justify-end mb-4">
            <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-md max-w-[85%] text-sm leading-relaxed">
                {task.description}
            </div>
        </div>
    );

    // System Task Card
    const renderSystemCard = () => {
        const isCompleted = task.status === 'completed';
        const isFailed = task.status === 'failed';
        const isProcessing = !isCompleted && !isFailed;

        let statusColor = 'bg-blue-50 border-blue-100';
        let icon = <PlayIcon className="w-4 h-4 text-blue-500 animate-pulse" />;
        let statusText = `AI 分析中... ${task.progress}%`;

        if (isCompleted) {
            statusColor = 'bg-green-50 border-green-100';
            icon = <CheckCircleIcon className="w-4 h-4 text-green-600" />;
            statusText = '分析完成';
        } else if (isFailed) {
            statusColor = 'bg-red-50 border-red-100';
            icon = <ShieldExclamationIcon className="w-4 h-4 text-red-600" />;
            statusText = '任务失败';
        }

        return (
            <div className="flex justify-start mb-6">
                <div className="flex gap-3 max-w-[90%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                        <DocumentTextIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className={`flex-1 rounded-2xl rounded-tl-sm border p-4 shadow-sm ${statusColor} bg-white`}>
                        <div className="flex items-center justify-between mb-2 gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                                {icon}
                                <span className={isCompleted ? 'text-green-700' : isFailed ? 'text-red-700' : 'text-blue-700'}>
                                    {statusText}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        {isProcessing && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3 overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${task.progress}%` }}
                                ></div>
                            </div>
                        )}

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {task.time_range && (
                                <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3" /> {task.time_range}
                                </span>
                            )}
                            <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 font-mono">
                                ID: {task.uuid.slice(0, 6)}
                            </span>
                        </div>

                        {/* Actions */}
                        {isCompleted && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                                <button 
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg transition-colors shadow-sm active:scale-95"
                                >
                                    {isDownloading ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                                    下载分析报告
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col">
            {renderUserMessage()}
            {renderSystemCard()}
        </div>
    );
};
