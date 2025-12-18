
import React, { useState, useMemo } from 'react';
import { StratifyTask, TaskPhase } from '../../../types';
import { OutlineGenerator } from '../steps/OutlineGenerator';
import { ContentWriter } from '../steps/ContentWriter';
import { LayoutGenerator } from '../steps/LayoutGenerator';
import { CheckCircleIcon, ClockIcon, PlayIcon, ViewGridIcon } from '../../icons';

// 预留的阶段渲染映射表 (Phase Registry)
// 开发者可以在这里为特定的阶段名注册特殊的 UI 组件
const PHASE_COMPONENTS: Record<string, React.FC<any>> = {
    "01_generate_outline": OutlineGenerator,
    "02_revise_outline": OutlineGenerator,
    "03_generate_content": ContentWriter,
    "04_revise_content": ContentWriter,
    "05_generate_html": LayoutGenerator,
    // 如果有自定义场景的阶段，可以在此添加
    // "custom_data_pick": CustomDataSelector,
};

export const PhaseWorkflow: React.FC<{
    task: StratifyTask;
    scenario: string;
    onUpdateTask: (task: StratifyTask) => void;
}> = ({ task, scenario, onUpdateTask }) => {
    
    // 计算当前活动阶段：第一个未完成的阶段
    const phases = useMemo(() => {
        if (!task.result?.phases) return [];
        // 按 key 排序确保顺序一致 (后端 00, 01, 02 命名习惯)
        return Object.entries(task.result.phases)
            .sort(([a], [b]) => a.localeCompare(b))
            // Fix: cast p to any to resolve spread type error
            .map(([key, p]) => ({ ...(p as any), id: key }));
    }, [task.result?.phases]);

    const activePhase = phases.find(p => p.status !== 'completed') || phases[phases.length - 1];

    if (!activePhase) return <div className="p-10 text-center text-slate-400">流水线初始化中...</div>;

    // 渲染动态阶段
    const renderActivePhase = () => {
        const Component = PHASE_COMPONENTS[activePhase.id];
        
        if (!Component) {
            // 兜底渲染器：普通的 Markdown/Revision 界面
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <ClockIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">正在执行：{activePhase.id}</h3>
                    <p className="text-slate-400 max-w-xs">该阶段使用通用渲染器，请稍候...</p>
                </div>
            );
        }

        // 这里的传参可以根据具体的组件需求进行适配
        // 实际上我们可以通过 phase_id 来判断需要哪些 Props
        return (
            <div className="flex-1 h-full overflow-hidden animate-in fade-in duration-500">
                <Component 
                    taskId={task.id}
                    topic={task.input_text}
                    scenario={scenario}
                    // 特殊适配：有些组件需要 outline
                    outline={task.result?.phases?.['01_generate_outline']?.content ? JSON.parse(task.result.phases['01_generate_outline'].content) : null}
                    // 回调函数，用于推动任务状态
                    onConfirm={(data: any, sid: string) => {
                        // 这里可以调用 fetch 更新 task 状态，推动流水线
                        // 简化起见，这里假设组件内部执行完流后会自动触发同步
                    }}
                />
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Phase Navigation Rail */}
            <div className="w-64 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ViewGridIcon className="w-4 h-4"/> 场景流水线
                    </h4>
                    <div className="mt-2 text-sm font-bold text-indigo-600 truncate">{scenario}</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {phases.map((p, idx) => {
                        const isCurrent = activePhase.id === p.id;
                        const isDone = p.status === 'completed';
                        
                        return (
                            <div 
                                key={p.id}
                                className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                    isCurrent 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                                        : isDone 
                                            ? 'bg-white border-slate-100 text-slate-400' 
                                            : 'bg-white border-transparent text-slate-300'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                    isDone ? 'bg-green-100 text-green-600' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'
                                }`}>
                                    {isDone ? <CheckCircleIcon className="w-4 h-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                                </div>
                                <span className="text-xs font-bold truncate">{p.id.split('_').slice(1).join(' ')}</span>
                                {isCurrent && p.status === 'processing' && (
                                    <div className="absolute right-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {/* Reference Materials Toggle / Preview */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">已注入上下文</div>
                    <div className="flex gap-1.5 flex-wrap">
                        {task.context?.files.map((_: any, i: number) => <div key={i} className="w-2 h-2 rounded-full bg-blue-400" title="File Attached"></div>)}
                        {task.context?.vector_snippets.map((_: any, i: number) => <div key={i} className="w-2 h-2 rounded-full bg-emerald-400" title="Vector Snippet Attached"></div>)}
                    </div>
                </div>
            </div>

            {/* Active Workspace */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {renderActivePhase()}
            </div>
        </div>
    );
};
