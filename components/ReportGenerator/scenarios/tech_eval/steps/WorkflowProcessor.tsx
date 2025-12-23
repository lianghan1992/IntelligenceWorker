
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, getScenarios, getScenarioFiles, generatePdf, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    LockClosedIcon, BeakerIcon, ChartIcon, ShieldExclamationIcon, 
    LightBulbIcon, DocumentTextIcon, SparklesIcon, CheckIcon, 
    DownloadIcon, RefreshIcon, CodeIcon, EyeIcon, CloseIcon,
    PlayIcon, StopIcon
} from '../../../../icons';
import { ReasoningModal } from '../../../ui/ReasoningModal';
import { WorkflowState } from '../TechEvalScenario';
import { StratifyScenarioFile, StratifyTask } from '../../../../../types';

// Helper for cleaning HTML
const cleanHtmlContent = (raw: string): string => {
    if (!raw) return '';
    let clean = raw.trim();
    clean = clean.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');
    // Simple robust extraction
    const startIdx = Math.max(clean.indexOf('<!DOCTYPE'), clean.indexOf('<html'));
    const endIdx = clean.lastIndexOf('</html>');
    if (startIdx !== -1 && endIdx !== -1) {
        clean = clean.substring(startIdx, endIdx + 7);
    }
    return clean;
};

// HTML extraction helper
const extractHtmlContent = (fullText: string, jsonPart: string): string | null => {
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html_report: string }>(jsonPart);
            if (parsed && parsed.html_report) return parsed.html_report;
        } catch (e) { }
    }
    const htmlTagMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
    if (htmlTagMatch) return htmlTagMatch[0];
    return null;
};

// Content extraction helper
const extractContent = (text: string, key?: string): string => {
    if (!key) return text;
    try {
        const parsed = parseLlmJson<any>(text);
        if (parsed && parsed[key]) return parsed[key];
    } catch (e) {}
    return text;
};

// Local Types
interface ReportSections {
    p1: string;
    p2: string;
    p3: string;
    p4: string;
}

interface StepData {
    id: number;
    key: string;
    label: string;
    icon: any;
    status: 'pending' | 'running' | 'completed' | 'error';
    reasoning: string;
    content: string;
    isHtml?: boolean;
    model?: string;
}

export const WorkflowProcessor: React.FC<{
    taskId: string;
    scenario: string;
    initialSessionId: string;
    targetTech: string;
    materials: string;
    workflowState: WorkflowState;
    setWorkflowState: (s: WorkflowState) => void;
    onReviewComplete: (markdown: string) => void;
    initialTask?: StratifyTask | null; 
    attachments?: any[]; 
}> = ({ taskId, scenario, initialSessionId, targetTech, materials, workflowState, setWorkflowState, onReviewComplete, initialTask, attachments = [] }) => {
    
    const [currentModel, setCurrentModel] = useState<string>('Initializing...');
    const [scenarioFiles, setScenarioFiles] = useState<StratifyScenarioFile[]>([]);
    const [defaultScenarioModel, setDefaultScenarioModel] = useState<string>('');
    
    const sessionRef = useRef(initialSessionId);
    const configRef = useRef<{ files: StratifyScenarioFile[], defaultModel: string }>({ files: [], defaultModel: '' });

    const [sections, setSections] = useState<ReportSections>({ p1: '', p2: '', p3: '', p4: '' });
    
    const [steps, setSteps] = useState<StepData[]>([
        { id: 1, key: 'init', label: '初始化分析协议', icon: LockClosedIcon, status: 'pending', reasoning: '', content: '' },
        { id: 2, key: 'ingest', label: '知识库注入', icon: BeakerIcon, status: 'pending', reasoning: '', content: '' },
        { id: 3, key: 'p1', label: '分析技术路线', icon: ChartIcon, status: 'pending', reasoning: '', content: '' },
        { id: 4, key: 'p2', label: '识别潜在风险', icon: ShieldExclamationIcon, status: 'pending', reasoning: '', content: '' },
        { id: 5, key: 'p3', label: '构建推荐方案', icon: LightBulbIcon, status: 'pending', reasoning: '', content: '' },
        { id: 6, key: 'p4', label: '溯源引用资料', icon: DocumentTextIcon, status: 'pending', reasoning: '', content: '' },
        { id: 7, key: 'html_gen', label: '生成视觉报告', icon: SparklesIcon, status: 'pending', reasoning: '', content: '', isHtml: true },
    ]);

    const [activeEditSection, setActiveEditSection] = useState<keyof ReportSections | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    const [revisingKey, setRevisingKey] = useState<keyof ReportSections | null>(null);
    const [zoomedHtml, setZoomedHtml] = useState<string | null>(null);
    
    const hasStarted = useRef(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const timelineEndRef = useRef<HTMLDivElement>(null);

    // Helpers
    const updateStep = (id: number, updates: Partial<StepData>) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const ensureScenarioConfig = async () => {
        if (configRef.current.files.length > 0) return;
        try {
            const scenarios = await getScenarios();
            const currentScenario = scenarios.find(s => s.id === scenario || s.name === scenario);
            if (currentScenario) {
                configRef.current.defaultModel = currentScenario.default_model || 'System Default';
                setDefaultScenarioModel(configRef.current.defaultModel);
                
                const files = await getScenarioFiles(currentScenario.id);
                configRef.current.files = files;
                setScenarioFiles(files);
            }
        } catch (e) {
            console.error("Config load failed", e);
        }
    };

    // Main Runner Logic
    const runStep = async (stepIndex: number, promptName: string, vars: any, partKey?: keyof ReportSections, isHtmlStep = false) => {
        const stepId = stepIndex + 1;
        
        let stepModel = configRef.current.defaultModel;
        const fileConfig = configRef.current.files.find(f => f.name.includes(promptName));
        if (fileConfig && fileConfig.model) {
            stepModel = fileConfig.model;
        }
        
        updateStep(stepId, { status: 'running', model: stepModel });
        setCurrentModel(stepModel);

        return new Promise<void>((resolve, reject) => {
            let fullContentBuffer = '';
            let apiReasoningBuffer = ''; 

            streamGenerate(
                { 
                    prompt_name: promptName, 
                    variables: vars, 
                    scenario, 
                    session_id: isHtmlStep ? undefined : sessionRef.current,
                    model_override: stepModel, 
                    task_id: taskId,             
                    phase_name: promptName,
                    attachments: attachments.length > 0 ? attachments : undefined
                },
                (chunk) => {
                    fullContentBuffer += chunk;
                    
                    let displayContent = fullContentBuffer;
                    let extractedDeepSeekThought = '';
                    
                    const thinkStart = fullContentBuffer.indexOf('<think>');
                    const thinkEnd = fullContentBuffer.indexOf('</think>');

                    if (thinkStart !== -1) {
                        if (thinkEnd !== -1) {
                            extractedDeepSeekThought = fullContentBuffer.substring(thinkStart + 7, thinkEnd);
                            displayContent = fullContentBuffer.substring(0, thinkStart) + fullContentBuffer.substring(thinkEnd + 8);
                        } else {
                            extractedDeepSeekThought = fullContentBuffer.substring(thinkStart + 7);
                            displayContent = fullContentBuffer.substring(0, thinkStart); 
                        }
                    }

                    const { thought: contentThought, jsonPart } = extractThoughtAndJson(displayContent);
                    const mergedReasoning = [apiReasoningBuffer, extractedDeepSeekThought, contentThought].filter(Boolean).join('\n');

                    let targetContent = '';
                    if (isHtmlStep) {
                        targetContent = extractHtmlContent(displayContent, jsonPart) || displayContent; 
                    } else {
                        targetContent = extractContent(jsonPart || displayContent, partKey);
                    }

                    setSteps(prev => prev.map(s => {
                        if (s.id === stepId) {
                            return { 
                                ...s, 
                                reasoning: mergedReasoning,
                                content: targetContent || s.content
                            };
                        }
                        return s;
                    }));
                },
                () => {
                    const { thought: contentThought, jsonPart } = extractThoughtAndJson(fullContentBuffer);
                    const extractedDeepSeekThought = fullContentBuffer.includes('<think>') && fullContentBuffer.includes('</think>') 
                        ? fullContentBuffer.substring(fullContentBuffer.indexOf('<think>')+7, fullContentBuffer.indexOf('</think>'))
                        : '';
                    const mergedReasoning = [apiReasoningBuffer, extractedDeepSeekThought, contentThought].filter(Boolean).join('\n');

                    let finalContent = '';
                    if (isHtmlStep) {
                         finalContent = extractHtmlContent(fullContentBuffer, jsonPart) || '';
                         if (!finalContent && fullContentBuffer.length > 0) {
                             finalContent = fullContentBuffer; 
                         }
                    } else {
                         finalContent = extractContent(jsonPart || fullContentBuffer, partKey);
                    }

                    if (partKey === 'p4' && finalContent) {
                        try {
                            const refs = JSON.parse(finalContent);
                            let md = '## 引用资料来源\n\n';
                            Object.entries(refs).forEach(([t, u]) => md += `- [${t}](${u})\n`);
                            finalContent = md;
                        } catch (e) { }
                    }

                    updateStep(stepId, { 
                        status: 'completed', 
                        content: finalContent || 'Completed',
                        reasoning: mergedReasoning
                    });
                    
                    if (partKey && finalContent) setSections(prev => ({ ...prev, [partKey]: finalContent }));
                    resolve();
                },
                (err) => {
                    updateStep(stepId, { status: 'error', content: 'Generation failed.' });
                    resolve(); 
                },
                (sid) => { 
                    if (sid && !isHtmlStep) {
                        sessionRef.current = sid;
                    }
                },
                (reasoningChunk) => {
                    apiReasoningBuffer += reasoningChunk;
                     setSteps(prev => prev.map(s => {
                        if (s.id === stepId) {
                            return { ...s, reasoning: apiReasoningBuffer };
                        }
                        return s;
                    }));
                }
            );
        });
    };

    const runPipeline = async () => {
        try {
            await ensureScenarioConfig();
            await runStep(0, '01_Role_ProtocolSetup', {});
            await runStep(1, '02_DataIngestion', { reference_materials: materials });
            await runStep(2, '03_TriggerGeneration_step1', { target_tech: targetTech }, 'p1');
            await runStep(3, '03_TriggerGeneration_step2', {}, 'p2');
            await runStep(4, '03_TriggerGeneration_step3', {}, 'p3');
            await runStep(5, '03_TriggerGeneration_step4', {}, 'p4');
            
            setWorkflowState('review');
        } catch (e) {
            console.error("Pipeline breakdown", e);
        }
    };

    useEffect(() => {
        if (workflowState === 'processing' && !hasStarted.current) {
            hasStarted.current = true;
            runPipeline();
        }
    }, [workflowState]);
    
    // Auto-scroll logic
    useEffect(() => {
        if (workflowState === 'processing' && timelineEndRef.current) {
            timelineEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [steps]);

    const handleGenerateFinalHtml = async () => {
        setWorkflowState('processing'); 
        const md = `## 技术路线与当前所处阶段分析\n\n${sections.p1}\n\n## 当前技术潜在风险识别与分析\n\n${sections.p2}\n\n## 行业技术方案推荐\n\n${sections.p3}\n\n${sections.p4}`;
        try {
            await ensureScenarioConfig();
            await runStep(6, '04_Markdown2Html', { markdown_report: md }, undefined, true);
            setWorkflowState('done');
            onReviewComplete(md); 
        } catch (e) {
            console.error(e);
        }
    };
    
    const getSectionTitle = (key: string) => { 
        if (key === 'p1') return '技术路线分析';
        if (key === 'p2') return '风险评估';
        if (key === 'p3') return '推荐方案';
        if (key === 'p4') return '参考资料';
        return 'Section';
    };

    const handleManualEdit = (key: keyof ReportSections, value: string) => { setSections(prev => ({ ...prev, [key]: value })); };
    
    const handleReviseSection = (key: keyof ReportSections) => {
        // Revision logic skipped for brevity, assume similar to manual edit for now or triggers re-run
    };

    if (workflowState === 'processing' || workflowState === 'done') {
        return (
            <div ref={mainScrollRef} className="flex-1 w-full h-full overflow-y-auto bg-slate-50 p-6 md:p-16 relative scroll-smooth custom-scrollbar">
                <div className="max-w-3xl mx-auto pb-32">
                     <div className="mb-12 text-center">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-sm border border-indigo-100 animate-pulse">
                            <SparklesIcon className="w-4 h-4" />
                            AI Agent Active
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">深度技术评估执行中</h2>
                        <p className="text-slate-500 mt-2 text-sm">正在调用垂直领域知识库构建分析报告...</p>
                    </div>
                    <div className="relative border-l-2 border-slate-200 ml-6 md:ml-10 space-y-12">
                        {steps.map((step) => {
                             const isRunning = step.status === 'running';
                             const isCompleted = step.status === 'completed';
                             return (
                                <div key={step.id} className="relative pl-8 md:pl-12 transition-all duration-500">
                                    <div className={`relative rounded-2xl border transition-all duration-500 ${isRunning ? 'bg-white border-indigo-200 shadow-xl' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                        <div className="p-4 flex items-center justify-between">
                                             <h3 className="font-bold text-base text-slate-700">{step.label}</h3>
                                        </div>
                                        {(isRunning || (isCompleted && (step.reasoning || step.content))) && (
                                            <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-2">
                                                <ThinkingTerminal content={step.reasoning} isActive={isRunning} />
                                                {step.isHtml ? (
                                                    <ResultCard content={step.content} isRunning={isRunning} isHtml={true} onZoom={() => setZoomedHtml(step.content)} />
                                                ) : (
                                                    !['init', 'ingest'].includes(step.key) && <ResultCard content={step.content} isRunning={isRunning} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                    <div ref={timelineEndRef} className="h-10 w-full" />
                </div>
                {zoomedHtml && <ZoomModal html={zoomedHtml} onClose={() => setZoomedHtml(null)} taskId={taskId} />}
            </div>
        );
    }

    // Review View
    return (
        <div className="flex-1 flex overflow-hidden bg-[#f8fafc]">
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                 <div className="max-w-4xl mx-auto space-y-8 pb-24">
                     {Object.keys(sections).map(key => {
                         const k = key as keyof ReportSections;
                         return (
                            <div key={k} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-lg mb-4">{getSectionTitle(k)}</h3>
                                <textarea 
                                    value={sections[k]}
                                    onChange={e => handleManualEdit(k, e.target.value)}
                                    className="w-full h-40 p-4 border rounded-lg resize-y"
                                />
                            </div>
                         );
                     })}
                 </div>
                 <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                    <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-4">
                         <div className="px-4 text-xs font-medium text-slate-500">满意当前内容？</div>
                         <button 
                            onClick={handleGenerateFinalHtml}
                            disabled={!!revisingKey}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all flex items-center gap-2"
                         >
                             <CheckIcon className="w-4 h-4" /> 生成视觉报告 (HTML)
                         </button>
                    </div>
                </div>
             </div>
        </div>
    );
};

// Sub Components
const ThinkingTerminal: React.FC<{ content: string; isActive: boolean }> = ({ content, isActive }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (scrollRef.current && isActive) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [content, isActive]);
    if (!content) return null;
    return (
        <div className="mb-4 bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-green-400 overflow-hidden border border-slate-800 shadow-inner">
            <div ref={scrollRef} className="max-h-24 overflow-y-auto custom-scrollbar-dark whitespace-pre-wrap break-all">
                {content}
                {isActive && <span className="inline-block w-1.5 h-3 bg-green-500 ml-1 animate-pulse align-middle"></span>}
            </div>
        </div>
    );
};

const ResultCard: React.FC<{ content: string; isRunning: boolean; isHtml?: boolean; onZoom?: () => void }> = ({ content, isRunning, isHtml, onZoom }) => {
    if (!content) return null;
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm text-slate-600 shadow-sm relative group overflow-hidden">
            {isHtml ? (
                <div className="relative aspect-video bg-gray-100 rounded border border-gray-200 overflow-hidden cursor-pointer" onClick={onZoom}>
                    <iframe srcDoc={content} className="w-full h-full border-none pointer-events-none" title="Preview" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">点击放大</span>
                    </div>
                </div>
            ) : (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">{content}</div>
            )}
            {isRunning && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 animate-pulse"></div>}
        </div>
    );
};

const ZoomModal: React.FC<{ html: string; onClose: () => void; taskId: string }> = ({ html, onClose, taskId }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="relative w-full max-w-6xl aspect-video bg-white rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <iframe srcDoc={html} className="w-full h-full border-none" title="Zoom Preview" />
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><CloseIcon className="w-6 h-6"/></button>
            </div>
        </div>
    );
};
