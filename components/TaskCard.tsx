import React, { useState, useEffect } from 'react';
import { LivestreamTask } from '../types';
import { TagIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
    onViewReport: () => void;
}

const Countdown: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
        if (value <= 0 && interval !== 'seconds') return null;
        if (timeLeft.days === 0 && interval === 'days') return null;
        
        const label = { days: '天', hours: '时', minutes: '分', seconds: '秒' }[interval];
        
        return (
            <div key={interval} className="flex flex-col items-center">
                <span className="text-3xl font-bold">{String(value).padStart(2, '0')}</span>
                <span className="text-xs opacity-75">{label}</span>
            </div>
        );
    }).filter(Boolean);
    
    if (!timerComponents.length) return <div className="text-xl font-semibold">即将开始...</div>;

    return (
        <div className="flex items-center gap-3 text-white drop-shadow-lg">
            {timerComponents.reduce((acc, curr, index) => {
                return index === 0 ? [curr] : [...acc, <span key={`sep-${index}`} className="text-2xl font-bold -mt-2">:</span>, curr];
            }, [] as React.ReactNode[])}
        </div>
    );
};

const getStatusDetails = (status: string, startTime: string) => {
    const statusLower = status.toLowerCase();
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();

    if (statusLower === 'recording') {
        return { text: 'LIVE', className: 'bg-red-600 text-white animate-pulse', type: 'live' };
    }
    if (statusLower === 'listening') {
        return { text: '监听中', className: 'bg-cyan-100 text-cyan-800 animate-in fade-in-0', type: 'upcoming' };
    }
    if (statusLower === 'pending' && start > now) {
        return { text: '即将开始', className: 'bg-blue-100 text-blue-800', type: 'upcoming' };
    }
    if (statusLower === 'completed') {
        return { text: '已完成', className: 'bg-green-100 text-green-800', type: 'finished' };
    }
    if (statusLower === 'processing') {
        return { text: 'AI分析中', className: 'bg-indigo-100 text-indigo-800', type: 'finished' };
    }
    if (statusLower === 'failed') {
        return { text: '失败', className: 'bg-red-100 text-red-800', type: 'finished' };
    }
    return { text: '已结束', className: 'bg-gray-100 text-gray-800', type: 'finished' };
};

const getSafeImageUrl = (base64String: string | null): string | null => {
    if (!base64String) return null;
    if (base64String.startsWith('data:image')) {
        return base64String;
    }
    return `data:image/jpeg;base64,${base64String}`;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport }) => {
    const statusDetails = getStatusDetails(task.status, task.start_time);
    const isFinished = statusDetails.type === 'finished';
    const hasReport = isFinished && task.summary_report;
    
    const imageUrl = getSafeImageUrl(task.livestream_image);

    const formattedDate = new Date(task.start_time).toLocaleString('zh-CN', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleReplayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(task.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            onClick={hasReport ? onViewReport : undefined}
            className={`bg-white rounded-xl border border-gray-200 overflow-hidden group flex flex-col shadow-sm transition-all duration-300 ${hasReport ? 'hover:shadow-lg hover:border-blue-400' : ''}`}
        >
            <div className="aspect-w-16 aspect-h-9 bg-black relative text-white" style={{ position: 'relative', paddingTop: '56.25%' }}>
                <div className="absolute inset-0">
                    {imageUrl ? (
                        <img src={imageUrl} alt={task.livestream_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-black"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {statusDetails.type === 'upcoming' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                            <Countdown targetDate={task.start_time} />
                        </div>
                    )}
                    
                    <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${statusDetails.className}`}>
                        {statusDetails.type === 'live' && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>}
                        {statusDetails.text}
                    </span>

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                        {task.entity && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full mb-1.5">
                                <TagIcon className="w-3 h-3" />
                                {task.entity}
                            </span>
                        )}
                        <h3 className={`text-md font-bold drop-shadow-sm ${hasReport ? 'group-hover:text-blue-300' : ''} transition-colors`}>{task.livestream_name}</h3>
                    </div>
                </div>
            </div>
            
            <div className="p-3 flex-grow flex flex-col">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{task.host_name || ''}</span>
                    <span>{formattedDate}</span>
                </div>

                {isFinished && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex-grow flex items-end gap-2">
                        <button
                            onClick={handleReplayClick}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        >
                            查看回放
                        </button>
                        <button
                            onClick={hasReport ? onViewReport : undefined}
                            disabled={!hasReport}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {hasReport ? '查看报告' : '报告生成中'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};