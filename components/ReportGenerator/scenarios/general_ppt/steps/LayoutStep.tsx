
import React, { useState, useEffect, useRef } from 'react';
import { ViewGridIcon, CheckIcon, BrainIcon, DownloadIcon, RefreshIcon, ShieldExclamationIcon, SparklesIcon, CodeIcon } from '../../../../icons';
import { StratifyPage } from '../../../../../types';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';

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

// Component: 16:9 Page Card with scaling and retry
const PageCard: React.FC<{
    page: StratifyPage;
    isGenerating: boolean;
    streamHtml?: string;
    onRetry: () => void;
}> = ({ page, isGenerating, streamHtml, onRetry }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.2);
    const codeScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { offsetWidth } = containerRef.current;
                setScale(offsetWidth / 1600); // 1600 is our base PPT width
            }
        };
        updateScale();
        const obs = new ResizeObserver(updateScale);
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [streamHtml]);

    return (
        <div className="flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        Slide {page.page_index}
                    </span>
                    <h4 className="text-xs font-bold text-slate-600 truncate max-w-[150px]" title={page.title}>
                        {page.title}
                    </h4>
                </div>
                {page.status === 'done' && <CheckIcon className="w-3.5 h-3.5 text-green-500" />}
            </div>

            <div 
                ref={containerRef}
                className={`
                    relative aspect-video w-full rounded-2xl border-2 transition-all duration-300 overflow-hidden shadow-sm
                    ${page.status === 'done' ? 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1' : 'bg-slate-50 border-dashed border-slate-300'}
                `}
            >
                {page.status === 'done' && page.html_content ? (
                    <div 
                        style={{ 
                            width: '1600px', 
                            height: '900px', 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'top left',
                            pointerEvents: 'none'
                        }}
                    >
                        <iframe 
                            srcDoc={page.html_content} 
                            className="w-full h-full border-none bg-white" 
                            title={`Slide ${page.page_index}`}
                        />
                    </div>
                ) : page.status === 'generating' ? (
                    <div className="absolute inset-0 flex flex-col bg-[#0f172a]">
                        <div className="flex-1 overflow-hidden p-2">
                             <div ref={codeScrollRef} className="h-full overflow-y-auto font-mono text-[8px] text-cyan-400/70 custom-scrollbar-dark leading-tight break-all">
                                 <div className="flex items-center gap-1 mb-2 opacity-50">
                                     <CodeIcon className="w-3 h-3"/>
                                     <span className="uppercase tracking-widest font-black">Layout_Stream</span>
                                 </div>
                                 {streamHtml || '// Starting synthesis...'}
                                 <span className="inline-block w-1 h-3 bg-cyan-400 ml-0.5 animate-pulse"></span>
                             </div>
                        </div>
                        <div className="h-1 bg-indigo-500/20">
                            <div className="h-full bg-indigo-500 animate-[grow_2s_infinite]"></div>
                        </div>
                    </div>
                ) : page.status === 'failed' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-red-50/50 text-center animate-in zoom-in-95">
                        <div className="p-3 bg-red-100 rounded-full mb-3">
                            <ShieldExclamationIcon className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="text-[10px] font-bold text-red-700 mb-4 px-2 leading-tight">页面设计中断</p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRetry(); }}
                            className="px-4 py-2 bg-white border border-red-200 text-red-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-red-50 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <RefreshIcon className="w-3 h-3" /> 重试本页
                        </button>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                        <ViewGridIcon className="w-10 h-10 text-slate-400" />
                    </div>
                )}
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
    const [pageThought, setPageThought] = useState(''); 
    const [reasoningStream, setReasoningStream] = useState('');
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentStreamingHtml, setCurrentStreamingHtml] = useState<string>('');
    
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;
    const failedCount = pages.filter(p => p.status === 'failed').length;
    const isAllDone = pages.length > 0 && pages.every(p => p.status === 'done');

    // Queue Processor
    useEffect(() => {
        if (processingRef.current) return;
        
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) return;

        const processPage = async (page: StratifyPage) => {
            processingRef.current = true;
            setPageThought('');
            setReasoningStream('');
            setCurrentStreamingHtml('');
            
            setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'generating' } : p));

            let buffer = '';
            await streamGenerate(
                {
                    prompt_name: '05_generate_html',
                    variables: {
                        page_title: page.title,
                        markdown_content: page.content_markdown || ''
                    },
                    scenario,
                    task_id: taskId,
                    phase_name: '05_generate_html'
                },
                (chunk) => {
                    buffer += chunk;
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    
                    // Real-time HTML code extraction for visual terminal
                    const match = jsonPart.match(/"html"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                    if (match && match.groups?.content) {
                        setCurrentStreamingHtml(match.groups.content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'));
                    }
                    
                    // Auto-close reasoning modal when content starts appearing
                    if (jsonPart && jsonPart.trim().length > 20) setIsThinkingOpen(false);
                },
                () => {
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    const htmlContent = robustExtractHtml(buffer, jsonPart);
                    if (htmlContent) {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, html_content: htmlContent, status: 'done' } : p));
                    } else {
                        setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    }
                    processingRef.current = false;
                },
                (err) => {
                    console.error("Layout generation error:", err);
                    setPages(prev => prev.map(p => p.page_index === page.page_index ? { ...p, status: 'failed' } : p));
                    processingRef.current = false;
                },
                undefined,
                (reasoning) => {
                    setIsThinkingOpen(true);
                    setReasoningStream(prev => prev + reasoning);
                }
            );
        };
        processPage(nextPage);
    }, [pages, scenario, taskId]);

    const handleRetry = (idx: number) => {
        setPages(prev => prev.map(p => p.page_index === idx ? { ...p, status: 'pending', html_content: null } : p));
    };

    const handleRetryAll = () => {
        setPages(prev => prev.map(p => p.status === 'failed' ? { ...p, status: 'pending', html_content: null } : p));
    };

    const handleExportPdf = async () => {
        setIsDownloading(true);
        try {
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
                
            const combinedContent = `
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

    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
            <ReasoningModal 
                isOpen={isThinkingOpen} 
                onClose={() => setIsThinkingOpen(false)} 
                content={reasoningStream || pageThought}
                status="AI 架构师正在设计思考..."
            />

            {/* Sticky Top Header */}
            <div className="flex-shrink-0 h-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 z-40">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100 animate-in fade-in slide-in-from-left-4">
                        <SparklesIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1.5">智能排版全景预览</h2>
                        <div className="flex items-center gap-2">
                             <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(completedCount/pages.length)*100}%` }}></div>
                             </div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {completedCount}/{pages.length} Pages Processed
                             </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {failedCount > 0 && (
                        <button 
                            onClick={handleRetryAll}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black hover:bg-red-100 transition-all shadow-sm active:scale-95"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            重试所有失败项 ({failedCount})
                        </button>
                    )}
                    
                    <button 
                        onClick={() => setIsThinkingOpen(true)}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                        title="查看架构思考过程"
                    >
                        <BrainIcon className="w-5 h-5" />
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-1"></div>
                    
                    {isAllDone && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-6 duration-700">
                            <button 
                                onClick={handleExportPdf}
                                disabled={isDownloading}
                                className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-black rounded-xl text-sm shadow-2xl shadow-slate-300 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isDownloading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                                导出完整 PDF
                            </button>
                            <button 
                                onClick={() => onComplete(pages)}
                                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white font-black rounded-xl text-sm shadow-2xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
                            >
                                <CheckIcon className="w-4 h-4" />
                                完成任务
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid Preview Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-100/50">
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 pb-20">
                    {pages.map(page => (
                        <PageCard 
                            key={page.page_index} 
                            page={page} 
                            isGenerating={page.status === 'generating'}
                            streamHtml={page.status === 'generating' ? currentStreamingHtml : undefined}
                            onRetry={() => handleRetry(page.page_index)}
                        />
                    ))}
                    
                    {!isAllDone && (
                        <div className="border-2 border-dashed border-slate-200 rounded-[32px] aspect-video flex flex-col items-center justify-center opacity-30 bg-white/50">
                             <div className="w-10 h-10 rounded-full bg-slate-200 mb-3 animate-pulse"></div>
                             <div className="h-2.5 w-32 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Progress Bar Overlay */}
            {!isAllDone && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-700">
                    <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-4 flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></div>
                            <span className="text-white text-xs font-black tracking-[0.2em] uppercase">Layout Engine Active</span>
                         </div>
                         <div className="w-32 bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all duration-1000 ease-out" style={{ width: `${(completedCount/pages.length)*100}%` }}></div>
                         </div>
                         <div className="text-[10px] font-mono text-indigo-300 font-bold">
                             {completedCount} / {pages.length}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
