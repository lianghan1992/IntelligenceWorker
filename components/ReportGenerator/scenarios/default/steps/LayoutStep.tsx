
import React, { useState, useEffect, useRef } from 'react';
import { ViewGridIcon, CheckIcon, MenuIcon, BrainIcon } from '../../../../icons';
import { StratifyPage } from '../../../../../types';
import { streamGenerate, parseLlmJson } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';

const robustExtractHtml = (fullText: string, jsonPart: string): string | null => {
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html: string }>(jsonPart);
            if (parsed && parsed.html) return parsed.html;
        } catch (e) { /* continue */ }
    }
    const jsonFieldMatch = fullText.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (jsonFieldMatch && jsonFieldMatch[1]) {
        try { return JSON.parse(`"${jsonFieldMatch[1]}"`); } 
        catch (e) { return jsonFieldMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'); }
    }
    const rawHtmlMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
    return rawHtmlMatch ? rawHtmlMatch[0] : null;
};

export const LayoutStep: React.FC<{
    taskId: string;
    pages: StratifyPage[];
    scenario: string;
    onComplete: (pages: StratifyPage[]) => void;
}> = ({ taskId, pages: initialPages, scenario, onComplete }) => {
    const [pages, setPages] = useState<StratifyPage[]>(initialPages.map(p => ({ ...p, status: p.status === 'done' ? 'pending' : p.status })));
    const [activePageIdx, setActivePageIdx] = useState(1);
    const [pageThought, setPageThought] = useState(''); 
    const [reasoningStream, setReasoningStream] = useState('');
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;

    useEffect(() => {
        if (processingRef.current) return;
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
                { prompt_name: '05_generate_html', variables: { page_title: page.title, markdown_content: page.content_markdown || '' }, scenario },
                (chunk) => {
                    buffer += chunk;
                    if (buffer.includes('<!DOCTYPE html>') || buffer.includes('<html')) setIsThinkingOpen(false);
                },
                () => {
                    const { thought, jsonPart } = extractThoughtAndJson(buffer);
                    setPageThought(thought); 
                    setIsThinkingOpen(false);
                    const htmlContent = robustExtractHtml(buffer, jsonPart);
                    if (htmlContent) {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, html_content: htmlContent, status: 'done' } : p));
                    } else {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    }
                    processingRef.current = false;
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
    }, [pages, scenario]);

    const activePage = pages.find(p => p.page_index === activePageIdx) || pages[0];
    const isAllLayoutDone = pages.every(p => p.status === 'done');

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden relative">
            <ReasoningModal isOpen={isThinkingOpen} onClose={() => setIsThinkingOpen(false)} content={reasoningStream || pageThought} status="AI 架构师正在设计..." />
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}
            <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 bg-white border-b"><h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><ViewGridIcon className="w-4 h-4 text-purple-600" /> 页面结构</h3></div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {pages.map(p => (
                        <button key={p.page_index} onClick={() => { setActivePageIdx(p.page_index); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${activePageIdx === p.page_index ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <span className="truncate flex-1">{p.page_index}. {p.title}</span>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>}
                            {p.status === 'done' && <CheckIcon className="w-4 h-4 text-green-500" />}
                        </button>
                    ))}
                </div>
                <div className="p-5 border-t bg-slate-50/50">
                    <div className="w-full text-center text-xs text-slate-400 mb-3 font-medium">{completedCount === pages.length ? "排版完成" : `正在设计 (${completedCount}/${pages.length})...`}</div>
                    {isAllLayoutDone && <button onClick={() => onComplete(pages)} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-green-700 transition-all flex items-center justify-center gap-2"><CheckIcon className="w-4 h-4" /> 生成最终报告</button>}
                </div>
            </div>
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#eef2f6]">
                <div className="flex-1 p-4 md:p-10 flex flex-col overflow-hidden items-center justify-center">
                    <div className="w-full max-w-[1400px] h-full bg-white rounded-2xl shadow-2xl border border-slate-300/60 overflow-hidden flex flex-col relative">
                        <div className="h-12 bg-slate-100 border-b flex items-center px-5 gap-4">
                            <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(true)}><MenuIcon className="w-5 h-5" /></button>
                            <div className="flex-1 flex justify-center"><div className="bg-white border text-xs text-slate-500 px-4 py-1.5 rounded-lg">preview_page_{activePage.page_index}.html</div></div>
                            <button onClick={() => setIsThinkingOpen(true)} className="text-slate-400 hover:text-purple-600 transition-colors p-2 hover:bg-white rounded-lg"><BrainIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 relative bg-white overflow-hidden">
                            {activePage.html_content ? <iframe srcDoc={activePage.html_content} className="w-full h-full border-none" title={`Preview ${activePage.page_index}`} sandbox="allow-scripts" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><p className="text-base font-medium">{activePage.status === 'generating' ? 'AI 架构师正在设计...' : '等待排版引擎启动...'}</p></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
