
import React, { useState } from 'react';
import { ScenarioProps } from '../registry';
import { createStratifyTask } from '../../../../api/stratify';
import { InputCollector } from './steps/InputCollector';
import { WorkflowProcessor } from './steps/WorkflowProcessor';
import { FinalRenderer } from './steps/FinalRenderer';
import { BrainIcon, SparklesIcon } from '../../../icons';

export const TechEvalScenario: React.FC<ScenarioProps> = ({ taskId: initialTaskId, scenario, onComplete }) => {
    const [targetTech, setTargetTech] = useState('');
    const [materials, setMaterials] = useState('');
    const [activeTaskId, setActiveTaskId] = useState(initialTaskId);
    const [activeSessionId, setActiveSessionId] = useState('');
    
    // 状态流: 'idle' -> 'processing' -> 'done'
    const [workflowState, setWorkflowState] = useState<'idle' | 'processing' | 'done'>('idle');
    const [markdownContent, setMarkdownContent] = useState('');

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
            setWorkflowState('idle');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden font-sans">
            {/* Header */}
            <div className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-3">
                    <BrainIcon className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Intelligence_WB</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${workflowState === 'processing' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{workflowState}</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 1. 左栏：控制中心 (33.3%) */}
                <div className="w-1/3 border-r border-slate-200 bg-white z-20 flex flex-col">
                    <InputCollector 
                        initialTech={targetTech}
                        initialMaterials={materials}
                        isProcessing={workflowState === 'processing'}
                        onStart={handleStart}
                    />
                </div>

                {/* 2. 中栏：内容生成 (33.3%) */}
                <div className="w-1/3 flex flex-col relative z-10 bg-white overflow-hidden border-r border-slate-100">
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
                            onConfirm={() => setWorkflowState('done')}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-10">
                            <SparklesIcon className="w-24 h-24 mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.5em]">System Standby</p>
                        </div>
                    )}
                </div>

                {/* 3. 右栏：合成渲染 (33.3%) */}
                <div className="w-1/3 bg-slate-950 z-20 flex flex-col shadow-[-1px_0_10px_rgba(0,0,0,0.05)]">
                    <FinalRenderer 
                        taskId={activeTaskId || ''}
                        scenario={scenario}
                        markdown={markdownContent}
                        isReady={workflowState === 'done'}
                        onComplete={onComplete}
                    />
                </div>
            </div>
        </div>
    );
};
