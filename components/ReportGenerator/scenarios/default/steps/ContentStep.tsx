
import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, ArrowRightIcon, SparklesIcon, BrainIcon, DocumentTextIcon, MenuIcon } from '../../../../icons';
import { StratifyOutline, StratifyPage } from '../../../../../types';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';

export const ContentStep: React.FC<{
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
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [revisionInput, setRevisionInput] = useState('');
    const [isRevising, setIsRevising] = useState(false);

    const processingRef = useRef(false);
    const contentScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const activePage = pages.find(p => p.page_index === activePageIdx);
        if (activePage && (activePage.status === 'generating' || isRevising) && contentScrollRef.current) {
            contentScrollRef.current.scrollTo({ top: contentScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [pages, activePageIdx, isRevising]);

    useEffect(() => {
        if (processingRef.current || isRevising) return;
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) return;

        const processPage = async (page: StratifyPage) => {
            processingRef.current = true;
            setActivePageIdx(page.page_index);
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
                    if (jsonPart && jsonPart.length > 5) setIsThinkingOpen(false);
                    if (jsonPart) {
                        const parsed = parseLlmJson<{title:string, content:string}>(jsonPart);
                        if (parsed && parsed.content) {
                             setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, content_markdown: parsed.content } : p));
                        }
                    }
                },
                () => {
                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'done' } : p));
                    processingRef.current = false;
                    setIsThinkingOpen(false);
                },
                () => {
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
                if (jsonPart && jsonPart.length > 5) setIsThinkingOpen(false);
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
            () => {
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
    const isAllDone = pages.every(p => p.status === 'done');

    return (
        <div className="flex h-full bg-[#f8fafc] overflow-hidden relative">
            <ReasoningModal isOpen={isThinkingOpen} onClose={() => setIsThinkingOpen(false)} content={displayThought} status="AI 正在深度思考..." />
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}
            <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-slate-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-slate-200/60"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><DocumentTextIcon className="w-4 h-4"/> 章节导航</h3></div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {pages.map(p => (
                        <button key={p.page_index} onClick={() => { setActivePageIdx(p.page_index); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${activePageIdx === p.page_index ? 'bg-white text-indigo-700 shadow-md ring-1 ring-indigo-50' : 'text-slate-600 hover:bg-white/60'}`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${activePageIdx === p.page_index ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200'}`}>{p.page_index}</span>
                                <span className="truncate">{p.title}</span>
                            </div>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0 relative h-full bg-white">
                <div className="flex-1 overflow-y-auto scroll-smooth relative" ref={contentScrollRef}>
                    <div className="max-w-4xl mx-auto min-h-full py-8 px-6 md:px-12 md:py-12">
                        <div className="mb-10 pb-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white/95 backdrop-blur-sm z-10 pt-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <button className="md:hidden p-1 -ml-1 text-slate-500 hover:text-indigo-600" onClick={() => setIsSidebarOpen(true)}><MenuIcon className="w-5 h-5" /></button>
                                    SECTION {activePage.page_index}
                                </span>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">{activePage.title}</h1>
                            </div>
                        </div>
                        <div className="min-h-[500px] animate-in fade-in duration-500">
                            {activePage.content_markdown ? <div className="prose prose-slate prose-lg max-w-none whitespace-pre-wrap leading-relaxed">{activePage.content_markdown}</div> : <div className="flex flex-col items-center justify-center h-96 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50"><p className="text-sm font-medium">{activePage.status === 'pending' ? '等待生成...' : 'AI 正在撰写...'}</p></div>}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6 z-20">
                    <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-3 flex flex-col md:flex-row gap-3 items-center max-w-4xl mx-auto ring-1 ring-slate-100">
                        <div className="w-full md:flex-1 relative">
                            <input type="text" value={revisionInput} onChange={(e) => setRevisionInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && activePage.status === 'done' && handleRevisePage()} placeholder="输入修改指令..." className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 rounded-xl pl-4 pr-12 py-3 text-sm transition-all outline-none" disabled={activePage.status === 'generating'} />
                            <button onClick={handleRevisePage} disabled={activePage.status === 'generating' || !revisionInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><ArrowRightIcon className="w-4 h-4" /></button>
                        </div>
                        <button onClick={() => onComplete(pages)} disabled={!isAllDone || isRevising} className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"><span>排版设计</span><ArrowRightIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};
