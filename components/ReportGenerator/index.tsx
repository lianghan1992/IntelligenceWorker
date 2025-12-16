
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    SparklesIcon, ArrowRightIcon, CloseIcon, DocumentTextIcon, 
    CheckIcon, LightBulbIcon, BrainIcon, ViewGridIcon, 
    ChartIcon, LockClosedIcon, PhotoIcon, PlayIcon
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
    `}</style>
);

// --- 核心解析器：分离思考与JSON ---
// 针对后端 Prompt 结构： "思考过程 (Markdown) \n ```json { ... } ```"
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
        // 只有当 '{' 之前的文本看起来像思考（包含换行或足够长）时才分割
        const jsonStartIndex = text.indexOf('{');
        if (jsonStartIndex !== -1) {
            // 简单的启发式：如果 { 在很后面，或者前面有明显的思考痕迹
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
        { id: 4, title: "撰写" }, // Skip 3 internal logic
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

// --- 阶段1: 创意输入 (含内联思考展示) ---
const IdeaInput: React.FC<{ 
    onStart: (idea: string) => void, 
    isAnalyzing: boolean,
    analysisStream: string, // 传入实时流
}> = ({ onStart, isAnalyzing, analysisStream }) => {
    const [idea, setIdea] = useState('');
    const { thought } = useMemo(() => extractThoughtAndJson(analysisStream), [analysisStream]);

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-full max-w-2xl px-4 relative">
                
                {/* 装饰背景 */}
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
                        className="w-full h-32 p-4 text-lg bg-transparent border-none resize-none focus:ring-0 text-slate-800 placeholder:text-slate-300 font-medium leading-relaxed"
                        disabled={isAnalyzing}
                    />
                    
                    {/* 底部工具栏 */}
                    <div className="flex justify-between items-center px-4 pb-2 pt-2 border-t border-slate-50">
                        <div className="flex gap-2">
                             {['行业研究', '竞品分析', '市场趋势'].map(tag => (
                                <button 
                                    key={tag} 
                                    onClick={() => setIdea(tag + " ")}
                                    disabled={isAnalyzing}
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs rounded-md transition-colors"
                                >
                                    {tag}
                                </button>
                             ))}
                        </div>
                        <button 
                            onClick={() => onStart(idea)}
                            disabled={!idea.trim() || isAnalyzing}
                            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-indigo-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>分析中...</span>
                                </>
                            ) : (
                                <>
                                    <span>立即生成</span>
                                    <ArrowRightIcon className="w-3 h-3" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 实时思考展示区 (取代弹窗) */}
                {isAnalyzing && (
                    <div className="mt-6 mx-4 bg-slate-900 rounded-xl p-4 shadow-lg animate-in slide-in-from-top-2 border border-slate-800">
                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-2 uppercase tracking-wider">
                            <BrainIcon className="w-3 h-3 animate-pulse" />
                            AI Thinking Process
                        </div>
                        <div className="font-mono text-xs text-green-400/90 leading-relaxed h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                            {thought || "正在连接 AI 模型..."}
                            <span className="typing-cursor"></span>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

// --- 阶段2: 大纲生成 (分层展示) ---
const OutlineGenerator: React.FC<{
    taskId: string;
    topic: string;
    scenario: string;
    precedingThought: string | null; // 也就是 Step 1 的思考
    onConfirm: (outline: StratifyOutline, sessionId: string | null) => void;
}> = ({ taskId, topic, scenario, precedingThought, onConfirm }) => {
    const [streamContent, setStreamContent] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [revisionInput, setRevisionInput] = useState('');
    
    const hasStarted = useRef(false);
    const thoughtScrollRef = useRef<HTMLDivElement>(null);

    // 解析流
    const { thought: currentThought, jsonPart, hasJsonStart } = useMemo(() => extractThoughtAndJson(streamContent), [streamContent]);
    
    // 解析 JSON (大纲)
    const outlineData = useMemo(() => {
        if (!jsonPart) return null;
        try {
            // 尝试解析部分 JSON，或者等待完整
            // 这里使用简单的正则提取 title 和 pages，比 parseLlmJson 更宽容
            const titleMatch = jsonPart.match(/"title"\s*:\s*"(.*?)"/);
            const pagesRegex = /{\s*"title"\s*:\s*"(.*?)"\s*,\s*"(?:content|summary)"\s*:\s*"(.*?)"\s*}/gs;
            
            const pages = [];
            let match;
            while ((match = pagesRegex.exec(jsonPart)) !== null) {
                pages.push({ title: match[1], content: match[2] });
            }

            return {
                title: titleMatch ? titleMatch[1] : '生成中...',
                pages: pages
            };
        } catch (e) {
            return null;
        }
    }, [jsonPart]);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        streamGenerate(
            {
                prompt_name: 'generate_outline',
                variables: { user_input: topic },
                scenario
            },
            (chunk) => setStreamContent(prev => prev + chunk),
            () => setIsGenerating(false),
            (err) => { console.error(err); setIsGenerating(false); },
            (sid) => { if(sid) setSessionId(sid); }
        );
    }, [topic, scenario]);

    // 自动滚动思考区
    useEffect(() => {
        if (thoughtScrollRef.current) {
            thoughtScrollRef.current.scrollTop = thoughtScrollRef.current.scrollHeight;
        }
    }, [currentThought]);

    const handleConfirm = () => {
        if (outlineData && outlineData.pages.length > 0) {
            onConfirm(outlineData, sessionId);
        }
    };

    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto px-4 w-full">
            {/* 上半部分：思维链 (可折叠或固定高度) */}
            <div className="flex-shrink-0 bg-[#1e1e1e] rounded-t-2xl border border-slate-700 overflow-hidden shadow-lg flex flex-col max-h-[30vh]">
                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <BrainIcon className="w-3.5 h-3.5 text-indigo-400" />
                        AI 思维链 (Chain of Thought)
                    </div>
                    {isGenerating && <div className="text-[10px] text-green-400 animate-pulse">● Live</div>}
                </div>
                <div ref={thoughtScrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed code-scrollbar">
                    {precedingThought && (
                        <div className="opacity-50 mb-4 pb-4 border-b border-white/10">
                            <div className="text-indigo-400 mb-1">// Phase 1: Intent Analysis</div>
                            {precedingThought}
                        </div>
                    )}
                    <div className="text-green-400 mb-1">// Phase 2: Outline Construction</div>
                    {currentThought || "思考中..."}
                    {isGenerating && <span className="typing-cursor"></span>}
                </div>
            </div>

            {/* 下半部分：大纲预览 (卡片式) */}
            <div className="flex-1 bg-white border-x border-b border-slate-200 rounded-b-2xl shadow-sm p-6 overflow-y-auto custom-scrollbar relative flex flex-col">
                {/* 标题区 */}
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {outlineData?.title || <span className="opacity-30">正在拟定标题...</span>}
                    </h2>
                </div>

                {/* 章节卡片列表 */}
                <div className="space-y-3 flex-1">
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
                    
                    {/* Loading Placeholder */}
                    {isGenerating && (!outlineData || outlineData.pages.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                            <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                            <p className="text-xs">正在构建逻辑结构...</p>
                        </div>
                    )}
                </div>

                {/* 底部操作区 */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center sticky bottom-0 bg-white z-10">
                    <div className="text-xs text-slate-400">
                        {isGenerating ? "生成中..." : `共 ${outlineData?.pages.length || 0} 个章节`}
                    </div>
                    <button 
                        onClick={handleConfirm}
                        disabled={isGenerating || !outlineData}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isGenerating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckIcon className="w-4 h-4"/>}
                        确认并生成正文
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 阶段3 & 4: 内容生成 (阅读器模式) ---
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
    const [pageThought, setPageThought] = useState(''); // 当前页的实时思考
    
    // 队列控制
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;

    // 自动触发下一页
    useEffect(() => {
        if (processingRef.current) return;
        
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) {
            if (pages.every(p => p.status === 'done')) {
                // 全部完成
                // Wait a bit then auto proceed or show button
            }
            return;
        }

        const processPage = async (page: StratifyPage) => {
            processingRef.current = true;
            setActivePageIdx(page.page_index); // Auto switch view
            setPageThought(''); // Reset thought for new page
            
            // Update status
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
                    setPageThought(thought); // 实时更新思考展示

                    // 尝试解析 JSON 内容部分
                    // 简单的正则提取 content
                    const contentMatch = jsonPart.match(/"content"\s*:\s*"(.*?)"/s); // 简单匹配，实际应用可能需要更强的 parser
                    // 由于 JSON 流式传输，这里为了展示效果，如果没解析出 content，就先展示 jsonPart 的原始文本作为降级，或者等待
                    // 实际上 parseLlmJson 更稳健，但流式需要增量解析。
                    // 这里简化：如果 parsePageStream 能提取到 content，就更新。
                    // 借用之前的 parsePageStream 逻辑（已包含在上面的 extract 之后）
                    
                    // 手动提取 content (处理转义)
                    if (jsonPart) {
                        const start = jsonPart.indexOf('"content"');
                        if (start !== -1) {
                            let valStart = jsonPart.indexOf(':', start) + 1;
                            while(jsonPart[valStart] === ' ' || jsonPart[valStart] === '\n') valStart++;
                            if (jsonPart[valStart] === '"') {
                                // 提取直到结尾或下一个引号
                                // 这里简化处理，直接显示清洗后的 markdown
                                const rawContent = jsonPart.slice(valStart + 1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
                                setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, content_markdown: rawContent } : p));
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
                }
            );
        };

        processPage(nextPage);

    }, [pages, outline, initialSessionId, scenario]);

    const activePage = pages.find(p => p.page_index === activePageIdx) || pages[0];
    const isAllDone = pages.every(p => p.status === 'done');

    // Render Markdown (Simplified)
    const renderContent = (md: string) => {
        if (!md) return null;
        // In real app use marked or remark
        return <div className="prose prose-sm max-w-none whitespace-pre-wrap">{md}</div>;
    };

    return (
        <div className="flex h-full gap-6">
            {/* Left: Navigation */}
            <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">目录</h3>
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
                    <button 
                        onClick={() => onComplete(pages)}
                        disabled={!isAllDone}
                        className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-600 transition-colors"
                    >
                        {isAllDone ? "下一步：排版" : `撰写中 (${completedCount}/${pages.length})...`}
                    </button>
                </div>
            </div>

            {/* Right: Editor / Reader */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                {/* Thinking Overlay / Split */}
                {activePage.status === 'generating' && pageThought && (
                    <div className="bg-[#1e1e1e] text-slate-300 p-4 text-xs font-mono border-b border-slate-700 max-h-32 overflow-y-auto">
                        <span className="text-indigo-400 font-bold mr-2">$ THINKING:</span>
                        {pageThought}
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
            </div>
        </div>
    );
};

// --- 主容器 ---
export const ReportGenerator: React.FC = () => {
    const [step, setStep] = useState(1);
    const [task, setTask] = useState<StratifyTask | null>(null);
    const [analysisStream, setAnalysisStream] = useState('');
    const [step1Thought, setStep1Thought] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [scenarios, setScenarios] = useState<string[]>(['default']);

    // Step 1: Start
    const handleStart = async (idea: string) => {
        setIsAnalyzing(true);
        setAnalysisStream('');
        try {
            const newTask = await createStratifyTask(idea);
            setTask(newTask);

            // Stream Analyze
            await streamGenerate(
                {
                    prompt_name: 'analyze_input',
                    variables: { user_input: idea },
                    scenario: 'default'
                },
                (chunk) => setAnalysisStream(prev => prev + chunk),
                () => {
                    // Done -> Transition
                    setTimeout(() => {
                        setIsAnalyzing(false);
                        // Extract final thought to pass to next step
                        const { thought, jsonPart } = extractThoughtAndJson(analysisStream); // Note: closure issue if using state directly, but here stream ends
                        // Re-parsing full buffer for safety
                        setStep1Thought(thought); 
                        setStep(2);
                    }, 800);
                },
                (err) => { alert('分析失败'); setIsAnalyzing(false); }
            );
        } catch (e) {
            alert('启动失败');
            setIsAnalyzing(false);
        }
    };

    // Step 2 Confirm
    const handleOutlineConfirm = (outline: StratifyOutline, sessionId: string | null) => {
        if(task) {
            const updated = { ...task, outline };
            setTask(updated);
            // In a real app, update backend here
            setStep(4); // Skip 3 (revise) for simplicity in this demo
        }
    };

    // Step 4 Complete
    const handleContentComplete = (pages: StratifyPage[]) => {
         if(task) {
            const updated = { ...task, pages };
            setTask(updated);
            setStep(6); // Skip HTML generation detail view for now, jump to finish
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
                        isAnalyzing={isAnalyzing}
                        analysisStream={analysisStream}
                    />
                )}

                {step === 2 && task && (
                    <OutlineGenerator 
                        taskId={task.id}
                        topic={task.topic}
                        scenario="default"
                        precedingThought={step1Thought}
                        onConfirm={handleOutlineConfirm}
                    />
                )}

                {step === 4 && task && task.outline && (
                    <ContentWriter 
                        taskId={task.id}
                        outline={task.outline}
                        scenario="default"
                        initialSessionId={null}
                        onComplete={handleContentComplete}
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
        </div>
    );
};
