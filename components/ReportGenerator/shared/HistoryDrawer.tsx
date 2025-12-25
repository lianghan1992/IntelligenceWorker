
import React, { useState, useEffect } from 'react';
import { getStratifyTasks } from '../../../api/stratify';
import { StratifyTask } from '../../../types';
import { ClockIcon, CloseIcon, ChevronRightIcon, RefreshIcon } from '../../icons';

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (taskId: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, onSelect }) => {
    const [tasks, setTasks] = useState<StratifyTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const res = await getStratifyTasks({ limit: 20 });
            setTasks(res || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchHistory();
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 z-[70] w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-indigo-600" /> 历史任务
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={fetchHistory} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {tasks.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => onSelect(task.id)}
                            className="p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                                    {task.scenario_name}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                    {task.status}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-700">
                                {task.input_text}
                            </p>
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                            </div>
                        </div>
                    ))}
                    {!isLoading && tasks.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">暂无历史记录</div>
                    )}
                </div>
            </div>
        </>
    );
};
