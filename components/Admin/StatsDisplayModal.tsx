import React, { useMemo, useState, useEffect, useRef } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTaskById } from '../../api';
import { CloseIcon, ServerIcon, FilmIcon, BrainIcon, CheckCircleIcon, ChevronDownIcon, ViewGridIcon } from '../icons';

interface StatsDisplayModalProps {
    task: LivestreamTask;
    onClose: () => void;
}

const STAT_LABELS: Record<string, string> = {
    status: "任务状态",
    start_time: "启动时间",
    recorded_segments_total: "已录制分段",
    segments_extracted_done: "已处理分段",
    frames_extracted_total: "总提取帧数",
    text_detected_total: "文本检测帧数",
    ai_recognized_total: "AI识别帧数",
    ffmpeg_running: "录制进程",
    resolved_stream_url: "解析流地址",
};

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
        <div className="flex items-center justify-between bg-slate-100 p-2 rounded-md border border-slate-200">
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
                <span className="text-gray-500">{value.toLocaleString()} / {max.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const prevValueRef = useRef(value);

    useEffect(() => {
        const startValue = prevValueRef.current;
        const endValue = value;
        prevValueRef.current = value;

        if (startValue === endValue) {
            setDisplayValue(endValue);
            return;
        }

        let startTime: number | null = null;
        const duration = 800;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            const easedPercentage = 1 - Math.pow(1 - percentage, 4); // easeOutQuart
            
            const currentValue = Math.round(startValue + (endValue - startValue) * easedPercentage);
            setDisplayValue(currentValue);

            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                 setDisplayValue(endValue);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span>{displayValue.toLocaleString()}</span>;
};


const PipelineNode: React.FC<{ icon: React.ReactNode; label: string; value: number; unit?: string; }> = ({ icon, label, value, unit }) => (
    <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 p-4 shadow-lg w-full flex items-center gap-4">
        <div className="p-3 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
            {icon}
        </div>
        <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="text-3xl font-bold text-slate-900">
                <AnimatedNumber value={value} />
                {unit && <span className="text-lg font-medium text-slate-500 ml-1">{unit}</span>}
            </p>
        </div>
    </div>
);

const PipelineConnector: React.FC<{ isFlowing?: boolean }> = ({ isFlowing }) => (
    <div className="h-10 w-full flex justify-center items-center relative">
        <div className="w-0.5 h-full bg-slate-200"></div>
        {isFlowing && (
             <div className="absolute w-2 h-2 rounded-full bg-blue-500/50" style={{
                animation: 'flow-light 2s linear infinite',
                boxShadow: '0 0 8px 2px rgba(59, 130, 246, 0.7)',
            }}></div>
        )}
    </div>
);

export const StatsDisplayModal: React.FC<StatsDisplayModalProps> = ({ task, onClose }) => {
    const [liveTask, setLiveTask] = useState<LivestreamTask>(task);

    const stats = useMemo(() => {
        if (!liveTask.stats_json || (typeof liveTask.stats_json === 'object' && Object.keys(liveTask.stats_json).length === 0)) {
            return {};
        }
        try {
            return typeof liveTask.stats_json === 'string' ? JSON.parse(liveTask.stats_json) : liveTask.stats_json;
        } catch (error) {
            console.error("Failed to parse stats_json:", error);
            return { error: "无法解析状态信息", raw: String(liveTask.stats_json) };
        }
    }, [liveTask.stats_json]);
    
    const getStat = (key: string, defaultValue: any = 0) => stats?.[key] ?? defaultValue;

    const taskStatus = useMemo(() => getStat('status', liveTask.status).toLowerCase(), [stats, liveTask.status]);
    const isTaskActive = useMemo(() => !['completed', 'failed'].includes(taskStatus), [taskStatus]);

    useEffect(() => {
        if (!task.id || !isTaskActive) return;

        const interval = setInterval(async () => {
            try {
                const updatedTask = await getLivestreamTaskById(task.id);
                setLiveTask(updatedTask);
            } catch (error) {
                console.error("Failed to fetch live task stats:", error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [task.id, isTaskActive]);


    const statusBadge = useMemo(() => {
        if (taskStatus === 'recording') return { text: '直播中', className: 'bg-red-100 text-red-800' };
        if (taskStatus === 'listening') return { text: '监听中', className: 'bg-cyan-100 text-cyan-800' };
        if (taskStatus === 'pending') return { text: '即将开始', className: 'bg-blue-100 text-blue-800' };
        if (taskStatus === 'completed') return { text: '已结束', className: 'bg-green-100 text-green-800' };
        if (taskStatus === 'processing') return { text: 'AI总结中', className: 'bg-indigo-100 text-indigo-800' };
        if (taskStatus === 'failed') return { text: '失败', className: 'bg-red-100 text-red-800 font-bold' };
        return { text: taskStatus, className: 'bg-gray-100 text-gray-800' };
    }, [taskStatus]);
    
    const pipelineStages = [
        { label: STAT_LABELS.recorded_segments_total, value: getStat('recorded_segments_total'), icon: <FilmIcon className="w-6 h-6" /> },
        { label: STAT_LABELS.segments_extracted_done, value: getStat('segments_extracted_done'), icon: <CheckCircleIcon className="w-6 h-6" /> },
        { label: STAT_LABELS.frames_extracted_total, value: getStat('frames_extracted_total'), icon: <ViewGridIcon className="w-6 h-6" />, unit: "帧" },
        { label: STAT_LABELS.ai_recognized_total, value: getStat('ai_recognized_total'), icon: <BrainIcon className="w-6 h-6" />, unit: "帧" },
    ];
    
    return (
        <>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-slate-50 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95">
                <header className="p-5 border-b bg-white/70 backdrop-blur-sm flex justify-between items-center flex-shrink-0 rounded-t-2xl">
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

                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    <details className="group" open>
                        <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-lg text-gray-800">
                            核心状态
                            <ChevronDownIcon className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
                        </summary>
                         <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <StatItem label={STAT_LABELS.status}>
                                    <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span>
                                </StatItem>
                                <StatItem label={STAT_LABELS.ffmpeg_running}>
                                    <span className={`font-semibold ${getStat('ffmpeg_running', false) ? 'text-green-600' : 'text-gray-600'}`}>{getStat('ffmpeg_running', false) ? '运行中' : '已停止'}</span>
                                </StatItem>
                                <StatItem label={STAT_LABELS.start_time}>
                                    <span className="text-base font-medium text-gray-800">{getStat('start_time', '') ? new Date(getStat('start_time', '')).toLocaleString('zh-CN') : '未开始'}</span>
                                </StatItem>
                                <StatItem label={STAT_LABELS.resolved_stream_url} fullWidth>
                                    {getStat('resolved_stream_url', '') ? <CopyableText text={getStat('resolved_stream_url', '')} /> : 'N/A'}
                                </StatItem>
                            </dl>
                        </div>
                    </details>
                    
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 mb-4">处理流水线</h3>
                        <div className="flex flex-col items-center">
                            {pipelineStages.map((stage, index) => (
                                <React.Fragment key={stage.label}>
                                    <PipelineNode {...stage} />
                                    {index < pipelineStages.length - 1 && (
                                        <PipelineConnector isFlowing={isTaskActive} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                         <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
                            <ProgressBar label="分段处理进度" value={getStat('segments_extracted_done')} max={getStat('recorded_segments_total')} />
                        </div>
                    </div>
                </main>

                <footer className="px-6 py-4 bg-white/70 backdrop-blur-sm border-t flex justify-end flex-shrink-0 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                        关闭
                    </button>
                </footer>
            </div>
        </div>
        <style>{`
            @keyframes flow-light {
                from {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                50% {
                    opacity: 1;
                }
                to {
                    transform: translateY(20px);
                    opacity: 0;
                }
            }
            details summary::-webkit-details-marker {
                display: none;
            }
        `}</style>
        </>
    );
};
