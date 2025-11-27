
import React, { useState, useEffect } from 'react';
import { LivestreamTask, View } from '../../types';
import { getLivestreamTasks } from '../../api';
import { VideoCameraIcon, ArrowRightIcon, ClockIcon, PlayIcon, LightningIcon } from '../icons';

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
                const res = await getLivestreamTasks({ limit: 4, sort_by: 'start_time', order: 'desc' });
                setTasks(res.items || []);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetch();
    }, []);

    return (
        <div className="flex-1 bg-white/70 backdrop-blur-xl rounded-[24px] border border-white/60 p-6 shadow-lg shadow-indigo-500/5 flex flex-col relative overflow-hidden h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-xl text-red-500 shadow-sm">
                        <VideoCameraIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-slate-800 tracking-tight">实时监控</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Events</p>
                    </div>
                </div>
                <button onClick={() => onNavigate('events')} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all">
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 space-y-3 z-10 overflow-y-auto custom-scrollbar pr-1">
                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100/50 rounded-2xl animate-pulse"></div>)}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 space-y-3 border-2 border-dashed border-slate-100 rounded-2xl">
                        <div className="p-3 bg-slate-50 rounded-full">
                            <VideoCameraIcon className="w-6 h-6 opacity-40" />
                        </div>
                        <p className="text-xs font-medium">暂无直播任务</p>
                    </div>
                ) : (
                    tasks.map(task => {
                        const status = task.status.toLowerCase();
                        const isLive = ['recording', 'downloading'].includes(status);
                        const isProcessing = status === 'processing';
                        const img = getSafeImageSrc(task.cover_image_b64);
                        
                        return (
                            <div key={task.id} onClick={() => onNavigate('events')} className="group relative flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                                {/* Hover Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                
                                {/* Thumbnail */}
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 shadow-inner border border-black/5">
                                    {img ? <img src={img} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" alt="" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><VideoCameraIcon className="w-6 h-6 text-slate-300"/></div>}
                                    
                                    {isLive && (
                                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
                                            <div className="w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40">
                                                <LightningIcon className="w-3.5 h-3.5 text-white animate-pulse" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 relative z-10">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{task.company}</span>
                                        
                                        {isLive ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                                                LIVE
                                            </span>
                                        ) : isProcessing ? (
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                                                AI 生成中
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium text-slate-400">
                                                已结束
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h4 className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{task.task_name}</h4>
                                    
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                                        <ClockIcon className="w-3 h-3" />
                                        {new Date(task.start_time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
