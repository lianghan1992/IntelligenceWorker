
import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, ArrowRightIcon, SparklesIcon, BrainIcon, DocumentTextIcon, MenuIcon } from '../../icons';
import { StratifyOutline, StratifyPage } from '../../../types';
import { streamGenerate, parseLlmJson } from '../../../api/stratify';
import { extractThoughtAndJson } from '../utils';
import { ReasoningModal } from '../ui/ReasoningModal';

export const ContentWriter: React.FC<{
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
    
    // Modal State
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    
    // Mobile Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Revision State for Content
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);

    // Queue Control
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;
    const isAllDone = pages.every(p => p.status === 'done');

    // Refs for Auto-scrolling content
    const contentScrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll Content Logic
    useEffect(() => {
        const activePage = pages.find(p => p.page_index === activePageIdx);
        // Only auto-scroll if generating or revising
        if (activePage && (activePage.status === 'generating' || isRevising) && contentScrollRef.current) {
            const element = contentScrollRef.current;
            element.scrollTo({
                top: element.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [pages, activePageIdx, isRevising]);

    // Auto-trigger next page
    useEffect(() => {
        if (processingRef.current || isRevising) return;
        
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) return;

        const processPage = async (page: StratifyPage) => {
            processingRef.current = true;
            setActivePageIdx(page.page_index);
            
            // Start Thinking UI
            setPageThought('');
            setReasoningStream('');
            setIsThinkingOpen(true);
            
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

                    // Auto-close modal when content starts arriving
                    if (jsonPart && jsonPart.length > 5) {
                        setIsThinkingOpen(false);
                    }

                    if (jsonPart) {
                        const parsed = parseLlmJson<{title:string, content:string}>(jsonPart);
                        if (parsed && parsed.content) {
                             setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, content_markdown: parsed.content } : p));
                        } else {
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
                    setIsThinkingOpen(false); // Ensure closed on done
                },
                (err) => {
                    console.error(err);
                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    processingRef.current = false;
                    setIsThinkingOpen(false);
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
        setIsThinkingOpen(true);
        
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
                
                if (jsonPart && jsonPart.length > 5) {
                    setIsThinkingOpen(false);
                }

                const parsed = parseLlmJson<{title:string, content:string}>(jsonPart);
                if (parsed && parsed.content) {
                    setPages(prev => prev.map(p => p.page_index === activePageIdx ? { ...p, content_markdown: parsed.content } : p));
                }
            },
            () => {
                setPages(prev => prev.map(p => p.page_index === activePageIdx ? { ...p, status: 'done' } : p));
                setIsRevising(false);
                setRevisionInput('');
                setIsThinkingOpen(false);
            },
            (err) => {
                console.error(err);
                setIsRevising(false);
                setPages(prev => prev.map(p => p.page_index === activePageIdx ? { ...p, status: 'done' } : p));
                setIsThinkingOpen(false);
            },
            undefined,
            (chunk) => setReasoningStream(prev => prev + chunk)
        );
    };

    const activePage = pages.find(p => p.page_index === activePageIdx) || pages[0];
    const displayThought = reasoningStream || pageThought;

    const renderContent = (md: string) => {
        if (!md) return null;
        return <div className="prose prose-slate prose-lg max-w-none whitespace-pre-wrap leading-relaxed">{md}</div>;
    };

    return (
        <div className="flex h-full bg-[#f8fafc] overflow-hidden relative">
            {/* Reasoning Modal */}
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={displayThought}
                status="AI 正在深度思考..."
            />

            {/* Mobile Sidebar Backdrop */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* 1. Left Sidebar: Navigation (Mac-style) */}
            <div className={`
                fixed inset-y-0 left-0 z-30 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-slate-200 flex flex-col transition-transform duration-300 transform
                md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-5 border-b border-slate-200/60">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4"/> 章节导航
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {pages.map(p => (
                        <button
                            key={p.page_index}
                            onClick={() => { setActivePageIdx(p.page_index); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${
                                activePageIdx === p.page_index 
                                    ? 'bg-white text-indigo-700 shadow-md shadow-indigo-100 ring-1 ring-indigo-50' 
                                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${activePageIdx === p.page_index ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {p.page_index}
                                </span>
                                <span className="truncate">{p.title}</span>
                            </div>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                            {p.status === 'done' && <CheckIcon className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </button>
                    ))}
                </div>
                
                <div className="p-5 border-t border-slate-200/60">
                    <div className="w-full flex justify-between items-center text-xs text-slate-500 mb-2 font-medium">
                        <span>生成进度</span>
                        <span>{completedCount} / {pages.length}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{width: `${(completedCount/pages.length)*100}%`}}></div>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Editor */}
            <div className="flex-1 flex flex-col min-w-0 relative h-full bg-white">
                
                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto scroll-smooth relative" ref={contentScrollRef}>
                    <div className="max-w-4xl mx-auto min-h-full py-8 px-6 md:px-12 md:py-12">
                        
                        {/* Page Header */}
                        <div className="mb-10 pb-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white/95 backdrop-blur-sm z-10 pt-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <button 
                                        className="md:hidden p-1 -ml-1 text-slate-500 hover:text-indigo-600"
                                        onClick={() => setIsSidebarOpen(true)}
                                    >
                                        <MenuIcon className="w-5 h-5" />
                                    </button>
                                    SECTION {activePage.page_index}
                                </span>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
                                    {activePage.title}
                                </h1>
                            </div>
                            <button 
                                onClick={() => setIsThinkingOpen(true)}
                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                title="查看思考过程"
                            >
                                <BrainIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="min-h-[500px] animate-in fade-in duration-500">
                            {activePage.content_markdown ? (
                                renderContent(activePage.content_markdown)
                            ) : (
                                <div className="flex flex-col items-center justify-center h-96 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                    {activePage.status === 'pending' ? (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                                <SparklesIcon className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-sm font-medium">等待生成...</p>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-indigo-600 animate-pulse">AI 正在撰写...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar (Floating) */}
                <div className="absolute bottom-6 left-6 right-6 z-20">
                    <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-indigo-500/10 rounded-2xl p-3 flex flex-col md:flex-row gap-3 items-center max-w-4xl mx-auto ring-1 ring-slate-100">
                        <div className="w-full md:flex-1 relative">
                            <input 
                                type="text" 
                                value={revisionInput}
                                onChange={(e) => setRevisionInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !activePage.status.includes('generating') && handleRevisePage()}
                                placeholder="输入修改指令 (e.g. '让语气更正式一点', '增加数据支撑')"
                                className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-4 pr-12 py-3 text-sm transition-all outline-none"
                                disabled={activePage.status === 'generating'}
                            />
                            <button 
                                onClick={handleRevisePage}
                                disabled={activePage.status === 'generating' || !revisionInput.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 disabled:opacity-50 disabled:bg-transparent transition-all shadow-sm"
                                title="提交修改"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="hidden md:block h-8 w-px bg-slate-200 mx-2"></div>
                        
                        <button 
                            onClick={() => onComplete(pages)}
                            disabled={!isAllDone || isRevising || processingRef.current}
                            className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-indigo-600 hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <span>排版设计</span>
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
