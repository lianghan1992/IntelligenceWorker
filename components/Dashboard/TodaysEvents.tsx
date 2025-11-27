
import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon, ClockIcon, PlayIcon } from '../icons';

const TimelineItem: React.FC<{ event: LivestreamTask; onNavigate: (view: View) => void }> = ({ event, onNavigate }) => {
    const status = event.status.toLowerCase();
    const isLive = ['recording', 'downloading', 'stopping'].includes(status);
    const isFuture = ['listening', 'scheduled', 'pending'].includes(status);
    
    const timeStr = new Date(event.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(event.start_time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

    return (
        <div onClick={() => onNavigate('events')} className="relative pl-6 pb-8 group cursor-pointer last:pb-0">
            {/* Line */}
            <div className="absolute left-0 top-2 bottom-0 w-px bg-slate-200 group-last:hidden"></div>
            
            {/* Dot */}
            <div className={`
                absolute left-[-4px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-all duration-300
                ${isLive ? 'bg-red-500 scale-125 shadow-red-200 ring-4 ring-red-100' : isFuture ? 'bg-blue-500' : 'bg-slate-300'}
            `}></div>

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-500">{timeStr}</span>
                    <span>{dateStr}</span>
                    {isLive && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">LIVE</span>}
                </div>
                
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                    {event.task_name}
                </h4>
                <div className="text-xs text-slate-500 mt-0.5 bg-slate-50 px-2 py-1 rounded-md self-start border border-slate-100">
                    {event.company}
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
                // Get diverse events to show active timeline
                const res = await getLivestreamTasks({ page_size: 5, sort_by: 'start_time', order: 'desc' });
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
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                        <VideoCameraIcon className="w-4 h-4" />
                    </div>
                    活动时间轴
                </h2>
                <button onClick={() => onNavigate('events')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <div className="space-y-6 animate-pulse pl-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="h-3 w-20 bg-slate-200 rounded"></div>
                                <div className="h-4 w-full bg-slate-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs">
                        <ClockIcon className="w-8 h-8 mb-2 opacity-20" />
                        暂无日程
                    </div>
                ) : (
                    <div className="pt-2">
                        {events.map(e => <TimelineItem key={e.id} event={e} onNavigate={onNavigate} />)}
                    </div>
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100">
                <button 
                    onClick={() => onNavigate('events')}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                    <PlayIcon className="w-4 h-4" />
                    进入直播中心
                </button>
            </div>
        </div>
    );
};
