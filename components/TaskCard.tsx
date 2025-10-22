import React from 'react';
import { LivestreamTask } from '../types';

interface TaskCardProps {
    task: LivestreamTask;
    onClick: () => void;
}

const getStatusDetails = (status: LivestreamTask['status']) => {
    const s = status.toLowerCase();
    if (s === 'recording' || s === 'listening') return { text: '直播中', color: 'bg-red-500', pulse: true };
    if (s === 'processing') return { text: '分析中', color: 'bg-yellow-500', pulse: true };
    if (s === 'completed') return { text: '已结束', color: 'bg-green-500', pulse: false };
    if (s === 'failed') return { text: '失败', color: 'bg-gray-600', pulse: false };
    if (s === 'pending') return { text: '即将开始', color: 'bg-blue-500', pulse: false };
    return { text: status, color: 'bg-gray-500', pulse: false }; // Fallback
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
    const statusDetails = getStatusDetails(task.status);
    const canViewReport = task.status.toLowerCase() === 'completed';
    const displayName = task.livestream_name || '未命名任务';

    return (
        <div 
            onClick={canViewReport ? onClick : undefined}
            className={`relative aspect-[4/3] w-full bg-gray-900 rounded-2xl overflow-hidden shadow-lg group transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${canViewReport ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {task.livestream_image ? (
                <img src={task.livestream_image} alt={displayName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-black"></div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

            <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className={`px-3 py-1 text-xs font-bold text-white rounded-full ${statusDetails.color} backdrop-blur-sm bg-opacity-80`}>
                    {statusDetails.text}
                </span>
                {statusDetails.pulse && (
                     <span className={`relative flex h-3 w-3`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusDetails.color} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${statusDetails.color}`}></span>
                    </span>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-bold text-lg leading-tight line-clamp-2" title={displayName}>
                    {displayName}
                </h3>
                <div className="text-xs text-white/80 mt-1.5 space-y-0.5">
                    <p>{task.host_name || '未知主播'}</p>
                    <p>
                        {new Date(task.start_time).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        </div>
    );
};