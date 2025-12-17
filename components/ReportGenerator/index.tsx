
import React, { useState } from 'react';
import { CheckIcon, DownloadIcon, ArrowRightIcon } from '../icons';
import { StratifyTask, StratifyPage, StratifyOutline } from '../../types';
import { createStratifyTask, streamGenerate, parseLlmJson, generatePdf } from '../../api/stratify';
import { extractThoughtAndJson } from './utils';

// Import newly refactored components
import { MarkdownStyles } from './ui/MarkdownStyles';
import { MinimalStepper } from './ui/MinimalStepper';
import { AnalysisModal } from './ui/AnalysisModal';
import { IdeaInput } from './steps/IdeaInput';
import { OutlineGenerator } from './steps/OutlineGenerator';
import { ContentWriter } from './steps/ContentWriter';
import { LayoutGenerator } from './steps/LayoutGenerator';

export const ReportGenerator: React.FC = () => {
    const [step, setStep] = useState(1);
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [analysisStream, setAnalysisStream] = useState('');
    const [analysisReasoning, setAnalysisReasoning] = useState(''); // Separate reasoning state
    const [step1Thought, setStep1Thought] = useState<string | null>(null);
    
    const [mainSessionId, setMainSessionId] = useState<string | null>(null);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    
    // PDF Generation State
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Step 1: Start -> Open Modal -> Stream -> Process
    const handleStart = async (idea: string) => {
        setIsAnalysisModalOpen(true);
        setAnalysisStream('');
        setAnalysisReasoning(''); 
        setStep1Thought(null);
        setMainSessionId(null); 
        
        let localBuffer = ''; 
        let localReasoningBuffer = '';

        try {
            const newTask = await createStratifyTask(idea);
            setTask(newTask);

            await streamGenerate(
                {
                    prompt_name: '00_analyze_input', 
                    variables: { user_input: idea },
                    scenario: 'default',
                    session_id: undefined 
                },
                (chunk) => {
                    localBuffer += chunk;
                    setAnalysisStream(prev => prev + chunk); 
                },
                () => {
                    setTimeout(() => {
                        processAnalysisResult(localBuffer, localReasoningBuffer, newTask, idea);
                        setIsAnalysisModalOpen(false);
                    }, 1000); 
                },
                (err) => { alert('分析失败'); setIsAnalysisModalOpen(false); },
                undefined, 
                (chunk) => { 
                    localReasoningBuffer += chunk;
                    setAnalysisReasoning(prev => prev + chunk);
                }
            );
        } catch (e) {
            alert('启动失败');
            setIsAnalysisModalOpen(false);
        }
    };

    const processAnalysisResult = (buffer: string, reasoningBuffer: string, task: StratifyTask, originalInput: string) => {
        const { thought, jsonPart } = extractThoughtAndJson(buffer);
        setStep1Thought(reasoningBuffer || thought);

        const parsed: any = parseLlmJson(jsonPart);
        
        const updatedTask = { ...task, topic: originalInput };
        setTask(updatedTask);

        if (!parsed || !parsed.type) {
            setStep(2);
            return;
        }
        setStep(2);
    };

    const handleOutlineConfirm = (outline: StratifyOutline, sessionId: string | null) => {
        if(task) {
            const updated = { ...task, outline };
            setTask(updated);
            if (sessionId) setMainSessionId(sessionId); 
            setStep(4); 
        }
    };

    const handleContentComplete = (pages: StratifyPage[]) => {
         if(task) {
            const updated = { ...task, pages };
            setTask(updated);
            setStep(5); 
        }
    };

    const handleLayoutComplete = (pages: StratifyPage[]) => {
        if(task) {
           const updated = { ...task, pages };
           setTask(updated);
           setStep(6); 
       }
   };

   // --- PDF Generation Logic ---
   const handleDownloadPdf = async () => {
        if (!task || !task.pages || task.pages.length === 0) return;
        
        setIsGeneratingPdf(true);
        try {
            // Concatenate all HTML pages into one big HTML string for printing
            // We wrap them in a basic structure to ensure styles apply if needed, though usually styles are inline or CDN
            let fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${task.topic}</title></head><body style="margin:0; padding:0;">`;
            
            task.pages.forEach(page => {
                if (page.html_content) {
                    // Extract body content if possible, or just append the whole thing if it's cleaner
                    // For robustness, let's just stack them. The backend PDF generator (e.g. wkhtmltopdf/puppeteer)
                    // usually handles stacked HTML well.
                    // However, to avoid multiple <html> tags, we should ideally strip them.
                    // For simplicity in this demo, let's append the raw HTML content. 
                    // A better approach is to ask the backend to merge, but here we do it client side string concat.
                    fullHtml += `<div style="page-break-after: always;">${page.html_content}</div>`;
                }
            });
            fullHtml += '</body></html>';

            const blob = await generatePdf(fullHtml, `${task.topic}.pdf`);
            
            // Trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.topic}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (e: any) {
            console.error(e);
            alert('PDF 生成失败: ' + (e.message || '未知错误'));
        } finally {
            setIsGeneratingPdf(false);
        }
   };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden font-sans">
            <div className="sticky top-0 z-50">
                <MinimalStepper currentStep={step} />
            </div>

            <div className="flex-1 relative z-10 overflow-hidden flex flex-col min-h-0">
                {step === 1 && (
                    <IdeaInput 
                        onStart={handleStart} 
                        isLoading={isAnalysisModalOpen}
                    />
                )}

                {step === 2 && task && (
                    <OutlineGenerator 
                        taskId={task.id}
                        topic={task.topic}
                        scenario="default"
                        onConfirm={handleOutlineConfirm}
                    />
                )}

                {step === 4 && task && task.outline && (
                    <ContentWriter 
                        taskId={task.id}
                        outline={task.outline}
                        scenario="default"
                        initialSessionId={mainSessionId}
                        onComplete={handleContentComplete}
                    />
                )}

                {step === 5 && task && task.pages && (
                    <LayoutGenerator 
                        taskId={task.id}
                        pages={task.pages}
                        scenario="default"
                        onComplete={handleLayoutComplete}
                    />
                )}

                {step === 6 && (
                    <div className="flex flex-col items-center justify-center h-full gap-8 animate-in zoom-in-95 duration-500 p-4">
                        <div className="relative">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-2xl relative z-10">
                                <CheckIcon className="w-12 h-12" />
                            </div>
                            <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                        </div>
                        
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">报告生成完成</h2>
                            <p className="text-slate-500 font-medium">您的专业报告已准备就绪，随时可以导出。</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                             <button 
                                onClick={handleDownloadPdf}
                                disabled={isGeneratingPdf}
                                className="flex-1 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                {isGeneratingPdf ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <DownloadIcon className="w-5 h-5" />
                                )}
                                <span>{isGeneratingPdf ? '正在生成 PDF...' : '下载 PDF 报告'}</span>
                            </button>
                            <button 
                                onClick={() => setStep(1)} 
                                className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                返回首页
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <MarkdownStyles />

            {/* Global Modal for Step 1 Analysis */}
            <AnalysisModal 
                isOpen={isAnalysisModalOpen} 
                streamContent={analysisStream} 
                reasoningContent={analysisReasoning}
            />
        </div>
    );
};
