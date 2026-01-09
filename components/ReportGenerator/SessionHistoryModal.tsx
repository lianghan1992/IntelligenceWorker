
import React, { useState, useEffect } from 'react';
import { getSessions, deleteSession } from '../../api/stratify';
import { AgentSession } from '../../types';
import { CloseIcon, ClockIcon, TrashIcon, ArrowRightIcon, SparklesIcon } from '../icons';

interface SessionHistoryModalProps {
    onClose: () => void;
    currentSessionId?: string;
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({ onClose, currentSessionId }) => {
    const [sessions, setSessions] = useState<AgentSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setIsLoading(true);
        try {
            // Fetch sessions sorted by update time desc
            const res = await getSessions({ agent_id: 'report-generator', sort_by: 'updated_at', order: 'desc', limit: 20 });
            setSessions(res || []);
        } catch (e) {
            console.error("Failed to load sessions", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = (sessionId: string) => {
        // Reload page with new session ID to ensure clean state reset
        const url = new URL(window.location.href);
        url.searchParams.set('session_id', sessionId);
        window.location.href = url.toString();
    };

    const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('确定要删除这条历史记录吗？')) return;
        
        setIsDeleting(sessionId);
        try {
            await deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (error) {
            alert('删除失败');
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-indigo-600"/> 历史报告任务
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-slate-50/50">
                    {isLoading ? (
                        <div className="py-10 text-center text-gray-400 text-sm">加载中...</div>
                    ) : sessions.length === 0 ? (
                        <div className="py-10 text-center flex flex-col items-center gap-3 text-gray-400">
                            <SparklesIcon className="w-10 h-10 opacity-20" />
                            <p className="text-sm">暂无历史任务</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sessions.map(session => (
                                <div 
                                    key={session.id}
                                    onClick={() => handleRestore(session.id)}
                                    className={`group p-4 bg-white border rounded-xl cursor-pointer hover:shadow-md transition-all flex justify-between items-center ${
                                        currentSessionId === session.id ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-gray-200 hover:border-indigo-300'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1 pr-4">
                                        <h4 className={`font-bold text-sm truncate mb-1 ${currentSessionId === session.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                            {session.title || '未命名报告'}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span>{new Date(session.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            {session.total_cost > 0 && (
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                                                    ¥{session.total_cost.toFixed(2)}
                                                </span>
                                            )}
                                            {currentSessionId === session.id && (
                                                <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">当前</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={(e) => handleDelete(e, session.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="删除"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
