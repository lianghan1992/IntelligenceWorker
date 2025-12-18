
import React, { useState, useEffect } from 'react';
import { StratifyTask } from '../../../types';
import { getStratifyTasks } from '../../../api/stratify';
import { CloseIcon, ClockIcon, SparklesIcon, ChevronRightIcon } from '../../icons';

export const HistoryDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (taskId: string) => void;
}> = ({ isOpen, onClose, onSelect }) => {
    const [tasks, setTasks] = useState<StratifyTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getStratifyTasks().then(setTasks).finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-slate-400" /> 历史任务记录
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><CloseIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {isLoading ? (
                        [1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse"></div>)
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">暂无历史记录</div>
                    ) : (
                        tasks.map(task => (
                            <div 
                                key={task.id}
                                onClick={() => onSelect(task.id)}
                                className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                        {task.scenario_name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 line-clamp-2 mb-3 leading-snug group-hover:text-indigo-600">
                                    {task.input_text}
                                </h4>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                        <span className={task.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}>
                                            {task.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
