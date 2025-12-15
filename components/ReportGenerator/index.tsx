
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon, 
    CloseIcon, DocumentTextIcon, CheckIcon, LightBulbIcon, BrainIcon, 
    ViewGridIcon, ChartIcon, PlayIcon, ChevronDownIcon, ChevronRightIcon
} from '../icons';
import { Slide, StratifyTask, StratifyPage, StratifyOutline } from '../../types';
import { 
    createStratifyTask, 
    updateStratifyTask, 
    saveStratifyPages, 
    streamGenerate, 
    parseLlmJson 
} from '../../api/stratify';

// --- 流程动画卡片组件 ---
const ProcessFlowCards: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, icon: LightBulbIcon, title: "意图识别", desc: "语义解析", color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" },
        { id: 2, icon: BrainIcon, title: "大纲生成", desc: "逻辑构建", color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200" },
        { id: 3, icon: ViewGridIcon, title: "结构规划", desc: "内容填充", color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
        { id: 4, icon: SparklesIcon, title: "内容生成", desc: "RAG写作", color: "text-pink-600", bg: "bg-pink-100", border: "border-pink-200" },
        { id: 5, icon: ChartIcon, title: "完成", desc: "报告预览", color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" },
    ];

    return (
        <div className="w-full max-w-5xl mx-auto mb-6 px-4 pt-4">
            <div className="relative">
                {/* Connecting Line Background */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full hidden md:block"></div>
                
                {/* Steps Grid */}
                <div className="grid grid-cols-5 gap-2 md:gap-4 relative z-10">
                    {steps.map((step, i) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        const isPending = currentStep < step.id;

                        return (
                            <div 
                                key={step.id} 
                                className={`flex flex-col items-center text-center transition-all duration-500 ${isPending ? 'opacity-60 grayscale' : 'opacity-100'}`}
                            >
                                {/* Connector Progress (Active Line) */}
                                {i < steps.length - 1 && isCompleted && (
                                    <div className="hidden md:block absolute top-1/2 left-[10%] w-[20%] h-1 -translate-y-1/2 bg-indigo-500 transition-all duration-1000" style={{ left: `${(i * 20) + 10}%` }}></div>
                                )}

                                {/* Card/Icon Node */}
                                <div className={`
                                    relative w-10 h-10 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
                                    ${isActive 
                                        ? `bg-white ${step.border} shadow-[0_0_20px_rgba(0,0,0,0.1)] scale-110 z-20 ring-4 ring-white` 
                                        : isCompleted 
                                            ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' 
                                            : 'bg-gray-50 border-transparent text-gray-400'
                                    }
                                `}>
                                    <div className={`
                                        transition-colors duration-300
                                        ${isActive ? step.color : ''}
                                    `}>
                                        {isCompleted ? <CheckIcon className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                    </div>
                                </div>
                                
                                {/* Text Labels */}
                                <div className="mt-2 md:mt-3 space-y-0.5">
                                    <h4 className={`text-[10px] md:text-xs font-bold transition-colors ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
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

// --- 阶段1: 创意输入 ---
const IdeaInput: React.FC<{ onStart: (idea: string) => void, isLoading: boolean }> = ({ onStart, isLoading }) => {
    const [idea, setIdea] = useState('');

    return (
        <div className="flex flex-col items-center justify-start h-full overflow-y-auto pb-20 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="w-full max-w-3xl text-center px-4 mt-8 md:mt-16">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">从一个想法开始</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    描述您报告的核心概念，AI 将为您完成从<span className="text-indigo-600 font-semibold">知识检索</span>到<span className="text-indigo-600 font-semibold">逻辑构建</span>的全过程。
                </p>
                
                <div className="mt-8 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[20px] opacity-20 group-hover:opacity-40 transition duration-500 blur-lg"></div>
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="例如：‘士大夫精神的现代转型与商业价值’"
                        className="relative w-full h-48 p-6 text-base bg-white rounded-2xl shadow-xl border border-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        disabled={isLoading}
                    />
                </div>

                <div className="mt-8 flex justify-center">
                    <button 
                        onClick={() => onStart(idea)}
                        disabled={!idea.trim() || isLoading}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2 min-w-[160px]"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                初始化...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                立即生成
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Helper: Robust Content Parser ---
// Extracts structured data even from streaming/partial JSON or Markdown
const parseOutlineStream = (text: string): { thought: string | null, title: string | null, outline: any[] } => {
    let thought = null;
    let title = null;
    let outline: any[] = [];

    // 1. Try to extract Thought Process
    // Pattern: "thought_process": "..." OR **Thought:** ...
    const thoughtMatchJson = text.match(/"thought_process"\s*:\s*"(.*?)"/s); // Simple JSON match
    if (thoughtMatchJson) {
        thought = thoughtMatchJson[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    // 2. Try to extract Title
    // Pattern: "title": "..." OR # Title
    const titleMatchJson = text.match(/"title"\s*:\s*"(.*?)"/);
    if (titleMatchJson) {
        title = titleMatchJson[1];
    } else {
        // Fallback Markdown Title
        const mdTitle = text.match(/^#\s+(.*$)/m);
        if (mdTitle) title = mdTitle[1];
    }

    // 3. Try to extract Outline Items
    // Strategy A: JSON Array Parsing (Best for full data)
    try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const potentialJson = text.substring(jsonStart, jsonEnd + 1);
            // Attempt to clean trailing commas which often break JSON.parse in streaming
            const cleanedJson = potentialJson.replace(/,\s*([\]}])/g, '$1'); 
            const parsed = JSON.parse(cleanedJson);
            if (parsed.outline || parsed.pages) {
                outline = parsed.outline || parsed.pages;
                if (!title && parsed.title) title = parsed.title;
                if (!thought && parsed.thought_process) thought = parsed.thought_process;
                return { thought, title, outline }; // Return early if JSON parse successful
            }
        }
    } catch (e) {
        // Continue to regex fallback
    }

    // Strategy B: Regex for JSON-like structure (for partial streams)
    // Matches objects inside the outline array: { "title": "...", "content": "..." }
    const itemRegex = /{\s*"title"\s*:\s*"(.*?)"\s*,\s*"content"\s*:\s*"(.*?)"\s*}/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
        outline.push({
            title: match[1],
            content: match[2]
        });
    }

    return { thought, title, outline };
};

// --- 阶段2 & 3: 智能大纲生成模态框 ---
const OutlineGenerationModal: React.FC<{ 
    isOpen: boolean;
    taskId: string;
    topic: string;
    onClose: () => void; // Usually disabled during generation
    onConfirm: (outline: StratifyOutline) => void;
}> = ({ isOpen, taskId, topic, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalOutline, setFinalOutline] = useState<StratifyOutline | null>(null);
    const [showThought, setShowThought] = useState(true);
    const hasStartedRef = useRef(false);
    const contentEndRef = useRef<HTMLDivElement>(null);

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

    // Auto-scroll to bottom of modal content
    useEffect(() => {
        if (contentEndRef.current && isGenerating) {
            contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [streamContent, isGenerating]);

    // Extract Display Data from Stream
    const displayData = useMemo(() => {
        const parsed = parseOutlineStream(streamContent);
        
        // If generation finished and we have data, prepare final object
        if (!isGenerating && parsed.title && parsed.outline.length > 0 && !finalOutline) {
             const normalized: StratifyOutline = {
                title: parsed.title,
                pages: parsed.outline
            };
            setFinalOutline(normalized);
            // Sync to backend silently
            updateStratifyTask(taskId, { 
                status: 'outline_generated',
                outline: normalized 
            });
        }
        
        return parsed;
    }, [streamContent, isGenerating, taskId, finalOutline]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <BrainIcon className={`w-5 h-5 ${isGenerating ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">
                                {isGenerating ? 'AI 智能规划中...' : '大纲生成完成'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {isGenerating ? '正在分析语义并构建逻辑结构' : '请确认以下大纲内容'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
                    
                    {/* 1. Thought Process (Collapsible) */}
                    {(displayData.thought || isGenerating) && (
                        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden transition-all duration-300">
                            <button 
                                onClick={() => setShowThought(!showThought)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50/50 hover:bg-indigo-50 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                                    <SparklesIcon className="w-4 h-4" />
                                    AI 思考过程
                                </div>
                                {isGenerating && <span className="text-xs text-indigo-500 animate-pulse font-medium">Thinking...</span>}
                                {!isGenerating && <ChevronDownIcon className={`w-4 h-4 text-indigo-400 transition-transform ${showThought ? 'rotate-180' : ''}`} />}
                            </button>
                            
                            {(showThought || isGenerating) && (
                                <div className="p-4 text-sm text-slate-600 leading-relaxed font-mono bg-white border-t border-indigo-50">
                                    {displayData.thought ? displayData.thought : (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. Title Section */}
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-bold uppercase tracking-wider pl-1">
                            <DocumentTextIcon className="w-3.5 h-3.5" /> 拟定标题
                        </div>
                        {displayData.title ? (
                            <div className="text-xl md:text-2xl font-extrabold text-slate-900 bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                                {displayData.title}
                            </div>
                        ) : (
                            <div className="h-16 bg-slate-200/50 rounded-xl animate-pulse"></div>
                        )}
                    </div>

                    {/* 3. Outline Cards */}
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 delay-200">
                        <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider pl-1">
                            <ViewGridIcon className="w-3.5 h-3.5" /> 结构大纲
                        </div>
                        
                        {displayData.outline.length > 0 ? (
                            <div className="space-y-3">
                                {displayData.outline.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-start hover:shadow-md transition-shadow group">
                                        <span className="flex-shrink-0 w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center text-sm font-bold font-mono border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="font-bold text-slate-800 text-base mb-1">{item.title}</div>
                                            <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                {item.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isGenerating && (
                                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm animate-pulse">
                                        正在生成后续章节...
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 animate-pulse">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                                            <div className="h-10 bg-slate-100 rounded w-full"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div ref={contentEndRef} />
                </div>

                {/* Footer Action */}
                <div className="p-5 border-t border-slate-200 bg-white flex justify-end items-center gap-4 flex-shrink-0">
                    <div className="text-xs text-slate-400 hidden sm:block">
                        {isGenerating ? 'AI 正在实时构建...' : '大纲已生成，确认后开始撰写'}
                    </div>
                    <button 
                        onClick={() => {
                            // If user clicks while generating, try to finalize with what we have
                            if (isGenerating && displayData.title && displayData.outline.length > 0) {
                                const normalized: StratifyOutline = {
                                    title: displayData.title,
                                    pages: displayData.outline
                                };
                                updateStratifyTask(taskId, { 
                                    status: 'outline_generated',
                                    outline: normalized 
                                });
                                onConfirm(normalized);
                            } else if (finalOutline) {
                                onConfirm(finalOutline);
                            }
                        }}
                        disabled={(!finalOutline && !isGenerating) || (isGenerating && displayData.outline.length === 0)}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center gap-2 transform active:scale-95"
                    >
                        {isGenerating ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                提前结束并生成
                            </>
                        ) : (
                            <>
                                确认并生成正文 <ArrowRightIcon className="w-4 h-4" />
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
        <div className="max-w-5xl mx-auto p-6 pb-20">
            <div className="flex items-center justify-between mb-8">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-900">正在生成内容...</h2>
                    <p className="text-gray-500 text-sm mt-1">AI 正在并发撰写 {pages.length} 页报告</p>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">{progress}%</div>
                    </div>
                    <div className="w-12 h-12 relative">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-200" />
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-600 transition-all duration-500" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * progress) / 100} />
                        </svg>
                    </div>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pages.map((page) => (
                    <div key={page.page_index} className={`
                        bg-white p-6 rounded-xl border shadow-sm transition-all duration-300 relative overflow-hidden
                        ${page.status === 'generating' ? 'border-indigo-500 ring-1 ring-indigo-100' : 'border-gray-200'}
                    `}>
                        {/* Status Bar */}
                        {page.status === 'generating' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden">
                                <div className="h-full bg-indigo-500 w-1/3 animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${page.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    P{page.page_index}
                                </span>
                                <h3 className="font-bold text-gray-800 text-base line-clamp-1" title={page.title}>{page.title}</h3>
                            </div>
                            {page.status === 'done' && <CheckIcon className="w-5 h-5 text-green-500" />}
                            {page.status === 'generating' && <span className="text-xs font-bold text-indigo-600 animate-pulse">Writing...</span>}
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs h-40 overflow-y-auto text-slate-600 relative">
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
        <div className="max-w-6xl mx-auto animate-in fade-in-0 pb-10 h-full flex flex-col pt-4">
            <div className="flex justify-between items-center mb-6 px-4">
                <button onClick={onStartOver} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                    <ArrowLeftIcon className="w-4 h-4"/>
                    重新开始
                </button>
                <div className="flex gap-2">
                    <button className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 flex items-center gap-2">
                        <DownloadIcon className="w-4 h-4" /> 导出 PDF
                    </button>
                </div>
            </div>
            
            <div className="flex-1 flex gap-6 overflow-hidden px-4">
                {/* Thumbnails */}
                <div className="hidden md:flex flex-col w-48 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                    {slides.map((slide, idx) => (
                        <div 
                            key={slide.id}
                            onClick={() => setCurrentIndex(idx)}
                            className={`
                                p-3 rounded-lg border cursor-pointer transition-all
                                ${idx === currentIndex ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:border-gray-300'}
                            `}
                        >
                            <div className="text-[10px] font-bold text-gray-400 mb-1">PAGE {idx + 1}</div>
                            <div className="text-xs font-semibold text-gray-800 line-clamp-2">{slide.title}</div>
                        </div>
                    ))}
                </div>

                {/* Main Slide */}
                <div className="flex-1 flex flex-col">
                    <div className="aspect-[16/9] w-full bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 sm:p-12 md:p-16 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-6 right-8 text-gray-300 font-bold text-4xl opacity-20 pointer-events-none">{currentIndex + 1}</div>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 leading-tight border-b pb-4">{slides[currentIndex].title}</h3>
                        <div className="text-base sm:text-lg text-gray-600 leading-relaxed prose max-w-none flex-1 overflow-y-auto custom-scrollbar">
                            <div dangerouslySetInnerHTML={renderMarkdown(slides[currentIndex].content)} />
                        </div>
                        
                        {/* Nav Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex justify-between items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={goToPrev} className="pointer-events-auto p-3 bg-black/5 hover:bg-black/10 rounded-full backdrop-blur-sm transition-colors"><ArrowLeftIcon className="w-6 h-6 text-gray-600" /></button>
                            <button onClick={goToNext} className="pointer-events-auto p-3 bg-black/5 hover:bg-black/10 rounded-full backdrop-blur-sm transition-colors"><ArrowRightIcon className="w-6 h-6 text-gray-600" /></button>
                        </div>
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
        <div className="p-4 sm:p-6 bg-gray-50/50 min-h-full flex flex-col font-sans">
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
