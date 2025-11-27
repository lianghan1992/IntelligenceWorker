
import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon, PlayIcon, FilmIcon, DocumentTextIcon, ClockIcon } from '../icons';

// Helper to handle image src
const getSafeImageSrc = (base64Data: string | null | undefined): string | null => {
  if (!base64Data || base64Data.trim() === '' || base64Data.toLowerCase() === 'none' || base64Data.toLowerCase() === 'null') {
    return null;
  }
  if (base64Data.startsWith('data:image') || base64Data.startsWith('http')) {
    return base64Data;
  }
  return `data:image/jpeg;base64,${base64Data}`;
};

const CompactEventCard: React.FC<{ event: LivestreamTask; onNavigate: (view: View) => void }> = ({ event, onNavigate }) => {
    const statusLower = event.status.toLowerCase();
    const isLive = ['recording', 'downloading', 'stopping'].includes(statusLower);
    const isUpcoming = ['listening', 'scheduled', 'pending'].includes(statusLower);
    const imageUrl = getSafeImageSrc(event.cover_image_b64);

    return (
        <div 
            onClick={() => onNavigate('events')}
            className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                {imageUrl ? (
                    <img src={imageUrl} alt={event.task_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><FilmIcon className="w-6 h-6" /></div>
                )}
                {isLive && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    </div>
                )}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-700 transition-colors">{event.task_name}</h4>
                    {isLive && <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded flex-shrink-0 ml-2">LIVE</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">{event.company}</span>
                    <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="mt-1.5">
                    {isUpcoming ? (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">即将开始</span>
                    ) : isLive ? (
                        <span className="text-[10px] text-red-600 font-medium">正在直播中...</span>
                    ) : (
                        <span className="text-[10px] text-slate-400">已结束</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TodaysEvents: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
    const [events, setEvents] = useState<LivestreamTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const response = await getLivestreamTasks({ page_size: 20, sort_by: 'start_time', order: 'desc' });
                const allEvents = response.items || [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                // Filter for today or future (upcoming)
                const relevantEvents = allEvents.filter(event => {
                    const eventDate = new Date(event.start_time);
                    // Include today's events OR future upcoming events
                    const isToday = eventDate >= today && eventDate <= endOfDay;
                    const isFuture = eventDate > endOfDay && ['listening', 'scheduled'].includes(event.status);
                    return isToday || isFuture;
                }).slice(0, 3); // Limit to 3

                setEvents(relevantEvents);
            } catch (error) {
                console.error("Failed to fetch events:", error);
                setEvents([]); 
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <VideoCameraIcon className="w-5 h-5 text-orange-500" />
                    近期日程
                </h2>
                <button 
                    onClick={() => onNavigate('events')} 
                    className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                    日程表 <ArrowRightIcon className="w-3 h-3"/>
                </button>
            </div>
            
            <div className="flex-1 space-y-3">
                {loading ? (
                     [1, 2].map(i => (
                        <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse border border-slate-200"></div>
                     ))
                ) : events.length > 0 ? (
                    events.map(event => (
                        <CompactEventCard key={event.id} event={event} onNavigate={onNavigate} />
                    ))
                ) : (
                    <div className="h-full bg-white p-6 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400">
                        <ClockIcon className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-xs">近期暂无发布会安排</span>
                        <button onClick={() => onNavigate('events')} className="mt-2 text-xs text-indigo-600 font-medium hover:underline">
                            查看历史回放
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
