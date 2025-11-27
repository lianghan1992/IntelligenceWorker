
import React, { useState, useEffect } from 'react';
import { DeepInsightTask, View } from '../../types';
import { getDeepInsightTasks } from '../../api';
import { DocumentTextIcon, ArrowRightIcon, CheckIcon, SparklesIcon, ChipIcon } from '../icons';

export const RecentDeepDives: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getDeepInsightTasks({ limit: 4, page: 1 });
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
                    <div className="p-2.5 bg-purple-50 rounded-xl text-purple-500 shadow-sm">
                        <ChipIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-slate-800 tracking-tight">深度洞察</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processing Unit</p>
                    </div>
                </div>
                <button onClick={() => onNavigate('dives')} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-purple-600 transition-all">
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
                            <DocumentTextIcon className="w-6 h-6 opacity-40" />
                        </div>
                        <p className="text-xs font-medium">暂无处理任务</p>
                    </div>
                ) : (
                    tasks.map(task => {
                        const isDone = task.status === 'completed';
                        const isProcessing = task.status === 'processing';
                        
                        return (
                            <div key={task.id} onClick={() => onNavigate('dives')} className="group relative flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 hover:border-purple-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                                {/* Hover Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                {/* Icon Box */}
                                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? 'bg-emerald-50 text-emerald-500' : isProcessing ? 'bg-purple-50 text-purple-500' : 'bg-slate-100 text-slate-400'}`}>
                                    {isProcessing ? (
                                        <SparklesIcon className="w-6 h-6 animate-pulse" />
                                    ) : isDone ? (
                                        <CheckIcon className="w-6 h-6" />
                                    ) : (
                                        <DocumentTextIcon className="w-6 h-6" />
                                    )}
                                    
                                    {/* Type Badge */}
                                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-white rounded-md border border-slate-100 shadow-sm text-[8px] font-bold text-slate-500 uppercase">
                                        {task.file_type}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-sm text-slate-800 truncate w-3/4 group-hover:text-purple-600 transition-colors" title={task.file_name}>{task.file_name}</h4>
                                        {isProcessing && (
                                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-1.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                            isDone ? 'bg-emerald-100 text-emerald-700' : 
                                            isProcessing ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {task.status}
                                        </span>
                                        
                                        {isProcessing && task.total_pages > 0 ? (
                                            <div className="flex items-center gap-2 w-20">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${(task.processed_pages / task.total_pages) * 100}%` }}></div>
                                                </div>
                                                <span className="text-[9px] font-mono text-purple-500">{Math.round((task.processed_pages / task.total_pages) * 100)}%</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-mono">{task.total_pages} pages</span>
                                        )}
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
