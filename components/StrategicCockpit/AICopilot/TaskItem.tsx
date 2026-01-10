
import React, { useState } from 'react';
import { IntelLlmTask } from '../../../types';
import { downloadIntelLlmTaskReport } from '../../../api/intelligence';
import { 
    CheckCircleIcon, ClockIcon, PlayIcon, ShieldExclamationIcon, 
    DownloadIcon, DocumentTextIcon 
} from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface TaskItemProps {
    task: IntelLlmTask;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const blob = await downloadIntelLlmTaskReport(task.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${task.id.slice(0, 8)}.csv`;
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

    const isCompleted = task.status === 'completed';
    const isFailed = task.status === 'failed';
    const isProcessing = !isCompleted && !isFailed;

    let statusBadge = (
        <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            <PlayIcon className="w-3 h-3 animate-pulse" /> 分析中 {task.progress}%
        </span>
    );

    if (isCompleted) {
        statusBadge = (
            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                <CheckCircleIcon className="w-3 h-3" /> 已完成
            </span>
        );
    } else if (isFailed) {
        statusBadge = (
            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                <ShieldExclamationIcon className="w-3 h-3" /> 失败
            </span>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono text-slate-400">ID: {task.id.slice(0, 6)}</span>
                <span className="text-[10px] text-slate-400">
                    {new Date(task.created_at).toLocaleDateString()} {new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
            
            <h4 className="text-sm font-bold text-slate-800 mb-3 line-clamp-2 leading-relaxed">
                {task.description}
            </h4>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <div>{statusBadge}</div>
                
                {isCompleted && (
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isDownloading ? <Spinner /> : <DownloadIcon className="w-3.5 h-3.5" />}
                        下载报告
                    </button>
                )}
            </div>
            
            {/* Progress Bar Visual for Processing */}
            {isProcessing && (
                <div className="mt-3 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(5, task.progress)}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};
