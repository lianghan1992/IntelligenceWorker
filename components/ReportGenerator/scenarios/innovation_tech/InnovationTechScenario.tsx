
import React, { useState, useEffect } from 'react';
import { ScenarioProps } from '../registry';
import { createStratifyTask, getScenarios } from '../../../../api/stratify';
import { InputStep } from './steps/InputStep';
import { ContentGenStep } from './steps/ContentGenStep';
import { HtmlGenStep } from './steps/HtmlGenStep';
import { LightBulbIcon, ChevronRightIcon } from '../../../icons';

export const InnovationTechScenario: React.FC<ScenarioProps> = ({ taskId: initialTaskId, scenario, onComplete, initialTask }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [topic, setTopic] = useState('');
    const [materials, setMaterials] = useState('');
    const [markdownContent, setMarkdownContent] = useState('');
    
    const [taskId, setTaskId] = useState(initialTaskId);
    const [contentSessionId, setContentSessionId] = useState('');
    const [defaultModel, setDefaultModel] = useState<string>('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);

    // 获取场景配置的默认模型
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const scenarios = await getScenarios();
                const current = scenarios.find(s => s.id === scenario || s.name === scenario);
                if (current?.default_model) {
                    setDefaultModel(current.default_model);
                }
            } catch (e) {
                console.error("Failed to load scenario config", e);
            }
        };
        fetchConfig();
    }, [scenario]);

    const handleInputConfirm = async (inputTopic: string, inputMaterials: string) => {
        setTopic(inputTopic);
        setMaterials(inputMaterials);
        
        // 如果没有 Task ID，创建一个，并等待返回后再进入下一步
        if (!taskId) {
            setIsCreatingTask(true);
            try {
                const newTask = await createStratifyTask(inputTopic, scenario);
                setTaskId(newTask.id);
                setStep(2); // 确保 taskId 存在后再跳转，避免下游组件空 ID 初始化
            } catch (e) {
                console.error("Task creation failed", e);
                alert("任务创建失败，请重试");
            } finally {
                setIsCreatingTask(false);
            }
        } else {
            setStep(2);
        }
    };

    const handleContentGenerated = (markdown: string, sessionId: string) => {
        setMarkdownContent(markdown);
        setContentSessionId(sessionId);
        setStep(3);
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans overflow-hidden">
            {/* 顶部导航 */}
            <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-50 sticky top-0 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                        <LightBulbIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-800 tracking-tight">创新技术分析</div>
                        <div className="text-[10px] text-slate-400 font-medium">Innovation Tech Analysis</div>
                    </div>
                </div>
                
                {/* 步骤条 */}
                <div className="flex items-center gap-4">
                    <StepNode number={1} title="技术输入" isActive={step === 1} isDone={step > 1} />
                    <ChevronRightIcon className="w-4 h-4 text-slate-300" />
                    <StepNode number={2} title="四象限分析" isActive={step === 2} isDone={step > 2} />
                    <ChevronRightIcon className="w-4 h-4 text-slate-300" />
                    <StepNode number={3} title="可视化生成" isActive={step === 3} isDone={step > 3} />
                </div>
            </header>

            {/* 内容区 */}
            <div className="flex-1 overflow-hidden relative">
                {step === 1 && (
                    <InputStep 
                        onStart={handleInputConfirm} 
                        isLoading={isCreatingTask}
                    />
                )}
                {step === 2 && (
                    <ContentGenStep 
                        taskId={taskId} 
                        topic={topic} 
                        materials={materials} 
                        scenario={scenario}
                        model={defaultModel}
                        onComplete={handleContentGenerated} 
                    />
                )}
                {step === 3 && (
                    <HtmlGenStep 
                        taskId={taskId} 
                        markdown={markdownContent} 
                        scenario={scenario}
                        onRestart={() => setStep(1)}
                        onComplete={onComplete}
                        // We do NOT pass the contentSessionId here, enforcing a new session for HTML gen
                    />
                )}
            </div>
        </div>
    );
};

const StepNode: React.FC<{ number: number; title: string; isActive: boolean; isDone: boolean }> = ({ number, title, isActive, isDone }) => {
    return (
        <div className={`flex items-center gap-2 transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-60'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                isActive ? 'border-orange-500 text-orange-500 bg-orange-50' : 
                isDone ? 'border-green-500 bg-green-500 text-white' : 
                'border-slate-300 text-slate-300'
            }`}>
                {isDone ? '✓' : number}
            </div>
            <span className={`text-xs font-bold ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{title}</span>
        </div>
    );
};
