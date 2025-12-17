
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createIntelLlmTask, getIntelLlmTasks } from '../../../api/intelligence';
import { IntelLlmTask, User } from '../../../types';
import { ChatInput } from './ChatInput';
import { TaskMessageBubble } from './TaskMessageBubble';
import { SparklesIcon, RefreshIcon } from '../../icons';

interface CopilotPanelProps {
    user: User;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({ user }) => {
    const [tasks, setTasks] = useState<IntelLlmTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        fetchTasks();
        // Polling for updates
        const interval = setInterval(fetchTasks, 5000);
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom on new tasks
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [tasks.length]);

    const fetchTasks = async () => {
        // Silent fetch
        try {
            const res = await getIntelLlmTasks({ page: 1, page_size: 20 });
            // Sort by creation time ascending for chat-like flow
            const sorted = (res.items || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setTasks(sorted);
        } catch (e) {
            console.error("Failed to fetch copilot tasks", e);
        }
    };

    const handleSend = async (message: string, config: { startMonth: string; endMonth: string; needSummary: boolean }) => {
        if (!user) return;
        setIsSending(true);
        try {
            const timeRangeParts = [config.startMonth, config.endMonth].filter(Boolean);
            const timeRange = timeRangeParts.length > 0 ? timeRangeParts.join(',') : undefined;

            await createIntelLlmTask({
                user_uuid: user.id,
                description: message,
                time_range: timeRange,
                need_summary: config.needSummary
            });
            
            // Immediate refresh
            await fetchTasks();
        } catch (e) {
            alert('发送失败，请检查网络');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-gray-800">AI 智能副驾驶</span>
                </div>
                <button onClick={fetchTasks} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                    <RefreshIcon className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Message List */}
            <div 
                ref={listRef}
                className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2"
            >
                {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                            <SparklesIcon className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="font-bold text-gray-700 mb-2">我是您的情报助手</h3>
                        <p className="text-xs text-gray-500 max-w-[200px]">
                            您可以让我帮您搜集特定话题、分析竞品动态或生成行业综述。
                        </p>
                        <div className="mt-6 flex flex-col gap-2 text-xs text-indigo-600">
                            <span className="bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">“分析小米汽车本周的座舱更新”</span>
                            <span className="bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">“总结 2024 年固态电池技术进展”</span>
                        </div>
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskMessageBubble key={task.uuid} task={task} />
                    ))
                )}
            </div>

            {/* Input Area */}
            <ChatInput onSend={handleSend} isLoading={isSending} />
        </div>
    );
};
