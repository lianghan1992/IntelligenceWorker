import React from 'react';
import { LivestreamTask } from '../types';
import { PhotoIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
    onViewReport: () => void;
}

const getStatusBadge = (status: string, startTime: string) => {
    const statusLower = status.toLowerCase();
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();

    if (statusLower === 'recording') {
        return <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-white bg-red-600 rounded-full flex items-center gap-1.5 animate-pulse"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>LIVE</span>;
    }
    if (statusLower === 'listening' || (statusLower === 'pending' && start > now)) {
        return <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-blue-800 bg-blue-100 rounded-full">即将开始</span>;
    }
    if (statusLower === 'completed') {
        return <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-green-800 bg-green-100 rounded-full">已完成</span>;
    }
     if (statusLower === 'processing') {
        return <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-indigo-800 bg-indigo-100 rounded-full">AI分析中</span>;
    }
    if (statusLower === 'failed') {
        return <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-red-800 bg-red-100 rounded-full">失败</span>;
    }
    return <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-gray-800 bg-gray-100 rounded-full">未知</span>;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport }) => {
    const isCompleted = task.status.toLowerCase() === 'completed' && task.summary_report;
    const isClickable = isCompleted;

    const formattedDate = new Date(task.start_time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    return (
        <div
            onClick={isClickable ? onViewReport : undefined}
            className={`bg-white rounded-xl border border-gray-200 overflow-hidden group flex flex-col h-full shadow-sm ${isClickable ? 'cursor-pointer hover:shadow-xl hover:border-blue-400' : ''} transition-all duration-300`}
        >
            <div className="h-40 bg-gray-100 relative overflow-hidden">
                {task.livestream_image ? (
                    <img src={task.livestream_image} alt={task.livestream_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <PhotoIcon className="w-12 h-12 text-gray-400" />
                    </div>
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                {getStatusBadge(task.status, task.start_time)}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className={`text-md font-bold text-gray-900 mb-1.5 ${isClickable ? 'group-hover:text-blue-600' : ''} transition-colors`}>{task.livestream_name}</h3>
                {task.host_name && <p className="text-sm text-gray-500 mb-2">{task.host_name}</p>}
                <p className="text-xs text-gray-500 mt-auto">{formattedDate}</p>

                {isCompleted && (
                    <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
                        查看分析报告
                    </button>
                )}
                 {!isCompleted && task.status.toLowerCase() !== 'recording' && (
                     <div className="mt-4 w-full py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm text-center">
                        报告生成中
                    </div>
                 )}
            </div>
        </div>
    );
};
