
import React, { useState } from 'react';
import { ScenarioProps } from '../registry';
import { StratifyPage } from '../../../../types';
import { InputCollector } from './steps/InputCollector';
import { WorkflowProcessor } from './steps/WorkflowProcessor';
import { FinalRenderer } from './steps/FinalRenderer';

type ViewStatus = 'input' | 'processing' | 'rendering';

export const TechEvalScenario: React.FC<ScenarioProps> = ({ taskId, topic, scenario, sessionId, onComplete }) => {
    const [view, setView] = useState<ViewStatus>('input');
    const [config, setConfig] = useState<{
        targetTech: string;
        materials: string;
    } | null>(null);
    const [draftMarkdown, setDraftMarkdown] = useState('');
    const [lastSessionId, setLastSessionId] = useState(sessionId);

    // 步骤1：输入完成，进入处理流
    const handleInputComplete = (data: { targetTech: string; materials: string }) => {
        setConfig(data);
        setView('processing');
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

            {view === 'processing' && config && (
                <WorkflowProcessor 
                    taskId={taskId}
                    scenario={scenario}
                    initialSessionId={lastSessionId}
                    targetTech={config.targetTech}
                    materials={config.materials}
                    onFinish={handleWorkflowComplete}
                    onUpdateSession={setLastSessionId}
                />
            )}

            {view === 'rendering' && (
                <FinalRenderer 
                    taskId={taskId}
                    scenario={scenario}
                    markdown={draftMarkdown}
                    onComplete={onComplete}
                />
            )}
        </div>
    );
};
