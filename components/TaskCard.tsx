import React from 'react';
import { LivestreamTask } from '../types';
import { FilmIcon, DocumentTextIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
    onViewReport: (task: LivestreamTask) => void;
}

const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
        case 'completed':
            return <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">已完成</span>;
        case 'processing':
            return <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full animate-pulse">处理中</span>;
        case 'recording':
            return <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full animate-pulse">录制中</span>;
        case 'listening':
            return <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full animate-pulse">监听中</span>;
        case 'pending':
            return <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">待开始</span>;
        case 'failed':
            return <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">失败</span>;
        default:
            return <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">{status}</span>;
    }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport }) => {
    const hasReport = task.summary_report && task.summary_report.trim() !== '';

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group flex flex-col h-full shadow-sm hover:shadow-lg transition-shadow duration-300">
            <div className="h-40 bg-gray-100 relative overflow-hidden">
                {task.livestream_image ? (
                    <img src={task.livestream_image} alt={task.livestream_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <FilmIcon className="w-16 h-16 text-gray-400" />
                    </div>
                )}
                 <div className="absolute top-3 right-3">{getStatusBadge(task.status)}</div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <p className="text-xs text-gray-500">{new Date(task.start_time).toLocaleString('zh-CN')}</p>
                <h3 className="text-base font-bold text-gray-800 my-1.5 flex-grow line-clamp-2">{task.livestream_name}</h3>
                <p className="text-sm text-gray-600">主办方: {task.host_name || task.entity || '未知'}</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                        onClick={() => onViewReport(task)}
                        disabled={!hasReport}
                        className="w-full px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                       <DocumentTextIcon className="w-4 h-4" />
                        <span>{hasReport ? '查看解读报告' : '报告生成中'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
