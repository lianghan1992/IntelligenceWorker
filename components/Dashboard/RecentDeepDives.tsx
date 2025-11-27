
import React, { useState, useEffect } from 'react';
import { DeepInsightTask, View } from '../../types';
import { getDeepInsightTasks } from '../../api';
import { DocumentTextIcon, ArrowRightIcon, CheckIcon, SparklesIcon } from '../icons';

export const RecentDeepDives: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getDeepInsightTasks({ limit: 3, page: 1 });
                setTasks(res.items || []);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetch();
    }, []);

    return (
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-xl text-purple-500">
                        <SparklesIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-800">深度洞察处理</h2>
                </div>
                <button onClick={() => onNavigate('dives')} className="text-slate-400 hover:text-indigo-600 transition-colors">
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
                        <DocumentTextIcon className="w-10 h-10 opacity-20" />
                        <p className="text-sm">暂无文档任务</p>
                    </div>
                ) : (
                    tasks.map(task => {
                        const isDone = task.status === 'completed';
                        return (
                            <div key={task.id} onClick={() => onNavigate('dives')} className="group flex items-center gap-4 p-3 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-all cursor-pointer">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {isDone ? <CheckIcon className="w-6 h-6" /> : <DocumentTextIcon className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{task.file_name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isDone ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {task.status}
                                        </span>
                                        <span className="text-xs text-slate-400">{task.file_type}</span>
                                    </div>
                                </div>
                                {task.status === 'processing' && (
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* Decorative bg */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        </div>
    );
};
