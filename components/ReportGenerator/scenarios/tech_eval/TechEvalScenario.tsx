
import React, { useState } from 'react';
import { ScenarioProps } from '../registry';
import { createStratifyTask } from '../../../../api/stratify';
import { InputCollector } from './steps/InputCollector';
import { WorkflowProcessor } from './steps/WorkflowProcessor';
import { FinalRenderer } from './steps/FinalRenderer';

type ViewStatus = 'input' | 'processing' | 'rendering';

export const TechEvalScenario: React.FC<ScenarioProps> = ({ taskId: initialTaskId, scenario, onComplete }) => {
    const [view, setView] = useState<ViewStatus>('input');
    const [config, setConfig] = useState<{
        targetTech: string;
        materials: string;
    } | null>(null);
    const [draftMarkdown, setDraftMarkdown] = useState('');
    const [activeTaskId, setActiveTaskId] = useState(initialTaskId);
    const [activeSessionId, setActiveSessionId] = useState('');

    // 步骤1：输入完成，此时才真正创建后端 Task 记录
    const handleInputComplete = async (data: { targetTech: string; materials: string }) => {
        setConfig(data);
        
        try {
            // 如果 initialTaskId 为空（从 Picker 直接跳过来），则创建新任务
            if (!activeTaskId) {
                const newTask = await createStratifyTask(data.targetTech, scenario);
                setActiveTaskId(newTask.id);
                setActiveSessionId(newTask.session_id);
            }
            setView('processing');
        } catch (e) {
            alert('初始化任务失败');
        }
    };

    // 步骤2：处理与对话微调完成，进入最终渲染
    const handleWorkflowComplete = (finalMd: string) => {
        setDraftMarkdown(finalMd);
        setView('rendering');
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
            {view === 'input' && (
                <InputCollector 
                    onStart={handleInputComplete} 
                />
            )}

            {view === 'processing' && config && activeTaskId && (
                <WorkflowProcessor 
                    taskId={activeTaskId}
                    scenario={scenario}
                    initialSessionId={activeSessionId}
                    targetTech={config.targetTech}
                    materials={config.materials}
                    onFinish={handleWorkflowComplete}
                    onUpdateSession={setActiveSessionId}
                />
            )}

            {view === 'rendering' && (
                <FinalRenderer 
                    taskId={activeTaskId}
                    scenario={scenario}
                    markdown={draftMarkdown}
                    onComplete={onComplete}
                />
            )}
        </div>
    );
};
