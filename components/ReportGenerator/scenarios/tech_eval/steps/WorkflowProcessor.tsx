
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    BrainIcon, CheckIcon, RefreshIcon, SparklesIcon, 
    ChevronRightIcon, LockClosedIcon, 
    ShieldExclamationIcon, DocumentTextIcon 
} from '../../../../icons';
import { WorkflowState } from '../TechEvalScenario';

// --- Types ---

interface ReportSections {
    p1: string; // 技术路线
    p2: string; // 风险分析
    p3: string; // 方案推荐
    p4: string; // 引用来源
}

interface StepData {
    id: number;
    key: string; // Internal key for logic
    label: string;
    icon: React.FC<any>;
    status: 'pending' | 'running' | 'completed' | 'error';
    reasoning: string; // Chain of Thought buffer
    content: string;   // Final output buffer
    isExpanded: boolean; // For UI toggle
}

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

// --- Helper Components ---

const ConnectorLine: React.FC<{ type: 'vertical' | 'horizontal' | 'curve-down'; height?: number; width?: number; className?: string }> = ({ type, height = 20, width = 20, className = '' }) => {
    if (type === 'vertical') {
        return <div className={`w-0.5 bg-slate-200 ${className}`} style={{ height }} />;
    }
    if (type === 'horizontal') {
        return <div className={`h-0.5 bg-slate-200 ${className}`} style={{ width }} />;
    }
    // Curve from left-center to bottom-right
    return (
        <svg width="40" height="40" className={`absolute text-slate-200 pointer-events-none ${className}`} style={{ fill: 'none' }}>
            <path d="M 0 0 C 20 0, 20 40, 40 40" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
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
}> = ({ scenario, initialSessionId, targetTech, materials, workflowState, setWorkflowState, onReviewComplete }) => {
    
    // --- State ---
    const [sessionId, setSessionId] = useState(initialSessionId);
    
    // Data Store
    const [sections, setSections] = useState<ReportSections>({ p1: '', p2: '', p3: '', p4: '' });
    
    // UI State for Mind Map
    const [steps, setSteps] = useState<StepData[]>([
        { id: 1, key: 'init', label: '初始化分析协议', icon: LockClosedIcon, status: 'pending', reasoning: '', content: '', isExpanded: true },
        { id: 2, key: 'ingest', label: '知识库注入', icon: BeakerIcon, status: 'pending', reasoning: '', content: '', isExpanded: true },
        { id: 3, key: 'p1', label: '分析技术路线', icon: ChartIcon, status: 'pending', reasoning: '', content: '', isExpanded: true },
        { id: 4, key: 'p2', label: '识别潜在风险', icon: ShieldExclamationIcon, status: 'pending', reasoning: '', content: '', isExpanded: true },
        { id: 5, key: 'p3', label: '构建推荐方案', icon: LightBulbIcon, status: 'pending', reasoning: '', content: '', isExpanded: true },
        { id: 6, key: 'p4', label: '溯源引用资料', icon: DocumentTextIcon, status: 'pending', reasoning: '', content: '', isExpanded: true },
    ]);

    // Review/Edit State
    const [activeEditSection, setActiveEditSection] = useState<keyof ReportSections | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);
    
    const hasStarted = useRef(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // --- Auto-scroll during generation ---
    useEffect(() => {
        if (workflowState === 'processing' && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [steps]);

    // --- Logic: Pipeline Execution ---
    
    // Update a specific step's state
    const updateStep = (id: number, updates: Partial<StepData>) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const extractContent = (text: string, partKey?: keyof ReportSections): string => {
        if (!partKey) return '';
        // Simple extraction logic tailored for this scenario's expected JSON output
        const regexMap: Record<string, RegExp> = {
            p1: /"第一部分_技术路线与当前所处阶段分析"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s,
            p2: /"第二部分_当前技术潜在风险识别与分析"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s,
            p3: /"第三部分_行业技术方案推荐"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s,
            p4: /{(?<content>.*)}/s // Fallback for pure JSON object at end
        };

        if (partKey === 'p4') {
             // For references, we might just get a JSON object
             // Try to find the last JSON object
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

    const runStep = async (stepIndex: number, promptName: string, vars: any, partKey?: keyof ReportSections) => {
        const stepId = stepIndex + 1; // 1-based ID
        updateStep(stepId, { status: 'running', isExpanded: true });

        // Collapse previous steps to reduce clutter (optional, keeps UI clean)
        if (stepIndex > 0) {
            updateStep(stepIndex, { isExpanded: false });
        }

        return new Promise<void>((resolve, reject) => {
            let buffer = '';
            streamGenerate(
                { prompt_name: promptName, variables: vars, scenario, session_id: sessionId, model_override: TARGET_MODEL },
                (chunk) => {
                    buffer += chunk;
                    const content = extractContent(buffer, partKey);
                    updateStep(stepId, { content: content || (partKey ? '' : 'Processing...') }); // Show something if no specific key needed
                },
                () => {
                    // Done
                    let finalContent = extractContent(buffer, partKey);
                    
                    // Special handling for P4 (References) JSON parsing
                    if (partKey === 'p4' && finalContent) {
                        try {
                            const refs = JSON.parse(finalContent);
                            let md = '## 引用资料来源\n\n';
                            Object.entries(refs).forEach(([t, u]) => md += `- [${t}](${u})\n`);
                            finalContent = md;
                        } catch (e) { /* ignore parse error */ }
                    }

                    updateStep(stepId, { status: 'completed', content: finalContent || 'Done' });
                    if (partKey) {
                        setSections(prev => ({ ...prev, [partKey]: finalContent }));
                    }
                    resolve();
                },
                (err) => {
                    updateStep(stepId, { status: 'error', content: 'Generation failed.' });
                    console.error(err);
                    resolve(); // Continue anyway? Or stop. Let's continue for resilience.
                },
                (sid) => { if (sid) setSessionId(sid); },
                (reasoning) => {
                    // Append reasoning
                    setSteps(prev => {
                        const target = prev.find(s => s.id === stepId);
                        if (!target) return prev;
                        return prev.map(s => s.id === stepId ? { ...s, reasoning: s.reasoning + reasoning } : s);
                    });
                }
            );
        });
    };

    const runPipeline = async () => {
        try {
            await runStep(0, '01_Role_ProtocolSetup', {});
            await runStep(1, '02_DataIngestion', { reference_materials: materials });
            await runStep(2, '03_TriggerGeneration_step1', { target_tech: targetTech }, 'p1');
            await runStep(3, '03_TriggerGeneration_step2', {}, 'p2');
            await runStep(4, '03_TriggerGeneration_step3', {}, 'p3');
            await runStep(5, '03_TriggerGeneration_step4', {}, 'p4');
            
            // Expand all for review at the end? Or switch view.
            // Let's switch view after a small delay to show full "green" state
            setTimeout(() => {
                setWorkflowState('review');
            }, 1500);

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

    // --- Renderers ---

    const renderMindMapNode = (step: StepData, index: number) => {
        const isLast = index === steps.length - 1;
        const isActive = step.status === 'running';
        const isDone = step.status === 'completed';
        
        return (
            <div key={step.id} className="relative flex flex-col pl-4 md:pl-0">
                {/* 1. Main Trunk Node */}
                <div className="flex items-center gap-4 relative z-10">
                    {/* Icon Circle */}
                    <div className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-sm transition-all duration-500 relative
                        ${isActive 
                            ? 'bg-white border-indigo-500 text-indigo-600 scale-110 shadow-indigo-200' 
                            : isDone 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-300'
                        }
                    `}>
                        {isActive && <span className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping"></span>}
                        {isDone ? <CheckIcon className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                    </div>
                    
                    {/* Label */}
                    <div className="flex-1">
                        <h3 className={`font-bold text-sm md:text-base transition-colors ${isActive ? 'text-indigo-900' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step.label}
                        </h3>
                        {isActive && <span className="text-xs text-indigo-500 font-medium animate-pulse">正在处理...</span>}
                    </div>
                </div>

                {/* 2. Vertical Connector Line (Trunk) */}
                {!isLast && (
                    <div className="absolute left-[22px] top-12 bottom-0 w-0.5 bg-slate-200 -z-0">
                         {/* Animated progress fill for trunk if current step is done */}
                         {(isDone || isActive) && (
                            <div className={`w-full bg-indigo-500 transition-all duration-1000 ${isDone ? 'h-full' : 'h-1/2'}`}></div>
                         )}
                    </div>
                )}

                {/* 3. Branching Content (Right Side) */}
                {(isActive || (isDone && step.isExpanded)) && (
                    <div className="ml-6 md:ml-16 mt-4 mb-8 space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                        
                        {/* Branch A: Reasoning (The "Brain") */}
                        {step.reasoning && (
                            <div className="relative flex items-start gap-4">
                                {/* Curved Line Connector */}
                                <div className="absolute -left-6 top-4 w-6 h-8 border-l-2 border-b-2 border-indigo-200 rounded-bl-2xl"></div>
                                
                                <div className="flex-1 bg-slate-900 rounded-xl p-4 shadow-xl border border-slate-700 relative overflow-hidden group">
                                    {/* Decoration */}
                                    <div className="absolute top-0 right-0 p-2 opacity-20">
                                        <BrainIcon className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    
                                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <SparklesIcon className="w-3 h-3" /> AI Thinking Process
                                    </h4>
                                    <div className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar-dark">
                                        {step.reasoning}
                                        {isActive && <span className="inline-block w-1.5 h-3 bg-indigo-500 ml-1 animate-pulse align-middle"></span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Branch B: Content/Result */}
                        {step.content && (
                            <div className="relative flex items-start gap-4">
                                {/* Connector logic: if reasoning exists, line comes from reasoning node? No, better from trunk or parallel. */}
                                {/* Let's make it look like a flow: Reasoning -> Result or Parallel. Parallel is cleaner in UI. */}
                                <div className="absolute -left-6 top-[-10px] bottom-1/2 w-6 border-l-2 border-slate-200"></div>
                                <div className="absolute -left-6 top-1/2 w-6 border-b-2 border-slate-200 rounded-bl-xl h-4"></div>

                                <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <DocumentTextIcon className="w-3 h-3" /> Generated Output
                                    </h4>
                                    <div className="text-sm text-slate-700 leading-relaxed line-clamp-4">
                                        {step.content}
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded">Markdown Preview</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // --- View Logic ---

    // 1. Mind Map View (Processing)
    if (workflowState === 'processing') {
        return (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12 relative scroll-smooth">
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                     style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                </div>
                
                <div className="max-w-4xl mx-auto pb-20">
                    <header className="mb-12 text-center">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">AI 深度分析进行中</h2>
                        <p className="text-slate-500 mt-2">Agent 正在执行思维链推理与内容生成...</p>
                    </header>

                    <div className="space-y-0">
                        {steps.map((step, idx) => renderMindMapNode(step, idx))}
                    </div>
                    
                    <div ref={bottomRef} className="h-10"></div>
                </div>
            </div>
        );
    }

    // 2. Review & Edit View (The classic editor we built)
    // Reuse previous logic but ensure it hooks up to the data we just generated
    
    // ... [Previous Review/Revision Logic] ...
    // (Re-using the logic from previous turn for the 'review' state rendering)
    
    const getSectionTitle = (key: string) => {
        const map: any = { p1: '技术路线分析', p2: '潜在风险识别', p3: '方案推荐', p4: '参考资料' };
        return map[key] || 'Section';
    };

    const handleReviseSection = async (key: keyof ReportSections) => {
        if (!revisionInput.trim() || isRevising) return;
        setIsRevising(true);
        setActiveEditSection(null);
        
        const currentContent = sections[key];
        // Fake a "Thinking" step in UI? Maybe just a spinner for revision.
        
        try {
            let buffer = '';
            await streamGenerate(
                {
                    prompt_name: '04_revise_content',
                    variables: {
                        page_title: getSectionTitle(key),
                        current_content: currentContent,
                        user_revision_request: revisionInput
                    },
                    scenario,
                    session_id: sessionId,
                    model_override: TARGET_MODEL
                },
                (chunk) => {
                    buffer += chunk;
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    // Attempt extraction
                    const match = jsonPart.match(/"content"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                    if (match && match.groups?.content) {
                        const raw = match.groups.content;
                        const newContent = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
                        setSections(prev => ({ ...prev, [key]: newContent }));
                    }
                },
                () => {
                    setIsRevising(false);
                    setRevisionInput('');
                }
            );
        } catch (e) {
            setIsRevising(false);
        }
    };

    const handleManualEdit = (key: keyof ReportSections, value: string) => {
        setSections(prev => ({ ...prev, [key]: value }));
    };

    const handleFinalConfirm = () => {
        const md = `## 技术路线与当前所处阶段分析\n\n${sections.p1}\n\n## 当前技术潜在风险识别与分析\n\n${sections.p2}\n\n## 行业技术方案推荐\n\n${sections.p3}\n\n${sections.p4}`;
        onReviewComplete(md);
    };

    return (
        <div className="flex-1 flex overflow-hidden bg-[#f8fafc]">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">审查与修订</h2>
                        <p className="text-slate-500 text-sm">点击任意段落进行手动编辑，或使用 AI 助手进行定点优化。</p>
                    </div>

                    {(['p1', 'p2', 'p3', 'p4'] as Array<keyof ReportSections>).map((key) => (
                        <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                                    {getSectionTitle(key)}
                                </h3>
                                <button 
                                    onClick={() => setActiveEditSection(activeEditSection === key ? null : key)}
                                    className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${activeEditSection === key ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-indigo-50 text-slate-500 hover:text-indigo-600'}`}
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" /> AI Refine
                                </button>
                            </div>

                            {activeEditSection === key && (
                                <div className="bg-indigo-50 p-4 border-b border-indigo-100 animate-in slide-in-from-top-2">
                                    <div className="flex gap-2">
                                        <input 
                                            autoFocus
                                            className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder={`告诉 AI 如何修改...`}
                                            value={revisionInput}
                                            onChange={e => setRevisionInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleReviseSection(key)}
                                        />
                                        <button 
                                            onClick={() => handleReviseSection(key)}
                                            disabled={isRevising || !revisionInput.trim()}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isRevising ? <RefreshIcon className="w-4 h-4 animate-spin"/> : '发送'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <textarea 
                                className="w-full min-h-[200px] p-6 text-sm md:text-base text-slate-700 leading-relaxed resize-y outline-none focus:bg-slate-50 transition-colors font-sans"
                                value={sections[key]}
                                onChange={e => handleManualEdit(key, e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-4">
                     <div className="px-4 text-xs font-medium text-slate-500">满意当前内容？</div>
                     <button 
                        onClick={handleFinalConfirm}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                     >
                         <CheckIcon className="w-4 h-4" /> 生成最终报告 (HTML)
                     </button>
                </div>
            </div>
        </div>
    );
};

// --- Mock Icon for Chart ---
function ChartIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  );
}

function BeakerIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
    );
}

function LightBulbIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
    )
}