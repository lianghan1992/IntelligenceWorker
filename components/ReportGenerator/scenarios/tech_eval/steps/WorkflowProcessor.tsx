
import React, { useRef } from 'react';
import { WorkflowState } from '../TechEvalScenario';
import { StratifyTask } from '../../../../../types';
import { streamGenerate } from '../../../../../api/stratify';

interface ReportSections {
    [key: string]: any;
}

export const WorkflowProcessor: React.FC<{
    taskId: string;
    scenario: string;
    initialSessionId: string;
    targetTech: string;
    materials: string;
    workflowState: WorkflowState;
    setWorkflowState: (s: WorkflowState) => void;
    onReviewComplete: (markdown: string) => void;
    initialTask?: StratifyTask | null; 
    attachments?: any[]; // 新增：从 InputCollector 传入的附件列表
}> = ({ taskId, scenario, initialSessionId, targetTech, materials, workflowState, setWorkflowState, onReviewComplete, initialTask, attachments = [] }) => {
    
    // Fix: Added missing refs and state placeholders to satisfy the truncated code snippet
    const configRef = useRef<any>({ defaultModel: '', files: [] });
    const sessionRef = useRef<string | null>(initialSessionId);
    const updateStep = (id: number, data: any) => { console.log(id, data); };

    const runStep = async (stepIndex: number, promptName: string, vars: any, partKey?: keyof ReportSections, isHtmlStep = false) => {
        const stepId = stepIndex + 1;
        let stepModel = configRef.current.defaultModel;
        const fileConfig = configRef.current.files.find((f: any) => f.name.includes(promptName));
        if (fileConfig && fileConfig.model) stepModel = fileConfig.model;
        
        updateStep(stepId, { status: 'running', model: stepModel });

        return new Promise<void>((resolve) => {
            // let fullContentBuffer = ''; // Unused in this snippet
            // let apiReasoningBuffer = ''; // Unused in this snippet

            streamGenerate(
                { 
                    prompt_name: promptName, 
                    variables: vars, 
                    scenario, 
                    session_id: isHtmlStep ? undefined : sessionRef.current,
                    model_override: stepModel, 
                    task_id: taskId,             
                    phase_name: promptName,
                    attachments: attachments.length > 0 ? attachments : undefined // 在此处注入附件
                },
                (chunk) => {
                    // ... 现有处理逻辑 ...
                    console.log(chunk);
                },
                // ... 其余逻辑 ...
            );
            resolve();
        });
    };

    // ... 其余现有代码 ...
    return null; // Fix: Added return to satisfy React.FC type
};
