import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon, PlayIcon, FilmIcon } from '../icons';

// Simplified and robust helper to handle image data from the backend
const getSafeImageSrc = (base64Data: string | null | undefined): string | null => {
  if (!base64Data || base64Data.trim() === '' || base64Data.toLowerCase() === 'none' || base64Data.toLowerCase() === 'null') {
    return null;
  }
  
  // If it's already a data URI, return it directly.
  if (base64Data.startsWith('data:image')) {
    return base64Data;
  }

  // If it's a full external URL, return it.
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }

  // Assume it's a raw base64 string and prepend the necessary prefix for JPG.
  return `data:image/jpeg;base64,${base64Data}`;
};


const formatTimeLeft = (distance: number): string | null => {
    if (distance < 0) return null;
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (days > 0) {
        return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


const EventCard: React.FC<{ event: LivestreamTask; onNavigate: (view: View) => void }> = ({ event, onNavigate }) => {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const statusLower = event.status.toLowerCase();
    
    // Comprehensive status mapping
    const isLive = ['recording', 'downloading', 'stopping'].includes(statusLower);
    const isProcessing = statusLower === 'processing';
    const isCompleted = ['finished', 'completed', 'failed'].includes(statusLower);
    const isUpcoming = ['scheduled', 'listening', 'pending'].includes(statusLower);

    const imageUrl = getSafeImageSrc(event.cover_image_b64);

    useEffect(() => {
        if (!isUpcoming) {
            setTimeLeft(null);
            return;
        }

        const calculateTime = () => {
            const now = new Date().getTime();
            const startTime = new Date(event.start_time).getTime();
            const distance = startTime - now;
            if (distance < 0) {
                setTimeLeft(null);
                return false; // Should stop
            } else {
                setTimeLeft(formatTimeLeft(distance));
                return true; // Keep running
            }
        };

        // Initial run
        if (!calculateTime()) return;

        const timer = setInterval(() => {
            if (!calculateTime()) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [event.start_time, isUpcoming]);

    const countdownTextSize = timeLeft && timeLeft.length > 8 ? 'text-3xl' : 'text-4xl';

    return (
        <div 
            onClick={() => onNavigate('events')}
            className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        >
            {imageUrl ? (
                <img src={imageUrl} alt={event.task_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <FilmIcon className="w-12 h-12 text-gray-600" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            <div className="relative z-10 p-4 h-full flex flex-col justify-between text-white">
                {/* Top: Status Badge */}
                <div className="flex justify-end">
                    {isLive && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500/90 backdrop-blur-sm flex items-center gap-1.5 animate-pulse border border-red-400/50">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            直播中
                        </span>
                    )}
                    {isProcessing && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-500/90 backdrop-blur-sm border border-indigo-400/50">
                            AI生成中
                        </span>
                    )}
                    {isCompleted && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/90 backdrop-blur-sm border border-green-400/50">
                            已结束
                        </span>
                    )}
                    {isUpcoming && (
                         <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/90 backdrop-blur-sm border border-blue-400/50">
                            即将开始
                        </span>
                    )}
                </div>

                {/* Middle: Countdown (Only for Upcoming) */}
                {isUpcoming && timeLeft && (
                    <div className="text-center">
                        <div className={`${countdownTextSize} font-bold tracking-tighter`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {timeLeft}
                        </div>
                        <p className="text-sm opacity-80">后开始</p>
                    </div>
                )}
                
                {/* Bottom: Info */}
                <div style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    {isLive && (
                        <a 
                            href={event.live_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mb-3 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105"
                        >
                            <PlayIcon className="w-4 h-4" />
                            <span>观看直播</span>
                        </a>
                    )}
                    <h3 className="text-lg font-bold leading-tight line-clamp-2">{event.task_name}</h3>
                    <p className="text-xs text-gray-200 mt-1 flex items-center gap-1">
                       <span>{event.company}</span>
                       <span>•</span>
                       <span>{new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })} 开始</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

const SkeletonCard: React.FC = () => (
    <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-200 animate-pulse">
        <div className="p-4 h-full flex flex-col justify-between">
            <div className="flex justify-end">
                <div className="h-5 w-16 bg-gray-300 rounded-full"></div>
            </div>
            <div>
                 <div className="h-4 w-1/3 bg-gray-300 rounded mb-1"></div>
                 <div className="h-6 w-4/5 bg-gray-300 rounded"></div>
                 <div className="h-3 w-1/4 bg-gray-300 rounded mt-2"></div>
            </div>
        </div>
    </div>
);


export const TodaysEvents: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
    const [events, setEvents] = useState<LivestreamTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                // Fetch recent tasks, sorted by start time to catch upcoming and just-passed events.
                const response = await getLivestreamTasks({ page_size: 50, sort_by: 'start_time', order: 'desc' });
                
                const allEvents = response.items || [];
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                const todaysEvents = allEvents.filter(event => {
                    const eventDate = new Date(event.start_time);
                    return eventDate >= today && eventDate <= endOfDay;
                });
                
                const getStatusPriority = (status: string) => {
                    const s = status.toLowerCase();
                    if (['recording', 'downloading', 'stopping'].includes(s)) return 0; // Live
                    if (['listening', 'scheduled', 'pending'].includes(s)) return 1; // Upcoming
                    if (s === 'processing') return 2; // Processing
                    if (['finished', 'completed', 'failed'].includes(s)) return 3; // Finished
                    return 4; // Others
                };

                const sortedEvents = todaysEvents.sort((a, b) => {
                    const priorityA = getStatusPriority(a.status);
                    const priorityB = getStatusPriority(b.status);
                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }
                    // For upcoming, sort by start time ascending (soonest first). 
                    if (priorityA === 1) { 
                        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                    }
                    // For everything else (Live 0, Processing 2, Finished 3), sort by start time descending (most recent first)
                    return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
                });

                setEvents(sortedEvents.slice(0, 4)); // Show top 4
            } catch (error) {
                console.error("Failed to fetch today's events:", error);
                setEvents([]); 
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <VideoCameraIcon className="w-6 h-6 text-indigo-500" />
                    今日事件
                </h2>
                <button 
                    onClick={() => onNavigate('events')} 
                    className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                >
                    查看全部 <ArrowRightIcon className="w-4 h-4"/>
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                     Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
                ) : events.length > 0 ? (
                    events.map(event => (
                        <EventCard key={event.live_url + event.start_time} event={event} onNavigate={onNavigate} />
                    ))
                ) : (
                    <div className="sm:col-span-2 lg:col-span-4 bg-white p-6 rounded-xl border border-dashed text-center text-gray-500">
                        今日暂无发布会安排。
                    </div>
                )}
            </div>
        </div>
    );
};
