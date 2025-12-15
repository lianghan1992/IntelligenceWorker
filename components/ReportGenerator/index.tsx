
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon, 
    CloseIcon, DocumentTextIcon, CheckIcon, LightBulbIcon, BrainIcon, 
    ViewGridIcon, ChartIcon, PlayIcon, ChevronDownIcon, ChevronRightIcon,
    ClockIcon, PencilIcon, RefreshIcon, StopIcon, LockClosedIcon, PhotoIcon
} from '../icons';
import { Slide, StratifyTask, StratifyPage, StratifyOutline } from '../../types';
import { 
    createStratifyTask, 
    updateStratifyTask, 
    saveStratifyPages, 
    streamGenerate, 
} from '../../api/stratify';

// --- 样式注入：修复 Markdown 表格和排版 ---
const MarkdownStyles = () => (
    <style>{`
        .prose table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1.5em;
            margin-bottom: 1.5em;
            font-size: 0.875em;
            line-height: 1.5;
        }
        .prose th {
            background-color: #f8fafc;
            font-weight: 700;
            text-align: left;
            padding: 0.75rem;
            border: 1px solid #e2e8f0;
            color: #1e293b;
        }
        .prose td {
            padding: 0.75rem;
            border: 1px solid #e2e8f0;
            color: #475569;
        }
        .prose tr:nth-child(even) {
            background-color: #fcfcfc;
        }
        .prose blockquote {
            font-style: normal;
            border-left-width: 4px;
            border-color: #6366f1;
            background-color: #f5f3ff;
            padding: 1rem;
            border-radius: 0.5rem;
            color: #4f46e5;
        }
        .prose ul > li::marker {
            color: #cbd5e1;
        }
        .prose h1, .prose h2, .prose h3 {
            color: #0f172a;
            font-weight: 800;
            letter-spacing: -0.025em;
        }
        /* 打字机光标效果 */
        .typing-cursor::after {
            content: '';
            display: inline-block;
            width: 6px;
            height: 1.2em;
            background-color: #4f46e5;
            margin-left: 2px;
            vertical-align: text-bottom;
            animation: blink 1s step-end infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
    `}</style>
);

// --- 流程动画卡片组件 ---
const ProcessFlowCards: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, icon: LightBulbIcon, title: "意图识别", desc: "语义解析", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-100" },
        { id: 2, icon: BrainIcon, title: "大纲生成", desc: "逻辑构建", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", ring: "ring-purple-100" },
        { id: 3, icon: ViewGridIcon, title: "结构规划", desc: "内容填充", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-100" },
        { id: 4, icon: SparklesIcon, title: "内容生成", desc: "RAG写作", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200", ring: "ring-pink-100" },
        { id: 5, icon: PhotoIcon, title: "排版渲染", desc: "HTML生成", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", ring: "ring-indigo-100" },
        { id: 6, icon: ChartIcon, title: "完成", desc: "报告预览", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-100" },
    ];

    return (
        <div className="w-full max-w-5xl mx-auto mb-4 px-4 pt-4 flex-shrink-0">
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 rounded-full hidden md:block"></div>
                <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 -translate-y-1/2 rounded-full hidden md:block transition-all duration-1000 ease-in-out"
                    style={{ width: `${Math.max(0, (currentStep - 1) * 20)}%` }}
                ></div>
                
                <div className="grid grid-cols-6 gap-2 md:gap-4 relative z-10">
                    {steps.map((step, i) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        const isPending = currentStep < step.id;

                        return (
                            <div 
                                key={step.id} 
                                className={`flex flex-col items-center text-center transition-all duration-500 group ${isPending ? 'opacity-50 grayscale' : 'opacity-100'}`}
                            >
                                <div className={`
                                    relative w-8 h-8 md:w-12 md:h-12 rounded-2xl border flex items-center justify-center transition-all duration-500 ease-out
                                    ${isActive 
                                        ? `bg-white ${step.border} shadow-[0_0_25px_rgba(0,0,0,0.08)] scale-110 z-20 ring-4 ${step.ring}` 
                                        : isCompleted 
                                            ? 'bg-white border-indigo-100 text-indigo-600 shadow-sm ring-2 ring-indigo-50' 
                                            : 'bg-white border-gray-100 text-gray-300 shadow-sm'
                                    }
                                `}>
                                    <div className={`transition-all duration-300 transform ${isActive ? `${step.color} scale-110` : ''}`}>
                                        {isCompleted ? <CheckIcon className="w-4 h-4 md:w-6 md:h-6" /> : <step.icon className="w-4 h-4 md:w-6 md:h-6" />}
                                    </div>
                                </div>
                                <div className={`mt-2 space-y-0.5 transition-all duration-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-70'}`}>
                                    <h4 className={`text-[10px] md:text-xs font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {step.title}
                                    </h4>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- 阶段1: 创意输入 (保持不变) ---
const IdeaInput: React.FC<{ onStart: (idea: string) => void, isLoading: boolean }> = ({ onStart, isLoading }) => {
    const [idea, setIdea] = useState('');

    return (
        <div className="flex flex-col items-center justify-start h-full overflow-y-auto pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="w-full max-w-3xl text-center px-4 mt-8 md:mt-16 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

                <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 shadow-sm animate-bounce">
                    <SparklesIcon className="w-3 h-3" />
                    <span>AI 智能报告生成引擎 V2.0</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 tracking-tight mb-6 leading-tight">
                    从一个想法<br/>到一份专业报告
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
                    输入您想要研究的主题，AI 将为您自动完成<span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">全网调研</span>、<span className="text-purple-600 font-bold bg-purple-50 px-1 rounded">数据分析</span>与<span className="text-pink-600 font-bold bg-pink-50 px-1 rounded">逻辑构建</span>。
                </p>
                
                <div className="relative group max-w-2xl mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[24px] opacity-25 group-hover:opacity-50 transition duration-500 blur-xl"></div>
                    <div className="relative bg-white rounded-[20px] shadow-2xl p-2 border border-slate-100">
                        <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="例如：‘2024年中国新能源汽车出海战略分析’ 或 ‘固态电池技术发展现状与商业化前景’"
                            className="w-full h-40 p-5 text-lg bg-transparent border-none resize-none focus:ring-0 text-slate-800 placeholder:text-slate-300 font-medium"
                            disabled={isLoading}
                        />
                        <div className="flex justify-between items-center px-4 pb-2">
                            <span className="text-xs text-slate-400 font-medium">支持中英文输入</span>
                            <button 
                                onClick={() => onStart(idea)}
                                disabled={!idea.trim() || isLoading}
                                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-600 hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center gap-2 group/btn"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                        <span>正在启动...</span>
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-4 h-4 group-hover/btn:animate-ping" />
                                        <span>立即生成</span>
                                        <ArrowRightIcon className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-wrap justify-center gap-3">
                    {['行业研究', '竞品分析', '技术洞察', '市场趋势', '政策解读'].map(tag => (
                        <span key={tag} onClick={() => setIdea(prev => tag + " ")} className="cursor-pointer px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Parsers (Helpers) - UPDATED for Reasoning Models ---
const parseIncrementalStream = (text: string): { thought: string | null, title: string | null, outline: any[] } => {
    let thought = null;
    let title = null;
    let outline: any[] = [];

    // 1. Detect Reasoning (Content before JSON)
    // Heuristic: Find first '{' that likely starts the JSON structure.
    // If there is significant text before it, treat that as thought.
    let jsonStartIndex = text.indexOf('{');
    const codeBlockIndex = text.indexOf('```json');
    
    if (codeBlockIndex !== -1) {
        // If code block exists, text before it is definitely thought
        jsonStartIndex = text.indexOf('{', codeBlockIndex);
        if (jsonStartIndex !== -1) {
            thought = text.slice(0, codeBlockIndex).trim();
        }
    } else if (jsonStartIndex > 10) {
        // Fallback: If no code block, but text starts late, treat prelude as thought
        thought = text.slice(0, jsonStartIndex).trim();
    }

    const jsonPart = jsonStartIndex !== -1 ? text.slice(jsonStartIndex) : text;

    // 2. Fallback to internal thought_process key if raw thought is empty
    if (!thought) {
        const thoughtRegex = /"thought_process"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/s;
        const thoughtMatch = jsonPart.match(thoughtRegex);
        if (thoughtMatch) {
            thought = thoughtMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
    }

    const titleRegex = /"title"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/;
    const titleMatch = jsonPart.match(titleRegex);
    if (titleMatch) {
        title = titleMatch[1];
    } else {
        const mdTitle = jsonPart.match(/^#\s+(.*$)/m);
        if (mdTitle) title = mdTitle[1].trim();
    }

    const outlineStartIdx = jsonPart.indexOf('"outline"');
    if (outlineStartIdx !== -1) {
        const outlineSection = jsonPart.slice(outlineStartIdx);
        const itemRegex = /{\s*"title"\s*:\s*"(.*?)"\s*,\s*"(?:content|summary)"\s*:\s*"(.*?)(?:"\s*}|"\s*,|"$)/gs;
        
        let match;
        while ((match = itemRegex.exec(outlineSection)) !== null) {
            const cleanTitle = match[1].replace(/\\"/g, '"');
            const cleanContent = match[2].replace(/\\"/g, '"').replace(/\\n/g, ' ');
            
            if (cleanTitle) {
                outline.push({ title: cleanTitle, content: cleanContent });
            }
        }
    }
    return { thought, title, outline };
};

const parsePageStream = (text: string) => {
    let thought = null;
    let content = '';
    let title = null;

    // 1. Detect Reasoning (Content before JSON)
    let jsonStartIndex = text.indexOf('{');
    const codeBlockIndex = text.indexOf('```json');
    
    if (codeBlockIndex !== -1) {
        jsonStartIndex = text.indexOf('{', codeBlockIndex);
        if (jsonStartIndex !== -1) {
            thought = text.slice(0, codeBlockIndex).trim();
        }
    } else if (jsonStartIndex > 10) {
        thought = text.slice(0, jsonStartIndex).trim();
    }

    const jsonPart = jsonStartIndex !== -1 ? text.slice(jsonStartIndex) : text;

    // 2. Fallback to internal thought_process
    if (!thought) {
        const thoughtMatch = jsonPart.match(/"thought_process"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/s);
        if (thoughtMatch) {
            thought = thoughtMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
    }

    const titleMatch = jsonPart.match(/"title"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/);
    if (titleMatch) {
        title = titleMatch[1];
    }

    const contentStartMatch = jsonPart.match(/"content"\s*:\s*"/);
    if (contentStartMatch && contentStartMatch.index !== undefined) {
        const start = contentStartMatch.index + contentStartMatch[0].length;
        let raw = jsonPart.slice(start);
        
        if (raw.match(/"\s*}\s*(```)?\s*$/)) {
             raw = raw.replace(/"\s*}\s*(```)?\s*$/, '');
        } else if (raw.endsWith('"')) {
             if (!raw.endsWith('\\"')) {
                 raw = raw.slice(0, -1);
             }
        }

        content = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\t/g, '\t');
    }

    return { thought, content, title };
};

// --- 阶段2 & 3: 智能大纲生成模态框 (Visual Upgrade) ---
const OutlineGenerationModal: React.FC<{ 
    isOpen: boolean;
    taskId: string;
    topic: string;
    onClose: () => void;
    onConfirm: (outline: StratifyOutline, sessionId: string | null) => void;
}> = ({ isOpen, taskId, topic, onClose, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showThought, setShowThought] = useState(true);
    const [showDebug, setShowDebug] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);
    
    const hasStartedRef = useRef(false);
    const contentEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial Stream Trigger
    useEffect(() => {
        if (isOpen && !hasStartedRef.current && taskId) {
            hasStartedRef.current = true;
            setIsGenerating(true);
            setStreamContent('');
            
            streamGenerate(
                {
                    prompt_name: 'generate_outline',
                    variables: { user_input: topic }
                },
                (chunk) => {
                    setStreamContent(prev => prev + chunk);
                },
                () => {
                    setIsGenerating(false);
                },
                (err) => {
                    console.error("Gen error", err);
                    setIsGenerating(false);
                },
                (sid) => {
                    if (sid) setSessionId(sid);
                }
            );
        }
    }, [isOpen, taskId, topic]);

    // Handle Revision Request
    const handleReviseOutline = async () => {
        if (!revisionInput.trim() || isGenerating) return;
        
        setIsRevising(true);
        setIsGenerating(true);
        setStreamContent(''); // Clear for new content
        const currentInput = revisionInput;
        setRevisionInput('');
        
        const currentOutlineStr = JSON.stringify(displayData.outline);

        streamGenerate(
            {
                prompt_name: 'revise_outline',
                variables: { 
                    current_outline: currentOutlineStr, 
                    user_revision_request: currentInput 
                },
                session_id: sessionId || undefined // Use existing session
            },
            (chunk) => {
                setStreamContent(prev => prev + chunk);
            },
            () => {
                setIsGenerating(false);
                setIsRevising(false);
            },
            (err) => {
                console.error("Revision error", err);
                setIsGenerating(false);
                setIsRevising(false);
            }
        );
    };

    // Smart Auto-scroll
    useEffect(() => {
        if (scrollContainerRef.current && isGenerating) {
            const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
            if (isNearBottom) {
                contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [streamContent, isGenerating]);

    const displayData = useMemo(() => {
        return parseIncrementalStream(streamContent);
    }, [streamContent]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}></div>

            <div className="relative bg-white/95 w-full max-w-4xl rounded-[24px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ring-1 ring-black/5">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-md z-10 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-colors duration-500 ${isGenerating ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                            {isGenerating ? (
                                <BrainIcon className="w-6 h-6 animate-pulse" />
                            ) : (
                                <CheckIcon className="w-6 h-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg tracking-tight flex items-center gap-2">
                                {isGenerating ? (isRevising ? '正在调整大纲...' : 'AI 深度思考与构建中...') : '大纲构建完成'}
                                {isGenerating && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                {isGenerating ? '正在实时流式输出...' : '请审阅以下大纲，您可以确认生成或提出修改意见'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowThought(!showThought)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                        >
                            {showThought ? '隐藏思考' : '查看思考'}
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                            title="关闭"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-50/50 p-6 sm:p-8 custom-scrollbar relative space-y-8">
                    {/* Thinking Process */}
                    <div className="animate-in slide-in-from-top-4 duration-700">
                        <div className={`transition-all duration-500 ease-in-out overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-[#1e1e1e] ${showThought ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 font-mono text-xs sm:text-sm text-green-400/90 leading-relaxed overflow-y-auto max-h-[400px] custom-scrollbar-dark">
                                {displayData.thought ? (
                                    <div className="whitespace-pre-wrap">
                                        <span className="text-gray-500 mr-2">$</span>
                                        {displayData.thought}
                                        {isGenerating && <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse align-middle"></span>}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-500 italic">
                                        <span className="text-gray-600">$</span> Initializing thought process...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Result */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                                <DocumentTextIcon className="w-4 h-4" /> Proposed Title
                            </div>
                            {displayData.title ? (
                                <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-indigo-900 leading-tight py-2 animate-in fade-in slide-in-from-left-4 duration-500">
                                    {displayData.title}
                                </div>
                            ) : (
                                <div className="h-10 w-2/3 bg-slate-200/50 rounded-lg animate-pulse"></div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                                <ViewGridIcon className="w-4 h-4" /> Structural Outline
                            </div>
                            
                            <div className="grid gap-4">
                                {displayData.outline.map((item: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        className="group bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex gap-5 items-start transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-200 animate-in slide-in-from-bottom-4 fill-mode-backwards"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center text-sm font-bold font-mono border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 mt-1">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-indigo-700 transition-colors">
                                                {item.title}
                                            </h4>
                                            <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600">
                                                {item.content}
                                                {isGenerating && idx === displayData.outline.length - 1 && (
                                                    <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full ml-1 animate-ping"></span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                                {isGenerating && (
                                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 bg-slate-50/30 animate-pulse">
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <span className="text-sm font-medium">正在构思下一章节...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div ref={contentEndRef} className="h-4" />
                </div>

                {/* Debug */}
                {showDebug && (
                    <div className="px-8 pb-4 border-t border-slate-100 bg-slate-50">
                        <div className="text-xs text-slate-400 mb-1 font-bold">RAW STREAM DATA:</div>
                        <textarea 
                            value={streamContent} 
                            readOnly 
                            className="w-full h-32 text-[10px] font-mono bg-slate-200/50 border border-slate-200 p-2 rounded text-slate-600 resize-none outline-none" 
                        />
                    </div>
                )}

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-white z-10 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
                    {!isGenerating && (
                        <div className="flex-1 w-full flex items-center gap-2">
                            <input 
                                type="text" 
                                value={revisionInput}
                                onChange={(e) => setRevisionInput(e.target.value)}
                                placeholder="输入修改建议，如：'增加关于自动驾驶的章节'..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                onKeyDown={(e) => e.key === 'Enter' && handleReviseOutline()}
                            />
                            <button 
                                onClick={handleReviseOutline}
                                disabled={!revisionInput.trim()}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm"
                                title="应用修改"
                            >
                                <SparklesIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                        <button 
                            onClick={() => setShowDebug(!showDebug)} 
                            className="hidden sm:block text-[10px] text-slate-400 hover:text-indigo-500 underline transition-colors"
                        >
                            {showDebug ? '隐藏调试' : '调试'}
                        </button>

                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
                            {isGenerating ? (
                                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> 实时生成中</span>
                            ) : (
                                <span className="flex items-center gap-2 text-green-600"><CheckIcon className="w-4 h-4" /> 生成完毕</span>
                            )}
                            <span className="w-px h-3 bg-slate-200 mx-2"></span>
                            <span>{displayData.outline.length} 章节</span>
                        </div>

                        <button 
                            onClick={() => {
                                if (displayData.title && displayData.outline.length > 0) {
                                    const normalized: StratifyOutline = {
                                        title: displayData.title,
                                        pages: displayData.outline
                                    };
                                    updateStratifyTask(taskId, { status: 'outline_generated', outline: normalized });
                                    // Pass both outline AND sessionId to proceed to next step
                                    onConfirm(normalized, sessionId);
                                }
                            }}
                            disabled={isGenerating || displayData.outline.length === 0}
                            className={`
                                px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 w-full sm:w-auto justify-center
                                ${isGenerating 
                                    ? 'bg-slate-800 hover:bg-slate-700 cursor-wait opacity-80' 
                                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                            `}
                        >
                            {isGenerating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>请稍候...</span>
                                </>
                            ) : (
                                <>
                                    <span>确认并生成正文</span>
                                    <ArrowRightIcon className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Component: Split View Content Generator ---
const ContentGenerator: React.FC<{
    taskId: string;
    outline: StratifyOutline;
    onComplete: (pages: StratifyPage[]) => void;
    initialSessionId: string | null;
}> = ({ taskId, outline, onComplete, initialSessionId }) => {
    // Local State
    const [pages, setPages] = useState<(StratifyPage & { thought_process?: string; sessionId?: string; isRevising?: boolean })[]>(() => 
        outline.pages.map((p, i) => ({
            page_index: i + 1,
            title: p.title,
            content_markdown: '',
            html_content: null,
            status: 'pending',
            thought_process: '',
            isRevising: false,
        }))
    );
    
    const [activePageIndex, setActivePageIndex] = useState(1);
    const [isGlobalBusy, setIsGlobalBusy] = useState(false); // Global lock for sequential constraint
    const [showThought, setShowThought] = useState(true); // Toggle per page or global? Let's make it local toggle in UI but state is global preference
    const [revisionInput, setRevisionInput] = useState('');

    const currentSessionIdRef = useRef<string | null>(initialSessionId);
    const hasStartedRef = useRef(false);
    const [progress, setProgress] = useState(0);
    const activePageData = pages[activePageIndex - 1];

    const updatePage = (idx: number, updates: Partial<typeof pages[0]>) => {
        setPages(prev => prev.map(p => p.page_index === idx ? { ...p, ...updates } : p));
    };

    // Sequential Generation Logic
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const generateSequentially = async () => {
            setIsGlobalBusy(true);
            try {
                // Iterate through pages sequentially
                for (let i = 0; i < outline.pages.length; i++) {
                    const pageOutline = outline.pages[i];
                    const pageIdx = i + 1;

                    updatePage(pageIdx, { status: 'generating' });
                    // Auto-switch view to the page being generated if it's the first run
                    setActivePageIndex(pageIdx);

                    let buffer = '';
                    
                    try {
                        await streamGenerate(
                            {
                                prompt_name: 'generate_content',
                                variables: {
                                    outline: JSON.stringify(outline), 
                                    page_index: pageIdx,
                                    page_title: pageOutline.title,
                                    page_summary: pageOutline.content
                                },
                                // CRITICAL: Pass the current session ID to maintain context
                                session_id: currentSessionIdRef.current || undefined
                            },
                            (chunk) => {
                                buffer += chunk;
                                const { thought, content, title } = parsePageStream(buffer);
                                updatePage(pageIdx, { 
                                    content_markdown: content,
                                    thought_process: thought || undefined,
                                    title: title || pageOutline.title 
                                });
                            },
                            () => {
                                // Explicitly mark as done when stream ends successfully
                                updatePage(pageIdx, { status: 'done' });
                                setProgress(Math.round(((i + 1) / outline.pages.length) * 100));
                            },
                            (err) => {
                                console.error(`Page ${pageIdx} error:`, err);
                                updatePage(pageIdx, { status: 'failed', content_markdown: `生成失败: ${err}` });
                            },
                            (sid) => {
                                // Update the session ref so the NEXT page uses this session
                                if (sid) {
                                    currentSessionIdRef.current = sid;
                                    updatePage(pageIdx, { sessionId: sid });
                                }
                            }
                        );
                    } catch (error) {
                        console.error("Sequence error", error);
                        updatePage(pageIdx, { status: 'failed' });
                    }
                }
            } finally {
                // Ensure global busy lock is released even if errors occur
                setIsGlobalBusy(false);
            }
        };

        generateSequentially();
    }, [outline]); 

    // Handle Revision
    const handlePageRevise = async () => {
        if (!revisionInput.trim() || isGlobalBusy || activePageData.status === 'generating') return;

        const targetPageIdx = activePageData.page_index;
        const request = revisionInput;
        setRevisionInput('');
        
        setIsGlobalBusy(true); // Lock globally
        updatePage(targetPageIdx, { status: 'generating', isRevising: true, thought_process: '' });
        
        let buffer = ''; 
        
        try {
            await streamGenerate(
                {
                    prompt_name: 'revise_content',
                    variables: {
                        current_content: activePageData.content_markdown || '',
                        user_revision_request: request
                    },
                    // Use the session ID specific to this flow (which should be consistent)
                    session_id: currentSessionIdRef.current || undefined
                },
                (chunk) => {
                    buffer += chunk;
                    const { thought, content, title } = parsePageStream(buffer);
                    updatePage(targetPageIdx, { 
                        content_markdown: content,
                        thought_process: thought || undefined,
                        title: title || activePageData.title
                    });
                },
                () => {
                    updatePage(targetPageIdx, { status: 'done', isRevising: false });
                },
                (err) => {
                    alert("修改失败，请重试");
                    updatePage(targetPageIdx, { status: 'done', isRevising: false }); // Revert to done
                },
                (sid) => {
                    if (sid) currentSessionIdRef.current = sid;
                }
            );
        } finally {
            setIsGlobalBusy(false); // Unlock globally
        }
    };

    const handleCompleteAll = async () => {
        // Just pass data to next step (HTML Generation)
        onComplete(pages);
    };

    const isAllDone = pages.every(p => p.status === 'done' || p.status === 'failed');

    const renderMarkdown = (content: string) => {
        if (!content) return { __html: '' };
        if (window.marked && typeof window.marked.parse === 'function') {
            return { __html: window.marked.parse(content) };
        }
        return { __html: `<pre class="whitespace-pre-wrap font-sans">${content}</pre>` };
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden relative">
            <MarkdownStyles />
            
            {/* 1. Left Sidebar: Outline Navigation */}
            <div className="w-64 md:w-72 bg-white border-r border-slate-200 flex flex-col h-full z-10 flex-shrink-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">报告大纲</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono">{progress}%</span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {pages.map((page) => {
                        const isActive = activePageIndex === page.page_index;
                        return (
                            <button
                                key={page.page_index}
                                onClick={() => setActivePageIndex(page.page_index)}
                                className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-all ${
                                    isActive 
                                        ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200 shadow-sm' 
                                        : 'hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <div className="mt-0.5">
                                    {page.status === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-600 border border-green-200">
                                            <CheckIcon className="w-2.5 h-2.5" />
                                        </div>
                                    ) : page.status === 'generating' ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                                    ) : page.status === 'failed' ? (
                                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">!</div>
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-400 bg-white">
                                            {page.page_index}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold truncate leading-tight">{page.title}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                        {page.status === 'pending' ? '等待生成...' : 
                                         page.status === 'generating' ? (page.isRevising ? '正在修改...' : '正在撰写...') : 
                                         page.status === 'done' ? '已完成' : '失败'}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Complete Button in Sidebar */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <button 
                        onClick={handleCompleteAll}
                        disabled={!isAllDone || isGlobalBusy}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isGlobalBusy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <CheckIcon className="w-4 h-4" />}
                        {isAllDone ? '完成并进行排版' : '等待生成...'}
                    </button>
                </div>
            </div>

            {/* 2. Right Main Area: Content Reader */}
            <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
                {/* Top Bar */}
                <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">PAGE {String(activePageData.page_index).padStart(2, '0')}</div>
                        <h2 className="text-lg font-bold text-slate-800 truncate max-w-xl">{activePageData.title}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                            activePageData.status === 'generating' ? 'bg-indigo-50 text-indigo-600' :
                            activePageData.status === 'done' ? 'bg-green-50 text-green-600' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                            {activePageData.status === 'generating' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>}
                            {activePageData.status === 'done' && <CheckIcon className="w-3.5 h-3.5" />}
                            {activePageData.status === 'generating' ? 'Writing...' : activePageData.status}
                        </span>
                        
                        {/* Global Lock Indicator */}
                        {isGlobalBusy && activePageData.status !== 'generating' && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-full border border-amber-100" title="其他页面正在生成或修改中，暂无法操作">
                                <LockClosedIcon className="w-3 h-3" />
                                <span>系统忙</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar scroll-smooth">
                    <div className="max-w-3xl mx-auto space-y-8 pb-20">
                        {/* Thinking Process Accordion (Collapsible) */}
                        {activePageData.thought_process && (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all">
                                <button 
                                    onClick={() => setShowThought(!showThought)}
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                        <BrainIcon className={`w-4 h-4 ${activePageData.status === 'generating' ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`} />
                                        AI Thinking Process
                                    </div>
                                    <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${showThought ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showThought && (
                                    <div className="p-4 bg-slate-900 text-slate-300 font-mono text-xs leading-relaxed border-t border-slate-200 animate-in slide-in-from-top-2">
                                        <div className="whitespace-pre-wrap opacity-90">
                                            {activePageData.thought_process}
                                            {activePageData.status === 'generating' && !activePageData.content_markdown && (
                                                <span className="inline-block w-1.5 h-3 bg-green-500 ml-1 animate-pulse align-middle"></span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Main Markdown Content */}
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 min-h-[500px]">
                            {activePageData.content_markdown ? (
                                <div className="prose prose-lg max-w-none text-slate-700 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-indigo-600">
                                    <div dangerouslySetInnerHTML={renderMarkdown(activePageData.content_markdown)} />
                                    {activePageData.status === 'generating' && <span className="typing-cursor"></span>}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-20 opacity-30 gap-4">
                                    {activePageData.status === 'pending' ? (
                                        <>
                                            <DocumentTextIcon className="w-16 h-16 text-slate-400" />
                                            <p className="text-slate-500 font-medium">内容即将生成...</p>
                                        </>
                                    ) : (
                                        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Revision Bar */}
                <div className="p-4 border-t border-slate-200 bg-white z-20 flex-shrink-0">
                    <div className="max-w-3xl mx-auto relative">
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handlePageRevise(); }}
                            className={`flex items-center gap-2 transition-opacity ${isGlobalBusy ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
                        >
                            <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm text-slate-700 placeholder:text-slate-400"
                                    placeholder={isGlobalBusy ? "请等待当前生成任务完成后再进行修改..." : "输入修改建议，如：‘补充更多数据案例’ 或 ‘精简本段文字’..."}
                                    value={revisionInput}
                                    onChange={(e) => setRevisionInput(e.target.value)}
                                    disabled={isGlobalBusy || activePageData.status !== 'done'}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={!revisionInput.trim() || isGlobalBusy || activePageData.status !== 'done'}
                                className="px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 阶段5: HTML 排版渲染 (HtmlGenerator) ---
const HtmlGenerator: React.FC<{
    taskId: string;
    pages: StratifyPage[]; // Passed from previous step (content generated)
    onComplete: (finalPages: StratifyPage[]) => void;
}> = ({ taskId, pages: initialPages, onComplete }) => {
    // Shared State for pages
    // We only need to update html_content and status. Markdown is already there.
    const [pages, setPages] = useState<StratifyPage[]>(initialPages.map(p => ({ ...p, status: 'pending', html_content: null })));
    
    const [activePageIndex, setActivePageIndex] = useState(1);
    const [isGlobalBusy, setIsGlobalBusy] = useState(false); 
    const hasStartedRef = useRef(false);
    const [progress, setProgress] = useState(0);
    const activePageData = pages[activePageIndex - 1];

    const updatePage = (idx: number, updates: Partial<StratifyPage>) => {
        setPages(prev => prev.map(p => p.page_index === idx ? { ...p, ...updates } : p));
    };

    // Sequential HTML Generation Logic
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const generateSequentially = async () => {
            setIsGlobalBusy(true);
            try {
                for (let i = 0; i < initialPages.length; i++) {
                    const page = initialPages[i];
                    const pageIdx = i + 1;

                    updatePage(pageIdx, { status: 'generating' });
                    setActivePageIndex(pageIdx); // Auto follow progress

                    let buffer = '';
                    
                    try {
                        // Independent Session Call (session_id is undefined)
                        await streamGenerate(
                            {
                                prompt_name: 'generate_page_html',
                                variables: {
                                    page_title: page.title,
                                    page_content: page.content_markdown || ''
                                },
                                session_id: undefined // Explicitly undefined for independent context
                            },
                            (chunk) => {
                                buffer += chunk;
                                // Simple parser: accumulated chunk is the HTML content. 
                                // Ideally, parsePageStream logic could be reused if backend wraps it, 
                                // but for HTML gen usually raw stream is fine or simple extract.
                                // Let's reuse parsePageStream for robust JSON/thought handling if backend uses it.
                                const { content } = parsePageStream(buffer);
                                updatePage(pageIdx, { 
                                    html_content: content || buffer, // Fallback to raw buffer if parse fails (assuming raw stream)
                                });
                            },
                            () => {
                                updatePage(pageIdx, { status: 'done' });
                                setProgress(Math.round(((i + 1) / initialPages.length) * 100));
                            },
                            (err) => {
                                console.error(`HTML Page ${pageIdx} error:`, err);
                                updatePage(pageIdx, { status: 'failed' });
                            }
                        );
                    } catch (error) {
                        console.error("HTML Sequence error", error);
                        updatePage(pageIdx, { status: 'failed' });
                    }
                }
            } finally {
                setIsGlobalBusy(false);
            }
        };

        generateSequentially();
    }, [initialPages]);

    const handleFinalize = async () => {
        // Save to backend
        await saveStratifyPages(taskId, pages);
        await updateStratifyTask(taskId, { status: 'completed' });
        onComplete(pages);
    };

    const isAllDone = pages.every(p => p.status === 'done' || p.status === 'failed');

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden relative">
            
            {/* 1. Left Sidebar: Status & Nav */}
            <div className="w-64 md:w-72 bg-white border-r border-slate-200 flex flex-col h-full z-10 flex-shrink-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">排版渲染进度</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono">{progress}%</span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {pages.map((page) => {
                        const isActive = activePageIndex === page.page_index;
                        return (
                            <button
                                key={page.page_index}
                                onClick={() => setActivePageIndex(page.page_index)}
                                className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-all ${
                                    isActive 
                                        ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200 shadow-sm' 
                                        : 'hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <div className="mt-0.5">
                                    {page.status === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-600 border border-green-200">
                                            <CheckIcon className="w-2.5 h-2.5" />
                                        </div>
                                    ) : page.status === 'generating' ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                                    ) : page.status === 'failed' ? (
                                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">!</div>
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-400 bg-white">
                                            {page.page_index}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold truncate leading-tight">{page.title}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                        {page.status === 'pending' ? '等待排版...' : 
                                         page.status === 'generating' ? '正在渲染HTML...' : 
                                         page.status === 'done' ? '排版完成' : '失败'}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <button 
                        onClick={handleFinalize}
                        disabled={!isAllDone || isGlobalBusy}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isGlobalBusy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <CheckIcon className="w-4 h-4" />}
                        {isAllDone ? '查看最终报告' : '等待渲染...'}
                    </button>
                </div>
            </div>

            {/* 2. Right Main Area: HTML Preview */}
            <div className="flex-1 flex flex-col h-full bg-slate-100 min-w-0">
                {/* Top Bar */}
                <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">PREVIEW PAGE {String(activePageData.page_index).padStart(2, '0')}</div>
                        <h2 className="text-lg font-bold text-slate-800 truncate max-w-xl">{activePageData.title}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                            activePageData.status === 'generating' ? 'bg-indigo-50 text-indigo-600' :
                            activePageData.status === 'done' ? 'bg-green-50 text-green-600' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                            {activePageData.status === 'generating' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>}
                            {activePageData.status === 'done' && <CheckIcon className="w-3.5 h-3.5" />}
                            {activePageData.status === 'generating' ? 'Rendering...' : 'Rendered'}
                        </span>
                    </div>
                </div>

                {/* Content Preview Area */}
                <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-200/50 p-4 md:p-8">
                    <div className="w-full max-w-[1000px] h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden relative">
                        {activePageData.html_content ? (
                            <iframe 
                                srcDoc={activePageData.html_content} 
                                className="w-full h-full border-none" 
                                title="HTML Preview"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                {activePageData.status === 'generating' ? (
                                    <>
                                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <p className="text-sm font-medium text-indigo-600">AI 正在生成 HTML 代码...</p>
                                    </>
                                ) : (
                                    <>
                                        <PhotoIcon className="w-16 h-16 opacity-20" />
                                        <p className="text-sm font-medium">等待排版</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Export: Report Generator ---
export const ReportGenerator: React.FC = () => {
    const [step, setStep] = useState(1);
    const [currentTask, setCurrentTask] = useState<StratifyTask | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionContext, setSessionContext] = useState<string | null>(null); // Store session ID
    
    // Step 1: Create Task
    const handleStart = async (topic: string) => {
        setIsLoading(true);
        setSessionContext(null); // Reset session
        try {
            const task = await createStratifyTask(topic);
            setCurrentTask(task);
            setStep(2); // Move to outline generation step
        } catch (e) {
            alert("启动失败，请重试");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2 & 3: Outline Confirmed
    const handleOutlineConfirmed = (outline: StratifyOutline, sessionId: string | null) => {
        if (currentTask) {
            setCurrentTask({ ...currentTask, outline });
            if (sessionId) setSessionContext(sessionId); // Capture session for content gen
            setStep(4); // Move to content generation
        }
    };

    // Step 4: Content Generation Complete
    const handleContentComplete = (pages: StratifyPage[]) => {
        if (currentTask) {
            // Update local state with generated content
            setCurrentTask({ ...currentTask, pages });
            setStep(5); // Move to HTML generation
        }
    };

    // Step 5: HTML Generation Complete
    const handleHtmlComplete = (pages: StratifyPage[]) => {
        if (currentTask) {
            setCurrentTask({ ...currentTask, pages, status: 'completed' });
            setStep(6); // Move to Final view
        }
    };

    const handleReset = () => {
        setStep(1);
        setCurrentTask(null);
        setSessionContext(null);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
            {/* Header / Process Bar (Only show in early steps or final) */}
            {step !== 4 && step !== 5 && <ProcessFlowCards currentStep={step} />}

            <div className="flex-1 relative z-10 overflow-hidden flex flex-col min-h-0">
                {step === 1 && (
                    <IdeaInput onStart={handleStart} isLoading={isLoading} />
                )}

                {step === 4 && currentTask && currentTask.outline && (
                    <ContentGenerator 
                        taskId={currentTask.id}
                        outline={currentTask.outline}
                        onComplete={handleContentComplete}
                        initialSessionId={sessionContext}
                    />
                )}

                {step === 5 && currentTask && currentTask.pages && (
                    <HtmlGenerator 
                        taskId={currentTask.id}
                        pages={currentTask.pages} // Pass generated content pages
                        onComplete={handleHtmlComplete}
                    />
                )}

                {step === 6 && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-xl">
                            <CheckIcon className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800">报告生成完成</h2>
                        <p className="text-slate-500 max-w-md text-center">
                            您的报告已生成完毕。您可以前往“深度洞察”模块查看完整文档，或下载 PDF。
                        </p>
                        <div className="flex gap-4">
                            <button onClick={handleReset} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                                生成新报告
                            </button>
                            <a href="/#/" onClick={(e) => { e.preventDefault(); window.location.hash = '#/dives'; window.location.reload(); }} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">
                                查看报告
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Outline Modal (Controlled) */}
            {currentTask && (
                <OutlineGenerationModal 
                    isOpen={step === 2 || step === 3}
                    taskId={currentTask.id}
                    topic={currentTask.topic}
                    onClose={() => setStep(1)} 
                    onConfirm={handleOutlineConfirmed}
                />
            )}
        </div>
    );
};
