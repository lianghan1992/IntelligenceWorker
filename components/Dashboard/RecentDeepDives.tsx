
import React, { useState, useEffect } from 'react';
import { DeepInsightTask } from '../../types';
import { getDeepInsightTasks } from '../../api';
import { DocumentTextIcon, ArrowRightIcon, CheckIcon, ClockIcon } from '../icons';
import { View } from '../../types';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed': return 'text-green-500 bg-green-50 border-green-100';
        case 'processing': return 'text-blue-500 bg-blue-50 border-blue-100 animate-pulse';
        case 'failed': return 'text-red-500 bg-red-50 border-red-100';
        default: return 'text-yellow-500 bg-yellow-50 border-yellow-100';
    }
};

const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckIcon className="w-3 h-3" />;
    if (status === 'processing') return <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />;
    return <ClockIcon className="w-3 h-3" />;
}

export const RecentDeepDives: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const res = await getDeepInsightTasks({ limit: 5, page: 1 });
                setTasks(res.items || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecent();
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                    深度洞察速览
                </h2>
                <button 
                    onClick={() => onNavigate('dives')}
                    className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                    全部文档 <ArrowRightIcon className="w-3 h-3" />
                </button>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-10 bg-slate-100 rounded"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                                    <div className="h-2 bg-slate-100 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
                        <DocumentTextIcon className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">暂无文档记录</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {tasks.map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => onNavigate('dives')}
                                className="p-3 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer group flex items-start gap-3"
                            >
                                <div className="flex-shrink-0 w-8 h-10 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-300 group-hover:border-indigo-200 group-hover:text-indigo-300 transition-colors">
                                    <DocumentTextIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 line-clamp-1 transition-colors" title={task.file_name}>
                                            {task.file_name}
                                        </h4>
                                        <span className={`ml-2 flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(task.status)}`}>
                                            {getStatusIcon(task.status)}
                                            {task.status === 'completed' ? '已就绪' : task.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                        <span>{task.file_type.toUpperCase()}</span>
                                        <span>•</span>
                                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                    <button onClick={() => onNavigate('ai')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 w-full py-1">
                        + 生成新报告
                    </button>
                </div>
            </div>
        </div>
    );
};
