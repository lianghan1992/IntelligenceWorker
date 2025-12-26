
import React, { useState } from 'react';
import { StratifyScenario, StratifyOutline } from '../../../types';
import { 
    ArrowLeftIcon, SparklesIcon, DocumentTextIcon, ViewGridIcon, 
    CheckCircleIcon, ChevronRightIcon, GlobeIcon
} from '../../icons';
import { Step1Collect } from './Step1Collect';
import { Step2Outline } from './Step2Outline';
import { Step3Compose } from './Step3Compose';
import { Step4Finalize } from './Step4Finalize';

interface ScenarioWorkstationProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

export type PPTStage = 'collect' | 'outline' | 'compose' | 'finalize';

// 定义消息结构，用于维护上下文
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface PPTData {
    topic: string;
    referenceMaterials: string;
    outline: StratifyOutline | null;
    pages: Array<{
        title: string;
        summary: string;
        content: string; // Markdown
        html?: string;
        isGenerating?: boolean;
    }>;
    // 新增：全流程共享的会话历史
    history: ChatMessage[];
}

const STEP_LABELS = [
    { id: 'collect', label: '灵感资料', icon: GlobeIcon },
    { id: 'outline', label: '结构蓝图', icon: ViewGridIcon },
    { id: 'compose', label: '深度创作', icon: DocumentTextIcon },
    { id: 'finalize', label: '视觉导出', icon: SparklesIcon },
];

export const ScenarioWorkstation: React.FC<ScenarioWorkstationProps> = ({ scenario, onBack }) => {
    const [currentStage, setCurrentStage] = useState<PPTStage>('collect');
    const [data, setData] = useState<PPTData>({
        topic: '',
        referenceMaterials: '',
        outline: null,
        pages: [],
        history: [] // 初始化历史记录
    });

    // 进度控制
    const activeStepIdx = STEP_LABELS.findIndex(s => s.id === currentStage);

    const handleBack = () => {
        if (currentStage === 'outline') setCurrentStage('collect');
        else if (currentStage === 'compose') setCurrentStage('outline');
        else if (currentStage === 'finalize') setCurrentStage('compose');
        else onBack();
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-sans">
            {/* Header with Stepper */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="hidden md:flex flex-col">
                        <h1 className="text-base font-black text-slate-800 tracking-tight">{scenario.title}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Workflow Engine v3.1</p>
                    </div>
                </div>

                {/* Progress Stepper */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                    {STEP_LABELS.map((step, idx) => {
                        const isActive = currentStage === step.id;
                        const isDone = activeStepIdx > idx;
                        return (
                            <React.Fragment key={step.id}>
                                <div className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300
                                    ${isActive ? 'bg-white text-indigo-600 shadow-md transform scale-105' : isDone ? 'text-emerald-600' : 'text-slate-400'}
                                `}>
                                    {isDone ? <CheckCircleIcon className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{step.label}</span>
                                </div>
                                {idx < STEP_LABELS.length - 1 && (
                                    <div className="w-4 flex items-center justify-center">
                                        <ChevronRightIcon className="w-3 h-3 text-slate-300" />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="w-32 flex justify-end">
                     <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <SparklesIcon className="w-4 h-4 text-indigo-600" />
                     </div>
                </div>
            </header>

            {/* Dynamic Workspace */}
            <main className="flex-1 overflow-hidden relative">
                {currentStage === 'collect' && (
                    <Step1Collect 
                        onNext={(topic, materials) => {
                            setData(prev => ({ ...prev, topic, referenceMaterials: materials }));
                            setCurrentStage('outline');
                        }}
                    />
                )}
                {currentStage === 'outline' && (
                    <Step2Outline 
                        topic={data.topic}
                        referenceMaterials={data.referenceMaterials}
                        // 传入已有历史（如果有）
                        history={data.history}
                        // 更新父组件历史
                        onHistoryUpdate={(newHistory) => setData(prev => ({ ...prev, history: newHistory }))}
                        onConfirm={(outline) => {
                            setData(prev => ({ 
                                ...prev, 
                                outline,
                                pages: outline.pages.map(p => ({ title: p.title, summary: p.content, content: '', isGenerating: false }))
                            }));
                            setCurrentStage('compose');
                        }}
                    />
                )}
                {currentStage === 'compose' && (
                    <Step3Compose 
                        topic={data.topic}
                        pages={data.pages}
                        // 传入完整的会话历史，确保内容生成不丢失上下文
                        history={data.history}
                        onUpdatePages={(newPages) => setData(prev => ({ ...prev, pages: newPages }))}
                        onFinish={() => setCurrentStage('finalize')}
                    />
                )}
                {currentStage === 'finalize' && (
                    <Step4Finalize 
                        topic={data.topic}
                        pages={data.pages}
                        onBackToCompose={() => setCurrentStage('compose')}
                    />
                )}
            </main>
        </div>
    );
};
