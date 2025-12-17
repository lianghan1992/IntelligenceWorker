
import React, { useState, useEffect, useRef } from 'react';
import { createIntelLlmTask, getIntelLlmTasks } from '../../../api/intelligence';
import { IntelLlmTask, User } from '../../../types';
import { TaskCreationForm } from './TaskCreationForm';
import { TaskItem } from './TaskItem';
import { RefreshIcon, CloseIcon, SparklesIcon } from '../../icons';

interface CopilotPanelProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({ user, isOpen, onClose }) => {
    const [tasks, setTasks] = useState<IntelLlmTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Initial Load & Polling
    useEffect(() => {
        if (isOpen) {
            fetchTasks();
            const interval = setInterval(fetchTasks, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const fetchTasks = async () => {
        try {
            const res = await getIntelLlmTasks({ page: 1, page_size: 20 });
            // Sort by creation time descending (newest first) for Task List style
            const sorted = (res.items || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTasks(sorted);
        } catch (e) {
            console.error("Failed to fetch copilot tasks", e);
        }
    };

    const handleCreate = async (description: string, config: { startMonth: string; endMonth: string; needSummary: boolean }) => {
        if (!user) return;
        setIsSending(true);
        try {
            const timeRangeParts = [config.startMonth, config.endMonth].filter(Boolean);
            const timeRange = timeRangeParts.length > 0 ? timeRangeParts.join(',') : undefined;

            await createIntelLlmTask({
                user_uuid: user.id,
                description,
                time_range: timeRange,
                need_summary: config.needSummary
            });
            
            // Immediate refresh
            await fetchTasks();
        } catch (e) {
            alert('任务创建失败，请检查网络');
        } finally {
            setIsSending(false);
        }
    };

    // 如果未打开，不渲染任何内容（或者由父级控制渲染）
    if (!isOpen) return null;

    return (
        <div className="w-full h-full bg-slate-50 flex flex-col border-l border-slate-200 shadow-xl relative z-10">
            {/* Header */}
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold text-slate-800">AI 智能检索</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchTasks} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600 transition-colors" title="刷新任务">
                        <RefreshIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Create Form Section */}
            <div className="flex-shrink-0 z-10 shadow-sm relative">
                <TaskCreationForm onCreate={handleCreate} isLoading={isSending} />
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
                <div className="flex items-center justify-between px-1 mb-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">历史任务 ({tasks.length})</h4>
                </div>
                
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <SparklesIcon className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-sm">暂无任务，快去创建一个吧</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskItem key={task.uuid} task={task} />
                    ))
                )}
            </div>
        </div>
    );
};
