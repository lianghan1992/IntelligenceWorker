
import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, ArrowRightIcon, SparklesIcon, BrainIcon } from '../../icons';
import { StratifyOutline, StratifyPage } from '../../../types';
import { streamGenerate, parseLlmJson } from '../../../api/stratify';
import { extractThoughtAndJson } from '../utils';

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
    
    // Revision State for Content
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);

    // Queue Control
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;
    const isAllDone = pages.every(p => p.status === 'done');

    // Refs for Auto-scrolling
    const contentScrollRef = useRef<HTMLDivElement>(null);
    const thoughtScrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll Content Logic
    useEffect(() => {
        const activePage = pages.find(p => p.page_index === activePageIdx);
        // Only auto-scroll if generating or revising
        if (activePage && (activePage.status === 'generating' || isRevising) && contentScrollRef.current) {
            const element = contentScrollRef.current;
            // Smoothly scroll to bottom
            element.scrollTo({
                top: element.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [pages, activePageIdx, isRevising]);

    // Auto-scroll Thought Logic
    useEffect(() => {
        if (thoughtScrollRef.current) {
            const element = thoughtScrollRef.current;
            element.scrollTop = element.scrollHeight;
        }
    }, [pageThought, reasoningStream]);

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
                    // Pass the session ID from Outline phase to maintain context
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
                // Use the same session ID for revision
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
            {/* Left Sidebar: Pages */}
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

            {/* Right Main Area */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                
                {/* 1. Improved Thinking Area (Fixed Height, Hidden Scrollbar) */}
                {activePage.status === 'generating' && (
                    <div className="flex-shrink-0 bg-slate-900 text-slate-300 border-b border-slate-800 flex flex-col h-36 transition-all duration-300">
                        {/* Header */}
                        <div className="px-4 py-2 flex items-center justify-between border-b border-white/5 bg-slate-950/50">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                                <BrainIcon className="w-3 h-3" />
                                <span>AI 深度思考中...</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150"></span>
                            </div>
                        </div>
                        
                        {/* Content (Hidden Scrollbar) */}
                        <div 
                            ref={thoughtScrollRef}
                            className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-400"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for Firefox/IE
                        >
                            {/* Webkit hide scrollbar */}
                            <style>{`
                                .no-scrollbar::-webkit-scrollbar { display: none; }
                            `}</style>
                            <div className="no-scrollbar whitespace-pre-wrap">
                                {displayThought || <span className="opacity-50 italic">等待推理流...</span>}
                                <span className="typing-cursor ml-1"></span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 2. Content Display (Real-time Markdown) */}
                <div 
                    ref={contentScrollRef}
                    className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white scroll-smooth"
                >
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{activePage.title}</h1>
                    {activePage.content_markdown ? (
                        <div className="animate-in fade-in duration-500">
                            {renderContent(activePage.content_markdown)}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            {activePage.status === 'pending' ? (
                                <>
                                    <SparklesIcon className="w-8 h-8 mb-2 opacity-20" />
                                    <span>等待生成...</span>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <span>正在构思正文...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Revision & Next Action Bar */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-4 items-center flex-shrink-0 z-10">
                    <div className="flex-1 flex gap-2">
                        <input 
                            type="text" 
                            value={revisionInput}
                            onChange={(e) => setRevisionInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !activePage.status.includes('generating') && handleRevisePage()}
                            placeholder="对本页内容不满意？输入修改意见（例如：增加更多数据支持...）"
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            disabled={activePage.status === 'generating'}
                        />
                        <button 
                            onClick={handleRevisePage}
                            disabled={activePage.status === 'generating' || !revisionInput.trim()}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 text-sm whitespace-nowrap transition-colors"
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
