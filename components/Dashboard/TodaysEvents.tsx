import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon } from '../icons';

const EventCard: React.FC<{ event: LivestreamTask; onNavigate: (view: View) => void }> = ({ event, onNavigate }) => (
    <div 
        onClick={() => onNavigate('events')}
        className="bg-white p-4 rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-blue-400 cursor-pointer h-full flex flex-col justify-between"
    >
        <div>
            <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full self-start truncate">
                    {event.entity || event.host_name}
                </span>
                <span className="text-xs font-semibold text-gray-500 flex-shrink-0 ml-2">
                    {new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
            </div>
            <p className="font-bold text-gray-800 mt-2 text-sm line-clamp-2">{event.livestream_name}</p>
        </div>
        <div className={`mt-2 text-xs font-bold px-2 py-1 rounded text-center ${
            event.status.toLowerCase() === 'recording' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
            {event.status.toLowerCase() === 'recording' ? '直播中' : '即将开始'}
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
                // Fetch upcoming and ongoing events
                const [upcomingRes, liveRes] = await Promise.all([
                    getLivestreamTasks({ limit: 5, status: 'pending', sort_by: 'start_time', order: 'asc' }),
                    getLivestreamTasks({ limit: 5, status: 'recording', sort_by: 'start_time', order: 'asc' })
                ]);
                const combined = [...liveRes.items, ...upcomingRes.items];
                const uniqueEvents = Array.from(new Map(combined.map(e => [e.id, e])).values());
                const sortedEvents = uniqueEvents.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                setEvents(sortedEvents.slice(0, 3)); // Show top 3
            } catch (error) {
                console.error("Failed to fetch today's events:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading) {
        // You can return a loading skeleton here if you prefer
        return null;
    }
    
    if (events.length === 0) {
        return null; // Don't render the section if there are no events
    }

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
                {events.map(event => (
                    <EventCard key={event.id} event={event} onNavigate={onNavigate} />
                ))}
            </div>
        </div>
    );
};
