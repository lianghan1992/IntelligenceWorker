import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon, PlayIcon } from '../icons';

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


const formatTimeLeft = (distance: number): string | null => {
    if (distance < 0) return null;
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


const EventCard: React.FC<{ event: LivestreamTask; onNavigate: (view: View) => void }> = ({ event, onNavigate }) => {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const statusLower = event.status.toLowerCase();
    const isLive = statusLower === 'recording';
    const isCompleted = statusLower === 'completed';
    const imageUrl = getSafeImageSrc(event.livestream_image);

    useEffect(() => {
        if (isLive || isCompleted) return;

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const startTime = new Date(event.start_time).getTime();
            const distance = startTime - now;
            if (distance < 0) {
                setTimeLeft(null);
                clearInterval(timer);
            } else {
                setTimeLeft(formatTimeLeft(distance));
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [event.start_time, isLive, isCompleted]);

    return (
        <div 
            onClick={() => onNavigate('events')}
            className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        >
            {imageUrl ? (
                <img src={imageUrl} alt={event.livestream_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-700 to-gray-900"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            <div className="relative z-10 p-4 h-full flex flex-col justify-between text-white">
                {/* Top: Status Badge */}
                <div className="flex justify-end">
                    {isLive ? (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500/90 backdrop-blur-sm flex items-center gap-1.5 animate-pulse">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            直播中
                        </span>
                    ) : isCompleted ? (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/90 backdrop-blur-sm">
                            已结束
                        </span>
                    ) : (
                         <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/90 backdrop-blur-sm">
                            即将开始
                        </span>
                    )}
                </div>

                {/* Middle: Countdown */}
                {!isLive && !isCompleted && timeLeft && (
                    <div className="text-center">
                        <div className="text-4xl font-bold tracking-tighter" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {timeLeft}
                        </div>
                        <p className="text-sm opacity-80">后开始</p>
                    </div>
                )}
                
                {/* Bottom: Info */}
                <div style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    {isLive && (
                        <a 
                            href={event.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mb-3 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105"
                        >
                            <PlayIcon className="w-4 h-4" />
                            <span>观看直播</span>
                        </a>
                    )}
                    <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full mb-1">
                        {event.entity || event.host_name}
                    </span>
                    <h3 className="text-lg font-bold leading-tight">{event.livestream_name}</h3>
                    <p className="text-xs text-gray-200 mt-1">
                       {new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })} 开始
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
                const [pendingRes, liveRes, listeningRes, completedRes] = await Promise.all([
                    getLivestreamTasks({ page_size: 5, status: 'pending', sort_by: 'start_time', order: 'asc' }),
                    getLivestreamTasks({ page_size: 5, status: 'recording', sort_by: 'start_time', order: 'asc' }),
                    getLivestreamTasks({ page_size: 5, status: 'listening', sort_by: 'start_time', order: 'asc' }),
                    getLivestreamTasks({ page_size: 5, status: 'completed', sort_by: 'start_time', order: 'desc' })
                ]);
                const combined = [...liveRes.items, ...pendingRes.items, ...listeningRes.items, ...completedRes.items];
                const uniqueEvents = Array.from(new Map(combined.map(e => [e.url, e])).values());
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                const todaysEvents = uniqueEvents.filter(event => {
                    const eventDate = new Date(event.start_time);
                    return eventDate >= today && eventDate <= endOfDay;
                });
                
                const getStatusPriority = (status: string) => {
                    const s = status.toLowerCase();
                    if (s === 'recording') return 0; // Live
                    if (s === 'listening' || s === 'pending') return 1; // Upcoming
                    if (s === 'completed') return 2; // Finished
                    return 3; // Others
                };

                const sortedEvents = todaysEvents.sort((a, b) => {
                    const priorityA = getStatusPriority(a.status);
                    const priorityB = getStatusPriority(b.status);
                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }
                    // For upcoming, sort by start time ascending. For completed, sort by start time descending (most recent first)
                    if (priorityA === 1) { // upcoming
                        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                    }
                    if (priorityA === 2) { // completed
                        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
                    }
                    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime(); // default for live and others
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
                        <EventCard key={event.url + event.start_time} event={event} onNavigate={onNavigate} />
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
