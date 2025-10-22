import React, { useState, useEffect } from 'react';
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
    const isUpcoming = task.status.toLowerCase() === 'pending' && new Date(task.start_time) > new Date();
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
                </>
            )}
        </div>
    );
};