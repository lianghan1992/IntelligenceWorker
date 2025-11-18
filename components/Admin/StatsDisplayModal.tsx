import React, { useMemo, useState, useEffect } from 'react';
import { LivestreamTask } from '../../types';
import { CloseIcon, ServerIcon, ClockIcon, FilmIcon, SparklesIcon, CheckCircleIcon } from '../icons';

interface StatsDisplayModalProps {
    task: LivestreamTask;
    onClose: () => void;
}

const formatDuration = (ms: number): string => {
    if (ms < 0) ms = 0;
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

const TimelineNode: React.FC<{
    icon: React.FC<any>;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    isLast?: boolean;
    children?: React.ReactNode;
}> = ({ icon: Icon, title, status, isLast = false, children }) => {
    const statusStyles = {
        pending: { icon: 'bg-gray-200 text-gray-500', text: 'text-gray-500', line: 'bg-gray-200' },
        running: { icon: 'bg-blue-100 text-blue-600', text: 'text-blue-600 font-bold', line: 'bg-gray-200' },
        completed: { icon: 'bg-green-100 text-green-600', text: 'text-gray-800 font-semibold', line: 'bg-green-400' },
        failed: { icon: 'bg-red-100 text-red-600', text: 'text-red-600 font-bold', line: 'bg-red-400' },
    };
    const currentStyle = statusStyles[status];

    return (
        <div className="relative pl-12">
            {!isLast && <div className={`absolute left-[22px] top-8 h-full w-1 ${status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}`}></div>}
            <div className="absolute left-0 top-0 flex items-center">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${currentStyle.icon}`}>
                    {status === 'running' ? (
                        <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <Icon className="w-6 h-6" />
                    )}
                </div>
            </div>
            <div className="min-h-[44px] flex items-center">
                <h4 className={`text-base ${currentStyle.text}`}>{title}</h4>
            </div>
            {children && <div className="pb-8">{children}</div>}
        </div>
    );
};

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return (
        <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{current.toLocaleString()} / {total.toLocaleString()} 帧</span>
                <span>{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export const StatsDisplayModal: React.FC<StatsDisplayModalProps> = ({ task, onClose }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const stats = useMemo(() => {
        if (!task.stats_json || (typeof task.stats_json === 'object' && Object.keys(task.stats_json).length === 0)) {
            return {};
        }
        try {
            return typeof task.stats_json === 'string' ? JSON.parse(task.stats_json) : task.stats_json;
        } catch (error) {
            console.error("Failed to parse stats_json:", error);
            return { error: "无法解析状态信息" };
        }
    }, [task.stats_json]);

    const { totalElapsedTime, isRunning } = useMemo(() => {
        const startTime = new Date(task.start_time).getTime();
        const endTime = task.status.toLowerCase() === 'completed' || task.status.toLowerCase() === 'failed'
            ? new Date(task.updated_at).getTime()
            : currentTime;
        return {
            totalElapsedTime: endTime - startTime,
            isRunning: !(task.status.toLowerCase() === 'completed' || task.status.toLowerCase() === 'failed'),
        };
    }, [task, currentTime]);
    
    // FIX: Refactored stage calculation logic to fix type errors and correctly handle 'failed' status.
    const stages = useMemo(() => {
        const taskStatus = task.status.toLowerCase();
        
        // Define helpers with explicit return types to prevent TS from inferring 'string'
        const videoProcessingStatus = (): 'pending' | 'running' | 'completed' => {
            if (stats.download_completed) return 'completed';
            if (taskStatus === 'recording' || taskStatus === 'listening') return 'running';
            if (taskStatus === 'pending') return 'pending';
            return 'completed'; // Assume completed if task has moved past this stage
        };

        const frameExtractionStatus = (): 'pending' | 'running' | 'completed' => {
            if (!stats.frame_extraction_started) return 'pending';
            const total = stats.total_frames ?? 0;
            const processed = stats.processed_frames ?? 0;
            if (total > 0 && processed < total && taskStatus === 'processing') return 'running';
            if (stats.vision_analysis_started || taskStatus === 'completed') return 'completed';
            return 'pending';
        };

        const visionAnalysisStatus = (): 'pending' | 'running' | 'completed' => {
            if (!stats.vision_analysis_started) return 'pending';
            if (stats.vision_analysis_completed) return 'completed';
            if (taskStatus === 'processing') return 'running';
            return 'pending';
        };

        const summaryGenerationStatus = (): 'pending' | 'running' | 'completed' => {
            if (!stats.summary_generation_started && !stats.vision_analysis_completed) return 'pending';
            if (stats.summary_generation_completed || taskStatus === 'completed') return 'completed';
            if (taskStatus === 'processing') return 'running';
            return 'pending';
        };

        const calculatedStages: {id: string; title: string; icon: React.FC<any>; status: 'pending' | 'running' | 'completed' | 'failed'; total?: any; processed?: any;}[] = [
            { id: 'queued', title: '任务已创建', icon: ClockIcon, status: 'completed' },
            { id: 'download', title: '视频下载/准备', icon: FilmIcon, status: videoProcessingStatus() },
            { id: 'frames', title: '视频抽帧与处理', icon: FilmIcon, status: frameExtractionStatus(), total: stats.total_frames, processed: stats.processed_frames },
            { id: 'vision', title: 'AI视觉分析', icon: SparklesIcon, status: visionAnalysisStatus() },
            { id: 'summary', title: 'AI生成总结报告', icon: SparklesIcon, status: summaryGenerationStatus() },
            { id: 'complete', title: '任务完成', icon: CheckCircleIcon, status: taskStatus === 'completed' ? 'completed' : 'pending' },
        ];

        // Post-process to correctly handle the 'failed' state
        if (taskStatus === 'failed') {
            let failureHandled = false;
            for (const stage of calculatedStages) {
                if (failureHandled) {
                    stage.status = 'pending';
                    continue;
                }
                if (stage.status !== 'completed') {
                    stage.status = 'failed';
                    failureHandled = true;
                }
            }
        }
        
        return calculatedStages;
    }, [task.status, stats]);


    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                <header className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg flex-shrink-0">
                            <ServerIcon className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-lg font-bold text-gray-900">任务处理流程</h2>
                            <p className="text-sm text-gray-500 truncate" title={task.task_name}>{task.task_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-500">总耗时 {isRunning && '(进行中)'}</h3>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{formatDuration(totalElapsedTime)}</p>
                    </div>
                    
                    <div className="relative">
                        {stages.map((stage, index) => (
                            <TimelineNode
                                key={stage.id}
                                icon={stage.icon}
                                title={stage.title}
                                status={stage.status}
                                isLast={index === stages.length - 1}
                            >
                                {stage.id === 'frames' && (stage.total > 0 || stage.status === 'running') && (
                                    <ProgressBar current={stage.processed ?? 0} total={stage.total ?? 0} />
                                )}
                            </TimelineNode>
                        ))}
                    </div>
                </main>

                <footer className="px-6 py-4 bg-white border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-200 transition-colors">
                        关闭
                    </button>
                </footer>
            </div>
        </div>
    );
};
