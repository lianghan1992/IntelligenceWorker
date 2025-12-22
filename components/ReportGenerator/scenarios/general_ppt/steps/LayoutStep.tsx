
import React, { useState, useEffect, useRef } from 'react';
import { ViewGridIcon, CheckIcon, BrainIcon, DownloadIcon, RefreshIcon, ShieldExclamationIcon, SparklesIcon, CodeIcon, CloseIcon, EyeIcon } from '../../../../icons';
import { StratifyPage } from '../../../../../types';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';

// --- HTML Cleaning Utilities ---

const unescapeHtml = (html: string) => {
    // Basic entity decoding using browser DOM
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

const cleanHtmlContent = (raw: string): string => {
    let clean = raw.trim();
    
    // 1. Remove Markdown code blocks
    clean = clean.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');

    // 2. Handle double-escaped entities (Common LLM issue: \&lt;)
    clean = clean.replace(/\\&lt;/g, '<').replace(/\\&gt;/g, '>');
    clean = clean.replace(/\\</g, '<').replace(/\\>/g, '>');
    
    // 3. Handle standard entities if the whole doc is escaped
    if (clean.startsWith('&lt;') || clean.includes('&lt;html')) {
        clean = unescapeHtml(clean);
    }
    
    // 4. Fallback: If model wrapped it in body text instead of returning pure HTML
    // Example: <html>...<body>&lt;!DOCTYPE...</body></html>
    const bodyContentMatch = clean.match(/<body>([\s\S]*?)<\/body>/i);
    if (bodyContentMatch && (bodyContentMatch[1].includes('&lt;!DOCTYPE') || bodyContentMatch[1].includes('<!DOCTYPE'))) {
         let bodyInner = bodyContentMatch[1].trim();
         // If inner content is escaped
         if (bodyInner.startsWith('&lt;') || bodyInner.startsWith('\\&lt;')) {
             bodyInner = unescapeHtml(bodyInner.replace(/\\&lt;/g, '<').replace(/\\&gt;/g, '>'));
         }
         return bodyInner;
    }

    return clean;
};

const robustExtractHtml = (fullText: string, jsonPart: string): string | null => {
    let rawHtml = '';
    
    // Priority 1: JSON Part parse
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html: string }>(jsonPart);
            if (parsed && parsed.html) rawHtml = parsed.html;
        } catch (e) { /* continue */ }
    }

    // Priority 2: Regex extraction from full text (if JSON failed or missing)
    if (!rawHtml) {
        const jsonFieldMatch = fullText.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (jsonFieldMatch && jsonFieldMatch[1]) {
            try { 
                // Construct a valid JSON string to parse safely
                rawHtml = JSON.parse(`"${jsonFieldMatch[1]}"`); 
            } catch (e) { 
                // Manual unescape if parse fails
                rawHtml = jsonFieldMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'); 
            }
        }
    }

    // Priority 3: Raw HTML block detection
    if (!rawHtml) {
        const rawHtmlMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
        if (rawHtmlMatch) rawHtml = rawHtmlMatch[0];
    }
    
    if (!rawHtml) return null;

    return cleanHtmlContent(rawHtml);
};

// --- Components ---

// Zoom Modal for Full Preview
const ZoomModal: React.FC<{
    html: string;
    onClose: () => void;
}> = ({ html, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                    <CloseIcon className="w-8 h-8" />
                </button>
                {/* 16:9 Container limited by screen size */}
                <div className="aspect-video w-full max-w-[90vw] max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden relative">
                     <iframe 
                        srcDoc={html} 
                        className="w-full h-full border-none bg-white" 
                        title="Full Preview"
                        sandbox="allow-scripts"
                    />
                </div>
            </div>
        </div>
    );
};

// 16:9 Page Card
const PageCard: React.FC<{
    page: StratifyPage;
    isGenerating: boolean;
    streamHtml?: string;
    onRetry: () => void;
    onZoom: () => void;
}> = ({ page, isGenerating, streamHtml, onRetry, onZoom }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.2);
    const codeScrollRef = useRef<HTMLDivElement>(null);
    
    // Standard PPT Resolution base (HD)
    const BASE_WIDTH = 1280;
    const BASE_HEIGHT = 720;

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { offsetWidth } = containerRef.current;
                setScale(offsetWidth / BASE_WIDTH);
            }
        };
        updateScale();
        const obs = new ResizeObserver(updateScale);
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // Auto-scroll the code view
    useEffect(() => {
        if (codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [streamHtml]);

    return (
        <div className="flex flex-col gap-2 group animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        Page {page.page_index}
                    </span>
                    <h4 className="text-xs font-bold text-slate-600 truncate max-w-[150px]" title={page.title}>
                        {page.title}
                    </h4>
                </div>
                {page.status === 'done' && <CheckIcon className="w-3.5 h-3.5 text-green-500" />}
            </div>

            <div 
                ref={containerRef}
                onDoubleClick={page.status === 'done' ? onZoom : undefined}
                className={`
                    relative aspect-video w-full rounded-xl border-2 transition-all duration-300 overflow-hidden shadow-sm bg-white
                    ${page.status === 'done' ? 'border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 cursor-zoom-in' : 'border-dashed border-slate-300'}
                `}
            >
                {page.status === 'done' && page.html_content ? (
                    <div 
                        style={{ 
                            width: `${BASE_WIDTH}px`, 
                            height: `${BASE_HEIGHT}px`, 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'top left',
                            pointerEvents: 'none' // Interactivity disabled in thumbnail
                        }}
                        className="bg-white"
                    >
                        <iframe 
                            srcDoc={page.html_content} 
                            className="w-full h-full border-none bg-white" 
                            title={`Slide ${page.page_index}`}
                            sandbox="allow-scripts"
                        />
                    </div>
                ) : page.status === 'generating' ? (
                    <div className="absolute inset-0 flex flex-col bg-[#1e1e1e] font-mono p-3">
                        <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-[8px] text-slate-400">Rendering HTML...</span>
                        </div>
                        <div ref={codeScrollRef} className="flex-1 overflow-hidden relative">
                             <div className="absolute inset-0 overflow-y-auto custom-scrollbar-dark text-[8px] leading-relaxed break-all text-green-400/80">
                                 {streamHtml || <span className="opacity-50 text-slate-500">// Waiting for stream...</span>}
                                 <span className="inline-block w-1.5 h-3 bg-green-500 ml-0.5 animate-pulse align-middle"></span>
                             </div>
                        </div>
                    </div>
                ) : page.status === 'failed' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-red-50/50 text-center animate-in zoom-in-95">
                        <div className="p-3 bg-red-100 rounded-full mb-3">
                            <ShieldExclamationIcon className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="text-[10px] font-bold text-red-700 mb-4 px-2 leading-tight">渲染失败</p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRetry(); }}
                            className="px-4 py-2 bg-white border border-red-200 text-red-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-red-50 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <RefreshIcon className="w-3 h-3" /> 重试
                        </button>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                        <ViewGridIcon className="w-10 h-10 text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">Waiting</p>
                    </div>
                )}
                
                {/* Hover Action Overlay for Done state */}
                {page.status === 'done' && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                         <div className="bg-white/90 backdrop-blur text-slate-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transform scale-90 group-hover:scale-100 transition-transform flex items-center gap-1.5">
                            <EyeIcon className="w-3.5 h-3.5" /> 双击放大预览
                         </div>
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
    const [zoomedPageIdx, setZoomedPageIdx] = useState<number | null>(null);
    
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
                    const { thought, jsonPart } = extractThoughtAndJson(buffer);
                    
                    // Streaming HTML Logic: Extract partial "html" field value to show coding effect
                    const match = jsonPart.match(/"html"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                    if (match && match.groups?.content) {
                        const rawContent = match.groups.content;
                        // Light unescape for display
                        const displayHtml = rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '  ');
                        setCurrentStreamingHtml(displayHtml);
                    }
                    
                    // If we have thought/reasoning but no JSON yet, show reasoning modal
                    // Once JSON starts, we assume "Coding" phase and close modal or rely on card view
                    if (!jsonPart && thought.trim().length > 0) {
                       // setIsThinkingOpen(true); // Optional: Auto-open reasoning
                    } else if (jsonPart) {
                       setIsThinkingOpen(false);
                    }
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
                    // Update reasoning stream for modal
                    setReasoningStream(prev => prev + reasoning);
                    // If backend sends reasoning events, we can show them
                    if (reasoning.trim().length > 0 && !currentStreamingHtml) {
                        // Only auto-open if not already streaming HTML
                        // setIsThinkingOpen(true); 
                    }
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
            // Just join HTMLs. The API handles page breaks via CSS usually or we can inject separator
            const processedPages = pages
                .filter(p => p.status === 'done' && p.html_content)
                .map(p => p.html_content!);
            
            const combinedContent = processedPages.join('<div style="page-break-after: always;"></div>');

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
            
            {zoomedPageIdx !== null && (
                <ZoomModal 
                    html={pages.find(p => p.page_index === zoomedPageIdx)?.html_content || ''}
                    onClose={() => setZoomedPageIdx(null)}
                />
            )}

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
                            onZoom={() => setZoomedPageIdx(page.page_index)}
                        />
                    ))}
                    
                    {!isAllDone && (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl aspect-video flex flex-col items-center justify-center opacity-30 bg-white/50">
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
