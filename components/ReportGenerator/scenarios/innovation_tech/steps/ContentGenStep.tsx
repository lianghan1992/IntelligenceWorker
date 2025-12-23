
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    BrainIcon, ChartIcon, CheckIcon, 
    ShieldExclamationIcon, LightBulbIcon, DocumentTextIcon 
} from '../../../../icons';

// 步骤定义
const STEPS = [
    { label: '领先性分析', icon: ChartIcon },
    { label: '可行性论证', icon: ShieldExclamationIcon },
    { label: '技术壁垒构建', icon: DocumentTextIcon },
    { label: '营销卖点提炼', icon: LightBulbIcon },
];

export const ContentGenStep: React.FC<{
    taskId: string;
    topic: string;
    materials: string;
    scenario: string;
    onComplete: (markdown: string) => void;
}> = ({ taskId, topic, materials, scenario, onComplete }) => {
    const [streamContent, setStreamContent] = useState('');
    const [thought, setThought] = useState('');
    const [isGenerating, setIsGenerating] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    // 自动滚动
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [streamContent, thought]);

    // 启动生成
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        let fullBuffer = '';
        streamGenerate(
            {
                prompt_name: '01_tech_quadrant_write', // 对应后端文件名
                variables: { 
                    new_tech: topic + (materials ? `\n\n补充材料:\n${materials}` : '') 
                },
                scenario,
                task_id: taskId,
                phase_name: '01_tech_quadrant_write'
            },
            (chunk) => {
                fullBuffer += chunk;
                const { thought: t, jsonPart: content } = extractThoughtAndJson(fullBuffer);
                // 如果提取不到 JSON Part（因为 prompt 实际上是输出 Markdown），
                // extractThoughtAndJson 会把非代码块内容视为 thought。
                // 这里我们要稍微变通：如果内容看起来像 Markdown 标题，就认为是正文。
                
                // 简单处理：假设 output 是混合的，主要展示 fullBuffer 即可，或者简单分离 <think>
                setStreamContent(fullBuffer);
            },
            () => {
                setIsGenerating(false);
                // 延迟一下自动跳转，让用户看到完成状态
                setTimeout(() => onComplete(fullBuffer), 1500);
            },
            (err) => {
                console.error(err);
                setIsGenerating(false);
            }
        );
    }, [topic, materials, scenario, taskId, onComplete]);

    return (
        <div className="flex h-full bg-slate-900 text-slate-200 font-mono">
            {/* 左侧：可视化进度 */}
            <div className="w-64 border-r border-slate-800 p-8 flex flex-col justify-center gap-8 bg-slate-950">
                {STEPS.map((step, i) => (
                    <div key={i} className={`flex items-center gap-4 transition-all duration-500 ${isGenerating ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`p-3 rounded-xl ${isGenerating ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                            <step.icon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phase 0{i+1}</span>
                            <span className="font-bold text-sm text-slate-300">{step.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 右侧：终端视图 */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="h-12 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-900/50 backdrop-blur z-10">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
                        <BrainIcon className="w-3.5 h-3.5" />
                        AI_ANALYST_TERMINAL
                    </div>
                    {isGenerating && <span className="text-[10px] text-orange-500 animate-pulse ml-auto">● PROCESSING STREAM</span>}
                </div>

                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 custom-scrollbar-dark"
                >
                    <pre className="whitespace-pre-wrap break-words leading-relaxed text-sm text-emerald-400/90 font-mono">
                        {streamContent || <span className="text-slate-600 animate-pulse">Initializing neural link...</span>}
                        <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 align-middle animate-pulse"></span>
                    </pre>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: #0f172a; }
            `}</style>
        </div>
    );
};
