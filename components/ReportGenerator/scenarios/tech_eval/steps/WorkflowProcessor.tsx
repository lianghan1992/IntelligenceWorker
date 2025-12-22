
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { streamGenerate, getScenarios } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    BrainIcon, CheckIcon, SparklesIcon, 
    LockClosedIcon, BeakerIcon, 
    ShieldExclamationIcon, LightBulbIcon, DocumentTextIcon,
    PlayIcon, ClockIcon, ChartIcon, RefreshIcon, PencilIcon,
    LightningBoltIcon
} from '../../../../icons';
import { WorkflowState } from '../TechEvalScenario';

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
}

const formatModelName = (model: string) => {
    if (!model) return 'Auto';
    // Remove channel prefix (e.g. "openrouter@")
    let name = model.includes('@') ? model.split('@')[1] : model;
    // Remove organization prefix if present (e.g. "mistralai/", "tngtech/") to make it cleaner
    if (name.includes('/')) {
        name = name.split('/')[1];
    }
    // Clean up version tags for cleaner display
    name = name.replace(':free', '').replace(':beta', '');
    return name;
};

// --- Sub-Components ---

// 1. 思考终端组件 (解决滚动问题的核心)
const ThinkingTerminal: React.FC<{ content: string; isActive: boolean }> = ({ content, isActive }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // 智能滚动逻辑：只要内容变化且处于激活状态，就滚到底部
    useLayoutEffect(() => {
        if (isActive && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [content, isActive]);

    // 修改：如果没有思考内容，直接不渲染（隐藏黑色框）
    if (!content) return null;

    return (
        <div className="mt-4 rounded-xl overflow-hidden bg-[#1e1e1e] border border-slate-800 shadow-inner relative group animate-in fade-in slide-in-from-top-2">
            {/* Header */}
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

            {/* Terminal Body */}
            <div 
                ref={scrollRef}
                className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar-dark font-mono text-xs leading-relaxed text-slate-300"
            >
                <div className="whitespace-pre-wrap break-words">
                    {content}
                    {isActive && (
                        <span className="inline-block w-2 h-4 bg-green-500 ml-1 align-middle animate-pulse"></span>
                    )}
                </div>
                <div ref={bottomRef} className="h-4" /> {/* Scroll Anchor */}
            </div>
            
            {/* Gradient Mask for top */}
            <div className="absolute top-[36px] left-0 right-0 h-4 bg-gradient-to-b from-[#1e1e1e] to-transparent pointer-events-none"></div>
        </div>
    );
};

// 2. 结果预览卡片
const ResultCard: React.FC<{ content: string; isRunning?: boolean }> = ({ content, isRunning }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部逻辑
    useEffect(() => {
        if (isRunning && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isRunning]);

    if (!content) return null;

    return (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-50">
                <DocumentTextIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Generated Output</span>
            </div>
            {/* 修改：移除 line-clamp，改为固定最大高度 + 滚动条，并添加 ref 用于自动滚动 */}
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
    const [currentModel, setCurrentModel] = useState<string>('');
    
    // Data Store
    const [sections, setSections] = useState<ReportSections>({ p1: '', p2: '', p3: '', p4: '' });
    
    // UI State
    const [steps, setSteps] = useState<StepData[]>([
        { id: 1, key: 'init', label: '初始化分析协议', icon: LockClosedIcon, status: 'pending', reasoning: '', content: '' },
        { id: 2, key: 'ingest', label: '知识库注入', icon: BeakerIcon, status: 'pending', reasoning: '', content: '' },
        { id: 3, key: 'p1', label: '分析技术路线', icon: ChartIcon, status: 'pending', reasoning: '', content: '' },
        { id: 4, key: 'p2', label: '识别潜在风险', icon: ShieldExclamationIcon, status: 'pending', reasoning: '', content: '' },
        { id: 5, key: 'p3', label: '构建推荐方案', icon: LightBulbIcon, status: 'pending', reasoning: '', content: '' },
        { id: 6, key: 'p4', label: '溯源引用资料', icon: DocumentTextIcon, status: 'pending', reasoning: '', content: '' },
    ]);

    // Review Logic
    const [activeEditSection, setActiveEditSection] = useState<keyof ReportSections | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    // 使用 revisingKey 来精确控制哪个部分正在被 AI 修改
    const [revisingKey, setRevisingKey] = useState<keyof ReportSections | null>(null);
    
    const hasStarted = useRef(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const timelineEndRef = useRef<HTMLDivElement>(null);

    // 智能页面滚动：当步骤状态变化时，滚动到底部
    useEffect(() => {
        if (workflowState === 'processing' && timelineEndRef.current) {
             timelineEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [steps.map(s => s.status).join(',')]);

    // Fetch scenario details to get default model
    useEffect(() => {
        const fetchModelInfo = async () => {
            try {
                const scenarios = await getScenarios();
                const current = scenarios.find(s => s.id === scenario || s.name === scenario);
                if (current && current.default_model) {
                    setCurrentModel(current.default_model);
                } else {
                    // Fallback to trying to match by name roughly if exact match failed
                    const looseMatch = scenarios.find(s => scenario.includes(s.name) || s.name.includes(scenario));
                     if (looseMatch && looseMatch.default_model) {
                        setCurrentModel(looseMatch.default_model);
                    } else {
                        setCurrentModel('System Default');
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch scenario details for model name", err);
                setCurrentModel("Unknown");
            }
        };
        fetchModelInfo();
    }, [scenario]);
    
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

    const runStep = async (stepIndex: number, promptName: string, vars: any, partKey?: keyof ReportSections) => {
        const stepId = stepIndex + 1;
        updateStep(stepId, { status: 'running' });

        return new Promise<void>((resolve, reject) => {
            let fullContentBuffer = ''; // 用于累积 data.content 的所有内容
            let apiReasoningBuffer = ''; // 用于累积 data.reasoning 的所有内容

            streamGenerate(
                { prompt_name: promptName, variables: vars, scenario, session_id: sessionId },
                (chunk) => {
                    // onData: 接收 content 字段
                    fullContentBuffer += chunk;
                    
                    // --- DeepSeek R1 <think> Handling ---
                    let displayContent = fullContentBuffer;
                    let extractedDeepSeekThought = '';
                    
                    const thinkStart = fullContentBuffer.indexOf('<think>');
                    const thinkEnd = fullContentBuffer.indexOf('</think>');

                    if (thinkStart !== -1) {
                        if (thinkEnd !== -1) {
                            // Completed think block
                            extractedDeepSeekThought = fullContentBuffer.substring(thinkStart + 7, thinkEnd);
                            // Remove the think block from content to show in UI
                            displayContent = fullContentBuffer.substring(0, thinkStart) + fullContentBuffer.substring(thinkEnd + 8);
                        } else {
                            // Streaming think block (not closed yet)
                            extractedDeepSeekThought = fullContentBuffer.substring(thinkStart + 7);
                            displayContent = fullContentBuffer.substring(0, thinkStart); // Hide partial think content from main view
                        }
                    }

                    // 1. 尝试从 content 缓冲区中分离出“思考内容”和“JSON部分”
                    // Pass the cleaned content (without <think> tags) to the JSON extractor
                    const { thought: contentThought, jsonPart } = extractThoughtAndJson(displayContent);
                    
                    // 2. 尝试从 JSON 部分提取目标字段
                    const targetContent = extractContent(jsonPart || displayContent, partKey);
                    
                    // 3. 更新步骤状态 (合并: API reasoning + DeepSeek tags + Standard Markdown blocks)
                    const mergedReasoning = [apiReasoningBuffer, extractedDeepSeekThought, contentThought].filter(Boolean).join('\n');

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
                    // onDone - Final cleanup similar to onData
                    let displayContent = fullContentBuffer;
                    let extractedDeepSeekThought = '';
                    const thinkStart = fullContentBuffer.indexOf('<think>');
                    const thinkEnd = fullContentBuffer.indexOf('</think>');
                    
                    if (thinkStart !== -1 && thinkEnd !== -1) {
                        extractedDeepSeekThought = fullContentBuffer.substring(thinkStart + 7, thinkEnd);
                        displayContent = fullContentBuffer.substring(0, thinkStart) + fullContentBuffer.substring(thinkEnd + 8);
                    }

                    const { thought: contentThought, jsonPart } = extractThoughtAndJson(displayContent);
                    let finalContent = extractContent(jsonPart || displayContent, partKey);
                    
                    const mergedReasoning = [apiReasoningBuffer, extractedDeepSeekThought, contentThought].filter(Boolean).join('\n');

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
                (sid) => { if (sid) setSessionId(sid); },
                (reasoningChunk) => {
                    // onReasoning: 接收 reasoning 字段 (DeepSeek-R1 style via specific providers)
                    apiReasoningBuffer += reasoningChunk;
                    // Trigger update to show reasoning even if content hasn't arrived
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
            await runStep(0, '01_Role_ProtocolSetup', {});
            await runStep(1, '02_DataIngestion', { reference_materials: materials });
            await runStep(2, '03_TriggerGeneration_step1', { target_tech: targetTech }, 'p1');
            await runStep(3, '03_TriggerGeneration_step2', {}, 'p2');
            await runStep(4, '03_TriggerGeneration_step3', {}, 'p3');
            await runStep(5, '03_TriggerGeneration_step4', {}, 'p4');
            
            setTimeout(() => setWorkflowState('review'), 1000);
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


    // --- View Mode 1: Timeline Processing ---
    
    if (workflowState === 'processing') {
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

                            return (
                                <div key={step.id} className="relative pl-8 md:pl-12 transition-all duration-500">
                                    
                                    {/* Timeline Dot */}
                                    <div className={`
                                        absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full border-4 border-slate-50 shadow-sm transition-all duration-500 z-10
                                        ${isRunning ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-100' : 
                                          isCompleted ? 'bg-green-500' : 
                                          isError ? 'bg-red-500' : 'bg-slate-300'}
                                    `}></div>

                                    {/* Content Card */}
                                    <div className={`
                                        relative rounded-2xl border transition-all duration-500
                                        ${isRunning 
                                            ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-100 scale-[1.02] -translate-y-1 z-20' 
                                            : isCompleted
                                                ? 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                                                : 'bg-slate-50 border-transparent opacity-50'
                                        }
                                    `}>
                                        {/* Card Header */}
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
                                                                {formatModelName(currentModel)}
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

                                        {/* Card Body (Expandable) */}
                                        {(isRunning || (isCompleted && (step.reasoning || step.content))) && (
                                            <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-2">
                                                {/* Reasoning Terminal */}
                                                <ThinkingTerminal content={step.reasoning} isActive={isRunning} />
                                                
                                                {/* Result Preview (Only if not purely data ingestion) */}
                                                {!['init', 'ingest'].includes(step.key) && (
                                                    <ResultCard content={step.content} isRunning={isRunning} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* 滚动锚点 */}
                    <div ref={timelineEndRef} className="h-10 w-full" />
                </div>
            </div>
        );
    }


    // --- View Mode 2: Review & Edit (Reusing Logic) ---
    
    const getSectionTitle = (key: string) => {
        const map: any = { p1: '技术路线分析', p2: '潜在风险识别', p3: '方案推荐', p4: '参考资料' };
        return map[key] || 'Section';
    };

    const handleReviseSection = async (key: keyof ReportSections) => {
        if (!revisionInput.trim() || revisingKey) return; // Prevent double submit
        
        // 设置正在修订的状态
        setRevisingKey(key);
        setActiveEditSection(null); // 关闭输入框，转为加载状态
        
        const currentContent = sections[key];
        
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
                },
                (chunk) => {
                    buffer += chunk;
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    
                    // 尝试解析 JSON 中的 content 字段
                    // 使用更宽容的正则来支持流式片段
                    const match = jsonPart.match(/"content"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                    
                    if (match && match.groups?.content) {
                        const raw = match.groups.content;
                        // 处理转义字符
                        const newContent = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
                        setSections(prev => ({ ...prev, [key]: newContent }));
                    } else if (jsonPart && !jsonPart.includes('"content"')) {
                         // 如果还没到 content 字段，可能是思考过程，暂时不更新正文
                    }
                },
                () => {
                    setRevisingKey(null);
                    setRevisionInput('');
                },
                (err) => {
                     console.error("Revision failed", err);
                     setRevisingKey(null);
                }
            );
        } catch (e) {
            setRevisingKey(null);
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

                    {(['p1', 'p2', 'p3', 'p4'] as Array<keyof ReportSections>).map((key) => {
                        const isRevisingThis = revisingKey === key;

                        return (
                            <div key={key} className={`bg-white rounded-2xl border transition-all group overflow-hidden relative ${isRevisingThis ? 'border-indigo-400 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <span className={`w-1.5 h-4 rounded-full ${isRevisingThis ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                        {getSectionTitle(key)}
                                    </h3>
                                    <div className="flex gap-2 items-center">
                                        {isRevisingThis && (
                                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white text-slate-400 border border-slate-200 mr-2">
                                                <LightningBoltIcon className="w-2.5 h-2.5 text-indigo-400" />
                                                {formatModelName(currentModel)}
                                            </span>
                                        )}
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

                                {/* Revision Input Box */}
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
                                        disabled={isRevisingThis} // Disable manual edit while AI is writing
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
                        onClick={handleFinalConfirm}
                        disabled={!!revisingKey}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         <CheckIcon className="w-4 h-4" /> 生成最终报告 (HTML)
                     </button>
                </div>
            </div>
        </div>
    );
};
