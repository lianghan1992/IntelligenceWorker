
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PPTData, PPTStage, PPTPageData } from './types';
import { generateBatchPdf } from '../../api/stratify';
import { 
    SparklesIcon, DownloadIcon, RefreshIcon, ViewGridIcon, 
    PencilIcon, CheckIcon, DocumentTextIcon, ChevronRightIcon, CodeIcon
} from '../icons';
import { Step2Outline } from './Step2Outline';
import { tryParsePartialJson } from './Step1Collect'; 

// Add marked for markdown rendering
declare global {
  interface Window {
    marked?: {
      parse(markdownString: string): string;
    };
  }
}

interface MainCanvasProps {
    stage: PPTStage;
    data: PPTData;
    activePageIndex: number;
    setActivePageIndex: (i: number) => void;
    isLlmActive: boolean;
    setStage?: (stage: PPTStage) => void; 
    setData?: React.Dispatch<React.SetStateAction<PPTData>>;
}

// --- Helper: Scaled Slide Renderer ---
// Renders the slide at a fixed base resolution (1600x900) and scales it to fit the container.
const ScaledSlide: React.FC<{ html: string; width: number; height: number }> = ({ html, width, height }) => {
    const BASE_WIDTH = 1600;
    const BASE_HEIGHT = 900;
    
    // Calculate scale to fit the container while maintaining aspect ratio
    // Add a small padding factor (0.95) to ensure borders aren't cut off
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT) * 0.95 || 1;

    return (
        <div 
            style={{ 
                width: width, 
                height: height, 
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f1f5f9' // slate-100
            }}
        >
            <div 
                style={{ 
                    width: BASE_WIDTH, 
                    height: BASE_HEIGHT, 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'center center',
                    background: 'white',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                }}
            >
                <iframe 
                    srcDoc={html}
                    className="w-full h-full border-none pointer-events-none select-none"
                    title="Slide Preview"
                />
            </div>
        </div>
    );
};

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
    stage, data, activePageIndex, setActivePageIndex, isLlmActive, setStage, setData
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const activePage = data.pages[activePageIndex];
    const editorScrollRef = useRef<HTMLDivElement>(null);
    const codeScrollRef = useRef<HTMLPreElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Monitor container size for scaling
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (let entry of entries) {
                setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const handleExport = async () => {
        setIsExporting(true);
        try {
             const pdfPages = data.pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);
            
            if (pdfPages.length === 0) {
                alert("没有可导出的页面 (HTML 未生成)。");
                setIsExporting(false);
                return;
            }

            const blob = await generateBatchPdf(pdfPages);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.topic || 'report'}.pdf`;
            a.click();
        } catch(e) { 
            alert('导出失败'); 
        } finally { 
            setIsExporting(false); 
        }
    };

    // Robust display content for streaming text
    const displayContent = useMemo(() => {
        if (!activePage) return '';
        const raw = activePage.content;
        
        if (raw.trim().startsWith('{') || raw.trim().startsWith('```json')) {
            const partial = tryParsePartialJson(raw);
            if (partial && partial.content) return partial.content;
            const match = raw.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/s);
            if (match) {
                try { return JSON.parse(`"${match[1]}"`); } catch(e) { return match[1]; }
            }
            return ''; 
        }
        return raw;
    }, [activePage?.content]);

    // Auto-scroll effect for text editor
    useEffect(() => {
        if (activePage?.isGenerating && !activePage.html && editorScrollRef.current) {
            editorScrollRef.current.scrollTop = editorScrollRef.current.scrollHeight;
        }
    }, [displayContent, activePage?.isGenerating, activePage?.html]);

    // Auto-scroll effect for code view
    useEffect(() => {
        if (activePage?.isGenerating && activePage.html && codeScrollRef.current) {
             // Scroll the pre element's parent container
             if (codeScrollRef.current.parentElement) {
                 codeScrollRef.current.parentElement.scrollTop = codeScrollRef.current.parentElement.scrollHeight;
             }
        }
    }, [activePage?.html, activePage?.isGenerating]);


    const renderMarkdown = (content: string): { __html: string } | undefined => {
        if (!content) return undefined;
        if (window.marked) {
            return { __html: window.marked.parse(content) };
        }
        return { __html: `<pre>${content}</pre>` };
    };

    const hasReadyHtml = data.pages.some(p => !!p.html);

    // --- Views ---

    if (stage === 'collect') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700 bg-slate-50 h-full">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border border-slate-200">
                    <SparklesIcon className="w-16 h-16 text-indigo-500" />
                </div>
                <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Auto Insight Canvas</h1>
                <p className="text-slate-500 max-w-md text-lg">
                    请在左侧输入研究主题，AI 将为您自动构建逻辑架构。
                </p>
            </div>
        );
    }

    if (stage === 'outline') {
        return (
            <Step2Outline 
                topic={data.topic} 
                outlineData={data.outline} 
                onConfirm={() => {
                    if (data.outline && setData && setStage) {
                        setData(prev => ({ 
                            ...prev, 
                            pages: prev.outline!.pages.map(p => ({ 
                                title: p.title, 
                                summary: p.content, 
                                content: '', 
                                isGenerating: false 
                            }))
                        }));
                        setStage('compose');
                        setActivePageIndex(0);
                    }
                }}
            />
        );
    }

    if (!activePage) return <div className="p-10 text-center">Loading...</div>;

    const hasHtml = !!activePage.html;
    const isGenerating = activePage.isGenerating;
    const hasContent = !!displayContent;

    return (
        <div className="flex h-full overflow-hidden bg-slate-100">
            {/* Left Rail: Thumbnails */}
            <div className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white">
                 <div className="p-4 border-b border-slate-100">
                     <h3 className="font-bold text-slate-800 text-sm truncate" title={data.topic}>{data.topic}</h3>
                     <p className="text-xs text-slate-400 mt-1">{data.pages.length} Pages</p>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                     {data.pages.map((p, idx) => (
                         <div 
                            key={idx}
                            onClick={() => setActivePageIndex(idx)}
                            className={`
                                group relative p-2 rounded-lg border-2 cursor-pointer transition-all
                                ${activePageIndex === idx ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}
                            `}
                         >
                             {/* Thumbnail Preview */}
                             <div className="aspect-[16/9] bg-slate-100 rounded border border-slate-200 mb-2 overflow-hidden relative flex items-center justify-center">
                                 {/* 
                                     Three States for Thumbnail:
                                     1. HTML Ready (Not Generating): Show Scaled Iframe (1600x900)
                                     2. Generating HTML: Show "Rendering" code view
                                     3. Text Only: Show Text
                                 */}
                                 {p.html && !p.isGenerating ? (
                                    // Fixed wrapper for scaling 1600x900 to approx 220px width (scale ~0.14)
                                     <div className="w-full h-full relative overflow-hidden bg-white">
                                         <div className="absolute top-0 left-0 w-[1600px] h-[900px] origin-top-left transform scale-[0.135]">
                                             <iframe srcDoc={p.html} className="w-full h-full border-none pointer-events-none" tabIndex={-1} />
                                         </div>
                                     </div>
                                 ) : p.isGenerating && p.html ? (
                                     // Generating HTML state - Show Code/Terminal look
                                     <div className="w-full h-full bg-slate-900 p-2 text-[5px] font-mono text-green-400 overflow-hidden leading-tight opacity-90 break-all whitespace-pre-wrap">
                                         {p.html.slice(-500)}
                                         <div className="absolute bottom-1 right-1">
                                             <RefreshIcon className="w-3 h-3 animate-spin text-white"/>
                                         </div>
                                     </div>
                                 ) : p.content ? (
                                     // Text Content State
                                     <div className="p-2 text-[5px] text-slate-400 leading-tight overflow-hidden text-left h-full w-full select-none bg-white">
                                        {p.content.startsWith('{') ? 'Content Generating...' : p.content.slice(0, 300)}
                                     </div>
                                 ) : (
                                     <span className="text-[10px] text-slate-300">{idx+1}</span>
                                 )}
                                 
                                 {/* Loading Overlay (only if not showing the code view above) */}
                                 {p.isGenerating && !p.html && (
                                     <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                         <RefreshIcon className="w-4 h-4 text-indigo-500 animate-spin"/>
                                     </div>
                                 )}
                             </div>
                             
                             <div className="flex items-center gap-2">
                                 <span className={`text-xs font-bold w-4 ${activePageIndex === idx ? 'text-indigo-600' : 'text-slate-400'}`}>{idx + 1}</span>
                                 <span className="text-xs text-slate-600 truncate flex-1">{p.title}</span>
                                 {p.html && !p.isGenerating && <CheckIcon className="w-3 h-3 text-green-500" />}
                             </div>
                         </div>
                     ))}
                 </div>
                 
                 {hasReadyHtml && (
                     <div className="p-4 border-t border-slate-200">
                         <button 
                            onClick={handleExport} 
                            disabled={isExporting} 
                            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                         >
                            {isExporting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5"/>}
                            导出 PDF
                         </button>
                     </div>
                 )}
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Page {activePageIndex + 1} • 
                            {hasHtml && !isGenerating ? <span className="text-green-600 flex items-center gap-1"><CheckIcon className="w-3 h-3"/> HTML Preview</span> : 
                             isGenerating && hasHtml ? <span className="text-blue-600 flex items-center gap-1"><CodeIcon className="w-3 h-3"/> Generating HTML...</span> :
                             'Content Editor'}
                        </span>
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="flex-1 overflow-hidden bg-slate-100 flex items-center justify-center p-4 md:p-8 relative">
                    <div 
                        ref={containerRef}
                        className={`w-full max-w-[1400px] h-full flex flex-col justify-center transition-all duration-500`}
                    >
                        
                        {/* 1. HTML View (Highest Priority if exists and NOT generating) */}
                        {hasHtml && !isGenerating ? (
                            <ScaledSlide html={activePage.html!} width={containerSize.width} height={containerSize.height} />
                        ) : hasHtml && isGenerating ? (
                            /* 2. Streaming Code View (Prevents Flicker) */
                            <div className="w-full h-full bg-[#1e1e1e] rounded-xl shadow-2xl border border-slate-700 p-0 overflow-hidden flex flex-col relative">
                                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-black/20">
                                    <div className="flex items-center gap-2 text-green-400 font-mono text-xs">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span>Compiling HTML Slide...</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4 custom-scrollbar-dark relative">
                                    <pre 
                                        ref={codeScrollRef}
                                        className="font-mono text-[11px] md:text-xs text-slate-300 whitespace-pre-wrap leading-relaxed"
                                    >
                                        {activePage.html}
                                        <span className="inline-block w-2 h-4 bg-green-500 ml-0.5 animate-pulse align-middle"></span>
                                    </pre>
                                </div>
                            </div>
                        ) : hasContent ? (
                            /* 3. Text/Markdown View */
                            <div className="w-full max-w-[900px] mx-auto h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                                <div ref={editorScrollRef} className="flex-1 overflow-y-auto p-8 md:p-12 relative scroll-smooth">
                                    <article 
                                        className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-h1:text-3xl prose-h2:text-2xl prose-strong:text-indigo-700"
                                        dangerouslySetInnerHTML={renderMarkdown(displayContent)}
                                    />
                                    {isGenerating && (
                                        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                            <span className="text-xs font-bold text-indigo-600">AI Writing...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* 4. Empty/Loading State */
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-20 text-center rounded-xl shadow-sm border border-slate-200 m-8">
                                {isGenerating ? (
                                    <>
                                        <div className="w-16 h-16 relative mb-6">
                                             <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                                             <div className="relative z-10 w-full h-full bg-white rounded-full border-2 border-indigo-100 flex items-center justify-center">
                                                 <SparklesIcon className="w-8 h-8 text-indigo-500 animate-pulse" />
                                             </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">AI 正在构思内容...</h3>
                                        <div className="mt-8 w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full animate-progress-indeterminate"></div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-300">
                                        <ViewGridIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="font-bold text-lg">等待生成</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes progress-indeterminate {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 1.5s infinite linear;
                }
                .custom-scrollbar-dark::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-track {
                    background: #1e1e1e; 
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb {
                    background: #4b5563; 
                    border-radius: 4px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
                    background: #6b7280; 
                }
            `}</style>
        </div>
    );
};
