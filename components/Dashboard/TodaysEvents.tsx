import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon } from '../icons';

const formatTimeLeft = (distance: number): string | null => {
    if (distance < 0) return null;
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


const EventCard: React.FC<{ event: LivestreamTask; onNavigate: (view: View) => void }> = ({ event, onNavigate }) => {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const isLive = event.status.toLowerCase() === 'recording';
    const imageUrl = event.livestream_image?.startsWith('data:image') 
        ? event.livestream_image 
        : `data:image/jpeg;base64,${event.livestream_image}`;

    useEffect(() => {
        if (isLive) return;

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
    }, [event.start_time, isLive]);

    return (
        <div 
            onClick={() => onNavigate('events')}
            className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        >
            {event.livestream_image ? (
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
                    ) : (
                         <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/90 backdrop-blur-sm">
                            即将开始
                        </span>
                    )}
                </div>

                {/* Middle: Countdown */}
                {!isLive && timeLeft && (
                    <div className="text-center">
                        <div className="text-4xl font-bold tracking-tighter" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {timeLeft}
                        </div>
                        <p className="text-sm opacity-80">后开始</p>
                    </div>
                )}
                
                {/* Bottom: Info */}
                <div style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
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
                const [pendingRes, liveRes, listeningRes] = await Promise.all([
                    getLivestreamTasks({ limit: 5, status: 'pending', sort_by: 'start_time', order: 'asc' }),
                    getLivestreamTasks({ limit: 5, status: 'recording', sort_by: 'start_time', order: 'asc' }),
                    getLivestreamTasks({ limit: 5, status: 'listening', sort_by: 'start_time', order: 'asc' })
                ]);
                const combined = [...liveRes.items, ...pendingRes.items, ...listeningRes.items];
                const uniqueEvents = Array.from(new Map(combined.map(e => [e.id, e])).values());
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                const todaysEvents = uniqueEvents.filter(event => {
                    const eventDate = new Date(event.start_time);
                    return eventDate >= today && eventDate <= endOfDay;
                });

                const sortedEvents = todaysEvents.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                setEvents(sortedEvents.slice(0, 3)); // Show top 3
            } catch (error) {
                console.error("Failed to fetch today's events:", error);
                setEvents([]); // Ensure events is an empty array on error
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? (
                     Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
                ) : events.length > 0 ? (
                    events.map(event => (
                        <EventCard key={event.id} event={event} onNavigate={onNavigate} />
                    ))
                ) : (
                    <div className="md:col-span-3 bg-white p-6 rounded-xl border border-dashed text-center text-gray-500">
                        今日暂无发布会安排。
                    </div>
                )}
            </div>
        </div>
    );
};