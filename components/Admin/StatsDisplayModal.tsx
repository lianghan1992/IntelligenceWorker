import React, { useMemo, useState } from 'react';
import { LivestreamTask } from '../../types';
import { CloseIcon, ServerIcon, FilmIcon, BrainIcon, CheckIcon } from '../icons';

interface StatsDisplayModalProps {
    task: LivestreamTask;
    onClose: () => void;
}

const STAT_LABELS: Record<string, string> = {
    status: "任务状态",
    start_time: "启动时间",
    recorded_segments_total: "已录制分段",
    segments_extracted_done: "已抽帧分段",
    frames_extracted_total: "总提取帧数",
    text_detected_total: "文本检测帧数",
    ai_recognized_total: "AI识别帧数",
    ffmpeg_running: "录制进程",
    resolved_stream_url: "解析流地址",
};

const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h3 className="font-bold text-lg text-gray-800">{title}</h3>
        </div>
        <dl className="space-y-4">
            {children}
        </dl>
    </div>
);

const StatItem: React.FC<{ label: string; children: React.ReactNode; fullWidth?: boolean }> = ({ label, children, fullWidth }) => (
    <div className={fullWidth ? 'col-span-1 sm:col-span-2' : ''}>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-gray-900">{children}</dd>
    </div>
);

const CopyableText: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
            <span className="text-sm font-mono truncate text-gray-700">{text}</span>
            <button onClick={handleCopy} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2">
                {copied ? '已复制' : '复制'}
            </button>
        </div>
    );
};

const ProgressBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between mb-1 text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-500">{value} / {max}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export const StatsDisplayModal: React.FC<StatsDisplayModalProps> = ({ task, onClose }) => {
    const stats = useMemo(() => {
        if (!task.stats_json || (typeof task.stats_json === 'object' && Object.keys(task.stats_json).length === 0)) {
            return null;
        }
        try {
            return typeof task.stats_json === 'string' ? JSON.parse(task.stats_json) : task.stats_json;
        } catch (error) {
            console.error("Failed to parse stats_json:", error);
            return { error: "无法解析状态信息", raw: String(task.stats_json) };
        }
    }, [task.stats_json]);

    const getStat = (key: string, defaultValue: any = 'N/A') => stats?.[key] ?? defaultValue;

    const statusBadge = useMemo(() => {
        const status = getStat('status', task.status).toLowerCase();
        if (status === 'recording') return { text: '直播中', className: 'bg-red-100 text-red-800' };
        if (status === 'listening') return { text: '监听中', className: 'bg-cyan-100 text-cyan-800' };
        if (status === 'pending') return { text: '即将开始', className: 'bg-blue-100 text-blue-800' };
        if (status === 'completed') return { text: '已结束', className: 'bg-green-100 text-green-800' };
        if (status === 'processing') return { text: 'AI总结中', className: 'bg-indigo-100 text-indigo-800' };
        if (status === 'failed') return { text: '失败', className: 'bg-red-100 text-red-800 font-bold' };
        return { text: status, className: 'bg-gray-100 text-gray-800' };
    }, [stats, task.status]);
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-gray-50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                <header className="p-5 border-b bg-white flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg flex-shrink-0">
                            <ServerIcon className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-lg font-bold text-gray-900">任务详情</h2>
                            <p className="text-sm text-gray-500 truncate" title={task.task_name}>{task.task_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    {!stats ? (
                        <p className="text-gray-500 text-center py-10">没有可用的状态信息。</p>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <StatCard title="核心状态" icon={<ServerIcon className="w-6 h-6 text-gray-500"/>} className="lg:col-span-2">
                                <StatItem label={STAT_LABELS.status}>
                                    <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span>
                                </StatItem>
                                <StatItem label={STAT_LABELS.start_time}>
                                    <span className="text-base font-medium text-gray-800">{getStat('start_time') ? new Date(getStat('start_time')).toLocaleString('zh-CN') : '未开始'}</span>
                                </StatItem>
                                 <StatItem label={STAT_LABELS.ffmpeg_running}>
                                    <span className={`font-semibold ${getStat('ffmpeg_running', false) ? 'text-green-600' : 'text-gray-600'}`}>{getStat('ffmpeg_running', false) ? '运行中' : '已停止'}</span>
                                </StatItem>
                                <StatItem label={STAT_LABELS.resolved_stream_url} fullWidth>
                                    {getStat('resolved_stream_url') !== 'N/A' ? <CopyableText text={getStat('resolved_stream_url')} /> : 'N/A'}
                                </StatItem>
                            </StatCard>
                            <StatCard title="录制与抽帧" icon={<FilmIcon className="w-6 h-6 text-gray-500"/>}>
                                <StatItem label={STAT_LABELS.recorded_segments_total}><span className="text-2xl font-bold">{getStat('recorded_segments_total', 0)}</span></StatItem>
                                <StatItem label={STAT_LABELS.segments_extracted_done}><span className="text-2xl font-bold">{getStat('segments_extracted_done', 0)}</span></StatItem>
                                 <StatItem label={STAT_LABELS.frames_extracted_total} fullWidth><span className="text-2xl font-bold">{getStat('frames_extracted_total', 0).toLocaleString()}</span> 帧</StatItem>
                            </StatCard>
                             <StatCard title="AI视觉分析" icon={<BrainIcon className="w-6 h-6 text-gray-500"/>}>
                                <StatItem label={STAT_LABELS.text_detected_total}><span className="text-2xl font-bold">{getStat('text_detected_total', 0).toLocaleString()}</span> 帧</StatItem>
                                <StatItem label={STAT_LABELS.ai_recognized_total}><span className="text-2xl font-bold">{getStat('ai_recognized_total', 0).toLocaleString()}</span> 帧</StatItem>
                                <div className="col-span-1 sm:col-span-2 mt-2">
                                     <ProgressBar label="分析进度" value={getStat('ai_recognized_total', 0)} max={getStat('frames_extracted_total', 0)} />
                                </div>
                            </StatCard>
                        </div>
                    )}
                </main>

                <footer className="px-6 py-4 bg-white border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                        关闭
                    </button>
                </footer>
            </div>
        </div>
    );
};
