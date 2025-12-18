
import React, { useState, useEffect } from 'react';
import { StratifyTask, Scenario } from '../../types';
import { createStratifyTask, getScenarios, getStratifyTaskDetail, streamGenerate } from '../../api/stratify';
import { SCENARIO_REGISTRY, isScenarioSupported } from './scenarios/registry';

// Shared UI Components
import { HistoryDrawer } from './shared/HistoryDrawer';
import { AnalysisModal } from './shared/AnalysisModal';
import { ContextCollector } from './shared/ContextCollector';
import { ScenarioPicker } from './shared/ScenarioPicker';
import { ClockIcon, SparklesIcon, ChevronLeftIcon, CheckIcon, DownloadIcon } from '../icons';

export const ReportGenerator: React.FC = () => {
    const [view, setViewState] = useState<'picker' | 'collector' | 'workflow' | 'done'>('picker');
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<string>('default');
    
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStream, setAnalysisStream] = useState('');

    // 每次组件挂载或返回选择器时获取最新场景
    useEffect(() => {
        if (view === 'picker') {
            getScenarios().then(setScenarios).catch(console.error);
        }
    }, [view]);

    const handleScenarioSelect = (name: string) => {
        if (!isScenarioSupported(name)) return;
        setSelectedScenario(name);
        setViewState('collector');
    };

    const handleStartTask = async (userInput: string, context: StratifyTask['context']) => {
        setIsAnalyzing(true);
        setAnalysisStream('');
        try {
            const newTask = await createStratifyTask(userInput, selectedScenario);
            setTask({ ...newTask, context });

            await streamGenerate(
                {
                    prompt_name: '00_analyze_input',
                    variables: { user_input: userInput },
                    scenario: selectedScenario,
                    task_id: newTask.id,
                    phase_name: '00_analyze_input'
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
            setSelectedScenario(detail.scenario_name);
            setViewState('workflow');
        } catch (e) {
            alert('加载失败');
        }
    };

    const renderScenarioWorkflow = () => {
        if (!task) return null;
        const ScenarioComponent = SCENARIO_REGISTRY[selectedScenario];
        if (!ScenarioComponent) return <div className="p-20 text-center">未找到场景组件实现</div>;

        return (
            <ScenarioComponent 
                taskId={task.id}
                topic={task.input_text}
                scenario={selectedScenario}
                sessionId={task.session_id}
                context={task.context}
                onComplete={() => setViewState('done')}
            />
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] relative overflow-hidden font-sans">
            {/* 顶层工具栏：仅在非工作流状态下显示历史任务，或在工作流中显示返回 */}
            <div className="absolute top-6 right-8 z-50 flex items-center gap-3">
                {view !== 'picker' && view !== 'done' && (
                    <button 
                        onClick={() => setViewState(view === 'workflow' ? 'collector' : 'picker')}
                        className="p-2 bg-white/80 backdrop-blur border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl shadow-sm transition-all"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                )}
                {view === 'picker' && (
                    <button 
                        onClick={() => setIsHistoryOpen(true)} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur text-slate-600 rounded-2xl text-sm font-bold border border-slate-200 shadow-sm hover:bg-white hover:text-indigo-600 transition-all active:scale-95"
                    >
                        <ClockIcon className="w-4 h-4 text-slate-400" /> 历史任务
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
                {view === 'picker' && <ScenarioPicker scenarios={scenarios} onSelect={handleScenarioSelect} />}
                {view === 'collector' && <ContextCollector onStart={handleStartTask} isProcessing={isAnalyzing} />}
                {view === 'workflow' && renderScenarioWorkflow()}
                {view === 'done' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-xl shadow-green-100">
                            <CheckIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">报告已就绪</h2>
                        <p className="text-slate-500 mb-8 max-w-md font-medium">您的专家级报告已生成，排版符合行业交付标准。</p>
                        <div className="flex gap-4">
                            <button className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5" /> 导出 PDF
                            </button>
                            <button onClick={() => setViewState('picker')} className="px-10 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all">返回起点</button>
                        </div>
                    </div>
                )}
            </div>

            <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelect={handleHistoryLoad} />
            <AnalysisModal isOpen={isAnalyzing} streamContent={analysisStream} />
        </div>
    );
};
