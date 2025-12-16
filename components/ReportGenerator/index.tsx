
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, CloseIcon, DocumentTextIcon, 
    CheckIcon, LightBulbIcon, BrainIcon, ViewGridIcon, 
    ChartIcon, LockClosedIcon, PhotoIcon, PlayIcon, 
    PencilIcon, ServerIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon
} from '../icons';
import { StratifyTask, StratifyPage, StratifyOutline } from '../../types';
import { 
    createStratifyTask, 
    updateStratifyTask, 
    saveStratifyPages, 
    streamGenerate,
    getScenarios,
    parseLlmJson
} from '../../api/stratify';

// --- 样式注入：修复 Markdown 表格和排版 ---
const MarkdownStyles = () => (
    <style>{`
        .prose table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.875em; }
        .prose th { background-color: #f8fafc; font-weight: 700; text-align: left; padding: 0.75rem; border: 1px solid #e2e8f0; color: #1e293b; }
        .prose td { padding: 0.75rem; border: 1px solid #e2e8f0; color: #475569; }
        .prose tr:nth-child(even) { background-color: #fcfcfc; }
        .prose blockquote { border-left: 4px solid #6366f1; background-color: #f5f3ff; padding: 1rem; border-radius: 0.5rem; color: #4f46e5; }
        .typing-cursor::after { content: ''; display: inline-block; width: 6px; height: 1.2em; background-color: #4f46e5; margin-left: 2px; vertical-align: text-bottom; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .code-scrollbar::-webkit-scrollbar { width: 6px; }
        .code-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        
        /* Cyberpunk Terminal Effect */
        .cyber-grid {
            background-image: linear-gradient(rgba(0, 255, 170, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 170, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
        }
        @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        .scanline::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(to bottom, transparent, rgba(0, 255, 170, 0.1), transparent);
            animation: scanline 2s linear infinite;
            pointer-events: none;
        }
        .mask-gradient-bottom {
            mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
        }
    `}</style>
);

// --- 核心解析器：分离思考与JSON ---
const extractThoughtAndJson = (text: string) => {
    let thought = '';
    let jsonPart = '';
    let hasJsonStart = false;

    // 1. 尝试寻找标准 Markdown 代码块
    const codeBlockRegex = /```json\s*([\s\S]*)/i;
    const codeBlockMatch = text.match(codeBlockRegex);

    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
        thought = text.slice(0, codeBlockMatch.index).trim();
        jsonPart = codeBlockMatch[1]; // 取代码块之后的内容
        // 去掉可能的结尾 ```
        const endBlockIndex = jsonPart.lastIndexOf('```');
        if (endBlockIndex !== -1) {
            jsonPart = jsonPart.slice(0, endBlockIndex);
        }
        hasJsonStart = true;
    } else {
        // 2. 兜底：寻找第一个 '{'，假设它是 JSON 的开始
        const jsonStartIndex = text.indexOf('{');
        if (jsonStartIndex !== -1) {
            thought = text.slice(0, jsonStartIndex).trim();
            jsonPart = text.slice(jsonStartIndex);
            hasJsonStart = true;
        } else {
            // 3. 纯思考阶段
            thought = text;
            jsonPart = '';
        }
    }

    return { thought, jsonPart, hasJsonStart };
};

// --- 组件：极简流程条 ---
const MinimalStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, title: "创意" },
        { id: 2, title: "大纲" },
        { id: 4, title: "撰写" },
        { id: 5, title: "排版" },
        { id: 6, title: "完成" },
    ];

    return (
        <div className="w-full max-w-md mx-auto mb-8 px-4 flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -z-10"></div>
            <div 
                className="absolute left-0 top-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-700 ease-in-out"
                style={{ width: `${Math.min(100, ((currentStep - 1) / 5) * 100)}%` }}
            ></div>
            {steps.map((s) => {
                const active = currentStep >= s.id;
                const current = currentStep === s.id;
                return (
                    <div key={s.id} className="flex flex-col items-center gap-1.5 bg-slate-50 px-2">
                        <div className={`
                            w-2.5 h-2.5 rounded-full transition-all duration-300
                            ${current ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-100' : active ? 'bg-indigo-600' : 'bg-slate-300'}
                        `}></div>
                        <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {s.title}
                        </span>
                    </div>
                )
            })}
        </div>
    );
};

// --- NEW: Analysis Modal (弹窗式意图分析) ---
const AnalysisModal: React.FC<{
    isOpen: boolean;
    streamContent: string;
    reasoningContent?: string;
}> = ({ isOpen, streamContent, reasoningContent }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    
    // 实时提取思考过程
    const { thought: extractedThought } = useMemo(() => extractThoughtAndJson(streamContent), [streamContent]);
    const displayThought = reasoningContent || extractedThought;

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [displayThought, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-300 ring-1 ring-white/10">
                <div className="px-6 py-4 border-b border-slate-800 bg-[#1e293b] flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                         <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-50 animate-pulse"></div>
                         <BrainIcon className="w-8 h-8 text-indigo-400 relative z-10" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-100 tracking-wide text-lg flex items-center gap-2">
                            AI 深度意图识别
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">正在分析您的输入并规划最佳报告路径...</p>
                    </div>
                </div>
                
                <div ref={scrollRef} className="flex-1 p-6 font-mono text-sm text-green-400 overflow-y-auto bg-black/50 custom-scrollbar-dark leading-relaxed">
                    <div className="whitespace-pre-wrap">
                        <span className="text-slate-500 mr-2">$</span>
                        {displayThought ? displayThought : <span className="text-slate-500 animate-pulse">连接推理引擎中...</span>}
                        <span className="typing-cursor"></span>
                    </div>
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
};

// --- 阶段1: 创意输入 ---
const IdeaInput: React.FC<{ 
    onStart: (idea: string) => void, 
    isLoading: boolean, 
}> = ({ onStart, isLoading }) => {
    const [idea, setIdea] = useState('');

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-full max-w-2xl px-4 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 mb-4">
                        <SparklesIcon className="w-3 h-3" />
                        <span>AI 智能报告引擎 V2.0</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                        从一个想法，<br/>到一份专业报告
                    </h1>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 ring-4 ring-slate-50/50 transition-all duration-300 focus-within:ring-indigo-100 focus-within:border-indigo-200">
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="输入您的研究主题，例如：'2024年中国新能源汽车出海战略分析'..."
                        className="w-full h-32 p-4 text-lg bg-transparent border-none resize-none focus:ring-0 focus:outline-none outline-none text-slate-800 placeholder:text-slate-300 font-medium leading-relaxed"
                        disabled={isLoading}
                    />
                    
                    <div className="flex justify-between items-center px-4 pb-2 pt-2 border-t border-slate-50">
                        <div className="flex gap-2">
                             {['行业研究', '竞品分析', '市场趋势'].map(tag => (
                                <button 
                                    key={tag} 
                                    onClick={() => setIdea(tag + " ")}
                                    disabled={isLoading}
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs rounded-md transition-colors"
                                >
                                    {tag}
                                </button>
                             ))}
                        </div>
                        <button 
                            onClick={() => onStart(idea)}
                            disabled={!idea.trim() || isLoading}
                            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-indigo-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <span>立即生成</span>
                            <ArrowRightIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 阶段2: 大纲生成 (支持修改) ---
const OutlineGenerator: React.FC<{
    taskId: string;
    topic: string;
    scenario: string;
    precedingThought: string | null;
    initialSessionId: string | null;
    onConfirm: (outline: StratifyOutline, sessionId: string | null) => void;
}> = ({ taskId, topic, scenario, precedingThought, initialSessionId, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [reasoningStream, setReasoningStream] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
    const [isGenerating, setIsGenerating] = useState(true);
    
    // Revision State
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);
    
    const hasStarted = useRef(false);
    const thoughtBottomRef = useRef<HTMLDivElement>(null);

    const { thought: extractedThought, jsonPart } = useMemo(() => extractThoughtAndJson(streamContent), [streamContent]);
    const displayThought = reasoningStream || extractedThought;

    // 解析 JSON (大纲)
    const outlineData = useMemo(() => {
        if (!jsonPart) return null;
        try {
            const parsed = parseLlmJson<{title: string, pages: any[]}>(jsonPart);
            if (parsed && parsed.title && Array.isArray(parsed.pages)) {
                return parsed;
            }
            // 简单的流式兼容 (JSON 不完整时)
            let title = '生成中...';
            const titleMatch = jsonPart.match(/"title"\s*:\s*"(?<title>(?:[^"\\]|\\.)*?)"/);
            if (titleMatch && titleMatch.groups?.title) title = titleMatch.groups.title;

            const pages: { title: string, content: string }[] = [];
            const pagesSection = jsonPart.indexOf('"pages"');
            if (pagesSection > -1) {
                const pageRegex = /{\s*(?:"title"\s*:\s*"(?<t1>(?:[^"\\]|\\.)*?)"\s*,\s*"(?:content|summary)"\s*:\s*"(?<c1>(?:[^"\\]|\\.)*?)"|"(?:content|summary)"\s*:\s*"(?<c2>(?:[^"\\]|\\.)*?)"\s*,\s*"title"\s*:\s*"(?<t2>(?:[^"\\]|\\.)*?)")\s*}/g;
                let match;
                while ((match = pageRegex.exec(jsonPart.slice(pagesSection))) !== null) {
                    if (match.groups) {
                        const t = match.groups.t1 || match.groups.t2;
                        const c = match.groups.c1 || match.groups.c2;
                        if (t && c) pages.push({ title: t.replace(/\\"/g, '"'), content: c.replace(/\\"/g, '"') });
                    }
                }
            }
            return { title, pages };
        } catch (e) { return null; }
    }, [jsonPart]);

    // Initial Generation
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        
        startStream('generate_outline', { user_input: topic });
    }, [topic, scenario]);

    const startStream = (promptName: string, vars: any) => {
        setIsGenerating(true);
        setStreamContent(''); 
        setReasoningStream('');
        
        streamGenerate(
            {
                prompt_name: promptName,
                variables: vars,
                scenario,
                session_id: sessionId || undefined 
            },
            (chunk) => setStreamContent(prev => prev + chunk),
            () => { setIsGenerating(false); setIsRevising(false); },
            (err) => { console.error(err); setIsGenerating(false); setIsRevising(false); },
            (sid) => { if(sid) setSessionId(sid); },
            (chunk) => setReasoningStream(prev => prev + chunk)
        );
    };

    const handleRevise = () => {
        if (!revisionInput.trim() || !jsonPart) return;
        setIsRevising(true);
        startStream('02_revise_outline', { 
            current_outline: jsonPart, 
            user_revision_request: revisionInput 
        });
        setRevisionInput('');
    };

    // Auto-scroll thought
    useEffect(() => {
        if (thoughtBottomRef.current) thoughtBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [displayThought]);

    const handleConfirm = () => {
        if (outlineData && outlineData.pages.length > 0) {
            onConfirm(outlineData, sessionId);
        }
    };

    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto px-4 w-full">
            {/* Thinking Panel */}
            <div className="flex-shrink-0 bg-[#1e1e1e] rounded-t-2xl border border-slate-700 overflow-hidden shadow-lg flex flex-col max-h-[25vh]">
                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <BrainIcon className="w-3.5 h-3.5 text-indigo-400" />
                        AI 思考与架构 (Chain of Thought)
                    </div>
                    {isGenerating && <div className="text-[10px] text-green-400 animate-pulse">● Live</div>}
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed code-scrollbar">
                    {precedingThought && !isRevising && (
                        <div className="opacity-50 mb-4 pb-4 border-b border-white/10">
                            <div className="text-indigo-400 mb-1">// Phase 1: Analysis</div>
                            <div className="whitespace-pre-wrap">{precedingThought}</div>
                        </div>
                    )}
                    <div className="text-green-400 mb-1">// Current Logic:</div>
                    <div className="whitespace-pre-wrap">
                        {displayThought ? displayThought : (isGenerating && "正在连接推理模型...")}
                        {isGenerating && <span className="typing-cursor"></span>}
                    </div>
                    <div ref={thoughtBottomRef} />
                </div>
            </div>

            {/* Outline Preview & Action */}
            <div className="flex-1 bg-white border-x border-b border-slate-200 rounded-b-2xl shadow-sm p-6 overflow-hidden flex flex-col relative">
                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-slate-900">
                            {outlineData?.title || <span className="opacity-30">正在拟定标题...</span>}
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {outlineData?.pages.map((page: any, idx: number) => (
                            <div key={idx} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors animate-in slide-in-from-bottom-2 fade-in">
                                <div className="flex-shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm mb-1">{page.title}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{page.content}</p>
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                <span className="text-xs animate-pulse">正在构建章节结构...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Revision & Confirm Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100 bg-white flex flex-col gap-3">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={revisionInput}
                            onChange={(e) => setRevisionInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleRevise()}
                            placeholder="例如：请增加一个关于'市场竞争格局'的章节，或者合并第2和第3章..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            disabled={isGenerating}
                        />
                        <button 
                            onClick={handleRevise}
                            disabled={isGenerating || !revisionInput.trim()}
                            className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50 transition-colors text-sm flex-shrink-0"
                        >
                            {isRevising ? <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin"></div> : "修改大纲"}
                        </button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-400">
                            {isGenerating ? "生成中..." : `共 ${outlineData?.pages.length || 0} 个章节`}
                        </div>
                        <button 
                            onClick={handleConfirm}
                            disabled={isGenerating || !outlineData || outlineData.pages.length === 0}
                            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {isGenerating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckIcon className="w-4 h-4"/>}
                            确认大纲并生成正文
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 阶段3: 内容生成 (支持单页修改) ---
const ContentWriter: React.FC<{
    taskId: string;
    outline: StratifyOutline;
    scenario: string;
    initialSessionId: string | null;
    onComplete: (pages: StratifyPage[]) => void;
}> = ({ taskId, outline, scenario, initialSessionId, onComplete }) => {
    const [pages, setPages] = useState<StratifyPage[]>(outline.pages.map((p, i) => ({
        page_index: i + 1,
        title: p.title,
        content_markdown: '',
        html_content: null,
        status: 'pending'
    })));
    const [activePageIdx, setActivePageIdx] = useState(1);
    const [pageThought, setPageThought] = useState(''); 
    const [reasoningStream, setReasoningStream] = useState('');
    
    // Revision State for Content
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);

    // Queue Control
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;
    const isAllDone = pages.every(p => p.status === 'done');

    // Auto-trigger next page (only if not revising)
    useEffect(() => {
        if (processingRef.current || isRevising) return;
        
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) return;

        const processPage = async (page: StratifyPage) => {
            processingRef.current = true;
            setActivePageIdx(page.page_index);
            setPageThought('');
            setReasoningStream('');
            
            setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'generating' } : p));

            let buffer = '';
            await streamGenerate(
                {
                    prompt_name: 'generate_content',
                    variables: {
                        outline: JSON.stringify(outline),
                        page_index: page.page_index,
                        page_title: page.title,
                        page_summary: outline.pages[page.page_index - 1].content
                    },
                    session_id: initialSessionId || undefined,
                    scenario
                },
                (chunk) => {
                    buffer += chunk;
                    const { thought, jsonPart } = extractThoughtAndJson(buffer);
                    setPageThought(thought);

                    if (jsonPart) {
                        const parsed = parseLlmJson<{title:string, content:string}>(jsonPart);
                        if (parsed && parsed.content) {
                             setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, content_markdown: parsed.content } : p));
                        } else {
                            // Fallback regex parsing for streaming partials
                            const start = jsonPart.indexOf('"content"');
                            if (start !== -1) {
                                let valStart = jsonPart.indexOf(':', start) + 1;
                                while(jsonPart[valStart] === ' ' || jsonPart[valStart] === '\n') valStart++;
                                if (jsonPart[valStart] === '"') {
                                    const rawContent = jsonPart.slice(valStart + 1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
                                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, content_markdown: rawContent } : p));
                                }
                            }
                        }
                    }
                },
                () => {
                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'done' } : p));
                    processingRef.current = false;
                },
                (err) => {
                    console.error(err);
                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    processingRef.current = false;
                },
                undefined,
                (chunk) => setReasoningStream(prev => prev + chunk)
            );
        };

        processPage(nextPage);

    }, [pages, outline, initialSessionId, scenario, isRevising]);

    const handleRevisePage = () => {
        const activePage = pages.find(p => p.page_index === activePageIdx);
        if (!activePage || !activePage.content_markdown || !revisionInput.trim()) return;

        setIsRevising(true);
        setReasoningStream('');
        setPageThought('');
        setPages(prev => prev.map(p => p.page_index === activePageIdx ? { ...p, status: 'generating' } : p));

        let buffer = '';
        streamGenerate(
            {
                prompt_name: '04_revise_content',
                variables: {
                    page_title: activePage.title,
                    current_content: activePage.content_markdown,
                    user_revision_request: revisionInput
                },
                session_id: initialSessionId || undefined,
                scenario
            },
            (chunk) => {
                buffer += chunk;
                const { thought, jsonPart } = extractThoughtAndJson(buffer);
                setPageThought(thought);
                const parsed = parseLlmJson<{title:string, content:string}>(jsonPart);
                if (parsed && parsed.content) {
                    setPages(prev => prev.map(p => p.page_index === activePageIdx ? { ...p, content_markdown: parsed.content } : p));
                }
            },
            () => {
                setPages(prev => prev.map(p => p.page_index === activePageIdx ? { ...p, status: 'done' } : p));
                setIsRevising(false);
                setRevisionInput('');
            },
            (err) => {
                console.error(err);
                setIsRevising(false);
                setPages(prev => prev.map(p => p.page_index === activePageIdx ? { ...p, status: 'done' } : p)); // revert status to done to unlock
            },
            undefined,
            (chunk) => setReasoningStream(prev => prev + chunk)
        );
    };

    const activePage = pages.find(p => p.page_index === activePageIdx) || pages[0];
    const displayThought = reasoningStream || pageThought;

    const renderContent = (md: string) => {
        if (!md) return null;
        return <div className="prose prose-sm max-w-none whitespace-pre-wrap">{md}</div>;
    };

    return (
        <div className="flex h-full gap-6">
            <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">内容撰写</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pages.map(p => (
                        <button
                            key={p.page_index}
                            onClick={() => setActivePageIdx(p.page_index)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                                activePageIdx === p.page_index 
                                    ? 'bg-indigo-50 text-indigo-700' 
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span className="truncate">{p.page_index}. {p.title}</span>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                            {p.status === 'done' && <CheckIcon className="w-3.5 h-3.5 text-green-500" />}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100">
                    <div className="w-full text-center text-xs text-slate-400">
                        {isAllDone ? "准备就绪" : `撰写中 (${completedCount}/${pages.length})...`}
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                {activePage.status === 'generating' && displayThought && (
                    <div className="bg-[#1e1e1e] text-slate-300 p-4 text-xs font-mono border-b border-slate-700 max-h-32 overflow-y-auto">
                        <span className="text-indigo-400 font-bold mr-2">$ CONTENT THINKING:</span>
                        {displayThought}
                        <span className="typing-cursor"></span>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{activePage.title}</h1>
                    {activePage.content_markdown ? (
                        renderContent(activePage.content_markdown)
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            {activePage.status === 'pending' ? '等待生成...' : '正在构思...'}
                        </div>
                    )}
                </div>

                {/* Revision & Next Action Bar */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-4 items-center">
                    <div className="flex-1 flex gap-2">
                        <input 
                            type="text" 
                            value={revisionInput}
                            onChange={(e) => setRevisionInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !activePage.status.includes('generating') && handleRevisePage()}
                            placeholder="对本页内容不满意？输入修改意见（例如：增加更多数据支持...）"
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            disabled={activePage.status === 'generating'}
                        />
                        <button 
                            onClick={handleRevisePage}
                            disabled={activePage.status === 'generating' || !revisionInput.trim()}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            {isRevising ? <div className="w-4 h-4 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin"></div> : "修改本页"}
                        </button>
                    </div>
                    <button 
                        onClick={() => onComplete(pages)}
                        disabled={!isAllDone || isRevising || processingRef.current}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        下一步：智能排版
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 阶段5: 智能排版 (HTML 生成与预览 + 酷炫流式) ---
const LayoutGenerator: React.FC<{
    taskId: string;
    pages: StratifyPage[];
    scenario: string;
    onComplete: (pages: StratifyPage[]) => void;
}> = ({ taskId, pages: initialPages, scenario, onComplete }) => {
    const [pages, setPages] = useState<StratifyPage[]>(initialPages.map(p => ({
        ...p,
        status: p.status === 'done' ? 'pending' : p.status // Reset status for layout phase if previously done
    })));
    const [activePageIdx, setActivePageIdx] = useState(1);
    const [pageThought, setPageThought] = useState(''); 
    const [reasoningStream, setReasoningStream] = useState('');
    
    // For "Cool Streaming": we need to show raw text buffer as if it's code being typed
    const [codeStreamBuffer, setCodeStreamBuffer] = useState(''); 
    
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;

    // 自动触发下一页 HTML 生成
    useEffect(() => {
        if (processingRef.current) return;
        
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) return;

        const processPage = async (page: StratifyPage) => {
            processingRef.current = true;
            setActivePageIdx(page.page_index);
            setPageThought('');
            setReasoningStream('');
            setCodeStreamBuffer(''); // Reset visual buffer
            
            setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'generating' } : p));

            let buffer = '';
            
            await streamGenerate(
                {
                    prompt_name: '05_generate_html',
                    variables: {
                        page_title: page.title,
                        markdown_content: page.content_markdown || ''
                    },
                    session_id: undefined, // Explicitly start FRESH session for each HTML generation as requested
                    scenario
                },
                (chunk) => {
                    buffer += chunk;
                    // Visual effect: accumulate last 800 chars to show "coding" effect
                    setCodeStreamBuffer(prev => (prev + chunk).slice(-800));
                },
                () => {
                    // On Done, extract the HTML from the JSON response
                    const { thought, jsonPart } = extractThoughtAndJson(buffer);
                    setPageThought(thought); 

                    const parsed = parseLlmJson<{ html: string }>(jsonPart);
                    if (parsed && parsed.html) {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, html_content: parsed.html, status: 'done' } : p));
                    } else {
                        console.warn('Failed to parse HTML from response', buffer);
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    }
                    processingRef.current = false;
                },
                (err) => {
                    console.error(err);
                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    processingRef.current = false;
                },
                undefined,
                (chunk) => setReasoningStream(prev => prev + chunk) 
            );
        };

        processPage(nextPage);

    }, [pages, scenario]);

    const activePage = pages.find(p => p.page_index === activePageIdx) || pages[0];
    const displayThought = reasoningStream || pageThought;
    const isAllLayoutDone = pages.every(p => p.status === 'done');

    return (
        <div className="flex h-full gap-6">
            <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <ViewGridIcon className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">智能排版</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pages.map(p => (
                        <button
                            key={p.page_index}
                            onClick={() => setActivePageIdx(p.page_index)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                                activePageIdx === p.page_index 
                                    ? 'bg-purple-50 text-purple-700' 
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span className="truncate">{p.page_index}. {p.title}</span>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>}
                            {p.status === 'done' && <CheckIcon className="w-3.5 h-3.5 text-green-500" />}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100">
                    <div className="w-full text-center text-xs text-slate-400 mb-2">
                        {completedCount === pages.length ? "排版完成!" : `设计中 (${completedCount}/${pages.length})...`}
                    </div>
                    {isAllLayoutDone && (
                        <button 
                            onClick={() => onComplete(pages)}
                            className="w-full py-2 bg-green-600 text-white font-bold rounded-lg text-xs shadow-md hover:bg-green-700 transition-colors"
                        >
                            生成最终报告
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 shadow-lg flex flex-col overflow-hidden relative">
                {/* Header / Thinking State */}
                <div className="bg-[#0f172a] text-slate-300 p-3 text-xs font-mono border-b border-slate-700 flex justify-between items-center h-12 flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <PencilIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span className="truncate text-slate-400">DESIGNING: {activePage.title}</span>
                    </div>
                    {activePage.status === 'generating' && (
                        <div className="flex items-center gap-2 text-purple-400 text-[10px] animate-pulse">
                            <ServerIcon className="w-3 h-3" />
                            AI ARCHITECT ACTIVE
                        </div>
                    )}
                </div>

                {/* Reasoning Panel (Always visible if generating, overlays iframe) */}
                {activePage.status === 'generating' && (
                    <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm flex flex-col font-mono p-8 overflow-hidden pointer-events-none">
                        <div className="text-green-500 text-xs mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                            RELAY_NODE_CONNECTED: GENERATING_VISUAL_STRUCTURE...
                        </div>
                        
                        {/* Split view: Reasoning vs Raw Code Stream */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
                            {/* Left: Logic / Reasoning */}
                            <div className="overflow-hidden relative border-r border-slate-800 pr-4">
                                <h4 className="text-purple-400 font-bold text-xs mb-2 border-b border-purple-900/50 pb-1">AI_THOUGHT_PROCESS</h4>
                                <div className="text-xs text-slate-400 whitespace-pre-wrap h-full overflow-hidden mask-gradient-bottom">
                                    {displayThought}
                                </div>
                            </div>
                            
                            {/* Right: Code Matrix Effect */}
                            <div className="overflow-hidden relative cyber-grid">
                                <h4 className="text-blue-400 font-bold text-xs mb-2 border-b border-blue-900/50 pb-1">LIVE_CODE_STREAM</h4>
                                <div className="text-[10px] text-blue-300/80 whitespace-pre-wrap break-all font-mono h-full overflow-hidden scanline">
                                    {codeStreamBuffer}
                                    <span className="typing-cursor"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Preview Area (Iframe) */}
                <div className="flex-1 relative bg-white">
                    {activePage.html_content ? (
                        <iframe 
                            srcDoc={activePage.html_content} 
                            className="w-full h-full border-none" 
                            title={`Preview ${activePage.page_index}`}
                            sandbox="allow-scripts"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                            {activePage.status === 'pending' ? (
                                <>
                                    <ViewGridIcon className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-sm">等待排版...</p>
                                </>
                            ) : (
                                // This state is technically covered by the overlay above, but as a fallback
                                <div className="text-center">
                                    <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4 mx-auto"></div>
                                    <p className="text-sm font-medium text-slate-600">正在构建布局与视觉元素...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 主容器 ---
export const ReportGenerator: React.FC = () => {
    const [step, setStep] = useState(1);
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [analysisStream, setAnalysisStream] = useState('');
    const [analysisReasoning, setAnalysisReasoning] = useState(''); // Separate reasoning state
    const [step1Thought, setStep1Thought] = useState<string | null>(null);
    const [step1SessionId, setStep1SessionId] = useState<string | null>(null);
    
    // Modal State for Step 1
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    
    const [scenarios, setScenarios] = useState<string[]>(['default']);

    // Step 1: Start -> Open Modal -> Stream -> Process
    const handleStart = async (idea: string) => {
        setIsAnalysisModalOpen(true);
        setAnalysisStream('');
        setAnalysisReasoning(''); // Reset reasoning buffer
        setStep1Thought(null);
        setStep1SessionId(null);
        
        let localBuffer = ''; 
        let localReasoningBuffer = '';
        let tempSessionId: string | null = null;

        try {
            const newTask = await createStratifyTask(idea);
            setTask(newTask);

            // Stream Analyze
            await streamGenerate(
                {
                    prompt_name: '00_analyze_input', // Updated to match backend prompt file name
                    variables: { user_input: idea },
                    scenario: 'default'
                },
                (chunk) => {
                    localBuffer += chunk;
                    setAnalysisStream(prev => prev + chunk); // Update Modal
                },
                () => {
                    // Delay slightly to let user see "Thinking" effect completion
                    setTimeout(() => {
                        processAnalysisResult(localBuffer, localReasoningBuffer, newTask, idea, tempSessionId);
                        setIsAnalysisModalOpen(false);
                    }, 1000); 
                },
                (err) => { alert('分析失败'); setIsAnalysisModalOpen(false); },
                (sid) => { tempSessionId = sid; }, // Capture session ID
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

    const processAnalysisResult = (buffer: string, reasoningBuffer: string, task: StratifyTask, originalInput: string, sessionId: string | null) => {
        const { thought, jsonPart } = extractThoughtAndJson(buffer);
        // Use separate reasoning if available, else fall back to extracted thought
        setStep1Thought(reasoningBuffer || thought);
        setStep1SessionId(sessionId);

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
            // Pass the session ID along if it was updated in Step 2
            setStep1SessionId(sessionId); 
            setStep(4); 
        }
    };

    const handleContentComplete = (pages: StratifyPage[]) => {
         if(task) {
            const updated = { ...task, pages };
            setTask(updated);
            // Instead of going to 6 directly, go to 5 (Layout)
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
                        precedingThought={step1Thought}
                        initialSessionId={step1SessionId}
                        onConfirm={handleOutlineConfirm}
                    />
                )}

                {step === 4 && task && task.outline && (
                    <ContentWriter 
                        taskId={task.id}
                        outline={task.outline}
                        scenario="default"
                        initialSessionId={step1SessionId}
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
