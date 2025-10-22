import React from 'react';
import { LivestreamTask } from '../types';
import { TagIcon, DocumentTextIcon, FilmIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
    onViewReport: () => void;
}

const getStatusDetails = (status: string) => {
    const statusLower = status.toLowerCase();

    if (statusLower === 'recording') {
        return { text: '直播中', className: 'bg-red-500 text-white', type: 'live' };
    }
    if (statusLower === 'listening') {
        return { text: '监听中', className: 'bg-cyan-500 text-white', type: 'upcoming' };
    }
    if (statusLower === 'pending') {
        return { text: '即将开始', className: 'bg-blue-500 text-white', type: 'upcoming' };
    }
    if (statusLower === 'completed') {
        return { text: '已结束', className: 'bg-green-500 text-white', type: 'finished' };
    }
    if (statusLower === 'processing') {
        return { text: 'AI总结中', className: 'bg-indigo-500 text-white', type: 'finished' };
    }
    if (statusLower === 'failed') {
        return { text: '失败', className: 'bg-red-500 text-white', type: 'finished' };
    }
    // Fallback for any other status
    return { text: '已结束', className: 'bg-gray-500 text-white', type: 'finished' };
};

const getSafeImageUrl = (base64String: string | null): string | null => {
    if (!base64String) return null;
    if (base64String.startsWith('data:image')) {
        return base64String;
    }
    return `data:image/jpeg;base64,${base64String}`;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport }) => {
    const statusDetails = getStatusDetails(task.status);
    const isFinished = statusDetails.type === 'finished';
    const hasReport = isFinished && !!task.summary_report;
    const imageUrl = getSafeImageUrl(task.livestream_image);

    const formattedDate = new Date(task.start_time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(/\//g, '.');

    const handleReplayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(task.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            onClick={hasReport ? onViewReport : undefined}
            className={`group relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-300 ${hasReport ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {/* Background Image and Gradient */}
            {imageUrl ? (
                <img src={imageUrl} alt={task.livestream_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gray-800"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            {/* Status Badge */}
            <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full ${statusDetails.className}`}>
                 {statusDetails.text}
            </span>

            {/* Main Content Area */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                {task.entity && (
                    <span className="inline-block self-start bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
                        {task.entity}
                    </span>
                )}
                <h3 className="text-lg font-bold drop-shadow-md leading-tight">{task.livestream_name}</h3>
                <p className="text-xs text-gray-200 mt-1.5 drop-shadow-sm">{task.host_name} &nbsp;&nbsp;|&nbsp;&nbsp; {formattedDate}</p>

                {isFinished && (
                    <div className="mt-4 flex gap-3">
                        <button 
                            onClick={hasReport ? onViewReport : undefined}
                            disabled={!hasReport}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>{hasReport ? '查看报告' : '报告生成中'}</span>
                        </button>
                        <button 
                            onClick={handleReplayClick} 
                            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20 transition-colors"
                        >
                            <FilmIcon className="w-4 h-4" />
                            <span>查看回放</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
