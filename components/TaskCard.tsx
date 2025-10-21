import React from 'react';
import { LivestreamTask } from '../types';
import { VideoCameraIcon, CheckIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
    onClick: () => void;
}

const getStatusDetails = (status: LivestreamTask['status']) => {
    const s = status.toLowerCase();
    if (s === '直播中') return { text: '直播中', color: 'bg-red-100 text-red-800 animate-pulse' };
    if (s === 'ai总结' || s === 'processing') return { text: '分析中', color: 'bg-yellow-100 text-yellow-800 animate-pulse' };
    if (s === '已完成' || s === 'completed') return { text: '已完成', color: 'bg-green-100 text-green-800' };
    if (s === 'failed') return { text: '失败', color: 'bg-red-100 text-red-800' };
    if (s === '即将开始' || s === 'pending') return { text: '即将开始', color: 'bg-blue-100 text-blue-800' };
    return { text: status, color: 'bg-gray-100 text-gray-800' }; // Fallback
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
    const statusDetails = getStatusDetails(task.status);
    const canViewReport = task.status === '已完成' || task.status === 'completed';
    const displayName = task.livestream_name || '未命名任务';

    return (
        <div 
            onClick={onClick}
            className={`bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-full shadow-sm hover:shadow-lg transition-shadow duration-300 ${canViewReport ? 'cursor-pointer' : 'cursor-default'}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {task.livestream_image ? (
                            <img src={`data:image/jpeg;base64,${task.livestream_image}`} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <VideoCameraIcon className="w-6 h-6 text-red-500" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 leading-tight line-clamp-2" title={displayName}>{displayName}</h3>
                        {task.host_name && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate" title={`Host: ${task.host_name}`}>
                                主播: {task.host_name}
                            </p>
                        )}
                    </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusDetails.color} flex-shrink-0`}>
                    {statusDetails.text}
                </span>
            </div>
            
            <div className="text-xs text-gray-400 border-t pt-3 mt-auto space-y-1">
                <p>开始于: {new Date(task.start_time).toLocaleString('zh-CN')}</p>
                {task.updated_at && task.status.includes('完成') && <p>完成于: {new Date(task.updated_at).toLocaleString('zh-CN')}</p>}
            </div>
            
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <button
                    disabled={!canViewReport}
                    className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 text-sm font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 bg-green-100 text-green-700 hover:bg-green-200"
                >
                    <CheckIcon className="w-4 h-4"/>
                    <span>查看报告</span>
                </button>
            </div>
        </div>
    );
};