import React, { useMemo, useState, useEffect, useRef } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTaskById } from '../../api';
import { CloseIcon, ServerIcon, FilmIcon, BrainIcon, CheckCircleIcon, ChevronDownIcon, ViewGridIcon, DocumentTextIcon } from '../icons';

interface StatsDisplayModalProps {
    task: LivestreamTask;
    onClose: () => void;
    onReanalyze: (task: LivestreamTask, action: 'reprocess' | 'resummarize') => void;
}

// --- Sub-components for the new design ---

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

const PipelineNode: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode; isFlowing?: boolean }> = ({ icon, label, children, isFlowing }) => (
    <div className="flex flex-col items-center text-center w-full sm:w-auto">
        <div className={`relative p-3 rounded-full border-2 transition-colors duration-300 ${isFlowing ? 'bg-blue-100 border-blue-300' : 'bg-slate-100 border-slate-200'}`}>
            {isFlowing && <div className="absolute inset-0 rounded-full bg-blue-400/50 animate-ping"></div>}
            <div className={`relative transition-colors duration-300 ${isFlowing ? 'text-blue-600' : 'text-slate-600'}`}>{icon}</div>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-700">{label}</p>
        <div className="mt-1 text-2xl font-bold text-slate-900">{children}</div>
    </div>
);

const PipelineConnector: React.FC<{ isFlowing?: boolean }> = ({ isFlowing }) => (
    <div className="relative h-8 w-px sm:h-px sm:w-full sm:flex-1 bg-slate-200 mx-2 my-1 sm:my-0">
        {isFlowing && (
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute h-full w-full bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-flow sm:animate-flow-horizontal"></div>
            </div>
        )}
    </div>
);


const StatItem: React.FC<{ label: string; children: React.ReactNode; fullWidth?: boolean }> = ({ label, children, fullWidth }) => (
    <div className={`py-2 ${fullWidth ? 'col-span-1 sm:col-span-2' : ''}`}>
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-slate-900">{children}</dd>
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
        <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-md border border-slate-200">
            <span className="text-xs font-mono truncate text-gray-700">{text}</span>
            <button onClick={handleCopy} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2 px-2 py-0.5 rounded bg-white hover:bg-blue-50 transition-colors">
                {copied ? '已复制' : '复制'}
            </button>
        </div>
    );
};

const ProgressBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div>
            <div className="flex justify-between mb-1 text-xs">
                <span className="font-medium text-slate-600">{label}</span>
                <span className="text-slate-500 font-mono">{value.toLocaleString()} / {max.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};


// --- Main Modal Component ---
export const StatsDisplayModal: React.FC<StatsDisplayModalProps> = ({ task, onClose, onReanalyze }) => {
    const [liveTask, setLiveTask] = useState<LivestreamTask>(task);

    const stats = useMemo(() => {
        if (!liveTask.stats_json) return {};
        try {
            return typeof liveTask.stats_json === 'string' ? JSON.parse(liveTask.stats_json) : liveTask.stats_json;
        } catch (e) { return {}; }
    }, [liveTask.stats_json]);
    
    const getStat = (key: string, defaultValue: any = 0) => stats?.[key] ?? defaultValue;

    const taskStatus = useMemo(() => liveTask.status.toLowerCase(), [liveTask.status]);
    const isTaskActive = useMemo(() => !['finished', 'failed'].includes(taskStatus), [taskStatus]);
    const isReanalyzable = useMemo(() => ['finished', 'failed'].includes(taskStatus), [taskStatus]);

    useEffect(() => {
        if (!task.id || !isTaskActive) return;
        const interval = setInterval(async () => {
            try {
                const updatedTask = await getLivestreamTaskById(task.id);
                setLiveTask(updatedTask);
            } catch (error) { console.error("Failed to fetch live stats:", error); }
        }, 3000);
        return () => clearInterval(interval);
    }, [task.id, isTaskActive]);

    const statusBadge = useMemo(() => {
        if (taskStatus === 'recording' || taskStatus === 'downloading') return { text: '采集中', className: 'bg-red-100 text-red-800' };
        if (taskStatus === 'listening' || taskStatus === 'scheduled') return { text: '待命中', className: 'bg-blue-100 text-blue-800' };
        if (taskStatus === 'stopping') return { text: '停止中', className: 'bg-yellow-100 text-yellow-800' };
        if (taskStatus === 'processing') return { text: 'AI总结中', className: 'bg-indigo-100 text-indigo-800' };
        if (taskStatus === 'finished') return { text: '已结束', className: 'bg-green-100 text-green-800' };
        if (taskStatus === 'failed') return { text: '失败', className: 'bg-red-100 text-red-800 font-bold' };
        return { text: taskStatus, className: 'bg-gray-100 text-gray-800' };
    }, [taskStatus]);

    return (
        <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
                <div className="bg-slate-50 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95">
                    <header className="p-5 border-b bg-white/70 backdrop-blur-sm flex justify-between items-center flex-shrink-0 rounded-t-2xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-teal-100 text-teal-600 rounded-lg flex-shrink-0">
                                <ServerIcon className="w-6 h-6" />
                            </div>
                            <div className="overflow-hidden">
                                <h2 className="text-lg font-bold text-gray-900 truncate" title={task.task_name}>{task.task_name}</h2>
                                <p className="text-sm text-gray-500">任务实时驾驶舱</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Core Info Section */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                                <div className="pr-4 space-y-2 pb-2 sm:pb-0">
                                    <StatItem label="车企"><span className="font-semibold">{liveTask.company}</span></StatItem>
                                    <StatItem label="任务状态">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span>
                                    </StatItem>
                                    <StatItem label="直播源"><CopyableText text={liveTask.live_url} /></StatItem>
                                </div>
                                <div className="pl-4 space-y-2 pt-2 sm:pt-0">
                                    <StatItem label="开始时间">{new Date(liveTask.start_time).toLocaleString('zh-CN')}</StatItem>
                                    <StatItem label="FFmpeg进程">
                                        <span className={`font-semibold ${getStat('ffmpeg_running', false) ? 'text-green-600' : 'text-gray-600'}`}>{getStat('ffmpeg_running', false) ? '运行中' : '已停止'}</span>
                                    </StatItem>
                                    <StatItem label="实际拉流地址">{getStat('resolved_stream_url', '') ? <CopyableText text={getStat('resolved_stream_url', '')} /> : 'N/A'}</StatItem>
                                </div>
                            </dl>
                        </div>

                        {/* Pipeline Section */}
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 mb-4">处理流水线</h3>
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-around">
                                    <PipelineNode label="视频分段" icon={<FilmIcon className="w-5 h-5"/>} isFlowing={isTaskActive}>
                                        <AnimatedNumber value={getStat('recorded_segments_total')} />
                                    </PipelineNode>
                                    <PipelineConnector isFlowing={isTaskActive} />
                                    <PipelineNode label="分段处理" icon={<CheckCircleIcon className="w-5 h-5"/>} isFlowing={isTaskActive && getStat('recorded_segments_total') > 0}>
                                        <AnimatedNumber value={getStat('segments_extracted_done')} />
                                    </PipelineNode>
                                     <PipelineConnector isFlowing={isTaskActive} />
                                    <PipelineNode label="图像筛选" icon={<ViewGridIcon className="w-5 h-5"/>} isFlowing={isTaskActive && getStat('segments_extracted_done') > 0}>
                                        <AnimatedNumber value={getStat('unique_images_total')} />
                                    </PipelineNode>
                                    <PipelineConnector isFlowing={isTaskActive} />
                                    <PipelineNode label="AI识别" icon={<BrainIcon className="w-5 h-5"/>} isFlowing={isTaskActive && getStat('unique_images_total') > 0}>
                                         <AnimatedNumber value={getStat('ai_recognized_success_total')} />
                                    </PipelineNode>
                                </div>
                                <div className="mt-6 space-y-4 pt-4 border-t border-gray-100">
                                    <ProgressBar label="分段处理进度" value={getStat('segments_extracted_done')} max={getStat('recorded_segments_total')} />
                                    <ProgressBar label="AI识别进度" value={getStat('ai_recognized_success_total')} max={getStat('ai_recognized_total')} />
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="px-6 py-4 bg-white/70 backdrop-blur-sm border-t flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
                        {isReanalyzable && (
                            <>
                                <button 
                                    onClick={() => onReanalyze(liveTask, 'resummarize')}
                                    className="px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                                >
                                    重新总结
                                </button>
                                <button 
                                    onClick={() => onReanalyze(liveTask, 'reprocess')}
                                    className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors"
                                >
                                    重新分析
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                            关闭
                        </button>
                    </footer>
                </div>
            </div>
            <style>{`
                @keyframes flow {
                    from { transform: translateY(-150%); } to { transform: translateY(150%); }
                }
                @keyframes flow-horizontal {
                    from { transform: translateX(-150%); } to { transform: translateX(150%); }
                }
                .animate-flow { animation: flow 2s ease-in-out infinite; }
                .sm\\:animate-flow-horizontal {
                     @media (min-width: 640px) { animation: flow-horizontal 2s ease-in-out infinite; }
                }
            `}</style>
        </>
    );
};
