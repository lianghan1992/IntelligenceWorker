
import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon, ClockIcon, PlayIcon } from '../icons';

const getSafeImageSrc = (base64Data: string | null | undefined): string | null => {
  if (!base64Data || base64Data.trim() === '' || base64Data.toLowerCase() === 'none' || base64Data.toLowerCase() === 'null') return null;
  if (base64Data.startsWith('data:image') || base64Data.startsWith('http')) return base64Data;
  return `data:image/jpeg;base64,${base64Data}`;
};

export const TodaysEvents: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                // Get upcoming or live tasks
                const res = await getLivestreamTasks({ limit: 3, sort_by: 'start_time', order: 'desc' });
                setTasks(res.items || []);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetch();
    }, []);

    return (
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-xl text-red-500">
                        <VideoCameraIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-800">发布会监控</h2>
                </div>
                <button onClick={() => onNavigate('events')} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <ArrowRightIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 space-y-4 z-10">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1,2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl"></div>)}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <VideoCameraIcon className="w-10 h-10 opacity-20" />
                        <p className="text-sm">暂无直播任务</p>
                    </div>
                ) : (
                    tasks.map(task => {
                        const isLive = ['recording', 'downloading'].includes(task.status.toLowerCase());
                        const img = getSafeImageSrc(task.cover_image_b64);
                        return (
                            <div key={task.id} onClick={() => onNavigate('events')} className="group flex items-center gap-4 p-3 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-all cursor-pointer">
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                                    {img ? <img src={img} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-800"></div>}
                                    {isLive && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{task.task_name}</h4>
                                        {isLive && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">LIVE</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{task.company}</p>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5 font-mono">
                                        <ClockIcon className="w-3 h-3" />
                                        {new Date(task.start_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* Decorative bg */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        </div>
    );
};
