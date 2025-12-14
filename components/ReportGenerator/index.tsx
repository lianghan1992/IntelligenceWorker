
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    SparklesIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon, 
    CloseIcon, DocumentTextIcon, CheckIcon, LightBulbIcon, BrainIcon, 
    ViewGridIcon, ChartIcon 
} from '../icons';
import { Slide, SearchChunkResult, StratifyTask, StratifyPage, StratifyOutline } from '../../types';
import { searchChunks } from '../../api';
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

// --- 知识库检索模态框 (Placeholder implementation for context) ---
const KnowledgeSearchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // (Implementation kept same as previous, abbreviated for brevity in this refactor)
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg" onClick={e => e.stopPropagation()}>
                <h3>知识库检索 (功能同前)</h3>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">关闭</button>
            </div>
        </div>
    );
};

// --- 阶段1: 创意输入 ---
const IdeaInput: React.FC<{ onGenerate: (idea: string) => void, isLoading: boolean }> = ({ onGenerate, isLoading }) => {
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
                        placeholder="例如：‘2025年中国新能源汽车出海战略分析报告，重点关注欧洲和东南亚市场’"
                        className="relative w-full h-48 p-6 text-base bg-white rounded-2xl shadow-xl border border-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        disabled={isLoading}
                    />
                </div>

                <div className="mt-8 flex justify-center">
                    <button 
                        onClick={() => onGenerate(idea)}
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

// --- 阶段2 & 3: 大纲生成与确认 ---
const OutlineGenerator: React.FC<{ 
    taskId: string; 
    topic: string;
    onConfirm: (outline: StratifyOutline) => void;
}> = ({ taskId, topic, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [parsedOutline, setParsedOutline] = useState<StratifyOutline | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const hasStartedRef = useRef(false);

    // 启动大纲生成流
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const startGen = async () => {
            await streamGenerate(
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
                    console.error("Outline gen error", err);
                    setIsGenerating(false);
                    // Handle error (maybe retry button)
                }
            );
        };
        startGen();
    }, [topic]);

    // 尝试解析 JSON
    useEffect(() => {
        if (!isGenerating && streamContent) {
            const result = parseLlmJson<{ title: string; pages: any[] }>(streamContent);
            if (result && result.pages) {
                setParsedOutline(result);
                // 自动保存到后端，但不跳转，等待用户确认
                updateStratifyTask(taskId, { 
                    status: 'outline_generated',
                    outline: result 
                });
            }
        }
    }, [isGenerating, streamContent, taskId]);

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            {/* Streaming Output (Visible during generation or if parse fails) */}
            {(!parsedOutline || isGenerating) && (
                <div className="bg-slate-900 rounded-xl p-6 shadow-2xl mb-6 font-mono text-sm text-green-400 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-50">
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                    </div>
                    <div className="whitespace-pre-wrap break-all min-h-[200px]">
                        {streamContent || "正在连接 AI 模型..."}
                        {isGenerating && <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse"></span>}
                    </div>
                </div>
            )}

            {/* Parsed Outline UI */}
            {parsedOutline && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-xl mb-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{parsedOutline.title}</h2>
                        <p className="text-gray-500">共 {parsedOutline.pages.length} 页 • 请确认大纲结构</p>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                        {parsedOutline.pages.map((page, index) => (
                            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 flex items-start gap-5 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex-shrink-0 w-10 h-10 bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 font-bold rounded-xl flex items-center justify-center border border-gray-100 group-hover:border-indigo-100 transition-colors">
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-indigo-700 transition-colors">{page.title}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">{page.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sticky bottom-6 flex justify-center">
                        <button 
                            onClick={() => onConfirm(parsedOutline)}
                            className="px-8 py-3 bg-indigo-600 text-white text-base font-bold rounded-full shadow-lg shadow-indigo-500/40 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            确认大纲并生成内容 <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
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
        // To avoid browser limits, we could batch them, but for < 10 pages, parallel is usually fine.
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

// --- 阶段5: 预览 (No changes needed, reuses existing logic) ---
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
    
    const handleOutlineConfirm = (confirmedOutline: StratifyOutline) => {
        setOutline(confirmedOutline);
        setFlowState('generatingContent');
    };

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
            case 'outlineReview': return 3;
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
                    <IdeaInput onGenerate={handleStartTask} isLoading={isCreating} />
                )}
                
                {flowState === 'generatingOutline' && taskId && (
                    <OutlineGenerator // Replaces old GenerationProgress
                        taskId={taskId}
                        topic={topic}
                        onConfirm={handleOutlineConfirm} // Transitions to next state inside component via parsed data
                    />
                )}
                
                {/* Removed separate OutlineEditor as OutlineGenerator handles the display and confirm now */}
                {/* If needed, OutlineGenerator could have an "Edit" mode, but sticking to stream->view->confirm flow for simplicity */}

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
