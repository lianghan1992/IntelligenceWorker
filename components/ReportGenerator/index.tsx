
import React, { useState, useEffect } from 'react';
import { StratifyTask, Scenario } from '../../types';
import { createStratifyTask, getScenarios, getStratifyTaskDetail, streamGenerate } from '../../api/stratify';
import { SCENARIO_REGISTRY, isScenarioSupported } from './scenarios/registry';

// Shared UI Components
import { HistoryDrawer } from './shared/HistoryDrawer';
import { AnalysisModal } from './shared/AnalysisModal';
import { ContextCollector } from './shared/ContextCollector';
import { ScenarioPicker } from './shared/ScenarioPicker';
import { ClockIcon, ChevronLeftIcon, CheckIcon, DownloadIcon } from '../icons';

export const ReportGenerator: React.FC = () => {
    const [view, setViewState] = useState<'picker' | 'collector' | 'workflow' | 'done'>('picker');
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<string>('default');
    
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStream, setAnalysisStream] = useState('');

    // 每次进入 picker 视图时，重新拉取最新的场景配置
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
        if (!ScenarioComponent) return <div className="p-20 text-center">未找到场景实现</div>;

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
        <div className="h-full flex flex-col bg-[#080808] relative overflow-hidden font-sans text-white">
            {/* 噪点质感层 */}
            <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* 顶层浮动工具栏 */}
            <div className="absolute top-8 right-8 z-[60] flex items-center gap-3">
                {view !== 'picker' && view !== 'done' && (
                    <button 
                        onClick={() => setViewState(view === 'workflow' ? 'collector' : 'picker')}
                        className="p-2.5 bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 rounded-2xl shadow-sm transition-all"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                )}
                {view === 'picker' && (
                    <button 
                        onClick={() => setIsHistoryOpen(true)} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-full text-sm font-bold border border-white/10 shadow-sm hover:bg-white/20 transition-all active:scale-95"
                    >
                        <ClockIcon className="w-4 h-4 opacity-70" /> 历史任务
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col z-10">
                {view === 'picker' && <ScenarioPicker scenarios={scenarios} onSelect={handleScenarioSelect} />}
                {view === 'collector' && <ContextCollector onStart={handleStartTask} isProcessing={isAnalyzing} />}
                {view === 'workflow' && renderScenarioWorkflow()}
                {view === 'done' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mb-6 shadow-xl shadow-green-500/10">
                            <CheckIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">报告已就绪</h2>
                        <p className="text-slate-400 mb-8 max-w-md font-medium">您的专家级报告已生成，您可以进行预览或下载。</p>
                        <div className="flex gap-4">
                            <button className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5" /> 导出 PDF
                            </button>
                            <button onClick={() => setViewState('picker')} className="px-10 py-4 bg-white/10 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all">返回首页</button>
                        </div>
                    </div>
                )}
            </div>

            <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelect={handleHistoryLoad} />
            <AnalysisModal isOpen={isAnalyzing} streamContent={analysisStream} />
        </div>
    );
};
