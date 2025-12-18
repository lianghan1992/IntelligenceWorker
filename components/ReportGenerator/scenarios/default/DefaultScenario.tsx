
import React, { useState } from 'react';
import { ScenarioProps } from '../registry';
import { StratifyPage, StratifyOutline } from '../../../../types';

// 场景内部私有组件 (从 shared 或当前目录引用)
import { OutlineStep } from './steps/OutlineStep';
import { ContentStep } from './steps/ContentStep';
import { LayoutStep } from './steps/LayoutStep';
import { MinimalStepper } from '../../shared/MinimalStepper';

export const DefaultScenario: React.FC<ScenarioProps> = ({ taskId, topic, scenario, sessionId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [pages, setPages] = useState<StratifyPage[]>([]);
    const [activeSessionId, setActiveSessionId] = useState(sessionId);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
            {/* 场景私有的步骤条 (如果每个场景步骤不同，也可以在这里定制) */}
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
                        onComplete={(resPages) => {
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
