
import React, { useState, useEffect } from 'react';
import { ScenarioProps } from '../registry';
import { StratifyPage, StratifyOutline } from '../../../../types';

// Steps
import { OutlineStep } from './steps/OutlineStep';
import { ContentStep } from './steps/ContentStep';
import { LayoutStep } from './steps/LayoutStep';
import { MinimalStepper } from '../../shared/MinimalStepper';
import { parseLlmJson } from '../../../../api/stratify';

export const GeneralPptScenario: React.FC<ScenarioProps> = ({ taskId, topic, scenario, sessionId, onComplete, initialTask }) => {
    const [step, setStep] = useState(1);
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [pages, setPages] = useState<StratifyPage[]>([]);
    const [activeSessionId, setActiveSessionId] = useState(sessionId);

    // 历史恢复逻辑
    useEffect(() => {
        if (initialTask?.result?.phases) {
            const phases = initialTask.result.phases;
            
            // 1. 尝试恢复大纲
            const outlinePhase = phases['01_generate_outline'];
            if (outlinePhase && outlinePhase.status === 'completed' && outlinePhase.content) {
                try {
                    // 尝试解析大纲 JSON
                    let parsedOutline = parseLlmJson<StratifyOutline>(outlinePhase.content);
                    
                    // 如果 parseLlmJson 失败，尝试简单的正则或直接解析
                    if (!parsedOutline) {
                        const jsonStart = outlinePhase.content.indexOf('{');
                        if (jsonStart > -1) {
                            parsedOutline = JSON.parse(outlinePhase.content.slice(jsonStart));
                        }
                    }

                    if (parsedOutline && Array.isArray(parsedOutline.pages)) {
                        setOutline(parsedOutline);
                        setStep(2); // 恢复到第二步

                        // 2. 尝试恢复内容 (如果支持)
                        // 目前内容可能分散或未完整保存，暂不深度恢复 pages 状态，
                        // 但如果有大纲，至少用户可以重新点击生成内容。
                    }
                } catch (e) {
                    console.warn("Failed to restore outline from history", e);
                }
            }
        }
    }, [initialTask]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
            {/* Stepper Navigation */}
            <MinimalStepper currentStep={step} />

            <div className="flex-1 relative overflow-hidden flex flex-col">
                {step === 1 && (
                    <OutlineStep 
                        taskId={taskId}
                        topic={topic}
                        scenario={scenario}
                        onConfirm={(data, sid) => {
                            setOutline(data);
                            if (sid) setActiveSessionId(sid);
                            setStep(2);
                        }}
                    />
                )}

                {step === 2 && outline && (
                    <ContentStep 
                        taskId={taskId}
                        outline={outline}
                        scenario={scenario}
                        initialSessionId={activeSessionId}
                        onComplete={(resPages: StratifyPage[]) => {
                            setPages(resPages);
                            setStep(3);
                        }}
                    />
                )}

                {step === 3 && (
                    <LayoutStep 
                        taskId={taskId}
                        pages={pages}
                        scenario={scenario}
                        onComplete={onComplete}
                    />
                )}
            </div>
        </div>
    );
};
