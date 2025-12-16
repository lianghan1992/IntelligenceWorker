
import React, { useState } from 'react';
import { CheckIcon } from '../icons';
import { StratifyTask, StratifyPage, StratifyOutline } from '../../types';
import { createStratifyTask, streamGenerate, parseLlmJson } from '../../api/stratify';
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
    
    // Core Session ID for the "Main" generation process (Outline -> Content)
    // Step 1 (Analysis) uses a disposable session.
    // Step 5 (Layout) uses per-page disposable sessions.
    const [mainSessionId, setMainSessionId] = useState<string | null>(null);
    
    // Modal State for Step 1
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    
    // Step 1: Start -> Open Modal -> Stream -> Process
    const handleStart = async (idea: string) => {
        setIsAnalysisModalOpen(true);
        setAnalysisStream('');
        setAnalysisReasoning(''); // Reset reasoning buffer
        setStep1Thought(null);
        setMainSessionId(null); // Reset main session
        
        let localBuffer = ''; 
        let localReasoningBuffer = '';

        try {
            const newTask = await createStratifyTask(idea);
            setTask(newTask);

            // Stream Analyze (Independent Session - session_id undefined)
            await streamGenerate(
                {
                    prompt_name: '00_analyze_input', // Updated to match backend prompt file name
                    variables: { user_input: idea },
                    scenario: 'default',
                    session_id: undefined // Force independent session for quick analysis
                },
                (chunk) => {
                    localBuffer += chunk;
                    setAnalysisStream(prev => prev + chunk); // Update Modal
                },
                () => {
                    // Delay slightly to let user see "Thinking" effect completion
                    setTimeout(() => {
                        processAnalysisResult(localBuffer, localReasoningBuffer, newTask, idea);
                        setIsAnalysisModalOpen(false);
                    }, 1000); 
                },
                (err) => { alert('分析失败'); setIsAnalysisModalOpen(false); },
                undefined, // We do not capture session ID from analysis
                (chunk) => { // Capture reasoning stream
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
        // Use separate reasoning if available, else fall back to extracted thought
        setStep1Thought(reasoningBuffer || thought);

        const parsed: any = parseLlmJson(jsonPart);
        
        // Use the original input as the 'topic' since the simplified JSON doesn't return data.
        const updatedTask = { ...task, topic: originalInput };
        setTask(updatedTask);

        if (!parsed || !parsed.type) {
            setStep(2);
            return;
        }

        // Logic based on Type (Future extension point for 'outline' or 'content' types input)
        setStep(2);
    };

    const handleOutlineConfirm = (outline: StratifyOutline, sessionId: string | null) => {
        if(task) {
            const updated = { ...task, outline };
            setTask(updated);
            // Capture the session ID established during the Outline phase
            // This session will be passed to Content phase
            if (sessionId) setMainSessionId(sessionId); 
            setStep(4); 
        }
    };

    const handleContentComplete = (pages: StratifyPage[]) => {
         if(task) {
            const updated = { ...task, pages };
            setTask(updated);
            // Move to layout phase
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

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
            <div className="pt-6 pb-2">
                <MinimalStepper currentStep={step} />
            </div>

            <div className="flex-1 relative z-10 overflow-hidden flex flex-col min-h-0 px-4 pb-4">
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
                        // Note: We don't pass precedingThought as "context" anymore because Step 1 session is dropped.
                        // We rely on Step 2 to start a fresh, robust generation session.
                        onConfirm={handleOutlineConfirm}
                    />
                )}

                {step === 4 && task && task.outline && (
                    <ContentWriter 
                        taskId={task.id}
                        outline={task.outline}
                        scenario="default"
                        // Pass the session ID established in Step 2
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
                    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-xl">
                            <CheckIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">报告生成完成</h2>
                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50">
                                返回首页
                            </button>
                             <button className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700">
                                下载 PDF
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
