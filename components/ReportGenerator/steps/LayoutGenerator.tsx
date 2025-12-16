
import React, { useState, useEffect, useRef } from 'react';
import { ViewGridIcon, CheckIcon, ServerIcon, BrainIcon, MenuIcon } from '../../icons';
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
                    
                    // Real-time detection: If content starts, close the reasoning modal.
                    // This handles models that skip reasoning and output JSON/HTML directly.
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    
                    // Condition 1: Valid JSON part detected
                    if (jsonPart && jsonPart.trim().length > 5) {
                        setIsThinkingOpen(false);
                    }
                    // Condition 2: Raw HTML detected (fallback)
                    else if (buffer.includes('<!DOCTYPE html>') || buffer.includes('<html')) {
                        setIsThinkingOpen(false);
                    }
                },
                () => {
                    const { thought, jsonPart } = extractThoughtAndJson(buffer);
                    setPageThought(thought); 
                    // Ensure closed on completion
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
                    // Update reasoning stream
                    setReasoningStream(prev => prev + chunk);
                    
                    // If we receive "reasoning" channel data, keep modal open? 
                    // No, usually logic above handles closing. 
                    // If buffer is empty but reasoning is coming, modal stays open (correct).
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
                fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300
                md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <ViewGridIcon className="w-4 h-4 text-purple-600" />
                        页面结构
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pages.map(p => (
                        <button
                            key={p.page_index}
                            onClick={() => { setActivePageIdx(p.page_index); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${
                                activePageIdx === p.page_index 
                                    ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100' 
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span className="truncate flex-1">{p.page_index}. {p.title}</span>
                            {p.status === 'generating' && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>}
                            {p.status === 'done' && <CheckIcon className="w-3.5 h-3.5 text-green-500" />}
                            {p.status === 'failed' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                    <div className="w-full text-center text-xs text-slate-400 mb-3">
                        {completedCount === pages.length ? "排版完成" : `正在设计 (${completedCount}/${pages.length})...`}
                    </div>
                    {isAllLayoutDone && (
                        <button 
                            onClick={() => onComplete(pages)}
                            className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-green-700 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <CheckIcon className="w-4 h-4" />
                            生成最终报告
                        </button>
                    )}
                </div>
            </div>

            {/* Right Main Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-100">
                {/* Preview Window Container */}
                <div className="flex-1 p-4 md:p-8 flex flex-col overflow-hidden">
                    <div className="bg-white flex-1 rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col ring-1 ring-black/5 relative">
                        {/* Browser-like Toolbar */}
                        <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-3 select-none">
                            {/* Mobile Menu Button */}
                            <button 
                                className="md:hidden text-slate-500 hover:text-indigo-600"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <MenuIcon className="w-4 h-4" />
                            </button>

                            <div className="hidden md:flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="bg-white border border-slate-200 text-[10px] text-slate-400 px-3 py-1 rounded-md flex items-center gap-2 w-full max-w-[400px] justify-center shadow-sm">
                                    <span className={`w-2 h-2 rounded-full ${activePage.status === 'generating' ? 'bg-purple-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                    {activePage.status === 'generating' ? 'designing_layout...' : 'preview.html'}
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsThinkingOpen(true)}
                                className="text-slate-400 hover:text-purple-600 transition-colors p-1 hover:bg-slate-200 rounded"
                                title="查看设计思路"
                            >
                                <BrainIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Preview Iframe */}
                        <div className="flex-1 relative bg-white">
                            {activePage.html_content ? (
                                <iframe 
                                    srcDoc={activePage.html_content} 
                                    className="w-full h-full border-none" 
                                    title={`Preview ${activePage.page_index}`}
                                    sandbox="allow-scripts"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 text-slate-400">
                                    {activePage.status === 'pending' ? (
                                        <>
                                            <ViewGridIcon className="w-16 h-16 mb-4 opacity-10" />
                                            <p className="text-sm font-medium">等待排版引擎启动...</p>
                                        </>
                                    ) : activePage.status === 'generating' ? (
                                        <div className="text-center">
                                            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6 mx-auto"></div>
                                            <p className="text-sm font-bold text-slate-600 mb-1">AI 架构师正在设计</p>
                                            <p className="text-xs text-slate-400">构建布局 • 生成矢量图形 • 优化排版</p>
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
