
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTPageData, ChatMessage } from './index';
import { streamChatCompletions, getPromptDetail, generateBatchPdf } from '../../api/stratify'; 
import { 
    RefreshIcon, DownloadIcon, ChevronRightIcon, 
    ChevronLeftIcon, CheckIcon, CodeIcon, BrainIcon, SparklesIcon,
    ArrowRightIcon
} from '../icons';

interface Step4FinalizeProps {
    topic: string;
    pages: PPTPageData[];
    onBackToCompose: () => void;
    onUpdatePages: (newPages: PPTPageData[]) => void;
    onLlmStatusChange?: (isActive: boolean) => void;
    onStreamingUpdate?: (msg: ChatMessage | null) => void;
}

const PROMPT_ID_HTML = "14920b9c-604f-4066-bb80-da7a47b65572";

const extractStreamingHtml = (rawText: string): string => {
    return rawText.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
};

export const Step4Finalize: React.FC<Step4FinalizeProps> = ({ 
    topic, 
    pages: initialPages, 
    onBackToCompose,
    onUpdatePages,
    onLlmStatusChange,
    onStreamingUpdate
}) => {
    // Local state initialized from props
    const [pages, setPages] = useState<PPTPageData[]>(initialPages);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(0.5); 
    
    // Streaming buffers
    const [partialHtmls, setPartialHtmls] = useState<Record<number, string>>({});
    const codeScrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync from props if external update happens
    useEffect(() => {
        setPages(initialPages);
    }, [initialPages]);

    // Auto-scroll code view during generation
    useEffect(() => {
        if (codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [partialHtmls]);

    // Auto-Scale Logic to fit viewport
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const cw = containerRef.current.offsetWidth;
                const ch = containerRef.current.offsetHeight;
                const padding = 80; // padding
                const targetW = 1600;
                const targetH = 900;
                
                const scaleW = (cw - padding) / targetW;
                const scaleH = (ch - padding) / targetH;
                const newScale = Math.min(scaleW, scaleH, 1.2); // Max scale 1.2
                setScale(newScale);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Core Generation Logic (Single Page) ---
    const generateHtml = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.html) return;

        onLlmStatusChange?.(true);
        
        // Optimistic update
        setPages(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], isGenerating: true };
            return next;
        });
        // Sync parent
        const newPagesStart = [...pages];
        newPagesStart[idx] = { ...newPagesStart[idx], isGenerating: true };
        onUpdatePages(newPagesStart);

        try {
            const prompt = await getPromptDetail(PROMPT_ID_HTML).catch(() => ({
                content: "You are a frontend expert. Generate a single HTML file for a presentation slide based on the content provided. Use TailwindCSS via CDN. The slide resolution is 1600x900. Return ONLY the HTML code.",
                channel_code: "openai",
                model_id: "gpt-4o"
            }));
            const userPrompt = `主题: ${topic}\n本页内容:\n${page.content}`;
            
            const modelName = (prompt as any).channel_code ? `${(prompt as any).channel_code}@${(prompt as any).model_id}` : 'gpt-4o';

            let accumulatedText = '', accumulatedReasoning = '';
            
            await streamChatCompletions({
                model: modelName,
                messages: [
                    { role: 'system', content: prompt.content },
                    { role: 'user', content: userPrompt }
                ],
                stream: true
            }, (data) => {
                if (data.reasoning) accumulatedReasoning += data.reasoning;
                if (data.content) {
                    accumulatedText += data.content;
                    const codeOnly = extractStreamingHtml(accumulatedText);
                    setPartialHtmls(prev => ({ ...prev, [idx]: codeOnly }));
                }
                
                // Optional: Update global streaming status
                onStreamingUpdate?.({
                    role: 'assistant',
                    content: `正在渲染第 ${idx + 1} 页: ${page.title}...`,
                    reasoning: accumulatedReasoning
                });

            }, () => {
                const finalHtml = extractStreamingHtml(accumulatedText);
                
                setPages(currentPages => {
                    const finalPages = [...currentPages];
                    finalPages[idx] = { ...finalPages[idx], html: finalHtml, isGenerating: false };
                    onUpdatePages(finalPages);
                    return finalPages;
                });
                
                setPartialHtmls(prev => {
                    const next = { ...prev };
                    delete next[idx]; // Cleanup buffer
                    return next;
                });

                onLlmStatusChange?.(false);
                onStreamingUpdate?.(null);
            }, (err) => {
                setPages(currentPages => {
                    const errorPages = [...currentPages];
                    errorPages[idx] = { ...errorPages[idx], isGenerating: false, html: `<div style="color:red;padding:40px;font-size:24px;">Render Error: ${err.message}</div>` };
                    onUpdatePages(errorPages);
                    return errorPages;
                });
                onLlmStatusChange?.(false);
                onStreamingUpdate?.(null);
            });

        } catch (e) {
            setPages(currentPages => {
                const errorPages = [...currentPages];
                errorPages[idx] = { ...errorPages[idx], isGenerating: false };
                onUpdatePages(errorPages);
                return errorPages;
            });
            onLlmStatusChange?.(false);
            onStreamingUpdate?.(null);
        }
    }, [pages, topic, onLlmStatusChange, onStreamingUpdate, onUpdatePages]);

    // --- Serial Queue Processor ---
    useEffect(() => {
        // If anything is currently generating, do nothing (wait for it to finish)
        const isBusy = pages.some(p => p.isGenerating);
        if (isBusy) return;

        // Find the first page that has no HTML and hasn't started generating
        const nextIdx = pages.findIndex(p => !p.html);
        if (nextIdx !== -1) {
            setActiveIdx(nextIdx); // Auto-focus the page being generated
            generateHtml(nextIdx);
        }
    }, [pages, generateHtml]);

    const handleExportFull = async () => {
        setIsExporting(true);
        try {
            const pdfPages = pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);

            if (pdfPages.length === 0) throw new Error("没有可导出的页面");

            const blob = await generateBatchPdf(pdfPages);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${topic}_report.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            alert('导出失败: ' + (e.message || '未知错误'));
        } finally {
            setIsExporting(false);
        }
    };

    const activePage = pages[activeIdx];
    const allRendered = pages.every(p => p.html && !p.isGenerating);

    // --- UI Render: Lightroom Style ---
    return (
        <div className="h-full flex flex-row bg-[#0b0c0e] overflow-hidden font-sans">
            
            {/* 1. Left Sidebar: Filmstrip (Dark Mode) */}
            <div className="w-64 flex flex-col border-r border-white/5 bg-[#121212] z-20 shadow-2xl flex-shrink-0">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SLIDES ({pages.length})</h3>
                    <div className="flex items-center gap-2">
                        {allRendered ? (
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                        ) : (
                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar-dark">
                    {pages.map((page, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                                group relative w-full aspect-video rounded-md cursor-pointer transition-all duration-200
                                ${activeIdx === idx 
                                    ? 'ring-2 ring-indigo-500 bg-[#1e1e1e] shadow-lg scale-[1.02]' 
                                    : 'bg-[#1e1e1e]/50 hover:bg-[#1e1e1e] border border-white/5 hover:border-white/10'
                                }
                            `}
                        >
                            {/* Tiny Preview using Scaled Iframe */}
                            {page.html ? (
                                <div className="w-full h-full rounded-md overflow-hidden relative pointer-events-none">
                                    <div className="absolute inset-0 transform scale-[0.15] origin-top-left w-[666%] h-[666%] bg-white">
                                        <iframe srcDoc={page.html} className="w-full h-full border-none" tabIndex={-1} />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-2">
                                    {page.isGenerating ? (
                                        <RefreshIcon className="w-6 h-6 animate-spin text-indigo-500" />
                                    ) : (
                                        <CodeIcon className="w-6 h-6 opacity-30" />
                                    )}
                                </div>
                            )}

                            {/* Badge Number */}
                            <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 border border-white/5">
                                {String(idx + 1).padStart(2, '0')}
                            </div>
                            
                            {/* Status Icon */}
                            <div className="absolute top-1 right-1">
                                {page.isGenerating && (
                                    <div className="bg-indigo-500/20 p-1 rounded-full backdrop-blur-sm">
                                        <RefreshIcon className="w-3 h-3 text-indigo-400 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
                    <button onClick={onBackToCompose} className="w-full mb-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                        <ChevronLeftIcon className="w-3 h-3" /> 返回编辑
                    </button>
                    <button 
                        onClick={handleExportFull}
                        disabled={!allRendered || isExporting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isExporting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                        导出 PDF 报告
                    </button>
                </div>
            </div>

            {/* 2. Main Canvas Area (Neutral Gray) */}
            <div className="flex-1 bg-[#1e232f] relative flex flex-col min-w-0">
                
                {/* Floating Controls (Bottom Center) */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-2xl transition-transform hover:scale-105">
                     <button 
                        onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                        disabled={activeIdx === 0}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-mono font-bold text-white tracking-widest min-w-[60px] text-center">
                        {activeIdx + 1} <span className="text-slate-600">/</span> {pages.length}
                    </span>
                    <button 
                        onClick={() => setActiveIdx(Math.min(pages.length - 1, activeIdx + 1))}
                        disabled={activeIdx === pages.length - 1}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Canvas Container */}
                <div 
                    ref={containerRef}
                    className="flex-1 flex items-center justify-center overflow-hidden relative"
                >
                    {activePage && activePage.html && !activePage.isGenerating ? (
                        <div 
                            className="bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
                            style={{ 
                                width: '1600px', 
                                height: '900px',
                                transform: `scale(${scale})`,
                                transformOrigin: 'center',
                                flexShrink: 0
                            }}
                        >
                            <iframe 
                                srcDoc={activePage.html} 
                                className="w-full h-full border-none pointer-events-none select-none"
                                title="Page Preview"
                            />
                        </div>
                    ) : (
                        // Rendering / Code View State
                        <div className="w-full max-w-5xl h-[600px] p-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="bg-[#0f172a] rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col h-full">
                                <div className="px-5 py-3 bg-[#0b0c0e] border-b border-white/5 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        {activePage?.isGenerating ? (
                                            <><RefreshIcon className="w-3 h-3 animate-spin"/> GENERATING...</>
                                        ) : (
                                            <>IDLE</>
                                        )}
                                    </div>
                                </div>
                                <div 
                                    ref={codeScrollRef}
                                    className="flex-1 p-6 overflow-y-auto custom-scrollbar-dark font-mono text-xs leading-relaxed text-emerald-400 bg-[#0f172a]"
                                >
                                    {partialHtmls[activeIdx] ? (
                                        <pre className="whitespace-pre-wrap break-all">{partialHtmls[activeIdx]}</pre>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-4">
                                            <BrainIcon className="w-16 h-16 opacity-10 animate-pulse" />
                                            <p className="font-sans font-bold text-slate-600">AI 正在构思页面布局...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Top Info Bar (Overlay) */}
                <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 text-xs text-white/80 font-medium shadow-lg">
                        {activePage?.title || 'Unknown Slide'}
                    </div>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
};
