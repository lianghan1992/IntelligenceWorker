import React, { useState, useEffect } from 'react';
import { LivestreamTask } from '../../types';
import { DocumentTextIcon, FilmIcon, PlayIcon } from '../icons';

interface TaskCardProps {
    task: LivestreamTask;
    onViewReport: () => void;
}

// Helper function to safely handle various image data formats from the backend
const getSafeImageSrc = (imageData: string | null | undefined): string | null => {
  // 1. Initial cleanup for falsy or placeholder values
  if (!imageData || imageData.trim() === '' || imageData.toLowerCase() === 'none' || imageData.toLowerCase() === 'null') {
    return null;
  }
  
  // 2. Handle full external URLs
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }

  // 3. Handle potential data URIs, including broken ones due to double-encoding
  if (imageData.startsWith('data:image')) {
    const parts = imageData.split(',');
    if (parts.length < 2) return null; // Malformed

    const prefix = parts[0];
    let payload = parts.slice(1).join(',');

    try {
      // Attempt to decode, checking for double-encoding
      const decodedPayload = atob(payload);

      if (decodedPayload.startsWith('data:image')) {
        // Case: The entire data URI was base64 encoded. The decoded payload is the correct URI.
        // e.g., base64('data:image/jpeg;base64,/9j/...')
        return decodedPayload;
      } else if (decodedPayload.startsWith('/9j/')) {
        // Case: The base64 data was double-encoded.
        // e.g., base64('/9j/...')
        return `${prefix},${decodedPayload}`;
      }
    } catch (e) {
      // Decoding failed, which is expected for a correct, single-encoded base64 string.
      // We can proceed assuming the original imageData is correct.
    }
    
    // If no double-encoding was detected, return the original URI as is.
    return imageData;
  }
  
  // 4. Fallback for raw base64 string without a prefix
  try {
    atob(imageData); // Verify it's valid base64
    return `data:image/jpeg;base64,${imageData}`;
  } catch (e) {
    console.error("Invalid image data format:", imageData);
    return null; // The data is not a URL, not a data URI, and not valid raw base64.
  }
};


const getStatusDetails = (status: string) => {
    const statusLower = status.toLowerCase();

    if (statusLower === 'recording') {
        return { text: '直播中', className: 'bg-red-500 text-white', type: 'live' };
    }
    if (statusLower === 'listening' || statusLower === 'pending') {
        return { text: '即将开始', className: 'bg-blue-500 text-white', type: 'upcoming' };
    }
    if (statusLower === 'completed') {
        return { text: '已结束', className: 'bg-green-500 text-white', type: 'finished' };
    }
    if (statusLower === 'processing') {
        return { text: 'AI总结中', className: 'bg-indigo-500 text-white', type: 'finished' };
    }
    if (statusLower === 'failed') {
        return { text: '失败', className: 'bg-red-500 text-white', type: 'finished' };
    }
    return { text: '已结束', className: 'bg-gray-500 text-white', type: 'finished' };
};

const CountdownDisplay: React.FC<{ timeLeft: string }> = ({ timeLeft }) => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-white text-center font-bold" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.7)' }}>
            <div className="text-4xl lg:text-5xl tracking-tighter leading-none">{timeLeft}</div>
            <div className="text-sm lg:text-base opacity-80 tracking-wide mt-1">后开始</div>
        </div>
    );
};


export const TaskCard: React.FC<TaskCardProps> = ({ task, onViewReport }) => {
    const statusDetails = getStatusDetails(task.status);
    const isFinished = statusDetails.type === 'finished';
    const isLive = statusDetails.type === 'live';
    const hasReport = isFinished && !!task.summary_report;
    const [timeLeft, setTimeLeft] = useState('');
    const imageUrl = getSafeImageSrc(task.livestream_image);

    useEffect(() => {
        if (statusDetails.type !== 'upcoming') return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const startTime = new Date(task.start_time).getTime();
            const distance = startTime - now;

            if (distance < 0) return "即将开始";

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (days > 0) return `${days}天 ${String(hours).padStart(2, '0')}时`;
            if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            if (minutes > 0) return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            return `${seconds}秒`;
        };
        
        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            if (newTimeLeft === "即将开始" && timeLeft !== "即将开始") {
                // To avoid flicker, we can stop the timer and let the component re-render on next data fetch.
                 clearInterval(timer);
            }
            setTimeLeft(newTimeLeft);
        }, 1000);

        // Initial call
        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [task.start_time, statusDetails.type, timeLeft]);


    const formattedDate = new Date(task.start_time).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(/\//g, '.');

    const handleReplayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(task.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            onClick={hasReport ? onViewReport : undefined}
            className={`group relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-300 ${hasReport ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {imageUrl ? (
                <img src={imageUrl} alt={task.livestream_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gray-800"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full z-20 ${statusDetails.className}`}>
                 {statusDetails.text}
            </span>

            {statusDetails.type === 'upcoming' && timeLeft && timeLeft !== "即将开始" && (
                <CountdownDisplay timeLeft={timeLeft} />
            )}

            <div className="absolute inset-0 flex flex-col justify-end p-4 text-white z-10">
                <h3 className="text-lg font-bold drop-shadow-md leading-tight">{task.livestream_name}</h3>
                <p className="text-xs text-gray-200 mt-1.5 drop-shadow-sm">{task.host_name} &nbsp;&nbsp;|&nbsp;&nbsp; {formattedDate}</p>

                {isLive && (
                    <div className="mt-4">
                        <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105"
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
                            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>{hasReport ? '查看报告' : '报告生成中'}</span>
                        </button>
                        <button 
                            onClick={handleReplayClick} 
                            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20 transition-colors"
                        >
                            <FilmIcon className="w-4 h-4" />
                            <span>查看回放</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};