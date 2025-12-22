
import React, { useState, useEffect, useRef } from 'react';
import { ViewGridIcon, CheckIcon, MenuIcon, BrainIcon, CodeIcon, DownloadIcon, RefreshIcon, ShieldExclamationIcon } from '../../../../icons';
import { StratifyPage } from '../../../../../types';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';

// Helper to robustly extract HTML for final rendering
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

// Helper to clean streaming JSON to show pure HTML code in the terminal window
const extractStreamingHtmlContent = (text: string): string => {
    const match = text.match(/"html"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
    if (match && match.groups?.content) {
        return match.groups.content
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
    }
    return '';
};

// Helper: Intent Sniffing for Status Text
const detectAction = (buffer: string) => {
    const tail = buffer.slice(-500);
    if (tail.match(/<svg|<path|<rect|<circle|<defs/i)) {
        return { title: '正在绘制矢量图形', sub: 'Rendering Vector Assets • SVG Optimization' };
    }
    if (tail.match(/<style|@media|font-family|:root/i)) {
        return { title: '正在调配视觉样式', sub: 'Injecting CSS • Typography • Color Palette' };
    }
    if (tail.match(/<script|function|const|var|let|addEventListener/i)) {
        return { title: '正在注入交互逻辑', sub: 'Compiling JavaScript • Event Listeners' };
    }
    if (tail.match(/display:\s*grid|grid-template|flex-direction|columns/i)) {
        return { title: '正在构建布局系统', sub: 'Grid System • Flexbox • Responsive Design' };
    }
    if (tail.match(/<img|src=['"]http|background-image/i)) {
        return { title: '正在加载媒体资源', sub: 'Fetching Images • CDN Assets' };
    }
    if (tail.match(/<table|<tr|<td|<th/i)) {
        return { title: '正在生成数据表格', sub: 'Data Visualization • Table Structure' };
    }
    if (tail.match(/<h1|<h2|<p|<span/i)) {
        return { title: '正在排版文本内容', sub: 'Typesetting • Semantic Structure' };
    }
    return { title: 'AI 架构师正在设计', sub: '构建布局 • 生成矢量图形 • 优化排版' };
};

const ScaledPreview: React.FC<{ htmlContent: string | null }> = ({ htmlContent }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const availableWidth = containerRef.current.offsetWidth;
                const scaleW = availableWidth / 1600;
                setScale(Math.min(scaleW, 1) * 0.95);
            }
        };
        window.addEventListener('resize', updateScale);
        updateScale();
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => {
            window.removeEventListener('resize', updateScale);
            observer.disconnect();
        };
    }, []);

    if (!htmlContent) return null;

    return (
        <div ref={containerRef} className="w-full h-full flex items-start justify-center bg-gray-200 overflow-auto relative p-8 custom-scrollbar">
            <div 
                style={{
                    width: '1600px',
                    height: '900px',
                    minHeight: '900px',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    boxShadow: '0 0 50px rgba(0,0,0,0.15)',
                    backgroundColor: 'white',
                }}
            >
                <iframe 
                    srcDoc={htmlContent} 
                    className="w-full h-full border-none bg-white" 
                    title="Preview"
                    sandbox="allow-scripts"
                />
            </div>
        </div>
    );
};

export const LayoutStep: React.FC<{
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
    const [htmlStreamBuffer, setHtmlStreamBuffer] = useState(''); 
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [statusInfo, setStatusInfo] = useState({ title: 'AI 架构师正在设计', sub: '构建布局 • 生成矢量图形 • 优化排版' });
    
    const lastUpdateRef = useRef(0);
    const processingRef = useRef(false);
    const codeScrollRef = useRef<HTMLDivElement>(null);
    const completedCount = pages.filter(p => p.status === 'done').length;

    useEffect(() => {
        if (codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [htmlStreamBuffer]);
    
    useEffect(() => {
        if (!htmlStreamBuffer) return;
        const now = Date.now();
        if (now - lastUpdateRef.current > 800) {
            const info = detectAction(htmlStreamBuffer);
            setStatusInfo(info);
            lastUpdateRef.current = now;
        }
    }, [htmlStreamBuffer]);

    useEffect(() => {
        if (processingRef.current) return;
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) return;

        const processPage = async (page: StratifyPage) => {
            processingRef.current = true;
            setActivePageIdx(page.page_index);
            setPageThought('');
            setReasoningStream('');
            setHtmlStreamBuffer(''); 
            setStatusInfo({ title: 'AI 架构师正在设计', sub: '构建布局 • 生成矢量图形 • 优化排版' });
            setIsThinkingOpen(true);
            setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'generating' } : p));

            let fullBuffer = '';
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
                    fullBuffer += chunk;
                    const { thought, jsonPart } = extractThoughtAndJson(fullBuffer);
                    setPageThought(thought);
                    const cleanHtml = extractStreamingHtmlContent(jsonPart);
                    if (cleanHtml) setHtmlStreamBuffer(cleanHtml);
                    if (jsonPart && jsonPart.trim().length > 5) setIsThinkingOpen(false);
                },
                () => {
                    const { thought, jsonPart } = extractThoughtAndJson(fullBuffer);
                    setPageThought(thought); 
                    setIsThinkingOpen(false);
                    const htmlContent = robustExtractHtml(fullBuffer, jsonPart);
                    if (htmlContent) {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, html_content: htmlContent, status: 'done' } : p));
                    } else {
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
                (chunk) => setReasoningStream(prev => prev + chunk)
            );
        };
        processPage(nextPage);
    }, [pages, scenario]);

    const handleRetry = (idx: number) => {
        setPages(prev => prev.map(p => p.page_index === idx ? { ...p, status: 'pending', html_content: null } : p));
    };

    const handleRetryAll = () => {
        setPages(prev => prev.map(p => p.status === 'failed' ? { ...p, status: 'pending', html_content: null } : p));
    };

    const handleExportPdf = async () => {
        setIsDownloading(true);
        try {
            let combinedContent = '';
            let allStyles = '';
            const processedPages = pages
                .filter(p => p.status === 'done' && p.html_content)
                .map(p => {
                    const html = p.html_content!;
                    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
                    if (styleMatch) allStyles += styleMatch[1] + '\n';
                    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    return bodyMatch ? bodyMatch[1] : html;
                });
                
            combinedContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap" rel="stylesheet">
                    <style>
                        ${allStyles}
                        @media print {
                            .page-break { page-break-after: always; }
                            body { margin: 0; padding: 0; }
                        }
                    </style>
                </head>
                <body class="bg-white">
                    ${processedPages.map(content => `<div class="page-break" style="width: 1600px; height: 900px; overflow: hidden; position: relative;">${content}</div>`).join('')}
                </body>
                </html>
            `;
            const blob = await generatePdf(combinedContent, `AI_Report_${taskId.slice(0,6)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI_Report_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('导出 PDF 失败，请稍后重试');
        } finally {
            setIsDownloading(false);
        }
    };

    const activePage = pages.find(p => p.page_index === activePageIdx) || pages[0];
    const displayThought = reasoningStream || pageThought;
    const isAllLayoutDone = pages.length > 0 && pages.every(p => p.status === 'done');

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden relative">
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={displayThought}
                status="AI 架构师正在设计..."
            />

            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

            <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-xl md:shadow-none md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 bg-white border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <ViewGridIcon className="w-4 h-4 text-purple-600" /> 页面结构
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {pages.map(p => (
                        <button
                            key={p.page_index}
                            onClick={() => { setActivePageIdx(p.page_index); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${activePageIdx === p.page_index ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100' : 'text-slate-600 hover:bg-slate-50'}`}
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
                    {!isAllLayoutDone && pages.some(p => p.status === 'failed') && (
                         <button 
                            onClick={handleRetryAll}
                            className="w-full mb-2 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshIcon className="w-3 h-3" /> 重试所有失败项
                        </button>
                    )}
                    {isAllLayoutDone && (
                        <div className="space-y-2">
                             <button 
                                onClick={handleExportPdf}
                                disabled={isDownloading}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-sm shadow-md hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                                {isDownloading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                                导出 PDF 合稿
                            </button>
                            <button onClick={() => onComplete(pages)} className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                <CheckIcon className="w-4 h-4" /> 完成任务
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#eef2f6]">
                <div className="flex-1 p-0 md:p-8 flex flex-col overflow-hidden items-center justify-center">
                    <div className="w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-300/60 overflow-hidden flex flex-col ring-1 ring-black/5 relative">
                        <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-5 gap-4 select-none flex-shrink-0 z-10">
                            <button className="md:hidden text-slate-500 hover:text-indigo-600" onClick={() => setIsSidebarOpen(true)}><MenuIcon className="w-5 h-5" /></button>
                            <div className="hidden md:flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                            </div>
                            <div className="flex-1 flex justify-center">
                                {activePage.status === 'generating' && (
                                    <div className="relative w-full max-w-md h-7 rounded-full bg-white overflow-hidden border border-indigo-100 shadow-inner">
                                         <div className="absolute inset-0 w-full h-full bg-indigo-50/50"></div>
                                         <div className="absolute inset-0 w-full h-full opacity-30" style={{backgroundImage: 'repeating-linear-gradient(-45deg, #6366f1 0, #6366f1 10px, transparent 10px, transparent 20px)', backgroundSize: '28px 28px', animation: 'flow-stream 1s linear infinite'}}></div>
                                         <div className="absolute inset-0 flex items-center justify-center z-10 gap-2">
                                             <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></div>
                                             <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Designing Layout...</span>
                                         </div>
                                         <style>{`@keyframes flow-stream { 0% { background-position: 0 0; } 100% { background-position: 28px 0; } }`}</style>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setIsThinkingOpen(true)} className="text-slate-400 hover:text-purple-600 transition-colors p-2 hover:bg-white rounded-lg" title="查看设计思路"><BrainIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="flex-1 relative bg-gray-100 overflow-hidden">
                            {activePage.html_content && activePage.status === 'done' ? (
                                <ScaledPreview htmlContent={activePage.html_content} />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 text-slate-400">
                                    {activePage.status === 'pending' ? (
                                        <>
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6"><ViewGridIcon className="w-10 h-10 opacity-20" /></div>
                                            <p className="text-base font-medium">等待排版引擎启动...</p>
                                        </>
                                    ) : activePage.status === 'generating' ? (
                                        <div className="flex flex-col items-center w-full max-w-2xl px-6 animate-in fade-in duration-700">
                                            <div className="mb-8 text-center -mt-24">
                                                <div className="relative mb-4 mx-auto w-20 h-20">
                                                    <div className="absolute inset-0 rounded-full border-4 border-purple-100 animate-ping opacity-20"></div>
                                                    <div className="absolute inset-2 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center"><ViewGridIcon className="w-8 h-8 text-purple-500" /></div>
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-700 mb-2 transition-all duration-300">{statusInfo.title}</h3>
                                                <p className="text-sm text-slate-500 transition-all duration-300">{statusInfo.sub}</p>
                                            </div>
                                            <div className="w-full bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-mono text-xs relative transform translate-y-4">
                                                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-black/50">
                                                    <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div><div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div><div className="w-3 h-3 rounded-full bg-[#27c93f]"></div></div>
                                                    <span className="ml-2 text-slate-400 font-sans font-bold text-[10px] uppercase tracking-wide">Layout_Engine.exe — Generating HTML</span>
                                                </div>
                                                <div ref={codeScrollRef} className="h-48 md:h-64 overflow-y-auto p-4 custom-scrollbar-dark text-blue-300">
                                                    <pre className="whitespace-pre-wrap break-all leading-relaxed">{htmlStreamBuffer || <span className="opacity-50 text-slate-500">// Initializing stream connection...</span>}<span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse align-middle"></span></pre>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center animate-in fade-in zoom-in duration-300">
                                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-100 shadow-sm">
                                                <ShieldExclamationIcon className="w-8 h-8 text-red-500" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-700 mb-2">生成解析失败</h3>
                                            <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">可能由于网络波动或模型响应异常导致，您可以尝试重新生成该页。</p>
                                            <button 
                                                onClick={() => handleRetry(activePage.page_index)}
                                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto active:scale-95"
                                            >
                                                <RefreshIcon className="w-4 h-4" /> 重试该章节
                                            </button>
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
