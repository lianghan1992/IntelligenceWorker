
import React, { useMemo, useState, useEffect } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTaskById } from '../../api';
import { 
    CloseIcon, ServerIcon, FilmIcon, BrainIcon,
    ViewGridIcon, DocumentTextIcon, MicrophoneIcon, 
    PhotoIcon, PlayIcon, RefreshIcon, StopIcon,
    CheckIcon
} from '../icons';

interface StatsDisplayModalProps {
    task: LivestreamTask;
    onClose: () => void;
    onReanalyze: (task: LivestreamTask, action: 'reprocess' | 'resummarize') => void;
}

// --- 1. 动态数字组件 (数码管风格) ---
const AnimatedNumber: React.FC<{ value: number, colorClass?: string }> = ({ value, colorClass = "text-cyan-400" }) => {
    const [displayValue, setDisplayValue] = useState(value);
    
    useEffect(() => {
        let startTimestamp: number | null = null;
        const startValue = displayValue;
        const duration = 800;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); 
            
            const current = Math.floor(startValue + (value - startValue) * ease);
            setDisplayValue(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        
        if (value !== displayValue) {
            window.requestAnimationFrame(step);
        }
    }, [value]);

    return <span className={`font-mono tracking-wider ${colorClass}`}>{displayValue.toLocaleString()}</span>;
};

// --- 2. 赛博连接线 (SVG 粒子流) ---
const CyberConnector: React.FC<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    active?: boolean;
    color?: string; // Hex color
}> = ({ startX, startY, endX, endY, active, color = '#22d3ee' }) => {
    const controlPointOffset = Math.abs(endX - startX) / 2;
    const pathData = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;

    return (
        <g>
            {/* 底层暗线 */}
            <path d={pathData} fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            
            {/* 激活时的流光效果 */}
            {active && (
                <>
                    {/* 辉光背景 */}
                    <path 
                        d={pathData} 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="4" 
                        strokeOpacity="0.15"
                    />
                    {/* 高亮流动粒子 */}
                    <path 
                        d={pathData} 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="2" 
                        strokeDasharray="10 10" 
                        className="animate-cyber-flow"
                        strokeLinecap="round"
                        filter="url(#glow)"
                    />
                </>
            )}
        </g>
    );
};

// --- 3. 硬核节点组件 ---
const TechNode: React.FC<{
    x: number;
    y: number;
    icon: React.ReactNode;
    label: string;
    value?: number | string;
    subLabel?: string;
    active?: boolean;
    statusColor: 'cyan' | 'purple' | 'blue' | 'emerald' | 'red';
}> = ({ x, y, icon, label, value, subLabel, active, statusColor }) => {
    
    const styles = {
        cyan: { text: 'text-cyan-400', border: 'border-cyan-500/50', shadow: 'shadow-cyan-500/20', bg: 'bg-cyan-950/30' },
        purple: { text: 'text-purple-400', border: 'border-purple-500/50', shadow: 'shadow-purple-500/20', bg: 'bg-purple-950/30' },
        blue: { text: 'text-blue-400', border: 'border-blue-500/50', shadow: 'shadow-blue-500/20', bg: 'bg-blue-950/30' },
        emerald: { text: 'text-emerald-400', border: 'border-emerald-500/50', shadow: 'shadow-emerald-500/20', bg: 'bg-emerald-950/30' },
        red: { text: 'text-red-400', border: 'border-red-500/50', shadow: 'shadow-red-500/20', bg: 'bg-red-950/30' },
    }[statusColor];

    return (
        <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
            style={{ left: x, top: y }}
        >
            {/* Node Hexagon/Box */}
            <div className={`
                relative w-20 h-20 flex items-center justify-center transition-all duration-500
                ${active ? `scale-110` : 'scale-100 opacity-60 grayscale'}
            `}>
                {/* Outer Ring Animation */}
                {active && (
                    <div className={`absolute inset-0 rounded-xl border ${styles.border} animate-ping opacity-20`}></div>
                )}
                
                {/* Main Box */}
                <div className={`
                    relative w-full h-full bg-[#0f172a] border-2 rounded-xl flex items-center justify-center backdrop-blur-md shadow-2xl overflow-hidden
                    ${active ? `${styles.border} ${styles.shadow}` : 'border-slate-700'}
                `}>
                    {/* Scanline Effect */}
                    {active && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-scan-fast h-full w-full pointer-events-none"></div>}
                    
                    <div className={`w-8 h-8 ${active ? styles.text : 'text-slate-500'}`}>
                        {icon}
                    </div>

                    {/* Tech Corners */}
                    <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${active ? styles.border : 'border-slate-600'}`}></div>
                    <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${active ? styles.border : 'border-slate-600'}`}></div>
                    <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${active ? styles.border : 'border-slate-600'}`}></div>
                    <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${active ? styles.border : 'border-slate-600'}`}></div>
                </div>

                {/* Connection Dot Points */}
                <div className={`absolute -right-1.5 w-1.5 h-1.5 bg-[#0f172a] border ${active ? styles.border : 'border-slate-600'}`}></div>
                <div className={`absolute -left-1.5 w-1.5 h-1.5 bg-[#0f172a] border ${active ? styles.border : 'border-slate-600'}`}></div>
            </div>

            {/* Label & Value */}
            <div className={`mt-3 text-center transition-all duration-500 ${active ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-1'}`}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
                {value !== undefined && (
                    <div className={`text-xl font-mono font-bold leading-none drop-shadow-md ${active ? styles.text : 'text-slate-500'}`}>
                        {typeof value === 'number' ? <AnimatedNumber value={value} colorClass={active ? styles.text : 'text-slate-500'} /> : value}
                    </div>
                )}
                {subLabel && <div className="text-[9px] text-slate-600 mt-1 font-mono">{subLabel}</div>}
            </div>
        </div>
    );
};

// --- Main Modal ---
export const StatsDisplayModal: React.FC<StatsDisplayModalProps> = ({ task, onClose, onReanalyze }) => {
    const [liveTask, setLiveTask] = useState<LivestreamTask>(task);

    const stats = useMemo(() => {
        if (!liveTask.stats_json) return {};
        try {
            return typeof liveTask.stats_json === 'string' ? JSON.parse(liveTask.stats_json) : liveTask.stats_json;
        } catch (e) { return {}; }
    }, [liveTask.stats_json]);
    
    const getStat = (key: string, defaultValue: any = 0) => stats?.[key] ?? defaultValue;
    const isTaskActive = !['finished', 'failed', 'completed'].includes(liveTask.status.toLowerCase());

    useEffect(() => {
        if (!task.id || !isTaskActive) return;
        const interval = setInterval(async () => {
            try {
                const updatedTask = await getLivestreamTaskById(task.id);
                setLiveTask(updatedTask);
            } catch (error) { console.error("Failed to fetch live stats:", error); }
        }, 2000);
        return () => clearInterval(interval);
    }, [task.id, isTaskActive]);

    // --- Data Extraction ---
    const ffmpegRunning = getStat('ffmpeg_running', false);
    const segmentsTotal = getStat('recorded_segments_total', 0);
    const segmentsExtracted = getStat('segments_extracted_done', 0);
    
    // Visual
    const uniqueImages = getStat('unique_images_total', 0);
    const visualAiSuccess = getStat('ai_recognized_success_total', 0);
    
    // Audio
    const asrSubmitted = getStat('asr_submitted_total', 0);
    const asrSuccess = getStat('asr_success_total', 0);
    const asrFinished = getStat('asr_finished', false);
    const asrFailed = getStat('asr_failed_total', 0);

    // Logic
    const isIngesting = ffmpegRunning || isTaskActive;
    const isSegmenting = segmentsTotal > 0;
    const isVisualActive = segmentsExtracted > 0;
    const isAudioActive = segmentsExtracted > 0 || asrSubmitted > 0; // Audio usually starts after extraction
    const isMergeReady = visualAiSuccess > 0 || asrSuccess > 0;
    const isFinished = ['finished', 'completed'].includes(liveTask.status.toLowerCase());

    // --- Node Coordinates (Fixed for symmetry) ---
    const coords = {
        start: { x: 80, y: 250 },
        segment: { x: 250, y: 250 },
        visual1: { x: 450, y: 120 },
        visual2: { x: 650, y: 120 },
        audio1: { x: 450, y: 380 },
        audio2: { x: 650, y: 380 },
        merge: { x: 850, y: 250 },
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            {/* Global Styles for Animation */}
            <style>{`
                @keyframes cyber-flow {
                    to { stroke-dashoffset: -20; }
                }
                .animate-cyber-flow {
                    animation: cyber-flow 0.8s linear infinite;
                }
                @keyframes scan-fast {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                .animate-scan-fast {
                    animation: scan-fast 2s linear infinite;
                }
            `}</style>

            {/* SVG Filter Definitions */}
            <svg width="0" height="0">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
            </svg>

            <div className="w-full max-w-6xl bg-[#020617] rounded-2xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden h-[85vh] relative">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>

                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-800 bg-[#020617]/80 backdrop-blur flex justify-between items-center z-30">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="w-2 h-8 bg-blue-500 rounded-sm"></span>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{task.task_name}</h2>
                            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded font-mono uppercase">
                                Task ID: {task.id.slice(0, 8)}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm ml-5">
                            <span className="text-slate-400">{task.company}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-blue-400 font-mono">{stats.status_text || liveTask.status}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Visualization Area */}
                <div className="flex-1 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center min-w-[1000px] transform scale-95">
                        
                        {/* 1. Layer: SVG Connectors */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                            {/* Ingest -> Segment */}
                            <CyberConnector startX={coords.start.x + 40} startY={coords.start.y} endX={coords.segment.x - 40} endY={coords.segment.y} active={isIngesting} color="#3b82f6" />
                            
                            {/* Segment -> Visual Branch */}
                            <CyberConnector startX={coords.segment.x + 40} startY={coords.segment.y} endX={coords.visual1.x - 40} endY={coords.visual1.y} active={isVisualActive} color="#06b6d4" />
                            <CyberConnector startX={coords.visual1.x + 40} startY={coords.visual1.y} endX={coords.visual2.x - 40} endY={coords.visual2.y} active={uniqueImages > 0} color="#06b6d4" />
                            
                            {/* Segment -> Audio Branch */}
                            <CyberConnector startX={coords.segment.x + 40} startY={coords.segment.y} endX={coords.audio1.x - 40} endY={coords.audio1.y} active={isAudioActive} color="#a855f7" />
                            <CyberConnector startX={coords.audio1.x + 40} startY={coords.audio1.y} endX={coords.audio2.x - 40} endY={coords.audio2.y} active={asrSubmitted > 0} color="#a855f7" />

                            {/* Merges */}
                            <CyberConnector startX={coords.visual2.x + 40} startY={coords.visual2.y} endX={coords.merge.x - 40} endY={coords.merge.y} active={visualAiSuccess > 0} color="#06b6d4" />
                            <CyberConnector startX={coords.audio2.x + 40} startY={coords.audio2.y} endX={coords.merge.x - 40} endY={coords.merge.y} active={asrSuccess > 0} color="#a855f7" />
                        </svg>

                        {/* 2. Layer: Nodes */}
                        
                        {/* Start */}
                        <TechNode {...coords.start} icon={<PlayIcon className="w-8 h-8" />} label="信号接入" active={isIngesting} statusColor="blue" subLabel="Ingest" />
                        
                        {/* Segment */}
                        <TechNode {...coords.segment} icon={<FilmIcon className="w-8 h-8" />} label="视频分段" value={segmentsTotal} active={isSegmenting} statusColor="blue" />

                        {/* Visual Branch */}
                        <div className="absolute left-[450px] top-[60px] transform -translate-x-1/2 text-cyan-500 font-mono text-xs tracking-[0.3em] opacity-70">VISUAL CORE</div>
                        <TechNode {...coords.visual1} icon={<ViewGridIcon className="w-8 h-8" />} label="抽帧去重" value={uniqueImages} active={uniqueImages > 0} statusColor="cyan" />
                        <TechNode {...coords.visual2} icon={<PhotoIcon className="w-8 h-8" />} label="视觉分析" value={visualAiSuccess} active={visualAiSuccess > 0} statusColor="cyan" />

                        {/* Audio Branch */}
                        <div className="absolute left-[450px] top-[450px] transform -translate-x-1/2 text-purple-500 font-mono text-xs tracking-[0.3em] opacity-70">AUDIO CORE</div>
                        <TechNode {...coords.audio1} icon={<DocumentTextIcon className="w-8 h-8" />} label="音频提取" value={asrSubmitted} active={asrSubmitted > 0} statusColor="purple" />
                        <TechNode {...coords.audio2} icon={<MicrophoneIcon className="w-8 h-8" />} label="语音转写" value={asrSuccess} active={asrSuccess > 0} statusColor="purple" subLabel={asrFailed > 0 ? `${asrFailed} Failed` : ''} />

                        {/* Merge */}
                        <TechNode {...coords.merge} icon={<BrainIcon className="w-9 h-9" />} label="智能总结" value={isFinished ? "已完成" : "等待中"} active={isFinished} statusColor="emerald" />

                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-900/80 border-t border-slate-800 p-6 z-30 flex justify-between items-center">
                    <div className="text-slate-500 text-xs font-mono flex gap-6">
                        <div>
                            <span className="text-slate-600 block mb-1">START TIME</span>
                            <span className="text-slate-300">{new Date(liveTask.start_time).toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-slate-600 block mb-1">SOURCE URL</span>
                            <span className="text-slate-300 max-w-[300px] block truncate" title={stats.resolved_stream_url || liveTask.live_url}>
                                {stats.resolved_stream_url || liveTask.live_url}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {isFinished && (
                            <>
                                <button 
                                    onClick={() => onReanalyze(liveTask, 'resummarize')}
                                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 font-semibold text-sm transition-all flex items-center gap-2"
                                >
                                    <RefreshIcon className="w-4 h-4" /> 重新总结
                                </button>
                                <button 
                                    onClick={() => onReanalyze(liveTask, 'reprocess')}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-900/20 font-bold text-sm transition-all flex items-center gap-2"
                                >
                                    <PlayIcon className="w-4 h-4" /> 重新分析
                                </button>
                            </>
                        )}
                        {liveTask.status.toLowerCase() === 'recording' && (
                             <div className="px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/50 rounded-lg font-mono text-sm flex items-center gap-2 animate-pulse">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                LIVE RECORDING
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
