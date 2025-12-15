
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon, 
    CloseIcon, DocumentTextIcon, CheckIcon, LightBulbIcon, BrainIcon, 
    ViewGridIcon, ChartIcon, PlayIcon, ChevronDownIcon, ChevronRightIcon,
    ClockIcon, PencilIcon, RefreshIcon
} from '../icons';
import { Slide, StratifyTask, StratifyPage, StratifyOutline } from '../../types';
import { 
    createStratifyTask, 
    updateStratifyTask, 
    saveStratifyPages, 
    streamGenerate, 
} from '../../api/stratify';

// --- 流程动画卡片组件 ---
const ProcessFlowCards: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, icon: LightBulbIcon, title: "意图识别", desc: "语义解析", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-100" },
        { id: 2, icon: BrainIcon, title: "大纲生成", desc: "逻辑构建", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", ring: "ring-purple-100" },
        { id: 3, icon: ViewGridIcon, title: "结构规划", desc: "内容填充", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-100" },
        { id: 4, icon: SparklesIcon, title: "内容生成", desc: "RAG写作", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200", ring: "ring-pink-100" },
        { id: 5, icon: ChartIcon, title: "完成", desc: "报告预览", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-100" },
    ];

    return (
        <div className="w-full max-w-5xl mx-auto mb-8 px-4 pt-6">
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 rounded-full hidden md:block"></div>
                <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 -translate-y-1/2 rounded-full hidden md:block transition-all duration-1000 ease-in-out"
                    style={{ width: `${Math.max(0, (currentStep - 1) * 25)}%` }}
                ></div>
                
                <div className="grid grid-cols-5 gap-2 md:gap-4 relative z-10">
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
                                    relative w-10 h-10 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ease-out
                                    ${isActive 
                                        ? `bg-white ${step.border} shadow-[0_0_25px_rgba(0,0,0,0.08)] scale-110 z-20 ring-4 ${step.ring}` 
                                        : isCompleted 
                                            ? 'bg-white border-indigo-100 text-indigo-600 shadow-sm ring-2 ring-indigo-50' 
                                            : 'bg-white border-gray-100 text-gray-300 shadow-sm'
                                    }
                                `}>
                                    <div className={`transition-all duration-300 transform ${isActive ? `${step.color} scale-110` : ''}`}>
                                        {isCompleted ? <CheckIcon className="w-5 h-5 md:w-6 md:h-6" /> : <step.icon className="w-5 h-5 md:w-6 md:h-6" />}
                                    </div>
                                    {isActive && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${step.bg} opacity-75`}></span>
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${step.color.replace('text-', 'bg-')}`}></span>
                                        </span>
                                    )}
                                </div>
                                <div className={`mt-3 space-y-0.5 transition-all duration-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-70'}`}>
                                    <h4 className={`text-[10px] md:text-xs font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {step.title}
                                    </h4>
                                    <p className="hidden md:block text-[10px] text-gray-400 font-medium">{step.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- 阶段1: 创意输入 ---
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

// --- Helper: Incremental Stream Parser for Outline ---
const parseIncrementalStream = (text: string): { thought: string | null, title: string | null, outline: any[] } => {
    let thought = null;
    let title = null;
    let outline: any[] = [];

    // 1. Extract Thought Process (Incremental)
    const thoughtRegex = /"thought_process"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/s;
    const thoughtMatch = text.match(thoughtRegex);
    if (thoughtMatch) {
        // Handle escaped newlines for display
        thought = thoughtMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    // 2. Extract Title (Incremental)
    const titleRegex = /"title"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/;
    const titleMatch = text.match(titleRegex);
    if (titleMatch) {
        title = titleMatch[1];
    } else {
        // Fallback for markdown format title
        const mdTitle = text.match(/^#\s+(.*$)/m);
        if (mdTitle) title = mdTitle[1].trim();
    }

    // 3. Extract Outline Items (Incremental)
    // Support both "content" and "summary" keys as the LLM might interchange them
    const outlineStartIdx = text.indexOf('"outline"');
    if (outlineStartIdx !== -1) {
        const outlineSection = text.slice(outlineStartIdx);
        // Regex to capture title and either content or summary
        // Note: The structure is typically [{"title": "...", "summary": "..."}, ...]
        const itemRegex = /{\s*"title"\s*:\s*"(.*?)"\s*,\s*"(?:content|summary)"\s*:\s*"(.*?)(?:"\s*}|"\s*,|"$)/gs;
        
        let match;
        while ((match = itemRegex.exec(outlineSection)) !== null) {
            const cleanTitle = match[1].replace(/\\"/g, '"');
            // Content might be partial (hit end of string)
            const cleanContent = match[2].replace(/\\"/g, '"').replace(/\\n/g, ' ');
            
            // Only add if we have at least a title
            if (cleanTitle) {
                outline.push({
                    title: cleanTitle,
                    content: cleanContent
                });
            }
        }
    }

    return { thought, title, outline };
};

// --- Helper: Incremental Stream Parser for Content (Page) ---
// Parses: { "thought_process": "...", "title": "...", "content": "..." }
const parsePageStream = (text: string) => {
    let thought = null;
    let content = '';
    let title = null;

    // Extract thought
    const thoughtMatch = text.match(/"thought_process"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/s);
    if (thoughtMatch) {
        thought = thoughtMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    // Extract Title (if present)
    const titleMatch = text.match(/"title"\s*:\s*"(.*?)(?:"\s*,|"\s*}|$)/);
    if (titleMatch) {
        title = titleMatch[1];
    }

    // Extract content
    // We look for "content": " ... and take everything after it until the end or closing quote
    const contentStartMatch = text.match(/"content"\s*:\s*"/);
    if (contentStartMatch && contentStartMatch.index !== undefined) {
        const start = contentStartMatch.index + contentStartMatch[0].length;
        let raw = text.slice(start);
        
        // Robust cleanup for end of stream or end of JSON
        // If it looks like it ends with the JSON closing sequence
        if (raw.match(/"\s*}\s*(```)?\s*$/)) {
             raw = raw.replace(/"\s*}\s*(```)?\s*$/, '');
        } else if (raw.endsWith('"')) {
             // Check if it's an escaped quote (part of content) or real closing quote
             if (!raw.endsWith('\\"')) {
                 raw = raw.slice(0, -1);
             }
        }

        // Unescape JSON string
        content = raw
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\t/g, '\t');
    }

    return { thought, content, title };
};

// --- 阶段2 & 3: 智能大纲生成模态框 (Visual Upgrade) ---
const OutlineGenerationModal: React.FC<{ 
    isOpen: boolean;
    taskId: string;
    topic: string;
    onClose: () => void;
    onConfirm: (outline: StratifyOutline) => void;
}> = ({ isOpen, taskId, topic, onClose, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalOutline, setFinalOutline] = useState<StratifyOutline | null>(null);
    const [showThought, setShowThought] = useState(true);
    const [showDebug, setShowDebug] = useState(false); // Debug state
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
                    setSessionId(sid);
                }
            );
        }
    }, [isOpen, taskId, topic]);

    // Handle Revision Request
    const handleReviseOutline = async () => {
        if (!revisionInput.trim() || !sessionId || isGenerating) return;
        
        setIsRevising(true);
        setIsGenerating(true);
        setStreamContent(''); // Clear previous stream for new one
        setRevisionInput('');
        
        // Pass the current structured outline as context if needed, or rely on session history.
        // Based on backend API: revise_outline variables: current_outline, user_revision_request
        // We will pass the full JSON string of the current parsed outline.
        
        const currentOutlineStr = JSON.stringify(displayData.outline);

        streamGenerate(
            {
                prompt_name: 'revise_outline',
                variables: { 
                    current_outline: currentOutlineStr, 
                    user_revision_request: revisionInput 
                },
                session_id: sessionId // Maintain session
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

    // Smart Auto-scroll: Only if user is near bottom
    useEffect(() => {
        if (scrollContainerRef.current && isGenerating) {
            const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
            if (isNearBottom) {
                contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [streamContent, isGenerating]);

    // Parse Data using the incremental parser
    const displayData = useMemo(() => {
        const parsed = parseIncrementalStream(streamContent);
        return parsed;
    }, [streamContent]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with strong blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}></div>

            {/* Modal Container */}
            <div className="relative bg-white/95 w-full max-w-4xl rounded-[24px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ring-1 ring-black/5">
                
                {/* 1. Header Area */}
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

                {/* 2. Scrollable Content */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-50/50 p-6 sm:p-8 custom-scrollbar relative space-y-8">
                    
                    {/* A. Thinking Process (Terminal Style) */}
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

                    {/* B. Generated Result (Document Style) */}
                    <div className="space-y-6">
                        {/* Title Section */}
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

                        {/* Outline Cards */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                                <ViewGridIcon className="w-4 h-4" /> Structural Outline
                            </div>
                            
                            <div className="grid gap-4">
                                {displayData.outline.map((item: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        className="group bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex gap-5 items-start transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-200 animate-in slide-in-from-bottom-4 fill-mode-backwards hover:-translate-y-0.5"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center text-sm font-bold font-mono border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300 mt-1">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-indigo-700 transition-colors">
                                                {item.title}
                                            </h4>
                                            <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600">
                                                {item.content}
                                                {/* If this is the last item and still generating, show cursor */}
                                                {isGenerating && idx === displayData.outline.length - 1 && (
                                                    <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full ml-1 animate-ping"></span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Loading Skeleton Card (When thinking but no new item yet) */}
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

                {/* Debug Panel (Optional) */}
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

                {/* 3. Footer Action */}
                <div className="px-8 py-5 border-t border-slate-100 bg-white z-10 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
                    {/* Revision Input Area (Only visible when not generating) */}
                    {!isGenerating && (
                        <div className="flex-1 w-full flex items-center gap-2">
                            <input 
                                type="text" 
                                value={revisionInput}
                                onChange={(e) => setRevisionInput(e.target.value)}
                                placeholder="输入修改建议，如：'增加关于自动驾驶的章节' 或 '让语气更专业'"
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
                                    onConfirm(normalized);
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

// --- Component: Page Generation Card ---
const PageGenerationCard: React.FC<{ 
    page: StratifyPage & { thought_process?: string; sessionId?: string };
    onRevise: (pageIndex: number, request: string) => void;
    isRevising: boolean;
}> = ({ page, onRevise, isRevising }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [revisionInput, setRevisionInput] = useState('');
    const [showRevisionInput, setShowRevisionInput] = useState(false);

    // Auto-scroll to bottom when content updates
    useEffect(() => {
        if (scrollRef.current && page.status === 'generating') {
            // Use scrollTo with smooth behavior for natural effect
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [page.content_markdown, page.status, page.thought_process]);

    const renderMarkdown = (content: string) => {
        if (!content) return { __html: '' };
        if (window.marked && typeof window.marked.parse === 'function') {
            // Add custom class for prose
            return { __html: window.marked.parse(content) };
        }
        return { __html: `<pre class="whitespace-pre-wrap font-sans">${content}</pre>` };
    };

    const handleRevisionSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!revisionInput.trim()) return;
        onRevise(page.page_index, revisionInput);
        setRevisionInput('');
        setShowRevisionInput(false);
    };

    return (
        <div 
            className={`
                bg-white rounded-2xl border shadow-sm transition-all duration-500 relative overflow-hidden group flex flex-col h-[30rem]
                ${page.status === 'generating' 
                    ? 'border-indigo-500/50 ring-4 ring-indigo-500/10 shadow-xl shadow-indigo-500/10 scale-[1.01] z-10' 
                    : 'border-slate-200 hover:shadow-md hover:border-slate-300'
                }
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Status Bar / Header */}
            <div className={`px-5 py-4 border-b flex justify-between items-center flex-shrink-0 ${page.status === 'generating' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded border tracking-wider flex-shrink-0 ${
                        page.status === 'done' ? 'bg-green-100 text-green-700 border-green-200' : 
                        page.status === 'generating' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 
                        'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                        PAGE {String(page.page_index).padStart(2, '0')}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm truncate" title={page.title}>{page.title}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                    {page.status === 'done' && !isRevising && (
                        <button 
                            onClick={() => setShowRevisionInput(!showRevisionInput)}
                            className={`p-1.5 rounded-lg transition-all text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 ${isHovered || showRevisionInput ? 'opacity-100' : 'opacity-0'}`}
                            title="修改本页"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    )}
                    {page.status === 'done' && <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />}
                    {page.status === 'generating' && (
                        <div className="flex items-center gap-2 text-indigo-600 flex-shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider animate-pulse hidden sm:inline">{isRevising ? 'Revising' : 'Writing'}</span>
                            <div className="flex gap-0.5">
                                <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce"></span>
                                <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                                <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Revision Input Overlay */}
            {showRevisionInput && (
                <div className="absolute top-[60px] left-0 right-0 z-20 p-3 bg-white border-b border-indigo-100 shadow-md animate-in slide-in-from-top-2">
                    <form onSubmit={handleRevisionSubmit} className="flex gap-2">
                        <input 
                            type="text" 
                            autoFocus
                            value={revisionInput}
                            onChange={(e) => setRevisionInput(e.target.value)}
                            placeholder="输入修改意见，例如：'精简本页内容'..."
                            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                            type="submit"
                            disabled={!revisionInput.trim()}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            确认
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowRevisionInput(false)}
                            className="p-2 text-slate-400 hover:text-slate-600"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}

            <div 
                ref={scrollRef}
                className="flex-1 bg-slate-50/30 p-6 font-sans text-sm overflow-y-auto relative custom-scrollbar group-hover:bg-white transition-colors"
            >
                {/* Empty State / Pending */}
                {!page.content_markdown && !page.thought_process && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-60">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" style={{ animationDuration: '3s' }}></div>
                        <span className="text-xs font-medium">准备中...</span>
                    </div>
                )}

                {/* Thinking State */}
                {page.status === 'generating' && !page.content_markdown && page.thought_process && (
                    <div className="bg-slate-900 rounded-lg p-4 mb-4 font-mono text-xs text-green-400 border border-slate-800 shadow-inner animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                            <BrainIcon className="w-3 h-3" /> AI Thinking
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed opacity-90">
                            {page.thought_process}
                            <span className="inline-block w-1.5 h-3 bg-green-500 ml-1 animate-pulse align-middle"></span>
                        </div>
                    </div>
                )}

                {/* Content Stream */}
                {page.content_markdown && (
                    <div className="prose prose-sm max-w-none prose-slate prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-800 animate-in fade-in duration-500">
                        <div dangerouslySetInnerHTML={renderMarkdown(page.content_markdown)} />
                        {page.status === 'generating' && (
                            <span className="inline-block w-2 h-5 bg-indigo-500 ml-1 animate-pulse align-middle shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 阶段4: 并发内容生成 ---
const ContentGenerator: React.FC<{
    taskId: string;
    outline: StratifyOutline;
    onComplete: (pages: StratifyPage[]) => void;
}> = ({ taskId, outline, onComplete }) => {
    // Local state to track each page's generation status and content
    // Added thought_process to state for live feedback
    const [pages, setPages] = useState<(StratifyPage & { thought_process?: string; sessionId?: string; isRevising?: boolean })[]>(() => 
        outline.pages.map((p, i) => ({
            page_index: i + 1,
            title: p.title,
            content_markdown: '',
            html_content: null,
            status: 'pending', // pending -> generating -> done
            thought_process: '',
            isRevising: false
        }))
    );
    
    const [progress, setProgress] = useState(0);
    const hasStartedRef = useRef(false);

    const updatePage = (idx: number, updates: Partial<StratifyPage & { thought_process?: string; sessionId?: string; isRevising?: boolean }>) => {
        setPages(prev => prev.map(p => p.page_index === idx ? { ...p, ...updates } : p));
    };

    // Initial Generation
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        // Start generation for all pages (Frontend Drive!)
        const generateAll = async () => {
            const promises = outline.pages.map(async (pageOutline, i) => {
                const pageIdx = i + 1;
                updatePage(pageIdx, { status: 'generating' });

                let buffer = '';
                await streamGenerate(
                    {
                        prompt_name: 'generate_content',
                        variables: {
                            outline: JSON.stringify(outline), // Pass full context
                            page_index: pageIdx,
                            page_title: pageOutline.title,
                            page_summary: pageOutline.content
                        }
                    },
                    (chunk) => {
                        buffer += chunk;
                        // Real-time parsing of the JSON stream
                        const { thought, content, title } = parsePageStream(buffer);
                        updatePage(pageIdx, { 
                            content_markdown: content,
                            thought_process: thought || undefined,
                            title: title || pageOutline.title // Update title if model refines it
                        });
                    },
                    () => {
                        updatePage(pageIdx, { status: 'done' });
                    },
                    (err) => {
                        updatePage(pageIdx, { status: 'failed', content_markdown: `Error: ${err}` });
                    },
                    (sessionId) => {
                        updatePage(pageIdx, { sessionId });
                    }
                );
            });

            await Promise.all(promises);
        };

        generateAll();
    }, [outline]);

    // Handle Page Revision
    const handlePageRevise = async (pageIndex: number, request: string) => {
        const targetPage = pages.find(p => p.page_index === pageIndex);
        if (!targetPage || targetPage.status === 'generating') return;

        updatePage(pageIndex, { status: 'generating', isRevising: true, thought_process: '' });
        
        let buffer = ''; // Clear buffer for new content stream (replacement)
        
        // Use existing session if available, otherwise just use current content as context
        const variables = {
            current_content: targetPage.content_markdown || '',
            user_revision_request: request
        };

        streamGenerate(
            {
                prompt_name: 'revise_content',
                variables,
                session_id: targetPage.sessionId
            },
            (chunk) => {
                buffer += chunk;
                const { thought, content, title } = parsePageStream(buffer);
                updatePage(pageIndex, { 
                    content_markdown: content,
                    thought_process: thought || undefined,
                    title: title || targetPage.title
                });
            },
            () => {
                updatePage(pageIndex, { status: 'done', isRevising: false });
            },
            (err) => {
                console.error("Revision failed", err);
                updatePage(pageIndex, { status: 'done', isRevising: false }); // Revert status but keep error logs?
                alert("修改失败，请重试");
            }
        );
    };

    const handleCompleteAll = async () => {
        // Save to backend
        const finalPages = pages.map(({ thought_process, sessionId, isRevising, ...rest }) => rest);
        await saveStratifyPages(taskId, finalPages);
        await updateStratifyTask(taskId, { status: 'completed' });
        onComplete(finalPages);
    };

    // Calculate progress
    useEffect(() => {
        const done = pages.filter(p => p.status === 'done').length;
        const total = pages.length;
        setProgress(Math.round((done / total) * 100));
    }, [pages]);

    const isAllDone = pages.every(p => p.status === 'done' || p.status === 'failed');

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                 <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">内容创作引擎运行中</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium flex items-center gap-2">
                        {!isAllDone && (
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                            </span>
                        )}
                        {isAllDone ? '所有章节已生成，您可以逐页进行修改或直接完成。' : `AI 正在并发撰写 ${pages.length} 个章节，请稍候...`}
                    </p>
                 </div>
                 <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-right">
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 font-mono">{progress}%</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</div>
                    </div>
                    {isAllDone ? (
                        <button 
                            onClick={handleCompleteAll}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                            完成创作 <ArrowRightIcon className="w-5 h-5"/>
                        </button>
                    ) : (
                        <div className="w-16 h-16 relative">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-indigo-600 transition-all duration-500 ease-out" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * progress) / 100} strokeLinecap="round" />
                            </svg>
                        </div>
                    )}
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pages.map((page) => (
                    <PageGenerationCard 
                        key={page.page_index} 
                        page={page} 
                        onRevise={handlePageRevise}
                        isRevising={!!page.isRevising}
                    />
                ))}
            </div>
            
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
            `}</style>
        </div>
    );
};

// --- Main Export: Report Generator ---
export const ReportGenerator: React.FC = () => {
    const [step, setStep] = useState(1);
    const [currentTask, setCurrentTask] = useState<StratifyTask | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Step 1: Create Task
    const handleStart = async (topic: string) => {
        setIsLoading(true);
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
    const handleOutlineConfirmed = (outline: StratifyOutline) => {
        if (currentTask) {
            setCurrentTask({ ...currentTask, outline });
            setStep(4); // Move to content generation
        }
    };

    // Step 4: Content Generation Complete
    const handleContentComplete = (pages: StratifyPage[]) => {
        if (currentTask) {
            setCurrentTask({ ...currentTask, pages, status: 'completed' });
            setStep(5);
        }
    };

    const handleReset = () => {
        setStep(1);
        setCurrentTask(null);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
            {/* Header / Process Bar */}
            <ProcessFlowCards currentStep={step} />

            <div className="flex-1 relative z-10 overflow-hidden">
                {step === 1 && (
                    <IdeaInput onStart={handleStart} isLoading={isLoading} />
                )}

                {step === 4 && currentTask && currentTask.outline && (
                    <ContentGenerator 
                        taskId={currentTask.id}
                        outline={currentTask.outline}
                        onComplete={handleContentComplete}
                    />
                )}

                {step === 5 && (
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
                            <a href="/#/" onClick={(e) => { e.preventDefault(); /* Navigate logic if needed or href for simplicity */ window.location.hash = '#/dives'; window.location.reload(); }} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">
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
                    onClose={() => setStep(1)} // Cancel
                    onConfirm={handleOutlineConfirmed}
                />
            )}
        </div>
    );
};
