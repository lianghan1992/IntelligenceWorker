
import React, { useState } from 'react';
import { ScenarioProps } from '../registry';
import { createStratifyTask } from '../../../../api/stratify';
import { InputCollector } from './steps/InputCollector';
import { WorkflowProcessor } from './steps/WorkflowProcessor';
import { FinalRenderer } from './steps/FinalRenderer';
import { BrainIcon, CheckIcon } from '../../../icons';

export const TechEvalScenario: React.FC<ScenarioProps> = ({ taskId: initialTaskId, scenario, onComplete }) => {
    const [targetTech, setTargetTech] = useState('');
    const [materials, setMaterials] = useState('');
    const [activeTaskId, setActiveTaskId] = useState(initialTaskId);
    const [activeSessionId, setActiveSessionId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // 报告生命周期状态: 'idle' -> 'analyzing' (01,02) -> 'composing' (03 steps) -> 'review' (editing) -> 'synthesizing' (04) -> 'done'
    const [workflowState, setWorkflowState] = useState<'idle' | 'analyzing' | 'composing' | 'review' | 'synthesizing' | 'done'>('idle');
    
    const [markdownContent, setMarkdownContent] = useState('');

    const handleStart = async (config: { targetTech: string; materials: string }) => {
        setTargetTech(config.targetTech);
        setMaterials(config.materials);
        setIsProcessing(true);
        setWorkflowState('analyzing');

        try {
            if (!activeTaskId) {
                const newTask = await createStratifyTask(config.targetTech, scenario);
                setActiveTaskId(newTask.id);
                setActiveSessionId(newTask.session_id);
            }
        } catch (e) {
            alert('AI 引擎初始化失败');
            setWorkflowState('idle');
        }
    };

    const handleMarkdownConfirm = () => {
        setWorkflowState('synthesizing');
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f1f3f6] overflow-hidden font-sans">
            {/* 顶部超窄状态条 */}
            <div className="h-10 bg-slate-900 flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-3">
                    <BrainIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Neural Workbench v3.2</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${workflowState !== 'idle' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`}></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{workflowState}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 左栏：输入 (固定) */}
                <div className="w-[300px] lg:w-[350px] border-r border-slate-200 bg-white z-20 flex flex-col shadow-lg">
                    <InputCollector 
                        initialTech={targetTech}
                        initialMaterials={materials}
                        isProcessing={workflowState !== 'idle' && workflowState !== 'review'}
                        onStart={handleStart}
                    />
                </div>

                {/* 中栏：分析工作台 (动态切换模式) */}
                <div className="w-[500px] lg:w-[600px] xl:w-[700px] border-r border-slate-200 bg-slate-50 flex flex-col relative z-10 overflow-hidden">
                    {activeTaskId ? (
                        <WorkflowProcessor 
                            taskId={activeTaskId}
                            scenario={scenario}
                            initialSessionId={activeSessionId}
                            targetTech={targetTech}
                            materials={materials}
                            workflowState={workflowState}
                            setWorkflowState={setWorkflowState}
                            markdownContent={markdownContent}
                            setMarkdownContent={setMarkdownContent}
                            onConfirm={handleMarkdownConfirm}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20">
                            <BrainIcon className="w-16 h-16 mb-4 text-slate-300" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Awaiting Knowledge Injection</p>
                        </div>
                    )}
                </div>

                {/* 右栏：高保真预览/代码流合成 */}
                <div className="flex-1 bg-slate-900 relative overflow-hidden">
                    {workflowState === 'synthesizing' || workflowState === 'done' ? (
                        <FinalRenderer 
                            taskId={activeTaskId}
                            scenario={scenario}
                            markdown={markdownContent}
                            onFinish={() => setWorkflowState('done')}
                            onComplete={onComplete}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-700 border-l border-white/5">
                            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative mb-4">
                                <div className="absolute inset-0 bg-indigo-500/20 w-1/3 animate-[shimmer_2s_infinite]"></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Visualizer Standby</span>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes shimmer { from { left: -100%; } to { left: 100%; } }
            `}</style>
        </div>
    );
};
