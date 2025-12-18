
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
    
    // 报告生命周期状态: 'idle' -> 'analyzing' -> 'composing' -> 'review' -> 'synthesizing' -> 'done'
    const [workflowState, setWorkflowState] = useState<'idle' | 'analyzing' | 'composing' | 'review' | 'synthesizing' | 'done'>('idle');
    const [markdownContent, setMarkdownContent] = useState('');

    const handleStart = async (config: { targetTech: string; materials: string }) => {
        setTargetTech(config.targetTech);
        setMaterials(config.materials);
        setWorkflowState('analyzing');

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
        <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden font-sans">
            {/* 顶部高端极简状态条 */}
            <div className="h-12 bg-white border-b border-slate-200/60 flex items-center justify-between px-8 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <BrainIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-900 text-xs font-black tracking-[0.1em] uppercase">Intelligence Workbench</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-1 h-1 rounded-full ${workflowState !== 'idle' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{workflowState}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 左栏：输入 - 纯白精细感 */}
                <div className="w-[320px] lg:w-[360px] border-r border-slate-100 bg-white z-20 flex flex-col shadow-[20px_0_40px_-20px_rgba(0,0,0,0.03)]">
                    <InputCollector 
                        initialTech={targetTech}
                        initialMaterials={materials}
                        isProcessing={workflowState !== 'idle' && workflowState !== 'review' && workflowState !== 'done'}
                        onStart={handleStart}
                    />
                </div>

                {/* 中栏：分析工作台 - 动态切换 */}
                <div className="w-[500px] lg:w-[650px] xl:w-[750px] border-r border-slate-100 bg-white flex flex-col relative z-10 overflow-hidden">
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
                            onConfirm={() => setWorkflowState('synthesizing')}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-10 grayscale">
                            <BrainIcon className="w-32 h-32 mb-4" />
                            <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-900">Wait for Mission</p>
                        </div>
                    )}
                </div>

                {/* 右栏：蓝图合成/预览 */}
                <div className="flex-1 bg-[#020617] relative overflow-hidden">
                    {workflowState === 'synthesizing' || workflowState === 'done' ? (
                        <FinalRenderer 
                            taskId={activeTaskId}
                            scenario={scenario}
                            markdown={markdownContent}
                            onFinish={() => setWorkflowState('done')}
                            onComplete={onComplete}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-800">
                            <div className="w-12 h-12 border-2 border-slate-900/50 rounded-full animate-spin-slow mb-4 relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-indigo-500 rounded-full"></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-20">Engine Idle</span>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
