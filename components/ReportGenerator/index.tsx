
import React, { useState, useEffect } from 'react';
import { StratifyTask, Scenario, TaskPhase } from '../../types';
import { createStratifyTask, getScenarios, getStratifyTaskDetail, streamGenerate } from '../../api/stratify';

// Components
import { MinimalStepper } from './ui/MinimalStepper';
import { HistoryDrawer } from './ui/HistoryDrawer';
import { AnalysisModal } from './ui/AnalysisModal';
import { ContextCollector } from './steps/ContextCollector';
import { ScenarioPicker } from './steps/ScenarioPicker';
import { PhaseWorkflow } from './ui/PhaseWorkflow';
import { ClockIcon, SparklesIcon, ChevronLeftIcon } from '../icons';

export const ReportGenerator: React.FC = () => {
    // 状态机: picker -> collector -> workflow
    const [view, setViewState] = useState<'picker' | 'collector' | 'workflow'>('picker');
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<string>('default');
    
    // 任务数据
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    
    // 初始分析流
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStream, setAnalysisStream] = useState('');

    useEffect(() => {
        getScenarios().then(setScenarios).catch(console.error);
    }, []);

    const handleScenarioSelect = (name: string) => {
        setSelectedScenario(name);
        setViewState('collector');
    };

    const handleStartTask = async (userInput: string, context: StratifyTask['context']) => {
        setIsAnalyzing(true);
        setAnalysisStream('');
        
        try {
            // 1. 创建后端任务
            const newTask = await createStratifyTask(userInput, selectedScenario);
            const enrichedTask = { ...newTask, context };
            setTask(enrichedTask);

            // 2. 触发第一个阶段（通常是意图分析 00_analyze_input）
            await streamGenerate(
                {
                    prompt_name: '00_analyze_input',
                    variables: { 
                        user_input: userInput,
                        reference_materials: JSON.stringify(context?.vector_snippets || []) 
                    },
                    scenario: selectedScenario,
                    task_id: newTask.id,
                    phase_name: '00_analyze_input'
                },
                (chunk) => setAnalysisStream(prev => prev + chunk),
                () => {
                    setTimeout(() => {
                        setIsAnalyzing(false);
                        setViewState('workflow');
                    }, 1000);
                }
            );
        } catch (e) {
            alert('启动失败');
            setIsAnalyzing(false);
        }
    };

    const handleHistoryLoad = async (taskId: string) => {
        setIsHistoryOpen(false);
        try {
            const detail = await getStratifyTaskDetail(taskId);
            setTask(detail);
            setSelectedScenario(detail.scenario_name);
            setViewState('workflow');
        } catch (e) {
            alert('加载失败');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] relative overflow-hidden font-sans">
            {/* Minimal Header with back button */}
            <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-40 shadow-sm">
                <div className="flex items-center gap-4">
                    {view !== 'picker' && (
                        <button 
                            onClick={() => setViewState(view === 'workflow' ? 'collector' : 'picker')}
                            className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <h1 className="font-black text-slate-800 tracking-tight">AI 报告工坊</h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                    >
                        <ClockIcon className="w-4 h-4" />
                        历史记录
                    </button>
                </div>
            </div>

            {/* Dynamic Viewport */}
            <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
                {view === 'picker' && (
                    <ScenarioPicker 
                        scenarios={scenarios} 
                        onSelect={handleScenarioSelect} 
                    />
                )}

                {view === 'collector' && (
                    <ContextCollector 
                        onStart={handleStartTask} 
                        isProcessing={isAnalyzing}
                    />
                )}

                {view === 'workflow' && task && (
                    <PhaseWorkflow 
                        task={task} 
                        scenario={selectedScenario}
                        onUpdateTask={setTask}
                    />
                )}
            </div>

            <HistoryDrawer 
                isOpen={isHistoryOpen} 
                onClose={() => setIsHistoryOpen(false)} 
                onSelect={handleHistoryLoad} 
            />

            <AnalysisModal 
                isOpen={isAnalyzing} 
                streamContent={analysisStream} 
            />
        </div>
    );
};
