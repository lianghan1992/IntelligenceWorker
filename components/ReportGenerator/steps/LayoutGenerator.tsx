
import React, { useState, useEffect, useRef } from 'react';
import { ViewGridIcon, CheckIcon, BrainIcon, MenuIcon } from '../../icons';
import { StratifyPage } from '../../../types';
import { streamGenerate, parseLlmJson } from '../../../api/stratify';
import { extractThoughtAndJson } from '../utils';
import { ReasoningModal } from '../ui/ReasoningModal';

// Helper to robustly extract HTML
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
        catch (e) { return jsonFieldMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'); }
    }
    const rawHtmlMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
    if (rawHtmlMatch) return rawHtmlMatch[0];
    return null;
};

export const LayoutGenerator: React.FC<{
    taskId: string;
    pages: StratifyPage[];
    scenario: string;
    onComplete: (pages: StratifyPage[]) => void;
}> = ({ taskId, pages: initialPages, scenario, onComplete }) => {
    const [pages, setPages] = useState<StratifyPage[]>(initialPages.map(p => ({
        ...p,
        status: p.status === 'done' ? 'pending' : p.status
    })));
    const [activePageIdx, setActivePageIdx] = useState(1);
    const [pageThought, setPageThought] = useState(''); 
    const [reasoningStream, setReasoningStream] = useState('');
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
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
            setIsThinkingOpen(true);
            
            setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'generating' } : p));

            let buffer = '';
            
            await streamGenerate(
                {
                    prompt_name: '05_generate_html',
                    variables: {
                        page_title: page.title,
                        markdown_content: page.content_markdown || ''
                    },
                    session_id: undefined, 
                    scenario
                },
                (chunk) => {
                    buffer += chunk;
                    
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    if (jsonPart && jsonPart.trim().length > 5) {
                        setIsThinkingOpen(false);
                    }
                    else if (buffer.includes('<!DOCTYPE html>') || buffer.includes('<html')) {
                        setIsThinkingOpen(false);
                    }
                },
                () => {
                    const { thought, jsonPart } = extractThoughtAndJson(buffer);
                    setPageThought(thought); 
                    setIsThinkingOpen(false);

                    const htmlContent = robustExtractHtml(buffer, jsonPart);

                    if (htmlContent) {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, html_content: htmlContent, status: 'done' } : p));
                    } else {
                        console.warn('Failed to parse HTML from response');
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    }
                    processingRef.current = false;
                },
                (err) => {
                    console.error(err);
                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    processingRef.current = false;
                    setIsThinkingOpen(false);
                },
                undefined,
                (chunk) => {
                    setReasoningStream(prev => prev + chunk);
                }
            );
        };

        processPage(nextPage);

    }, [pages, scenario]);

    const activePage = pages.find(p => p.page_index === activePageIdx) || pages[0];
    const displayThought = reasoningStream || pageThought;
    const isAllLayoutDone = pages.every(p => p.status === 'done');

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden relative">
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={displayThought}
                status="AI 架构师正在设计..."
            />

            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Left Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-xl md:shadow-none
                md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-5 bg-white border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <ViewGridIcon className="w-4 h-4 text-purple-600" />
                        页面结构
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {pages.map(p => (
                        <button
                            key={p.page_index}
                            onClick={() => { setActivePageIdx(p.page_index); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${
                                activePageIdx === p.page_index 
                                    ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100' 
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span className="truncate flex-1">{p.page_index}. {p.title}</span>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>}
                            {p.status === 'done' && <CheckIcon className="w-4 h-4 text-green-500" />}
                            {p.status === 'failed' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                        </button>
                    ))}
                </div>
                <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                    <div className="w-full text-center text-xs text-slate-400 mb-3 font-medium">
                        {completedCount === pages.length ? "排版完成" : `正在设计 (${completedCount}/${pages.length})...`}
                    </div>
                    {isAllLayoutDone && (
                        <button 
                            onClick={() => onComplete(pages)}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-green-700 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <CheckIcon className="w-4 h-4" />
                            生成最终报告
                        </button>
                    )}
                </div>
            </div>

            {/* Right Main Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#eef2f6]">
                {/* Preview Window Container */}
                <div className="flex-1 p-4 md:p-10 flex flex-col overflow-hidden items-center justify-center">
                    
                    <div className="w-full max-w-[1400px] h-full bg-white rounded-2xl shadow-2xl border border-slate-300/60 overflow-hidden flex flex-col ring-1 ring-black/5 relative">
                        
                        {/* Browser-like Toolbar */}
                        <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-5 gap-4 select-none">
                            {/* Mobile Menu Button */}
                            <button 
                                className="md:hidden text-slate-500 hover:text-indigo-600"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <MenuIcon className="w-5 h-5" />
                            </button>

                            <div className="hidden md:flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                            </div>
                            
                            <div className="flex-1 flex justify-center">
                                <div className="bg-white border border-slate-200 text-xs text-slate-500 font-medium px-4 py-1.5 rounded-lg flex items-center gap-2 w-full max-w-md justify-center shadow-sm">
                                    <span className={`w-2 h-2 rounded-full ${activePage.status === 'generating' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></span>
                                    {activePage.status === 'generating' ? 'designing_layout...' : `preview_page_${activePage.page_index}.html`}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setIsThinkingOpen(true)}
                                className="text-slate-400 hover:text-purple-600 transition-colors p-2 hover:bg-white rounded-lg"
                                title="查看设计思路"
                            >
                                <BrainIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Preview Iframe */}
                        <div className="flex-1 relative bg-white overflow-hidden">
                            {activePage.html_content ? (
                                <iframe 
                                    srcDoc={activePage.html_content} 
                                    className="w-full h-full border-none" 
                                    title={`Preview ${activePage.page_index}`}
                                    sandbox="allow-scripts"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/30 text-slate-400">
                                    {activePage.status === 'pending' ? (
                                        <>
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                                <ViewGridIcon className="w-10 h-10 opacity-20" />
                                            </div>
                                            <p className="text-base font-medium">等待排版引擎启动...</p>
                                        </>
                                    ) : activePage.status === 'generating' ? (
                                        <div className="text-center">
                                            <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-8 mx-auto"></div>
                                            <h3 className="text-xl font-bold text-slate-700 mb-2">AI 架构师正在设计</h3>
                                            <p className="text-sm text-slate-500">构建布局 • 生成矢量图形 • 优化排版</p>
                                        </div>
                                    ) : (
                                        <div className="text-center text-red-400">
                                            <p>生成失败</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
