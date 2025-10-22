import React, { useState, useEffect } from 'react';
import { LivestreamTask } from '../types';
import { FilmIcon, DocumentTextIcon } from './icons';

interface TaskCardProps {
    task: LivestreamTask;
    onViewReport: () => void;
}

const getStatusDetails = (status: LivestreamTask['status']) => {
    const s = status.toLowerCase();
    if (s === 'recording') return { text: '直播中', color: 'bg-red-500', pulse: true };
    if (s === 'listening') return { text: '监听中', color: 'bg-cyan-500', pulse: true };
    if (s === 'processing') return { text: '分析中', color: 'bg-yellow-500', pulse: true };
    if (s === 'completed') return { text: '已结束', color: 'bg-green-500', pulse: false };
    if (s === 'failed') return { text: '失败', color: 'bg-gray-600', pulse: false };
    if (s === 'pending') return { text: '即将开始', color: 'bg-blue-500', pulse: false };
    return { text: status, color: 'bg-gray-500', pulse: false }; // Fallback
};

const useCountdown = (targetDate: string) => {
    const countDownDate = new Date(targetDate).getTime();
    const [countDown, setCountDown] = useState(countDownDate - new Date().getTime());

    useEffect(() => {
        const interval = setInterval(() => {
            setCountDown(countDownDate - new Date().getTime());
        }, 1000);
        return () => clearInterval(interval);
    }, [countDownDate]);

    return getReturnValues(countDown);
};

const getReturnValues = (countDown: number) => {
    if (countDown < 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true };
    }
    const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
    const hours = Math.floor((countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((countDown % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, isFinished: false };
};

const CountdownItem: React.FC<{ value: number, label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center">
        <span className="text-4xl font-bold tracking-tighter" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-xs uppercase opacity-80">{label}</span>
    </div>
);

const CountdownDisplay: React.FC<{ targetDate: string, name: string }> = ({ targetDate, name }) => {
    const { days, hours, minutes, seconds, isFinished } = useCountdown(targetDate);

    if (isFinished) {
        return (
            <div className="text-center">
                <h3 className="font-bold text-xl drop-shadow-md">{name}</h3>
                <p className="text-lg font-semibold mt-2 drop-shadow-md">直播即将开始</p>
            </div>
        );
    }

    return (
        <div className="text-center">
            <h3 className="font-bold text-lg mb-4 drop-shadow-md">{name}</h3>
            <div className="flex items-center gap-3">
                {days > 0 && (
                    <>
                        <CountdownItem value={days} label="天" />
                        <span className="text-3xl font-bold pb-4">:</span>
                    </>
                )}
                <CountdownItem value={hours} label="时" />
                <span className="text-3xl font-bold pb-4">:</span>
                <CountdownItem value={minutes} label="分" />
                <span className="text-3xl font-bold pb-4">:</span>
                <CountdownItem value={seconds} label="秒" />
            </div>
        </div>
    );
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport }) => {
    const isUpcoming = task.status.toLowerCase() === 'pending' && new Date(task.start_time) > new Date();
    const statusDetails = getStatusDetails(task.status);
    const isFinished = statusDetails.text === '已结束';
    const displayName = task.livestream_name || '未命名任务';

    const handleReplayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(task.url, '_blank', 'noopener,noreferrer');
    };

    const handleReportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.summary_report) {
            onViewReport();
        }
    };


    return (
        <div 
            className="relative aspect-[16/9] w-full bg-gray-900 rounded-2xl overflow-hidden shadow-lg group transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
        >
            {task.livestream_image ? (
                <img src={task.livestream_image} alt={displayName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-black"></div>
            )}
            
            <div className={`absolute inset-0 ${isUpcoming ? 'bg-black/50' : 'bg-gradient-to-t from-black/80 via-black/40 to-transparent'}`}></div>

            {isUpcoming ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 p-4">
                    <CountdownDisplay targetDate={task.start_time} name={displayName} />
                </div>
            ) : (
                <>
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
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

                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
                         {task.entity && (
                            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full mb-2">
                                {task.entity}
                            </span>
                        )}
                        <h3 className="font-bold text-lg leading-tight line-clamp-2" title={displayName}>
                            {displayName}
                        </h3>
                        <div className="text-xs text-white/80 mt-1.5 space-y-0.5">
                            <p>{task.host_name || '未知主播'}</p>
                            <p>
                                {new Date(task.start_time).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {isFinished && (
                             <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={handleReportClick}
                                    disabled={!task.summary_report}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold rounded-lg hover:bg-white/20 transition-colors disabled:bg-gray-500/20 disabled:cursor-not-allowed"
                                >
                                    <DocumentTextIcon className="w-4 h-4" />
                                    <span>查看报告</span>
                                </button>
                                <button
                                    onClick={handleReplayClick}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <FilmIcon className="w-4 h-4" />
                                    <span>查看回放</span>
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};