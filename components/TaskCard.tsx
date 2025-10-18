import React from 'react';
import { LivestreamTask } from '../types';
import { VideoCameraIcon, FilmIcon, PhotoIcon, CheckIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
}

const TaskTypeIcon: React.FC<{ type: LivestreamTask['task_type'] }> = ({ type }) => {
    switch (type) {
        case 'live':
            return <VideoCameraIcon className="w-6 h-6 text-red-500" />;
        case 'video':
            return <FilmIcon className="w-6 h-6 text-blue-500" />;
        case 'summit':
            return <PhotoIcon className="w-6 h-6 text-purple-500" />;
        default:
            return null;
    }
};

const getStatusDetails = (status: LivestreamTask['status']) => {
    switch (status) {
        case 'running':
            return { text: '运行中', color: 'bg-blue-100 text-blue-800' };
        case 'processing':
            return { text: '分析中', color: 'bg-yellow-100 text-yellow-800 animate-pulse' };
        case 'completed':
            return { text: '已完成', color: 'bg-green-100 text-green-800' };
        case 'failed':
            return { text: '失败', color: 'bg-red-100 text-red-800' };
        case 'stopped':
            return { text: '已停止', color: 'bg-gray-200 text-gray-800' };
        case 'pending':
        default:
            return { text: '待处理', color: 'bg-gray-100 text-gray-800' };
    }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const statusDetails = getStatusDetails(task.status);
    const canViewReport = task.status === 'completed';
    const displayName = task.event_name || task.room_name || '未命名任务';

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-full shadow-sm hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {task.cover_image_data ? (
                            <img src={task.cover_image_data} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <TaskTypeIcon type={task.task_type} />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 leading-tight line-clamp-2" title={displayName}>{displayName}</h3>
                        {task.task_type === 'live' && task.room_id && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate" title={`Room ID: ${task.room_id}`}>
                                房间ID: {task.room_id}
                            </p>
                        )}
                    </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusDetails.color} flex-shrink-0`}>
                    {statusDetails.text}
                </span>
            </div>
            
            <div className="text-xs text-gray-400 border-t pt-3 mt-auto space-y-1">
                <p>创建于: {new Date(task.created_at).toLocaleString('zh-CN')}</p>
                {task.completion_time && <p>完成于: {new Date(task.completion_time).toLocaleString('zh-CN')}</p>}
            </div>
            
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <button
                    onClick={() => alert('报告查看功能请前往后台管理模块。')}
                    disabled={!canViewReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 bg-green-100 text-green-700 hover:bg-green-200"
                >
                    <CheckIcon className="w-4 h-4"/>
                    <span>查看报告</span>
                </button>
            </div>
        </div>
    );
};