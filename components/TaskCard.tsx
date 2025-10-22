import React, { useState, useEffect, useMemo } from 'react';
import { LivestreamTask } from '../types';
// FIX: Add missing icons for manager actions
import { FilmIcon, DocumentTextIcon, EyeIcon, PlayIcon, StopIcon, TrashIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
    onViewReport: (task: LivestreamTask) => void;
    // FIX: Add optional props for manager actions to support both user and admin views
    onStart?: (taskId: string) => void;
    onStop?: (taskId: string) => void;
    onDelete?: (task: LivestreamTask) => void;
    isProcessing?: (taskId: string) => boolean;
}

const getStatusDetails = (status: string) => {
    switch (status) {
        case 'completed': return { text: '已结束', color: 'bg-green-500' };
        case 'listening': return { text: '监听中', color: 'bg-cyan-500', pulse: true };
        case 'recording': return { text: '直播中', color: 'bg-red-500', pulse: true };
        case 'processing': return { text: '处理中', color: 'bg-yellow-500', pulse: true };
        case 'pending': return { text: '即将开始', color: 'bg-blue-500' };
        case 'failed': return { text: '失败', color: 'bg-red-700' };
        default: return { text: status, color: 'bg-gray-500' };
    }
};

const Countdown: React.FC<{ startTime: string }> = ({ startTime }) => {
    const calculateCountdown = () => {
        const difference = new Date(startTime).getTime() - new Date().getTime();
        if (difference <= 0) return null;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        return { days, hours, minutes, seconds };
    };

    const [countdown, setCountdown] = useState(calculateCountdown());

    useEffect(() => {
        const timer = setInterval(() => setCountdown(calculateCountdown()), 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    if (!countdown) return null;

    return (
        <div className="text-white text-center">
            {countdown.days > 0 ? (
                <>
                    <span className="text-4xl font-bold">{countdown.days}</span>
                    <span className="text-lg ml-1">天</span>
                </>
            ) : (
                <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-4xl font-bold">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="text-2xl font-semibold">:</span>
                    <span className="text-4xl font-bold">{String(countdown.minutes).padStart(2, '0')}</span>
                    <span className="text-2xl font-semibold">:</span>
                    <span className="text-4xl font-bold">{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
            )}
            <p className="text-sm opacity-80 mt-1">后开始</p>
        </div>
    );
};

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport, onStart, onStop, onDelete, isProcessing }) => {
    const statusInfo = getStatusDetails(task.status);
    const isCompleted = task.status === 'completed';
    const isUpcoming = ['pending', 'listening'].includes(task.status);
    
    const imageUrl = useMemo(() => {
        if (!task.livestream_image) return null;
        return task.livestream_image.startsWith('data:image') 
            ? task.livestream_image 
            : `data:image/jpeg;base64,${task.livestream_image}`;
    }, [task.livestream_image]);

    const isManagerView = !!(onStart && onStop && onDelete && isProcessing);
    const isProcessingTask = isProcessing ? isProcessing(task.id) : false;

    return (
        <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-md group relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            {imageUrl ? (
                <img src={imageUrl} alt={task.livestream_name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <FilmIcon className="w-16 h-16 text-gray-700" />
                </div>
            )}
            
            <div className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-white rounded-full flex items-center gap-1.5 ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}>
                <span className="h-2 w-2 rounded-full bg-white/80"></span>
                {statusInfo.text}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
                {isUpcoming && !statusInfo.pulse && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                        <Countdown startTime={task.start_time} />
                    </div>
                )}
                 
                <div>
                     {task.entity && <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-1.5">{task.entity}</span>}
                    <h3 className="text-lg font-bold text-white leading-tight shadow-black/50 [text-shadow:_0_1px_4px_var(--tw-shadow-color)]">{task.livestream_name}</h3>
                    <div className="text-xs text-slate-300 mt-1.5 space-y-0.5">
                        <p>{task.host_name}</p>
                        <p>{new Date(task.start_time).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                    {isManagerView ? (
                        <>
                            {task.status === 'pending' && onStart && (
                                <button onClick={() => onStart(task.id)} disabled={isProcessingTask} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/20 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/30 transition-colors text-sm disabled:bg-white/10 disabled:cursor-wait">
                                    {isProcessingTask ? <Spinner /> : <><PlayIcon className="w-4 h-4" /><span>启动</span></>}
                                </button>
                            )}
                             {task.status === 'listening' && onStop && (
                                <button onClick={() => onStop(task.id)} disabled={isProcessingTask} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/20 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/30 transition-colors text-sm disabled:bg-white/10 disabled:cursor-wait">
                                     {isProcessingTask ? <Spinner /> : <><StopIcon className="w-4 h-4" /><span>停止</span></>}
                                </button>
                            )}
                            {task.summary_report && (
                                 <button onClick={() => onViewReport(task)} disabled={isProcessingTask} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/20 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/30 transition-colors text-sm disabled:bg-white/10 disabled:cursor-wait">
                                    <DocumentTextIcon className="w-4 h-4" />
                                    <span>报告</span>
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={() => onDelete(task)} disabled={isProcessingTask} className="flex-shrink-0 p-2 bg-red-500/30 backdrop-blur text-white font-semibold rounded-lg hover:bg-red-500/50 transition-colors text-sm disabled:bg-red-500/10 disabled:cursor-wait">
                                    {isProcessingTask ? <Spinner /> : <TrashIcon className="w-4 h-4" />}
                                </button>
                            )}
                        </>
                    ) : (
                        isCompleted && (
                            <>
                                {task.summary_report && (
                                     <button onClick={() => onViewReport(task)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/20 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/30 transition-colors text-sm">
                                        <DocumentTextIcon className="w-4 h-4" />
                                        <span>查看报告</span>
                                    </button>
                                )}
                                 <a href={task.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/20 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/30 transition-colors text-sm">
                                    <EyeIcon className="w-4 h-4" />
                                    <span>查看回放</span>
                                </a>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
