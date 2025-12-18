
import React, { useState, useEffect, useCallback } from 'react';
import { StratifyTask, StratifyPage, StratifyOutline, Scenario } from '../../types';
import { 
    createStratifyTask, 
    streamGenerate, 
    getScenarios, 
    getStratifyTasks,
    getStratifyTaskDetail,
    generatePdf 
} from '../../api/stratify';
import { extractThoughtAndJson } from './utils';

// UI Components
import { MarkdownStyles } from './ui/MarkdownStyles';
import { MinimalStepper } from './ui/MinimalStepper';
import { AnalysisModal } from './ui/AnalysisModal';
import { IdeaInput } from './steps/IdeaInput';
import { OutlineGenerator } from './steps/OutlineGenerator';
import { ContentWriter } from './steps/ContentWriter';
import { LayoutGenerator } from './steps/LayoutGenerator';
import { HistoryDrawer } from './ui/HistoryDrawer';
import { CheckIcon, DownloadIcon, ClockIcon } from '../icons';

export const ReportGenerator: React.FC = () => {
    const [step, setStep] = useState(1);
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState('default');
    
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [analysisStream, setAnalysisStream] = useState('');
    const [analysisReasoning, setAnalysisReasoning] = useState('');
    
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Initial Load
    useEffect(() => {
        getScenarios().then(setScenarios).catch(console.error);
    }, []);

    const handleStart = async (idea: string, attachments?: string[]) => {
        setIsAnalysisModalOpen(true);
        setAnalysisStream('');
        setAnalysisReasoning('');
        
        try {
            const newTask = await createStratifyTask(idea, selectedScenario);
            setTask(newTask);

            // Trigger Phase 0: Intent Analysis
            await streamGenerate(
                {
                    prompt_name: '00_analyze_input',
                    variables: { user_input: idea },
                    scenario: selectedScenario,
                    task_id: newTask.id,
                    phase_name: '00_analyze_input'
                },
                (chunk) => setAnalysisStream(prev => prev + chunk),
                () => {
                    setTimeout(() => {
                        setIsAnalysisModalOpen(false);
                        setStep(2); // Move to Outline
                    }, 1500);
                },
                () => setIsAnalysisModalOpen(false),
                undefined,
                (chunk) => setAnalysisReasoning(prev => prev + chunk)
            );
        } catch (e) {
            alert('初始化失败');
            setIsAnalysisModalOpen(false);
        }
    };

    const handleHistorySelect = async (taskId: string) => {
        setIsHistoryOpen(false);
        try {
            const detail = await getStratifyTaskDetail(taskId);
            setTask(detail);
            // Logic to determine step based on detail.result.phases
            if (detail.status === 'completed') setStep(6);
            else if (detail.result?.phases?.['01_generate_outline']?.status === 'completed') setStep(4);
            else setStep(2);
        } catch (e) {
            alert('加载历史任务失败');
        }
    };

    const handleDownloadPdf = async () => {
        if (!task?.pages) return;
        setIsGeneratingPdf(true);
        try {
            const fullHtml = task.pages.map(p => p.html_content).join('<div style="page-break-after:always;"></div>');
            const blob = await generatePdf(fullHtml, `${task.topic}.pdf`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.topic || 'report'}.pdf`;
            a.click();
        } catch (e) {
            alert('PDF 生成失败');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden font-sans">
            <MinimalStepper currentStep={step} />
            
            {/* History Toggle */}
            <button 
                onClick={() => setIsHistoryOpen(true)}
                className="fixed bottom-6 left-6 z-40 p-3 bg-white border border-slate-200 rounded-full shadow-lg text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all"
                title="查看历史任务"
            >
                <ClockIcon className="w-6 h-6" />
            </button>

            <div className="flex-1 relative z-10 overflow-hidden flex flex-col min-h-0">
                {step === 1 && (
                    <IdeaInput 
                        scenarios={scenarios}
                        selectedScenario={selectedScenario}
                        onScenarioChange={setSelectedScenario}
                        onStart={handleStart} 
                        isLoading={isAnalysisModalOpen}
                    />
                )}

                {step === 2 && task && (
                    <OutlineGenerator 
                        taskId={task.id}
                        topic={task.input_text}
                        scenario={selectedScenario}
                        onConfirm={(outline, sid) => {
                            setTask({ ...task, outline, session_id: sid || task.session_id });
                            setStep(4);
                        }}
                    />
                )}

                {step === 4 && task && task.outline && (
                    <ContentWriter 
                        taskId={task.id}
                        outline={task.outline}
                        scenario={selectedScenario}
                        initialSessionId={task.session_id}
                        onComplete={(pages) => {
                            setTask({ ...task, pages });
                            setStep(5);
                        }}
                    />
                )}

                {step === 5 && task && task.pages && (
                    <LayoutGenerator 
                        taskId={task.id}
                        pages={task.pages}
                        scenario={selectedScenario}
                        onComplete={(pages) => {
                            setTask({ ...task, pages });
                            setStep(6);
                        }}
                    />
                )}

                {step === 6 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                            <CheckIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">报告已就绪</h2>
                        <p className="text-slate-500 mb-8 max-w-md">基于您的意图和场景模板，AI 已经完成了全案设计。</p>
                        <div className="flex gap-4">
                            <button 
                                onClick={handleDownloadPdf}
                                disabled={isGeneratingPdf}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                {isGeneratingPdf ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <DownloadIcon className="w-5 h-5" />}
                                导出 PDF
                            </button>
                            <button onClick={() => setStep(1)} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">返回起点</button>
                        </div>
                    </div>
                )}
            </div>
            
            <HistoryDrawer 
                isOpen={isHistoryOpen} 
                onClose={() => setIsHistoryOpen(false)} 
                onSelect={handleHistorySelect} 
            />
            
            <AnalysisModal 
                isOpen={isAnalysisModalOpen} 
                streamContent={analysisStream} 
                reasoningContent={analysisReasoning}
            />
            
            <MarkdownStyles />
        </div>
    );
};
