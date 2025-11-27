
import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon, ClockIcon } from '../icons';

export const TodaysEvents: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
    const [events, setEvents] = useState<LivestreamTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const res = await getLivestreamTasks({ page_size: 5, sort_by: 'start_time', order: 'asc', status: 'scheduled,listening,pending' });
                setEvents(res.items || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <VideoCameraIcon className="w-5 h-5 text-orange-500" />
                    今日日程
                </h2>
                <button onClick={() => onNavigate('events')} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                    全部 <ArrowRightIcon className="w-3 h-3" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
                ) : events.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center">
                        <ClockIcon className="w-8 h-8 mb-2 opacity-20" />
                        暂无今日日程
                    </div>
                ) : (
                    events.map(event => (
                        <div 
                            key={event.id} 
                            onClick={() => onNavigate('events')}
                            className="p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                    {new Date(event.start_time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span className="text-[10px] text-gray-400">{event.company}</span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 line-clamp-2">
                                {event.task_name}
                            </h4>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
