
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
        return <div className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed">{md}</div>;
    };

    return (
        <div className="flex h-full bg-[#f8fafc] overflow-hidden relative">
            {/* Reasoning Modal */}
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={displayThought}
                status="AI 正在构思正文..."
            />

            {/* Mobile Sidebar Backdrop */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* 1. Left Sidebar: Navigation */}
            <div className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 transform
                md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4"/> 目录概览
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {pages.map(p => (
                        <button
                            key={p.page_index}
                            onClick={() => { setActivePageIdx(p.page_index); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${
                                activePageIdx === p.page_index 
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activePageIdx === p.page_index ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                                    {p.page_index}
                                </span>
                                <span className="truncate">{p.title}</span>
                            </div>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                            {p.status === 'done' && <CheckIcon className="w-3.5 h-3.5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="w-full flex justify-between items-center text-xs text-slate-500 mb-2">
                        <span>完成度</span>
                        <span className="font-bold">{completedCount}/{pages.length}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{width: `${(completedCount/pages.length)*100}%`}}></div>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Editor */}
            <div className="flex-1 flex flex-col min-w-0 relative h-full">
                
                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto bg-slate-100/50 scroll-smooth relative" ref={contentScrollRef}>
                    <div className="max-w-4xl mx-auto min-h-full py-4 md:py-8 px-4 md:px-10">
                        <div className="bg-white rounded-[20px] shadow-sm border border-slate-200/60 min-h-[600px] md:min-h-[800px] p-6 md:p-14 relative group">
                            
                            {/* Page Header & Actions */}
                            <div className="mb-6 md:mb-8 pb-4 md:pb-6 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <button 
                                            className="md:hidden p-1 -ml-1 text-slate-500 hover:text-indigo-600"
                                            onClick={() => setIsSidebarOpen(true)}
                                        >
                                            <MenuIcon className="w-5 h-5" />
                                        </button>
                                        PAGE {activePage.page_index}
                                    </span>
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                                        {activePage.title}
                                    </h1>
                                </div>
                                <button 
                                    onClick={() => setIsThinkingOpen(true)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                                    title="查看思考过程"
                                >
                                    <BrainIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Main Content */}
                            <div className="min-h-[400px]">
                                {activePage.content_markdown ? (
                                    <div className="animate-in fade-in duration-700">
                                        {renderContent(activePage.content_markdown)}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                        {activePage.status === 'pending' ? (
                                            <>
                                                <SparklesIcon className="w-10 h-10 mb-3 opacity-20" />
                                                <p className="text-sm font-medium">等待生成...</p>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                                <p className="text-sm font-medium text-indigo-600 animate-pulse">AI 正在构思正文...</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white/80 backdrop-blur z-20 flex flex-col md:flex-row gap-3 items-center justify-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <div className="w-full md:flex-1 max-w-2xl flex gap-3">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={revisionInput}
                                onChange={(e) => setRevisionInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !activePage.status.includes('generating') && handleRevisePage()}
                                placeholder="输入修改意见（例如：增加更多数据支持、语气更正式一些...）"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
                                disabled={activePage.status === 'generating'}
                            />
                            <button 
                                onClick={handleRevisePage}
                                disabled={activePage.status === 'generating' || !revisionInput.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50 disabled:bg-transparent transition-all"
                                title="提交修改"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="hidden md:block h-8 w-px bg-slate-200 mx-2"></div>
                    <button 
                        onClick={() => onComplete(pages)}
                        disabled={!isAllDone || isRevising || processingRef.current}
                        className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <span>下一步：智能排版</span>
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
