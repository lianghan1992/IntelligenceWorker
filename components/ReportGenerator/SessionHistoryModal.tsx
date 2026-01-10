
import React, { useState, useEffect } from 'react';
import { getSessions, deleteSession } from '../../api/stratify';
import { AgentSession } from '../../types';
import { 
    CloseIcon, ClockIcon, TrashIcon, ArrowRightIcon, 
    SparklesIcon, DocumentTextIcon, ChartIcon, CheckCircleIcon 
} from '../icons';
import { AGENTS } from '../../agentConfig';

interface SessionHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentSessionId?: string;
    onSwitchSession: (sessionId: string) => void;
}

// Agent ID for Report Generator
// Using global configuration
const REPORT_GENERATOR_AGENT_ID = AGENTS.REPORT_GENERATOR;

const StageBadge: React.FC<{ stage: string }> = ({ stage }) => {
    const map: Record<string, { label: string; color: string }> = {
        'collect': { label: '构思中', color: 'bg-slate-100 text-slate-500 border-slate-200' },
        'outline': { label: '大纲确认', color: 'bg-purple-50 text-purple-600 border-purple-200' },
        'compose': { label: '内容生成', color: 'bg-blue-50 text-blue-600 border-blue-200' },
        'finalize': { label: '定稿', color: 'bg-green-50 text-green-600 border-green-200' },
    };
    const conf = map[stage] || map['collect'];
    
    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${conf.color} font-medium`}>
            {conf.label}
        </span>
    );
};

export const SessionHistoryDrawer: React.FC<SessionHistoryDrawerProps> = ({ 
    isOpen, onClose, currentSessionId, onSwitchSession 
}) => {
    const [sessions, setSessions] = useState<AgentSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSessions();
        }
    }, [isOpen]);

    const loadSessions = async () => {
        setIsLoading(true);
        try {
            // FIX: Use specific agent_id
            const res = await getSessions({ agent_id: REPORT_GENERATOR_AGENT_ID, sort_by: 'updated_at', order: 'desc', limit: 50 });
            setSessions(res || []);
        } catch (e) {
            console.error("Failed to load sessions", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('确定要永久删除这份报告任务吗？此操作无法撤销。')) return;
        
        setDeletingId(sessionId);
        try {
            await deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (error) {
            alert('删除失败');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[40] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Drawer Panel */}
            <div 
                className={`fixed top-0 left-0 bottom-0 w-[400px] bg-white shadow-2xl z-[50] transform transition-transform duration-300 ease-out border-r border-slate-200 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-black text-xl text-slate-800 flex items-center gap-2 tracking-tight">
                            <ClockIcon className="w-5 h-5 text-indigo-600"/> 历史任务
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">共 {sessions.length} 份报告草稿</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                    >
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                            <span className="text-xs">同步历史记录...</span>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-60">
                            <SparklesIcon className="w-16 h-16 text-slate-200" />
                            <p className="text-sm font-medium">暂无历史任务</p>
                        </div>
                    ) : (
                        sessions.map(session => {
                            const isCurrent = currentSessionId === session.id;
                            // Parse context data safely to get page count
                            let pageCount = 0;
                            try {
                                if (session.context_data && session.context_data.data && Array.isArray(session.context_data.data.pages)) {
                                    pageCount = session.context_data.data.pages.length;
                                }
                            } catch (e) {}

                            return (
                                <div 
                                    key={session.id}
                                    onClick={() => { onSwitchSession(session.id); onClose(); }}
                                    className={`
                                        group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200
                                        ${isCurrent 
                                            ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/10' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                        }
                                    `}
                                >
                                    {/* Active Indicator */}
                                    {isCurrent && (
                                        <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-500 rounded-full shadow-sm animate-pulse"></div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        {/* Title & Stage */}
                                        <div>
                                            <div className="flex justify-between items-start pr-4">
                                                <h4 className={`font-bold text-sm leading-snug line-clamp-2 ${isCurrent ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                    {session.title || '未命名报告任务'}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <StageBadge stage={session.current_stage || 'collect'} />
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {new Date(session.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Metrics Divider */}
                                        <div className="h-px bg-slate-50"></div>

                                        {/* Stats */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <div className="flex items-center gap-1" title="生成页数">
                                                    <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-mono">{pageCount} P</span>
                                                </div>
                                                <div className="flex items-center gap-1" title="预估消耗">
                                                    <ChartIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-mono">¥{session.total_cost?.toFixed(3) || '0.000'}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <button 
                                                onClick={(e) => handleDelete(e, session.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="删除任务"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};
