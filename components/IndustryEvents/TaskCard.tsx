
import React, { useState, useEffect } from 'react';
import { LivestreamTask } from '../../types';
import { DocumentTextIcon, FilmIcon, PlayIcon } from '../icons';
import { getLivestreamCover } from '../../api';

interface TaskCardProps {
    task: Partial<LivestreamTask>;
    onViewReport: () => void;
}

const getStatusDetails = (status: string = '') => {
    const statusLower = status.toLowerCase();

    if (statusLower === 'recording' || statusLower === 'downloading') {
        return { text: '直播中', className: 'bg-red-500 text-white', type: 'live' };
    }
    if (statusLower === 'listening' || statusLower === 'pending' || statusLower === 'scheduled') {
        return { text: '即将开始', className: 'bg-blue-500 text-white', type: 'upcoming' };
    }
    if (statusLower === 'finished' || statusLower === 'completed') {
        return { text: '已结束', className: 'bg-green-500 text-white', type: 'finished' };
    }
    if (statusLower === 'processing') {
        return { text: 'AI总结中', className: 'bg-indigo-500 text-white', type: 'finished' };
    }
     if (statusLower === 'stopping') {
        return { text: '停止中', className: 'bg-yellow-500 text-white', type: 'live' };
    }
    if (statusLower === 'failed') {
        return { text: '失败', className: 'bg-red-500 text-white', type: 'finished' };
    }
    return { text: '已结束', className: 'bg-gray-500 text-white', type: 'finished' };
};

const CountdownDisplay: React.FC<{ timeLeft: string }> = ({ timeLeft }) => {
    const textSizeClass = timeLeft.length > 8 ? 'text-3xl lg:text-4xl' : 'text-4xl lg:text-5xl';
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-white text-center font-bold" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.7)' }}>
            <div className={`${textSizeClass} tracking-tighter leading-none`}>{timeLeft}</div>
            <div className="text-sm lg:text-base opacity-80 tracking-wide mt-1">后开始</div>
        </div>
    );
};


export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport }) => {
    const statusDetails = getStatusDetails(task.status);
    const isFinished = statusDetails.type === 'finished';
    const isLive = statusDetails.type === 'live';
    const hasReport = (task.status?.toLowerCase() === 'completed' || task.status?.toLowerCase() === 'finished');
    
    const [timeLeft, setTimeLeft] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // Fetch Cover Image Individually
    useEffect(() => {
        if (!task.id) return;
        let active = true;
        getLivestreamCover(task.id).then(url => {
            if (active && url) {
                setImageUrl(url);
            }
        });
        return () => { active = false; if (imageUrl) URL.revokeObjectURL(imageUrl); }
    }, [task.id]);

    useEffect(() => {
        if (statusDetails.type !== 'upcoming' || !task.start_time) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const startTime = new Date(task.start_time!).getTime();
            const distance = startTime - now;

            if (distance < 0) return "即将开始";

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            if (days > 0) return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        setTimeLeft(calculateTimeLeft());
        return () => clearInterval(timer);
    }, [task.start_time, statusDetails.type]);


    const formattedDate = task.start_time ? new Date(task.start_time).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(/\//g, '.') : '-';

    const handleReplayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.live_url) window.open(task.live_url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            onClick={hasReport ? onViewReport : undefined}
            className={`group relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-700 animate-in fade-in slide-in-from-bottom-4 ${hasReport ? 'cursor-pointer' : 'cursor-default'} ${isImageLoaded ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-2'}`}
        >
            {imageUrl ? (
                <img 
                    src={imageUrl} 
                    alt={task.task_name} 
                    onLoad={() => setIsImageLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${isImageLoaded ? 'scale-100 blur-0' : 'scale-110 blur-sm'} group-hover:scale-105`} 
                />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
                    <FilmIcon className="w-12 h-12 text-gray-600 animate-pulse" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full z-20 ${statusDetails.className}`}>
                 {statusDetails.text}
            </span>

            {statusDetails.type === 'upcoming' && timeLeft && timeLeft !== "即将开始" && (
                <CountdownDisplay timeLeft={timeLeft} />
            )}

            <div className="absolute inset-0 flex flex-col justify-end p-4 text-white z-10">
                <div className="text-lg font-bold drop-shadow-md leading-tight group-hover:text-indigo-300 transition-colors">
                  {task.task_name}
                </div>
                <p className="text-xs text-gray-300 mt-1.5 drop-shadow-sm font-medium">{task.company} · {formattedDate}</p>

                {isLive && (
                    <div className="mt-4">
                        <a
                            href={task.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105 active:scale-95"
                        >
                            <PlayIcon className="w-4 h-4" />
                            <span>观看直播</span>
                        </a>
                    </div>
                )}

                {isFinished && (
                    <div className="mt-4 flex gap-3">
                        <button 
                            onClick={hasReport ? onViewReport : undefined}
                            disabled={!hasReport}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>{hasReport ? '查看报告' : '报告生成中'}</span>
                        </button>
                        <button 
                            onClick={handleReplayClick} 
                            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-colors active:scale-95"
                        >
                            <FilmIcon className="w-4 h-4" />
                            <span>回放</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
