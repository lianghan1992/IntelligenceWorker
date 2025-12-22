
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, getScenarios, getScenarioFiles, generatePdf, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    BrainIcon, CheckIcon, SparklesIcon, 
    LockClosedIcon, BeakerIcon, 
    ShieldExclamationIcon, LightBulbIcon, DocumentTextIcon,
    ChartIcon, RefreshIcon,
    LightningBoltIcon,
    EyeIcon,
    DownloadIcon,
    CloseIcon
} from '../../../../icons';
import { WorkflowState } from '../TechEvalScenario';
import { StratifyScenarioFile, StratifyTask } from '../../../../../types';

// --- Types ---

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
    icon: React.FC<any>;
    status: 'pending' | 'running' | 'completed' | 'error';
    reasoning: string;
    content: string;
    model?: string;
    isHtml?: boolean; // Flag to identify HTML step
}

const formatModelName = (model: string) => {
    if (!model) return 'Auto';
    let name = model.includes('@') ? model.split('@')[1] : model;
    if (name.includes('/')) {
        name = name.split('/')[1];
    }
    name = name.replace(':free', '').replace(':beta', '');
    return name;
};

// --- Sub-Components ---

// 1. 思考终端组件
const ThinkingTerminal: React.FC<{ content: string; isActive: boolean }> = ({ content, isActive }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [userHasScrolled, setUserHasScrolled] = useState(false);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight <= 20;
        setUserHasScrolled(!isAtBottom);
    };

    useEffect(() => {
        if (isActive && !userHasScrolled && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isActive, userHasScrolled]);

    if (!content) return null;

    return (
        <div className="mt-4 rounded-xl overflow-hidden bg-[#1e1e1e] border border-slate-800 shadow-inner relative group animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-black/20">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="ml-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <BrainIcon className="w-3 h-3" />
                        Neural_Chain_of_Thought
                    </span>
                </div>
                {isActive && <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>}
            </div>
            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar-dark font-mono text-xs leading-relaxed text-slate-300"
            >
                <div className="whitespace-pre-wrap break-words">
                    {content}
                    {isActive && (
                        <span className="inline-block w-2 h-4 bg-green-500 ml-1 align-middle animate-pulse"></span>
                    )}
                </div>
            </div>
            <div className="absolute top-[36px] left-0 right-0 h-4 bg-gradient-to-b from-[#1e1e1e] to-transparent pointer-events-none"></div>
        </div>
    );
};

// 2. 结果预览卡片 (Text & HTML Thumbnail)
const ResultCard: React.FC<{ 
    content: string; 
    isRunning?: boolean; 
    isHtml?: boolean; 
    onZoom?: () => void; 
}> = ({ content, isRunning, isHtml, onZoom }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isRunning && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isRunning]);

    if (!content) return null;

    if (isHtml) {
        return (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group relative">
                {/* Thumbnail Container */}
                <div className="w-full aspect-video bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative cursor-pointer hover:shadow-lg transition-all hover:border-indigo-300" onClick={onZoom}>
                    <div className="w-[1280px] h-[720px] origin-top-left transform scale-[0.25] sm:scale-[0.35] md:scale-[0.45] pointer-events-none select-none bg-white">
                         <iframe 
                            srcDoc={content}
                            className="w-full h-full border-none"
                            title="HTML Thumbnail"
                            sandbox="allow-scripts"
                         />
                    </div>
                    {/* Overlay Hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white/90 backdrop-blur text-slate-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <EyeIcon className="w-4 h-4" /> 点击全屏预览
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-center flex justify-between items-center px-1">
                     <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">HTML Report (A4)</span>
                     {isRunning && <span className="text-[10px] text-indigo-500 animate-pulse">Rendering...</span>}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-50">
                <DocumentTextIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Generated Output</span>
            </div>
            <div 
                ref={scrollRef}
                className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar p-1 scroll-smooth"
            >
                {content}
                {isRunning && <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 align-middle animate-pulse"></span>}
            </div>
            <div className="mt-2 text-center">
                 <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">Markdown Preview</span>
            </div>
        </div>
    );
};

// 3. Fullscreen Zoom Modal (A4 Paper Style)
const ZoomModal: React.FC<{ html: string; onClose: () => void; taskId: string }> = ({ html, onClose, taskId }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const blob = await generatePdf(html, `TECH_REPORT_${taskId.slice(0,8)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `技术评估报告_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch(e) {
            alert('下载失败');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Modal Container */}
            <div className="relative w-full max-w-5xl h-[85vh] bg-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10 ring-1 ring-black/20 z-10 animate-in zoom-in-95 duration-300">
                
                {/* Toolbar */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-slate-800 font-bold text-sm">生成报告预览</h3>
                            <p className="text-[10px] text-slate-400 font-medium">A4 打印布局</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95"
                        >
                            {isDownloading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                            导出 PDF
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
                            title="关闭"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content Area (Paper Viewer) */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-6 md:p-10 custom-scrollbar flex justify-center">
                    {/* Simulated A4 Paper */}
                    <div className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] transition-shadow duration-300">
                         <iframe 
                            srcDoc={html} 
                            className="w-full h-full min-h-[calc(85vh-140px)] border-none bg-white"
                            title="Full Report"
                            sandbox="allow-scripts allow-same-origin"
                         />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Processor ---

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
}> = ({ taskId, scenario, initialSessionId, targetTech, materials, workflowState, setWorkflowState, onReviewComplete, initialTask }) => {
    
    // --- State ---
    const [currentModel, setCurrentModel] = useState<string>('Initializing...');
    const [scenarioFiles, setScenarioFiles] = useState<StratifyScenarioFile[]>([]);
    const [defaultScenarioModel, setDefaultScenarioModel] = useState<string>('');
    
    // Refs to maintain state across closures in async functions
    const sessionRef = useRef(initialSessionId);
    const configRef = useRef<{ files: StratifyScenarioFile[], defaultModel: string }>({ files: [], defaultModel: '' });

    // Data Store
    const [sections, setSections] = useState<ReportSections>({ p1: '', p2: '', p3: '', p4: '' });
    
    // UI State - Updated with Step 7 (HTML Gen)
    const [steps, setSteps] = useState<StepData[]>([
        { id: 1, key: 'init', label: '初始化分析协议', icon: LockClosedIcon, status: 'pending', reasoning: '', content: '' },
        { id: 2, key: 'ingest', label: '知识库注入', icon: BeakerIcon, status: 'pending', reasoning: '', content: '' },
        { id: 3, key: 'p1', label: '分析技术路线', icon: ChartIcon, status: 'pending', reasoning: '', content: '' },
        { id: 4, key: 'p2', label: '识别潜在风险', icon: ShieldExclamationIcon, status: 'pending', reasoning: '', content: '' },
        { id: 5, key: 'p3', label: '构建推荐方案', icon: LightBulbIcon, status: 'pending', reasoning: '', content: '' },
        { id: 6, key: 'p4', label: '溯源引用资料', icon: DocumentTextIcon, status: 'pending', reasoning: '', content: '' },
        { id: 7, key: 'html_gen', label: '生成视觉报告', icon: SparklesIcon, status: 'pending', reasoning: '', content: '', isHtml: true },
    ]);

    // Review Logic
    const [activeEditSection, setActiveEditSection] = useState<keyof ReportSections | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    const [revisingKey, setRevisingKey] = useState<keyof ReportSections | null>(null);
    
    const [zoomedHtml, setZoomedHtml] = useState<string | null>(null);
    
    const hasStarted = useRef(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const timelineEndRef = useRef<HTMLDivElement>(null);

    // Update session ref when initial prop changes
    useEffect(() => {
        if (initialSessionId) sessionRef.current = initialSessionId;
    }, [initialSessionId]);

    // 智能页面滚动
    useEffect(() => {
        if (workflowState === 'processing' && timelineEndRef.current) {
             timelineEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [steps.map(s => s.status).join(',')]);

    // Fetch scenario details helper
    const ensureScenarioConfig = async () => {
        if (configRef.current.files.length > 0) return;
        try {
            const scenarios = await getScenarios();
            const current = scenarios.find(s => s.id === scenario || s.name === scenario);
            if (current) {
                const defModel = current.default_model || 'System Default';
                setDefaultScenarioModel(defModel);
                setCurrentModel(defModel);
                const files = await getScenarioFiles(current.id);
                setScenarioFiles(files);
                configRef.current = { files: files, defaultModel: defModel };
            }
        } catch (err) { console.warn("Failed to fetch scenario details", err); }
    };

    useEffect(() => { ensureScenarioConfig(); }, [scenario]);

    // --- State Restoration Logic ---
    useEffect(() => {
        if (initialTask && initialTask.result?.phases) {
            const phases = initialTask.result.phases;
            const newSteps = [...steps];
            const newSections = { ...sections };

            const restoreStep = (stepIdx: number, phaseKey: string, sectionKey: keyof ReportSections | null, isHtml = false) => {
                const phase = phases[phaseKey];
                if (phase && phase.status === 'completed' && phase.content) {
                    let content = phase.content;
                    
                    if (isHtml) {
                         // HTML Restoration
                         try {
                            const parsed = JSON.parse(content);
                            if (parsed.html_report) content = parsed.html_report;
                         } catch (e) { /* use raw content if parse fails, likely raw html */ }
                    } else {
                        // Markdown Restoration
                        try {
                            const parsed = JSON.parse(content);
                            const val = Object.values(parsed)[0] as string;
                            if (val) content = val;
                        } catch(e) {
                            if (sectionKey) {
                                 const extracted = extractContent(content, sectionKey);
                                 if (extracted) content = extracted;
                            }
                        }
                    }

                    newSteps[stepIdx] = { ...newSteps[stepIdx], status: 'completed', content: content };
                    if (sectionKey) newSections[sectionKey] = content;
                }
            };

            if (Object.keys(phases).length > 0) {
                newSteps[0].status = 'completed'; 
                newSteps[1].status = 'completed'; 
            }

            restoreStep(2, '03_TriggerGeneration_step1', 'p1');
            restoreStep(3, '03_TriggerGeneration_step2', 'p2');
            restoreStep(4, '03_TriggerGeneration_step3', 'p3');
            restoreStep(5, '03_TriggerGeneration_step4', 'p4');
            restoreStep(6, '04_Markdown2Html', null, true); // Restore HTML Step

            setSteps(newSteps);
            setSections(newSections);
            hasStarted.current = true;
        }
    }, [initialTask]);
    
    // --- Logic: Pipeline Execution ---
    
    const updateStep = (id: number, updates: Partial<StepData>) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const extractContent = (text: string, partKey?: keyof ReportSections): string => {
        if (!partKey) return '';
        const regexMap: Record<string, RegExp> = {
            p1: /"第一部分_技术路线与当前所处阶段分析"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s,
            p2: /"第二部分_当前技术潜在风险识别与分析"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s,
            p3: /"第三部分_行业技术方案推荐"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s,
            p4: /{(?<content>.*)}/s 
        };
        if (partKey === 'p4') {
             const lastBrace = text.lastIndexOf('}');
             const firstBrace = text.indexOf('{');
             if (lastBrace > firstBrace && firstBrace > -1) {
                 return text.substring(firstBrace, lastBrace + 1);
             }
             return '';
        }
        const match = text.match(regexMap[partKey]);
        if (match && match.groups?.content) {
            return match.groups.content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
        }
        return '';
    };

    // Helper for HTML Extraction
    const extractHtmlContent = (text: string, jsonPart: string): string | null => {
        // 1. Try JSON
        if (jsonPart) {
            try {
                const parsed = parseLlmJson<{ html_report: string }>(jsonPart);
                if (parsed && parsed.html_report) return parsed.html_report;
            } catch (e) { }
        }
        // 2. Regex for JSON property
        const keyMatch = text.match(/"html_report"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
        if (keyMatch && keyMatch.groups?.content) {
             try { return JSON.parse(`"${keyMatch.groups.content}"`); } 
             catch(e) { return keyMatch.groups.content.replace(/\\n/g, '\n').replace(/\\"/g, '"'); }
        }
        // 3. Regex for code block
        const codeBlockMatch = text.match(/```html\s*([\s\S]*?)```/i);
        if (codeBlockMatch) return codeBlockMatch[1];
        // 4. Raw HTML fallback
        const htmlTagMatch = text.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
        if (htmlTagMatch) return htmlTagMatch[0];
        return null;
    };

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
                    session_id: isHtmlStep ? undefined : sessionRef.current, // HTML step often stateless or new session
                    model_override: stepModel, 
                    task_id: taskId,             
                    phase_name: promptName       
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

                    // Extract content based on step type
                    let targetContent = '';
                    if (isHtmlStep) {
                        targetContent = extractHtmlContent(displayContent, jsonPart) || displayContent; // Fallback to raw if extract fails mid-stream
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
                    // Final Processing
                    const { thought: contentThought, jsonPart } = extractThoughtAndJson(fullContentBuffer);
                    const extractedDeepSeekThought = fullContentBuffer.includes('<think>') && fullContentBuffer.includes('</think>') 
                        ? fullContentBuffer.substring(fullContentBuffer.indexOf('<think>')+7, fullContentBuffer.indexOf('</think>'))
                        : '';
                    const mergedReasoning = [apiReasoningBuffer, extractedDeepSeekThought, contentThought].filter(Boolean).join('\n');

                    let finalContent = '';
                    if (isHtmlStep) {
                         finalContent = extractHtmlContent(fullContentBuffer, jsonPart) || '';
                         // Error handling for HTML
                         if (!finalContent && fullContentBuffer.length > 0) {
                             // Try to use full buffer if regex failed but we have data
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
            
            // Switch to review mode before final generation
            setWorkflowState('review');
        } catch (e) {
            console.error("Pipeline breakdown", e);
        }
    };

    useEffect(() => {
        // Auto-start if in processing state and not started
        if (workflowState === 'processing' && !hasStarted.current) {
            hasStarted.current = true;
            runPipeline();
        }
    }, [workflowState]);

    const handleGenerateFinalHtml = async () => {
        setWorkflowState('processing'); // Go back to processing/timeline view
        
        // Construct full markdown
        const md = `## 技术路线与当前所处阶段分析\n\n${sections.p1}\n\n## 当前技术潜在风险识别与分析\n\n${sections.p2}\n\n## 行业技术方案推荐\n\n${sections.p3}\n\n${sections.p4}`;
        
        // Trigger Step 7
        try {
            await ensureScenarioConfig();
            await runStep(6, '04_Markdown2Html', { markdown_report: md }, undefined, true);
            setWorkflowState('done');
            onReviewComplete(md); // Notify parent done
        } catch (e) {
            console.error(e);
        }
    };

    // === NEW HELPER FUNCTIONS ===

    const getSectionTitle = (key: string) => {
        const map: Record<string, string> = {
            p1: '技术路线与当前所处阶段分析',
            p2: '当前技术潜在风险识别与分析',
            p3: '行业技术方案推荐',
            p4: '引用资料来源'
        };
        return map[key] || key;
    };

    const handleManualEdit = (key: keyof ReportSections, value: string) => {
        setSections(prev => ({ ...prev, [key]: value }));
    };

    const handleReviseSection = (key: keyof ReportSections) => {
        if (!revisionInput.trim()) return;
        setRevisingKey(key);
        
        let buffer = '';
        streamGenerate(
            {
                prompt_name: '04_revise_content',
                variables: {
                    current_content: sections[key],
                    user_revision_request: revisionInput,
                    page_title: getSectionTitle(key)
                },
                scenario,
                session_id: sessionRef.current
            },
            (chunk) => {
                buffer += chunk;
                const { jsonPart } = extractThoughtAndJson(buffer);
                
                if (jsonPart) {
                    const parsed = parseLlmJson<{ content: string }>(jsonPart);
                    if (parsed && parsed.content) {
                        setSections(prev => ({ ...prev, [key]: parsed.content }));
                    } else {
                         const match = jsonPart.match(/"content"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                         if (match && match.groups?.content) {
                             const content = match.groups.content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
                             setSections(prev => ({ ...prev, [key]: content }));
                         }
                    }
                }
            },
            () => {
                setRevisingKey(null);
                setRevisionInput('');
                setActiveEditSection(null);
            },
            (err) => {
                console.error(err);
                setRevisingKey(null);
                alert("修订生成失败");
            }
        );
    };

    // --- View Mode 1: Timeline Processing (Input, Processing, Done) ---
    if (workflowState === 'processing' || workflowState === 'done') {
        return (
            <div ref={mainScrollRef} className="flex-1 w-full h-full overflow-y-auto bg-slate-50 p-6 md:p-16 relative scroll-smooth custom-scrollbar">
                <div className="max-w-3xl mx-auto pb-32">
                    {/* Header */}
                    <div className="mb-12 text-center">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-sm border border-indigo-100 animate-pulse">
                            <SparklesIcon className="w-4 h-4" />
                            AI Agent Active
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">深度技术评估执行中</h2>
                        <p className="text-slate-500 mt-2 text-sm">正在调用垂直领域知识库构建分析报告...</p>
                    </div>

                    {/* Timeline Container */}
                    <div className="relative border-l-2 border-slate-200 ml-6 md:ml-10 space-y-12">
                        {steps.map((step, index) => {
                            const isRunning = step.status === 'running';
                            const isCompleted = step.status === 'completed';
                            const isPending = step.status === 'pending';
                            const isError = step.status === 'error';
                            const displayModel = step.model || currentModel;

                            return (
                                <div key={step.id} className="relative pl-8 md:pl-12 transition-all duration-500">
                                    <div className={`
                                        absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full border-4 border-slate-50 shadow-sm transition-all duration-500 z-10
                                        ${isRunning ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-100' : 
                                          isCompleted ? 'bg-green-500' : 
                                          isError ? 'bg-red-500' : 'bg-slate-300'}
                                    `}></div>

                                    <div className={`
                                        relative rounded-2xl border transition-all duration-500
                                        ${isRunning 
                                            ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-100 scale-[1.02] -translate-y-1 z-20' 
                                            : isCompleted
                                                ? 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                                                : 'bg-slate-50 border-transparent opacity-50'
                                        }
                                    `}>
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isRunning ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    <step.icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className={`font-bold text-base ${isRunning ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                        {step.label}
                                                    </h3>
                                                    {(isRunning || isCompleted) && (
                                                        <div className="flex items-center gap-1 mt-0.5 animate-in fade-in">
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                <LightningBoltIcon className="w-2.5 h-2.5 text-indigo-400" />
                                                                {formatModelName(displayModel)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold">
                                                {isRunning && <span className="text-indigo-500 flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> Processing</span>}
                                                {isCompleted && <span className="text-green-600 flex items-center gap-1"><CheckIcon className="w-4 h-4"/> Done</span>}
                                                {isPending && <span className="text-slate-400">Waiting</span>}
                                            </div>
                                        </div>

                                        {(isRunning || (isCompleted && (step.reasoning || step.content))) && (
                                            <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-2">
                                                <ThinkingTerminal content={step.reasoning} isActive={isRunning} />
                                                {step.isHtml ? (
                                                    <ResultCard 
                                                        content={step.content} 
                                                        isRunning={isRunning} 
                                                        isHtml={true}
                                                        onZoom={() => setZoomedHtml(step.content)}
                                                    />
                                                ) : (
                                                    !['init', 'ingest'].includes(step.key) && (
                                                        <ResultCard content={step.content} isRunning={isRunning} />
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div ref={timelineEndRef} className="h-10 w-full" />
                </div>
                {/* Zoom Modal */}
                {zoomedHtml && (
                    <ZoomModal 
                        html={zoomedHtml} 
                        onClose={() => setZoomedHtml(null)} 
                        taskId={taskId}
                    />
                )}
            </div>
        );
    }

    // --- View Mode 2: Review & Edit ---
    
    return (
        <div className="flex-1 flex overflow-hidden bg-[#f8fafc]">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">审查与修订</h2>
                        <p className="text-slate-500 text-sm">点击任意段落进行手动编辑，或使用 AI 助手进行定点优化。</p>
                    </div>

                    {(['p1', 'p2', 'p3', 'p4'] as Array<keyof ReportSections>).map((key) => {
                        const isRevisingThis = revisingKey === key;
                        const isFilled = !!sections[key];

                        return (
                            <div key={key} className={`bg-white rounded-2xl border transition-all group overflow-hidden relative ${isRevisingThis ? 'border-indigo-400 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <span className={`w-1.5 h-4 rounded-full ${isRevisingThis ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                        {getSectionTitle(key)}
                                    </h3>
                                    <div className="flex gap-2 items-center">
                                        {isRevisingThis ? (
                                             <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                                                 <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> AI 撰写中...
                                             </span>
                                        ) : (
                                            <button 
                                                onClick={() => setActiveEditSection(activeEditSection === key ? null : key)}
                                                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${activeEditSection === key ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-indigo-50 text-slate-500 hover:text-indigo-600'}`}
                                            >
                                                <SparklesIcon className="w-3.5 h-3.5" /> AI Refine
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {activeEditSection === key && (
                                    <div className="bg-indigo-50 p-4 border-b border-indigo-100 animate-in slide-in-from-top-2">
                                        <div className="flex gap-2">
                                            <input 
                                                autoFocus
                                                className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder={`告诉 AI 如何修改 (例如："增加具体数据支撑" 或 "语气更严谨一些")...`}
                                                value={revisionInput}
                                                onChange={e => setRevisionInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleReviseSection(key)}
                                            />
                                            <button 
                                                onClick={() => handleReviseSection(key)}
                                                disabled={!revisionInput.trim()}
                                                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                            >
                                                <SparklesIcon className="w-4 h-4"/> 发送
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="relative">
                                    <textarea 
                                        className={`w-full min-h-[200px] p-6 text-sm md:text-base text-slate-700 leading-relaxed resize-y outline-none transition-colors font-sans ${isRevisingThis ? 'bg-slate-50/50' : 'focus:bg-slate-50'}`}
                                        value={sections[key]}
                                        onChange={e => handleManualEdit(key, e.target.value)}
                                        spellCheck={false}
                                        disabled={isRevisingThis} 
                                    />
                                    {isRevisingThis && (
                                        <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none">
                                            <span className="relative flex h-3 w-3">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-4">
                     <div className="px-4 text-xs font-medium text-slate-500">满意当前内容？</div>
                     <button 
                        onClick={handleGenerateFinalHtml}
                        disabled={!!revisingKey}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         <CheckIcon className="w-4 h-4" /> 生成视觉报告 (HTML)
                     </button>
                </div>
            </div>
        </div>
    );
};
