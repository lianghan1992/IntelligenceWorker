
import React, { useState, useEffect } from 'react';
import { ScenarioProps } from '../registry';
import { createStratifyTask } from '../../../../api/stratify';
import { InputCollector } from './steps/InputCollector';
import { WorkflowProcessor } from './steps/WorkflowProcessor';
import { FinalRenderer } from './steps/FinalRenderer';
import { BrainIcon, SparklesIcon, ChevronRightIcon } from '../../../icons';

export type WorkflowState = 'input' | 'processing' | 'review' | 'finalizing' | 'done';

export const TechEvalScenario: React.FC<ScenarioProps> = ({ taskId: initialTaskId, scenario, onComplete, initialTask }) => {
    // 核心数据状态
    const [targetTech, setTargetTech] = useState('');
    const [materials, setMaterials] = useState('');
    const [activeTaskId, setActiveTaskId] = useState(initialTaskId);
    const [activeSessionId, setActiveSessionId] = useState('');
    
    // 流程控制
    const [workflowState, setWorkflowState] = useState<WorkflowState>('input');
    
    // 最终用于渲染的 Markdown
    const [finalMarkdown, setFinalMarkdown] = useState('');

    // 历史恢复逻辑
    useEffect(() => {
        if (initialTask) {
            setActiveTaskId(initialTask.id);
            setActiveSessionId(initialTask.session_id);
            // 恢复输入框内容
            if (initialTask.input_text) setTargetTech(initialTask.input_text);
            
            // 深度状态恢复逻辑
            if (initialTask.result?.phases) {
                // 检查是否有任何阶段已开始
                const hasStarted = Object.keys(initialTask.result.phases).length > 0;
                
                if (hasStarted) {
                    // 如果有 phases 数据，说明已经进入处理流程，跳转到 processing 或 review
                    // 检查是否所有关键步骤都已完成
                    const phases = initialTask.result.phases;
                    const stepsDone = 
                        phases['03_TriggerGeneration_step1']?.status === 'completed' &&
                        phases['03_TriggerGeneration_step2']?.status === 'completed' &&
                        phases['03_TriggerGeneration_step3']?.status === 'completed';

                    if (stepsDone) {
                        setWorkflowState('review');
                    } else {
                        setWorkflowState('processing');
                    }
                }
            } else if (initialTask.status === 'completed') {
                 // 兜底：如果任务状态是 completed，即使没有 phases 数据（旧数据），也尝试进入 review
                 setWorkflowState('review');
            }
        }
    }, [initialTask]);

    const handleStart = async (config: { targetTech: string; materials: string }) => {
        setTargetTech(config.targetTech);
        setMaterials(config.materials);
        setWorkflowState('processing');

        try {
            if (!activeTaskId) {
                const newTask = await createStratifyTask(config.targetTech, scenario);
                setActiveTaskId(newTask.id);
                setActiveSessionId(newTask.session_id);
            }
        } catch (e) {
            setWorkflowState('input');
            alert("任务初始化失败，请重试");
        }
    };

    const handleReviewComplete = (markdown: string) => {
        setFinalMarkdown(markdown);
        setWorkflowState('finalizing');
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans overflow-hidden">
            {/* 顶部导航栏 (Minimalist Header) */}
            <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 z-50 sticky top-0 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <BrainIcon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 tracking-tight">技术评估 Agent</span>
                    <span className="text-slate-300 text-xs">/</span>
                    <span className="text-xs text-slate-500 font-medium">Tech Evaluation</span>
                </div>
                
                {/* 步骤指示器 */}
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <StepIndicator state={workflowState} target="input" label="Input" />
                    <ChevronRightIcon className="w-3 h-3 text-slate-300" />
                    <StepIndicator state={workflowState} target="processing" label="Analysis" />
                    <ChevronRightIcon className="w-3 h-3 text-slate-300" />
                    <StepIndicator state={workflowState} target="review" label="Review" />
                    <ChevronRightIcon className="w-3 h-3 text-slate-300" />
                    <StepIndicator state={workflowState} target="done" label="Report" />
                </div>
            </header>

            {/* 主内容区 - 使用 flex-col 和 min-h-0 确保子元素滚动条生效 */}
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                {workflowState === 'input' && (
                    <InputCollector 
                        initialTech={targetTech}
                        initialMaterials={materials}
                        isProcessing={false}
                        onStart={handleStart}
                    />
                )}

                {(workflowState === 'processing' || workflowState === 'review') && (
                    <WorkflowProcessor 
                        taskId={activeTaskId || ''}
                        scenario={scenario}
                        initialSessionId={activeSessionId}
                        targetTech={targetTech}
                        materials={materials}
                        workflowState={workflowState}
                        setWorkflowState={setWorkflowState}
                        onReviewComplete={handleReviewComplete}
                        // 传入 initialTask 以供 Processor 内部恢复步骤状态
                        initialTask={initialTask}
                    />
                )}

                {(workflowState === 'finalizing' || workflowState === 'done') && (
                    <FinalRenderer 
                        taskId={activeTaskId || ''}
                        scenario={scenario}
                        markdown={finalMarkdown}
                        isReady={workflowState === 'finalizing'} // minimizing prop overlap
                        onComplete={onComplete}
                        onBack={() => setWorkflowState('review')}
                    />
                )}
            </div>
        </div>
    );
};

const StepIndicator: React.FC<{ state: WorkflowState, target: string, label: string }> = ({ state, target, label }) => {
    const order = ['input', 'processing', 'review', 'finalizing', 'done'];
    const currIdx = order.indexOf(state === 'finalizing' ? 'done' : state); // finalizing map to done for visual
    const targetIdx = order.indexOf(target);
    
    const isActive = currIdx === targetIdx;
    const isPast = currIdx > targetIdx;

    return (
        <div className={`flex items-center gap-1.5 transition-colors duration-300 ${isActive ? 'text-indigo-600' : isPast ? 'text-slate-800' : 'text-slate-300'}`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-600 animate-pulse' : isPast ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            <span>{label}</span>
        </div>
    );
};
