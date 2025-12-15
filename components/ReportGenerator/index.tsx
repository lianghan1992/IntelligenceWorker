
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon, 
    CloseIcon, DocumentTextIcon, CheckIcon, LightBulbIcon, BrainIcon, 
    ViewGridIcon, ChartIcon, PlayIcon, ChevronDownIcon, ChevronRightIcon,
    ClockIcon
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
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 rounded-full hidden md:block"></div>
                <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 -translate-y-1/2 rounded-full hidden md:block transition-all duration-1000 ease-in-out"
                    style={{ width: `${Math.max(0, (currentStep - 1) * 25)}%` }}
                ></div>
                
                {/* Steps Grid */}
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
                                {/* Card/Icon Node */}
                                <div className={`
                                    relative w-10 h-10 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ease-out
                                    ${isActive 
                                        ? `bg-white ${step.border} shadow-[0_0_25px_rgba(0,0,0,0.08)] scale-110 z-20 ring-4 ${step.ring}` 
                                        : isCompleted 
                                            ? 'bg-white border-indigo-100 text-indigo-600 shadow-sm ring-2 ring-indigo-50' 
                                            : 'bg-white border-gray-100 text-gray-300 shadow-sm'
                                    }
                                `}>
                                    <div className={`
                                        transition-all duration-300 transform
                                        ${isActive ? `${step.color} scale-110` : ''}
                                    `}>
                                        {isCompleted ? <CheckIcon className="w-5 h-5 md:w-6 md:h-6" /> : <step.icon className="w-5 h-5 md:w-6 md:h-6" />}
                                    </div>
                                    
                                    {/* Active Pulse */}
                                    {isActive && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${step.bg} opacity-75`}></span>
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${step.color.replace('text-', 'bg-')}`}></span>
                                        </span>
                                    )}
                                </div>
                                
                                {/* Text Labels */}
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
                {/* Background Decor */}
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

                {/* Tags */}
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

// --- Helper: Robust Content Parser ---
const parseOutlineStream = (text: string): { thought: string | null, title: string | null, outline: any[] } => {
    let thought = null;
    let title = null;
    let outline: any[] = [];

    // 1. Thought Process: Extract content between <thought> tags or JSON field
    // New model sometimes outputs raw text then JSON, or "thought_process" field
    const thoughtMatch = text.match(/"thought_process"\s*:\s*"(.*?)"/s) || text.match(/<thought>(.*?)<\/thought>/s);
    if (thoughtMatch) {
        thought = thoughtMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    // 2. Title: Pattern "title": "..." or # Title
    const titleMatchJson = text.match(/"title"\s*:\s*"(.*?)"/);
    if (titleMatchJson) {
        title = titleMatchJson[1];
    } else {
        const mdTitle = text.match(/^#\s+(.*$)/m);
        if (mdTitle) title = mdTitle[1].trim();
    }

    // 3. Outline Items: Robust Regex for streaming JSON objects
    // Matches { "title": "...", "content": "..." } even if surrounded by other text
    // Using [\s\S] to match across newlines
    const itemRegex = /{\s*"title"\s*:\s*"(.*?)"\s*,\s*"content"\s*:\s*"(.*?)"\s*}/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
        // Simple unescape for JSON strings
        const cleanTitle = match[1].replace(/\\"/g, '"');
        const cleanContent = match[2].replace(/\\"/g, '"').replace(/\\n/g, ' ');
        
        // Avoid duplicates if stream re-sends or overlaps (simple check)
        if (!outline.find(o => o.title === cleanTitle)) {
            outline.push({
                title: cleanTitle,
                content: cleanContent
            });
        }
    }

    return { thought, title, outline };
};

// --- 阶段2 & 3: 智能大纲生成模态框 (Visual Upgrade) ---
const OutlineGenerationModal: React.FC<{ 
    isOpen: boolean;
    taskId: string;
    topic: string;
    onClose: () => void;
    onConfirm: (outline: StratifyOutline) => void;
}> = ({ isOpen, taskId, topic, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalOutline, setFinalOutline] = useState<StratifyOutline | null>(null);
    const [showThought, setShowThought] = useState(true);
    
    const hasStartedRef = useRef(false);
    const contentEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Stream Trigger
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
                }
            );
        }
    }, [isOpen, taskId, topic]);

    // Auto-scroll logic (Optimized)
    useEffect(() => {
        if (scrollContainerRef.current && isGenerating) {
            const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
            // Only auto-scroll if user is near bottom
            if (scrollHeight - scrollTop - clientHeight < 200) {
                contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [streamContent, isGenerating]);

    // Parse Data
    const displayData = useMemo(() => {
        const parsed = parseOutlineStream(streamContent);
        
        if (!isGenerating && parsed.title && parsed.outline.length > 0 && !finalOutline) {
             const normalized: StratifyOutline = {
                title: parsed.title,
                pages: parsed.outline
            };
            setFinalOutline(normalized);
            updateStratifyTask(taskId, { 
                status: 'outline_generated',
                outline: normalized 
            });
        }
        return parsed;
    }, [streamContent, isGenerating, taskId, finalOutline]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500"></div>

            {/* Modal Container */}
            <div className="relative bg-white w-full max-w-4xl rounded-[24px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ring-1 ring-black/5">
                
                {/* 1. Header Area */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-colors duration-500 ${isGenerating ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                            {isGenerating ? (
                                <BrainIcon className="w-6 h-6 animate-pulse" />
                            ) : (
                                <CheckIcon className="w-6 h-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-xl tracking-tight flex items-center gap-2">
                                {isGenerating ? 'AI 智能规划中...' : '大纲构建完成'}
                                {isGenerating && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">
                                {isGenerating ? '正在深度分析主题，构建逻辑框架...' : '请审阅以下大纲，确认无误后生成正文'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Collapsible Thought Toggle */}
                    <button 
                        onClick={() => setShowThought(!showThought)}
                        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showThought ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'}`}
                    >
                        <SparklesIcon className="w-3 h-3" />
                        {showThought ? '隐藏思考过程' : '查看思考过程'}
                    </button>
                </div>

                {/* 2. Scrollable Content */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-50/50 p-6 sm:p-8 custom-scrollbar relative">
                    
                    {/* Thought Process (Collapsible) */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showThought && (displayData.thought || isGenerating) ? 'max-h-[500px] mb-8 opacity-100' : 'max-h-0 mb-0 opacity-0'}`}>
                        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                            <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-50 flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <ClockIcon className="w-3.5 h-3.5" /> AI Thinking Process
                                </span>
                            </div>
                            <div className="p-5 font-mono text-sm text-slate-600 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                                {displayData.thought ? (
                                    <div className="whitespace-pre-wrap">{displayData.thought}</div>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-400 italic">
                                        思考中 <span className="animate-pulse">...</span>
                                    </div>
                                )}
                                {isGenerating && !displayData.thought && (
                                    <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle"></span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* Title Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                                <DocumentTextIcon className="w-4 h-4" /> Proposed Title
                            </div>
                            {displayData.title ? (
                                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                                    {displayData.title}
                                </div>
                            ) : (
                                <div className="h-20 bg-slate-200/50 rounded-2xl animate-pulse"></div>
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
                                        className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-5 items-start transition-all duration-300 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 animate-in slide-in-from-bottom-4 fill-mode-backwards"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center text-sm font-bold font-mono border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1">
                                            <h4 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-indigo-700 transition-colors">{item.title}</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 group-hover:bg-white group-hover:shadow-inner transition-colors">
                                                {item.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Loading Skeleton Card */}
                                {isGenerating && (
                                    <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 bg-slate-50/30 animate-pulse">
                                        <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <span className="text-sm font-medium">正在构思下一章节...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div ref={contentEndRef} className="h-4" />
                </div>

                {/* 3. Footer Action */}
                <div className="px-8 py-5 border-t border-slate-100 bg-white z-10 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
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
                            if (isGenerating && displayData.title && displayData.outline.length > 0) {
                                const normalized: StratifyOutline = {
                                    title: displayData.title,
                                    pages: displayData.outline
                                };
                                updateStratifyTask(taskId, { status: 'outline_generated', outline: normalized });
                                onConfirm(normalized);
                            } else if (finalOutline) {
                                onConfirm(finalOutline);
                            }
                        }}
                        disabled={(!finalOutline && !isGenerating) || (isGenerating && displayData.outline.length === 0)}
                        className={`
                            px-8 py-3.5 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2
                            ${isGenerating 
                                ? 'bg-slate-800 hover:bg-slate-700 cursor-wait' 
                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                        `}
                    >
                        {isGenerating ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                <span>提前生成 ({displayData.outline.length})</span>
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
    );
};

// --- 阶段4: 并发内容生成 ---
const ContentGenerator: React.FC<{
    taskId: string;
    outline: StratifyOutline;
    onComplete: (pages: StratifyPage[]) => void;
}> = ({ taskId, outline, onComplete }) => {
    // Local state to track each page's generation status and content
    const [pages, setPages] = useState<StratifyPage[]>(() => 
        outline.pages.map((p, i) => ({
            page_index: i + 1,
            title: p.title,
            content_markdown: '',
            html_content: null,
            status: 'pending' // pending -> generating -> done
        }))
    );
    
    const [progress, setProgress] = useState(0);
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        // Start generation for all pages (Frontend Drive!)
        const generateAll = async () => {
            
            const updatePage = (idx: number, updates: Partial<StratifyPage>) => {
                setPages(prev => prev.map(p => p.page_index === idx ? { ...p, ...updates } : p));
            };

            const promises = outline.pages.map(async (pageOutline, i) => {
                const pageIdx = i + 1;
                updatePage(pageIdx, { status: 'generating' });

                let contentBuffer = '';
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
                        contentBuffer += chunk;
                        updatePage(pageIdx, { content_markdown: contentBuffer });
                    },
                    () => {
                        updatePage(pageIdx, { status: 'done' });
                    },
                    (err) => {
                        updatePage(pageIdx, { status: 'failed', content_markdown: `Error: ${err}` });
                    }
                );
            });

            await Promise.all(promises);
            
            // All done, save to backend
            const finalPages = await new Promise<StratifyPage[]>(resolve => {
                setPages(current => {
                    resolve(current);
                    return current;
                });
            });
            
            await saveStratifyPages(taskId, finalPages);
            await updateStratifyTask(taskId, { status: 'completed' });
            onComplete(finalPages);
        };

        generateAll();
    }, [outline, taskId, onComplete]);

    // Calculate progress
    useEffect(() => {
        const done = pages.filter(p => p.status === 'done').length;
        const total = pages.length;
        setProgress(Math.round((done / total) * 100));
    }, [pages]);

    return (
        <div className="max-w-5xl mx-auto p-6 pb-20 animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-8">
                 <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">内容创作引擎运行中</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">AI 正在并发撰写 {pages.length} 个章节，请稍候...</p>
                 </div>
                 <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-right">
                        <div className="text-3xl font-black text-indigo-600 font-mono">{progress}%</div>
                    </div>
                    <div className="w-12 h-12 relative">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-600 transition-all duration-500 ease-out" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * progress) / 100} />
                        </svg>
                    </div>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pages.map((page) => (
                    <div key={page.page_index} className={`
                        bg-white p-6 rounded-2xl border shadow-sm transition-all duration-300 relative overflow-hidden group
                        ${page.status === 'generating' ? 'border-indigo-500/50 ring-4 ring-indigo-500/5 shadow-indigo-100' : 'border-slate-200'}
                    `}>
                        {/* Status Bar */}
                        {page.status === 'generating' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden">
                                <div className="h-full bg-indigo-500 w-1/3 animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${page.status === 'done' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    PAGE {String(page.page_index).padStart(2, '0')}
                                </span>
                                <h3 className="font-bold text-slate-800 text-base line-clamp-1" title={page.title}>{page.title}</h3>
                            </div>
                            {page.status === 'done' && <div className="bg-green-100 p-1 rounded-full"><CheckIcon className="w-4 h-4 text-green-600" /></div>}
                            {page.status === 'generating' && <span className="text-xs font-bold text-indigo-600 animate-pulse flex items-center gap-1"><SparklesIcon className="w-3 h-3"/> Writing...</span>}
                        </div>
                        
                        <div className="bg-slate-50/50 rounded-xl p-4 font-mono text-xs h-40 overflow-y-auto text-slate-600 relative border border-slate-100 custom-scrollbar group-hover:bg-white group-hover:shadow-inner transition-colors">
                            {page.content_markdown ? (
                                <div className="whitespace-pre-wrap">{page.content_markdown}</div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    {page.status === 'pending' ? '等待队列中...' : '准备中...'}
                                </div>
                            )}
                            {page.status === 'generating' && <div className="animate-pulse w-2 h-4 bg-indigo-500 inline-block align-middle ml-1"></div>}
                        </div>
                    </div>
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

// --- 阶段5: 预览 ---
const ReportPreview: React.FC<{ 
    taskId: string;
    slides: Slide[]; 
    onStartOver: () => void 
}> = ({ taskId, slides, onStartOver }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Markdown rendering with window.marked (Assumed global)
    const renderMarkdown = (content: string) => {
        if (window.marked && typeof window.marked.parse === 'function') {
            return { __html: window.marked.parse(content) };
        }
        return { __html: `<pre class="whitespace-pre-wrap">${content}</pre>` };
    };

    const goToPrev = () => setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
    const goToNext = () => setCurrentIndex(prev => (prev + 1) % slides.length);

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 h-full flex flex-col pt-4">
            <div className="flex justify-between items-center mb-6 px-4">
                <button onClick={onStartOver} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
                    <ArrowLeftIcon className="w-4 h-4"/>
                    返回首页
                </button>
                <div className="flex gap-3">
                    <button className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                        <DownloadIcon className="w-4 h-4" /> 导出 PDF
                    </button>
                </div>
            </div>
            
            <div className="flex-1 flex gap-6 overflow-hidden px-4">
                {/* Thumbnails */}
                <div className="hidden md:flex flex-col w-56 gap-3 overflow-y-auto pr-2 custom-scrollbar pb-4">
                    {slides.map((slide, idx) => (
                        <div 
                            key={slide.id}
                            onClick={() => setCurrentIndex(idx)}
                            className={`
                                p-4 rounded-xl border cursor-pointer transition-all duration-200 group
                                ${idx === currentIndex 
                                    ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md transform scale-[1.02]' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                }
                            `}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${idx === currentIndex ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>P {idx + 1}</span>
                            </div>
                            <div className={`text-xs font-bold line-clamp-2 ${idx === currentIndex ? 'text-indigo-900' : 'text-slate-700'}`}>{slide.title}</div>
                        </div>
                    ))}
                </div>

                {/* Main Slide */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="aspect-[16/9] w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 sm:p-12 md:p-16 flex flex-col relative overflow-hidden group">
                        {/* Page Number Watermark */}
                        <div className="absolute top-6 right-8 text-slate-100 font-black text-6xl opacity-50 pointer-events-none select-none font-mono">
                            {String(currentIndex + 1).padStart(2, '0')}
                        </div>
                        
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-8 leading-tight border-b-2 border-slate-100 pb-6 relative z-10">
                            {slides[currentIndex].title}
                        </h3>
                        
                        <div className="text-base sm:text-lg text-slate-600 leading-relaxed prose prose-slate max-w-none flex-1 overflow-y-auto custom-scrollbar relative z-10">
                            <div dangerouslySetInnerHTML={renderMarkdown(slides[currentIndex].content)} />
                        </div>
                        
                        {/* Nav Overlay */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex justify-between items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={goToPrev} className="pointer-events-auto p-3 bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-lg border border-slate-100 backdrop-blur-sm transition-all hover:scale-110"><ArrowLeftIcon className="w-6 h-6" /></button>
                            <button onClick={goToNext} className="pointer-events-auto p-3 bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-lg border border-slate-100 backdrop-blur-sm transition-all hover:scale-110"><ArrowRightIcon className="w-6 h-6" /></button>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex justify-center gap-2">
                        {slides.map((_, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-indigo-600 w-6' : 'bg-slate-300 hover:bg-slate-400'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Container ---
export const ReportGenerator: React.FC = () => {
    const [flowState, setFlowState] = useState<'idea' | 'generatingOutline' | 'outlineReview' | 'generatingContent' | 'preview'>('idea');
    const [taskId, setTaskId] = useState<string | null>(null);
    const [topic, setTopic] = useState('');
    const [outline, setOutline] = useState<StratifyOutline | null>(null);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Initial Task Creation
    const handleStartTask = async (userIdea: string) => {
        setIsCreating(true);
        setTopic(userIdea);
        try {
            const task = await createStratifyTask(userIdea);
            setTaskId(task.id);
            setFlowState('generatingOutline');
        } catch (e) {
            alert('创建任务失败');
        } finally {
            setIsCreating(false);
        }
    };
    
    // Outline Confirmation
    const handleOutlineConfirm = (confirmedOutline: StratifyOutline) => {
        setOutline(confirmedOutline);
        setFlowState('generatingContent');
    };

    // Content Generation Completion
    const handleContentComplete = (pages: StratifyPage[]) => {
        const uiSlides: Slide[] = pages.map(p => ({
            id: `p-${p.page_index}`,
            title: p.title,
            content: p.content_markdown || '',
            status: 'done'
        }));
        setSlides(uiSlides);
        setFlowState('preview');
    };
    
    const handleStartOver = () => {
        setTaskId(null);
        setOutline(null);
        setSlides([]);
        setFlowState('idea');
    };

    const getStepFromState = (state: string) => {
        switch(state) {
            case 'idea': return 1;
            case 'generatingOutline': return 2;
            case 'outlineReview': return 3; // Technically inside modal flow, but conceptually review
            case 'generatingContent': return 4;
            case 'preview': return 5;
            default: return 1;
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-[#f8fafc] min-h-full flex flex-col font-sans">
            <ProcessFlowCards currentStep={getStepFromState(flowState)} />
            
            <div className="flex-1 relative">
                {flowState === 'idea' && (
                    <IdeaInput onStart={handleStartTask} isLoading={isCreating} />
                )}
                
                {/* 
                    New Modal-based Outline Generation
                    It triggers automatically when state is 'generatingOutline' and we have a task ID
                */}
                <OutlineGenerationModal 
                    isOpen={flowState === 'generatingOutline' && !!taskId}
                    taskId={taskId!}
                    topic={topic}
                    onClose={() => { /* Prevent closing manually during generation */ }}
                    onConfirm={handleOutlineConfirm}
                />

                {flowState === 'generatingContent' && taskId && outline && (
                    <ContentGenerator 
                        taskId={taskId}
                        outline={outline}
                        onComplete={handleContentComplete} 
                    />
                )}
                
                {flowState === 'preview' && taskId && (
                    <ReportPreview 
                        taskId={taskId}
                        slides={slides} 
                        onStartOver={handleStartOver} 
                    />
                )}
            </div>
        </div>
    );
};
