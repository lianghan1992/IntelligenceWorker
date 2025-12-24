
import React, { useState, useEffect } from 'react';
import { StratifyTask, StratifyScenario } from '../../types';
import { createStratifyTask, getScenarios, getStratifyTaskDetail, streamGenerate } from '../../api/stratify';
import { isScenarioSupported, getScenarioComponent } from './scenarios/registry';

// Shared UI Components
import { HistoryDrawer } from './shared/HistoryDrawer';
import { AnalysisModal } from './shared/AnalysisModal';
import { ContextCollector } from './shared/ContextCollector';
import { ScenarioPicker } from './shared/ScenarioPicker';
import { ClockIcon, ChevronLeftIcon, CheckIcon } from '../icons';

const DEFAULT_REPORT_MODEL = "openrouter@mistralai/devstral-2512:free";

export const ReportGenerator: React.FC = () => {
    const [view, setViewState] = useState<'picker' | 'collector' | 'workflow' | 'done'>('picker');
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
    
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStream, setAnalysisStream] = useState('');

    useEffect(() => {
        if (view === 'picker') {
            getScenarios().then(setScenarios).catch(console.error);
        }
    }, [view]);

    const isTechEvalScenario = (id: string) => {
        return id === '50de3a59-0502-4202-9ddb-36ceb07fb3f1' || 
               id === 'tech_evaluation' || 
               id === 'tech_assessment' ||
               id === '43a73bc4-0fae-4aa7-8854-e4fdfaf89a07' ||
               id === 'innovation_tech_analysis' ||
               id === '创新技术分析';
    };

    const handleScenarioSelect = (id: string) => {
        const scenario = scenarios.find(s => s.id === id);
        if (!scenario || !isScenarioSupported(scenario)) return;
        
        setSelectedScenarioId(id);
        
        // 特殊定制场景（如新技术评估、创新技术分析）直接进入工作台，跳过通用的意图解析步骤
        if (isTechEvalScenario(id)) {
            setTask(null);
            setViewState('workflow');
        } else {
            setViewState('collector');
        }
    };

    const handleStartTask = async (userInput: string, context: StratifyTask['context']) => {
        setIsAnalyzing(true);
        setAnalysisStream('');
        try {
            const newTask = await createStratifyTask(userInput, selectedScenarioId);
            setTask({ ...newTask, context });

            await streamGenerate(
                {
                    prompt_name: '00_analyze_input',
                    variables: { user_input: userInput },
                    scenario: selectedScenarioId,
                    task_id: newTask.id,
                    phase_name: '00_analyze_input',
                    model_override: DEFAULT_REPORT_MODEL
                },
                (chunk) => setAnalysisStream(prev => prev + chunk),
                () => {
                    setTimeout(() => {
                        setIsAnalyzing(false);
                        setViewState('workflow');
                    }, 800);
                }
            );
        } catch (e) {
            alert('初始化失败');
            setIsAnalyzing(false);
        }
    };

    const handleHistoryLoad = async (taskId: string) => {
        setIsHistoryOpen(false);
        try {
            const detail = await getStratifyTaskDetail(taskId);
            setTask(detail);
            // 关键修复：确保使用 task 中的 scenario_name 来查找组件，即使它在本地 scenarios 列表里没加载到
            // 后端返回的可能是 "tech_assessment"，这里直接使用它，registry 会处理映射
            setSelectedScenarioId(detail.scenario_name); 
            setViewState('workflow');
        } catch (e) {
            alert('加载失败');
        }
    };

    const renderScenarioWorkflow = () => {
        // 允许 tech_assessment 通过
        const isSpecialized = isTechEvalScenario(selectedScenarioId);
        
        // 如果是从历史记录加载，task 会有值。如果是新建且 specialized，task 可能初始为 null
        if (!task && !isSpecialized) return null;
        
        const ScenarioComponent = getScenarioComponent(selectedScenarioId);
        
        if (!ScenarioComponent) {
            return (
                <div className="flex items-center justify-center h-full flex-col gap-4">
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                        场景组件未找到 ({selectedScenarioId})
                    </div>
                    <button onClick={() => setViewState('picker')} className="text-sm text-blue-600 underline">返回首页</button>
                </div>
            );
        }

        return (
            <ScenarioComponent 
                taskId={task?.id || ''}
                topic={task?.input_text || ''}
                scenario={selectedScenarioId}
                sessionId={task?.session_id || ''}
                context={task?.context}
                initialTask={task} // 传递完整任务对象用于恢复状态
                onComplete={() => setViewState('done')}
            />
        );
    };

    return (
        <div className="h-full flex flex-col bg-white relative overflow-hidden font-sans">
            {/* 顶层工具栏：仅在特定视图显示，避免重叠 */}
            {view === 'picker' && (
                <div className="absolute top-8 right-8 z-[60]">
                    <button 
                        onClick={() => setIsHistoryOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-full text-xs font-bold border border-slate-200 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95"
                    >
                        <ClockIcon className="w-3.5 h-3.5 opacity-60" /> 历史任务
                    </button>
                </div>
            )}

            {view === 'collector' && (
                <div className="absolute top-8 right-8 z-[60]">
                    <button 
                        onClick={() => setViewState('picker')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-2xl shadow-sm transition-all active:scale-95"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        <span className="text-xs font-bold">返回</span>
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden relative flex flex-col z-20">
                {view === 'picker' && <ScenarioPicker scenarios={scenarios} onSelect={handleScenarioSelect} />}
                {view === 'collector' && <ContextCollector onStart={handleStartTask} isProcessing={isAnalyzing} />}
                {view === 'workflow' && renderScenarioWorkflow()}
                {view === 'done' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-xl">
                            <CheckIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">报告已就绪</h2>
                        <button onClick={() => setViewState('picker')} className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all mt-8">返回首页</button>
                    </div>
                )}
            </div>

            <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelect={handleHistoryLoad} />
            <AnalysisModal isOpen={isAnalyzing} streamContent={analysisStream} />
        </div>
    );
};
