
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ViewGridIcon, CheckIcon, BrainIcon, DownloadIcon, RefreshIcon, ShieldExclamationIcon, SparklesIcon, CodeIcon, CloseIcon, EyeIcon, PencilIcon } from '../../../../icons';
import { StratifyPage } from '../../../../../types';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';

// --- HTML Cleaning Utilities ---

const unescapeHtml = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

const cleanHtmlContent = (raw: string): string => {
    if (!raw) return '';
    let clean = raw.trim();
    
    // 1. Specific Fix for User's Issue: <\!DOCTYPE -> <!DOCTYPE
    clean = clean.replace(/<\\!DOCTYPE/gi, '<!DOCTYPE');
    clean = clean.replace(/<\\html/gi, '<html');
    clean = clean.replace(/<\\body/gi, '<body');
    clean = clean.replace(/<\\head/gi, '<head');
    clean = clean.replace(/<\\div/gi, '<div');
    clean = clean.replace(/<\\script/gi, '<script');
    clean = clean.replace(/<\\style/gi, '<style');

    // 2. Remove Markdown code blocks
    clean = clean.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');

    // 3. Handle double-escaped entities (Common LLM artifact: \&lt;)
    clean = clean.replace(/\\&lt;/g, '<').replace(/\\&gt;/g, '>');
    clean = clean.replace(/\\</g, '<').replace(/\\>/g, '>');
    clean = clean.replace(/\\"/g, '"'); // Fix escaped quotes in attributes

    // 4. Recursive Unescape: keep unescaping until we see a tag or hit limit
    let limit = 3;
    while ((clean.includes('&lt;') || clean.includes('&gt;')) && limit > 0) {
        clean = unescapeHtml(clean);
        limit--;
    }
    
    // 5. Fallback: If model wrapped it in body text instead of returning pure HTML
    if (clean.includes('<!DOCTYPE') || clean.includes('<html')) {
         // Try to find the start and end of the HTML document
         const startIdx = Math.max(clean.indexOf('<!DOCTYPE'), clean.indexOf('<html'));
         const endIdx = clean.lastIndexOf('</html>');
         
         if (startIdx !== -1 && endIdx !== -1) {
             clean = clean.substring(startIdx, endIdx + 7);
         }
    }

    return clean;
};

const robustExtractHtml = (fullText: string, jsonPart: string): string | null => {
    let rawHtml = '';
    
    // Strategy 1: JSON Part parse
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html: string }>(jsonPart);
            if (parsed && parsed.html) rawHtml = parsed.html;
        } catch (e) { /* continue */ }
    }

    // Strategy 2: Regex extraction from full text (if JSON failed or missing)
    if (!rawHtml) {
        const jsonFieldMatch = fullText.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (jsonFieldMatch && jsonFieldMatch[1]) {
            try { 
                rawHtml = JSON.parse(`"${jsonFieldMatch[1]}"`); 
            } catch (e) { 
                rawHtml = jsonFieldMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'); 
            }
        }
    }

    // Strategy 3: Raw HTML block detection
    if (!rawHtml) {
        const rawHtmlMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
        if (rawHtmlMatch) rawHtml = rawHtmlMatch[0];
    }
    
    if (!rawHtml) return null;

    return cleanHtmlContent(rawHtml);
};

// --- Components ---

// Scaled Preview Component
const ScaledPreview: React.FC<{
    html: string;
    parentWidth: number;
    parentHeight: number;
}> = ({ html, parentWidth, parentHeight }) => {
    const CANVAS_WIDTH = 1600;
    const CANVAS_HEIGHT = 900;
    
    const scaleX = parentWidth / CANVAS_WIDTH;
    const scaleY = parentHeight / CANVAS_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    return (
        <div 
            style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                backgroundColor: 'white', 
                overflow: 'hidden'
            }}
        >
            <iframe 
                srcDoc={html} 
                className="w-full h-full border-none pointer-events-none select-none"
                title="Preview"
                sandbox="allow-scripts"
            />
        </div>
    );
};

// Zoom Modal
const ZoomModal: React.FC<{
    html: string;
    onClose: () => void;
}> = ({ html, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });
    const CANVAS_WIDTH = 1600;
    const CANVAS_HEIGHT = 900;
    
    useLayoutEffect(() => {
        const updateDims = () => {
            if (containerRef.current) {
                const maxWidth = window.innerWidth * 0.9;
                const maxHeight = window.innerHeight * 0.9;
                let targetW = maxWidth;
                let targetH = targetW * (9/16);
                
                if (targetH > maxHeight) {
                    targetH = maxHeight;
                    targetW = targetH * (16/9);
                }
                setDims({ w: targetW, h: targetH });
            }
        };
        updateDims();
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm">
                <CloseIcon className="w-8 h-8" />
            </button>
            <div 
                ref={containerRef}
                className="relative bg-white shadow-2xl overflow-hidden transition-all duration-300 rounded-lg"
                onClick={e => e.stopPropagation()}
                style={{ width: dims.w, height: dims.h }}
            >
                 {dims.w > 0 && <ScaledPreview html={html} parentWidth={dims.w} parentHeight={dims.h} />}
            </div>
        </div>
    );
};

// Revision Input Modal
const RevisionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (instruction: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [input, setInput] = useState('');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PencilIcon className="w-5 h-5 text-indigo-600"/>
                    页面微调指令
                </h3>
                <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
                    placeholder="请输入修改意见，例如：'把背景换成深蓝色'，'字体调大一点'..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    autoFocus
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200">取消</button>
                    <button 
                        onClick={() => { if(input.trim()) { onConfirm(input); onClose(); setInput(''); } }} 
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md"
                        disabled={!input.trim()}
                    >
                        开始重做
                    </button>
                </div>
            </div>
        </div>
    );
};

// 16:9 Page Card
const PageCard: React.FC<{
    page: ExtendedStratifyPage;
    isGenerating: boolean;
    streamHtml?: string;
    onRetry: () => void;
    onZoom: () => void;
    onRevise: () => void;
}> = ({ page, isGenerating, streamHtml, onRetry, onZoom, onRevise }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const codeScrollRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        const obs = new ResizeObserver(updateWidth);
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

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
                    relative w-full aspect-video rounded-xl border-2 transition-all duration-300 overflow-hidden shadow-sm bg-white
                    ${page.status === 'done' ? 'border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1' : 'border-dashed border-slate-300'}
                `}
            >
                {page.status === 'done' && page.html_content ? (
                    containerWidth > 0 && (
                        <ScaledPreview 
                            html={page.html_content} 
                            parentWidth={containerWidth} 
                            parentHeight={containerWidth * (9/16)} 
                        />
                    )
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
                             <div className="absolute inset-0 overflow-y-auto custom-scrollbar-dark text-[10px] leading-relaxed break-all text-green-400/90 font-mono">
                                 {streamHtml || <span className="opacity-50 text-slate-500">// Connecting to renderer...</span>}
                                 <span className="inline-block w-1.5 h-3 bg-green-500 ml-0.5 animate-pulse align-middle"></span>
                             </div>
                        </div>
                    </div>
                ) : page.status === 'failed' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-red-50/50 text-center animate-in zoom-in-95">
                        <ShieldExclamationIcon className="w-6 h-6 text-red-500 mb-2" />
                        <p className="text-[10px] font-bold text-red-700 mb-2">渲染失败</p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRetry(); }}
                            className="px-3 py-1 bg-white border border-red-200 text-red-600 text-[10px] font-bold rounded-lg shadow-sm hover:bg-red-50"
                        >
                            重试
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
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onZoom(); }}
                            className="bg-white/90 backdrop-blur text-slate-700 p-2 rounded-full shadow-lg hover:scale-110 transition-transform hover:text-indigo-600"
                            title="放大预览"
                         >
                            <EyeIcon className="w-5 h-5" />
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRevise(); }}
                            className="bg-white/90 backdrop-blur text-slate-700 p-2 rounded-full shadow-lg hover:scale-110 transition-transform hover:text-indigo-600"
                            title="调整/重做"
                         >
                            <PencilIcon className="w-5 h-5" />
                         </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Extend StratifyPage to include session info
interface ExtendedStratifyPage extends StratifyPage {
    session_id?: string;
}

export const LayoutStep: React.FC<{
    taskId: string;
    pages: StratifyPage[];
    scenario: string;
    onComplete: (pages: StratifyPage[]) => void;
}> = ({ taskId, pages: initialPages, scenario, onComplete }) => {
    const [pages, setPages] = useState<ExtendedStratifyPage[]>(initialPages.map(p => ({
        ...p,
        status: p.status === 'done' ? 'pending' : p.status,
        session_id: undefined // Initialize session storage
    })));
    const [pageThought, setPageThought] = useState(''); 
    const [reasoningStream, setReasoningStream] = useState('');
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentStreamingHtml, setCurrentStreamingHtml] = useState<string>('');
    const [zoomedPageIdx, setZoomedPageIdx] = useState<number | null>(null);
    
    // Revision State
    const [revisingPageIdx, setRevisingPageIdx] = useState<number | null>(null);
    
    const processingRef = useRef(false);
    const completedCount = pages.filter(p => p.status === 'done').length;
    const failedCount = pages.filter(p => p.status === 'failed').length;
    const isAllDone = pages.length > 0 && pages.every(p => p.status === 'done');

    // Generic Generation Function
    const triggerGeneration = async (pageIndex: number, revisionInstruction?: string) => {
        const targetPage = pages.find(p => p.page_index === pageIndex);
        if (!targetPage) return;

        processingRef.current = true;
        setPageThought('');
        setReasoningStream('');
        setCurrentStreamingHtml('');
        
        setPages(prev => prev.map(p => p.page_index === pageIndex ? { ...p, status: 'generating' } : p));

        let buffer = '';
        
        // Construct variables. If revising, we include instructions.
        const vars: any = {
            page_title: targetPage.title,
            markdown_content: targetPage.content_markdown || ''
        };
        
        if (revisionInstruction) {
            vars.user_revision_request = revisionInstruction;
        }

        await streamGenerate(
            {
                prompt_name: revisionInstruction ? '05_revise_html' : '05_generate_html', // Assume revise prompt exists or use same one with instruction var
                variables: vars,
                scenario,
                task_id: taskId,
                phase_name: '05_generate_html', // Keep phase name consistent for tracking
                // Crucial: Use existing session ID if available to maintain context
                session_id: targetPage.session_id 
            },
            (chunk) => {
                buffer += chunk;
                const { thought, jsonPart } = extractThoughtAndJson(buffer);
                
                // Improved Streaming HTML Extraction
                const match = jsonPart.match(/"html"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
                if (match && match.groups?.content) {
                    const rawContent = match.groups.content;
                    const displayHtml = rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '  ').replace(/\\\\/g, '\\');
                    setCurrentStreamingHtml(displayHtml);
                } else if (buffer.length > 100 && !jsonPart && !thought) {
                     setCurrentStreamingHtml(buffer.slice(-500));
                }
                
                if (jsonPart && jsonPart.trim().length > 20) {
                    setIsThinkingOpen(false);
                }
            },
            () => {
                const { jsonPart } = extractThoughtAndJson(buffer);
                const htmlContent = robustExtractHtml(buffer, jsonPart);
                
                if (htmlContent) {
                    setPages(prev => prev.map(p => p.page_index === pageIndex ? { ...p, html_content: htmlContent, status: 'done' } : p));
                } else {
                    setPages(prev => prev.map(p => p.page_index === pageIndex ? { ...p, status: 'failed' } : p));
                }
                processingRef.current = false;
            },
            (err) => {
                console.error("Layout generation error:", err);
                setPages(prev => prev.map(p => p.page_index === pageIndex ? { ...p, status: 'failed' } : p));
                processingRef.current = false;
            },
            (sessionId) => {
                // Save session ID for future revisions
                if (sessionId) {
                    setPages(prev => prev.map(p => p.page_index === pageIndex ? { ...p, session_id: sessionId } : p));
                }
            },
            (reasoning) => {
                setReasoningStream(prev => prev + reasoning);
            }
        );
    };

    // Queue Processor (Initial Pass)
    useEffect(() => {
        if (processingRef.current) return;
        
        const nextPage = pages.find(p => p.status === 'pending');
        if (!nextPage) return;

        triggerGeneration(nextPage.page_index);
    }, [pages, scenario, taskId]);

    const handleRetry = (idx: number) => {
        // Reset to pending to be picked up by effect
        setPages(prev => prev.map(p => p.page_index === idx ? { ...p, status: 'pending', html_content: null } : p));
    };

    const handleReviseConfirm = (instruction: string) => {
        if (revisingPageIdx !== null) {
            triggerGeneration(revisingPageIdx, instruction);
            setRevisingPageIdx(null);
        }
    };

    const handleRetryAll = () => {
        setPages(prev => prev.map(p => p.status === 'failed' ? { ...p, status: 'pending', html_content: null } : p));
    };

    const handleExportPdf = async () => {
        setIsDownloading(true);
        try {
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

            <RevisionModal 
                isOpen={revisingPageIdx !== null}
                onClose={() => setRevisingPageIdx(null)}
                onConfirm={handleReviseConfirm}
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
                            onZoom={() => setZoomedPageIdx(page.page_index)}
                            onRevise={() => setRevisingPageIdx(page.page_index)}
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
