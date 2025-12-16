
import React, { useState, useEffect, useRef } from 'react';
import { ViewGridIcon, CheckIcon, PencilIcon, ServerIcon, CodeIcon, BrainIcon, ChevronDownIcon, ChevronRightIcon } from '../../icons';
import { StratifyPage } from '../../../types';
import { streamGenerate, parseLlmJson } from '../../../api/stratify';
import { extractThoughtAndJson } from '../utils';

// Helper to robustly extract HTML from potentially malformed LLM response
const robustExtractHtml = (fullText: string, jsonPart: string): string | null => {
    // 1. Try standard JSON parse of the extracted JSON part
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html: string }>(jsonPart);
            if (parsed && parsed.html) return parsed.html;
        } catch (e) { /* continue */ }
    }

    // 2. Try regex for the specific "html" field in the JSON part (handling potential unescaped chars)
    const jsonFieldMatch = fullText.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (jsonFieldMatch && jsonFieldMatch[1]) {
        try {
            // Standard unescape
            return JSON.parse(`"${jsonFieldMatch[1]}"`);
        } catch (e) {
            // Manual fallback unescape if JSON.parse fails (e.g. newlines)
            return jsonFieldMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\');
        }
    }

    // 3. Last resort: Look for raw HTML tags if the model violated JSON constraints
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
        status: p.status === 'done' ? 'pending' : p.status // Reset status for layout phase if previously done
    })));
    const [activePageIdx, setActivePageIdx] = useState(1);
    const [pageThought, setPageThought] = useState(''); 
    const [reasoningStream, setReasoningStream] = useState('');
    
    // For "Cool Streaming": we need to show raw text buffer as if it's code being typed
    const [codeStreamBuffer, setCodeStreamBuffer] = useState(''); 
    
    // Terminal State
    const [isTerminalOpen, setIsTerminalOpen] = useState(true);
    const terminalRef = useRef<HTMLDivElement>(null);
    
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;

    // Auto-scroll terminal
    useEffect(() => {
        if (isTerminalOpen && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [pageThought, reasoningStream, codeStreamBuffer, isTerminalOpen]);

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
            setCodeStreamBuffer(''); 
            
            setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'generating' } : p));

            let buffer = '';
            
            await streamGenerate(
                {
                    prompt_name: '05_generate_html',
                    variables: {
                        page_title: page.title,
                        markdown_content: page.content_markdown || ''
                    },
                    // Explicitly set session_id to undefined to block context and ensure clean HTML generation
                    session_id: undefined, 
                    scenario
                },
                (chunk) => {
                    buffer += chunk;
                    // Visual effect: accumulate last 2000 chars
                    setCodeStreamBuffer(prev => (prev + chunk).slice(-2000));
                },
                () => {
                    // On Done, robustly extract HTML
                    const { thought, jsonPart } = extractThoughtAndJson(buffer);
                    setPageThought(thought); 

                    const htmlContent = robustExtractHtml(buffer, jsonPart);

                    if (htmlContent) {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, html_content: htmlContent, status: 'done' } : p));
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
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-10">
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
                            onClick={() => setActivePageIdx(p.page_index)}
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
                <div className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    <div className="bg-white flex-1 rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col ring-1 ring-black/5 relative">
                        {/* Browser-like Toolbar */}
                        <div className="h-9 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2 select-none">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                            </div>
                            <div className="ml-4 flex-1 flex justify-center">
                                <div className="bg-white border border-slate-200 text-[10px] text-slate-400 px-3 py-0.5 rounded-md flex items-center gap-1.5 w-full max-w-[300px] justify-center">
                                    <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                                    {activePage.status === 'generating' ? 'designing...' : 'preview.html'}
                                </div>
                            </div>
                            <div className="w-10"></div>
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

                {/* Bottom Terminal (Collapsible) */}
                <div 
                    className={`border-t border-slate-800 bg-[#1e1e1e] transition-all duration-300 ease-in-out flex flex-col ${
                        isTerminalOpen ? 'h-64' : 'h-9'
                    }`}
                >
                    {/* Terminal Bar */}
                    <div 
                        className="h-9 bg-[#2d2d2d] flex items-center justify-between px-4 cursor-pointer select-none hover:bg-[#3d3d3d] transition-colors"
                        onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                                <ServerIcon className="w-3.5 h-3.5 text-purple-400" />
                                AI_DESIGN_ENGINE
                            </span>
                            {activePage.status === 'generating' && (
                                <span className="text-[10px] text-green-400 animate-pulse">● Running</span>
                            )}
                        </div>
                        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isTerminalOpen ? '' : 'rotate-180'}`} />
                    </div>

                    {/* Terminal Content */}
                    <div className="flex-1 flex overflow-hidden font-mono text-[11px] leading-relaxed">
                        {/* Reasoning Stream */}
                        <div className="w-1/2 border-r border-white/10 flex flex-col">
                            <div className="px-3 py-1 bg-[#252526] text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2">
                                <BrainIcon className="w-3 h-3" /> Thought Process
                            </div>
                            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar-dark text-slate-300/80 whitespace-pre-wrap">
                                {displayThought || <span className="text-slate-600 italic">// Waiting for reasoning...</span>}
                            </div>
                        </div>

                        {/* Code Stream */}
                        <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
                            <div className="px-3 py-1 bg-[#252526] text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2">
                                <CodeIcon className="w-3 h-3" /> Live Code Stream
                            </div>
                            <div 
                                ref={terminalRef}
                                className="flex-1 p-3 overflow-y-auto custom-scrollbar-dark text-blue-300/90 break-all"
                            >
                                {codeStreamBuffer || <span className="text-slate-600 italic">// Waiting for code output...</span>}
                                {activePage.status === 'generating' && <span className="typing-cursor ml-1"></span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
