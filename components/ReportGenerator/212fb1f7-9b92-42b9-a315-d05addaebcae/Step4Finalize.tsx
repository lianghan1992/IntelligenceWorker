
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTPageData, ChatMessage } from '../index';
import { streamChatCompletions, getPromptDetail, generateBatchPdf } from '../../../api/stratify'; 
import { 
    RefreshIcon, DownloadIcon, ChevronRightIcon, 
    ChevronLeftIcon, CheckIcon, CodeIcon, BrainIcon, SparklesIcon
} from '../../icons';

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
    // Initialize state from props
    const [pages, setPages] = useState<PPTPageData[]>(initialPages);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(0.5); 
    
    // Local ephemeral state for streaming text
    const [partialHtmls, setPartialHtmls] = useState<Record<number, string>>({});
    const codeScrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync prop updates to local state to handle external updates if any
    useEffect(() => {
        setPages(initialPages);
    }, [initialPages]);

    // Auto-scroll code view
    useEffect(() => {
        if (codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [partialHtmls]);

    // Auto-Scale Logic
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const cw = containerRef.current.offsetWidth;
                const ch = containerRef.current.offsetHeight;
                const padding = 64; // padding
                const targetW = 1600;
                const targetH = 900;
                
                const scaleW = (cw - padding) / targetW;
                const scaleH = (ch - padding) / targetH;
                const newScale = Math.min(scaleW, scaleH, 1); // Max 100%
                setScale(newScale);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Generation Logic ---
    const generateHtml = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.html) return;

        onLlmStatusChange?.(true);
        
        // Optimistic update locally AND parent
        const newPagesStart = [...pages];
        newPagesStart[idx] = { ...page, isGenerating: true };
        setPages(newPagesStart);
        onUpdatePages(newPagesStart); 

        try {
            const prompt = await getPromptDetail(PROMPT_ID_HTML).catch(() => ({ 
                content: "你是一个前端专家，请根据提供的内容生成精美的 HTML 代码，作为 PPT 的一页。只返回 HTML 代码，不要包含其他解释。",
                channel_code: "openai", // fallback
                model_id: "gpt-4o"      // fallback
            }));
            const userPrompt = `主题: ${topic}\n内容:\n${page.content}`;

            let accumulatedText = '', accumulatedReasoning = '';
            
            // Construct model ID correctly
            const modelName = (prompt as any).channel_code ? `${(prompt as any).channel_code}@${(prompt as any).model_id}` : 'gpt-4o';

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

                onStreamingUpdate?.({
                    role: 'assistant',
                    content: `正在渲染第 ${idx + 1} 页: ${page.title}...`,
                    reasoning: accumulatedReasoning
                });

            }, () => {
                const finalHtml = extractStreamingHtml(accumulatedText);
                // Important: Use function update to get latest state
                setPages(currentPages => {
                    const finalPages = [...currentPages];
                    finalPages[idx] = { ...finalPages[idx], html: finalHtml, isGenerating: false };
                    onUpdatePages(finalPages); // Sync result
                    return finalPages;
                });
                
                onLlmStatusChange?.(false);
                onStreamingUpdate?.(null);
            }, (err) => {
                setPages(currentPages => {
                    const errorPages = [...currentPages];
                    errorPages[idx] = { ...errorPages[idx], isGenerating: false, html: `<div style="color:red;padding:20px;">Render Error: ${err.message}</div>` };
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

    // --- Serial Queue Effect ---
    useEffect(() => {
        // 1. Check if ANY page is currently generating
        const isBusy = pages.some(p => p.isGenerating);
        if (isBusy) return; // Wait for it to finish

        // 2. Find next pending page
        const nextIdx = pages.findIndex(p => !p.html);
        if (nextIdx !== -1) {
            setActiveIdx(nextIdx); // Auto-focus the working page
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

    return (
        <div className="h-full flex flex-row bg-slate-900 overflow-hidden font-sans">
            
            {/* Left Sidebar: Filmstrip Navigator (Lightroom Style) */}
            <div className="w-56 flex flex-col border-r border-slate-800 bg-[#0f172a] z-20 shadow-xl flex-shrink-0">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Slides ({pages.length})</h3>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-dark">
                    {pages.map((page, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                                group relative w-full aspect-video rounded-lg cursor-pointer transition-all duration-200
                                ${activeIdx === idx 
                                    ? 'ring-2 ring-indigo-500 bg-slate-800 shadow-lg scale-[1.02]' 
                                    : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600'
                                }
                            `}
                        >
                            {/* Tiny Preview or Placeholder */}
                            {page.html ? (
                                <div className="w-full h-full rounded-lg overflow-hidden relative">
                                    <div className="absolute inset-0 pointer-events-none transform scale-[0.12] origin-top-left w-[833%] h-[833%]">
                                        <iframe srcDoc={page.html} className="w-full h-full border-none bg-white" tabIndex={-1} />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                                    {page.isGenerating ? (
                                        <RefreshIcon className="w-5 h-5 animate-spin text-indigo-500" />
                                    ) : (
                                        <CodeIcon className="w-5 h-5 opacity-50" />
                                    )}
                                </div>
                            )}

                            {/* Badge */}
                            <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-300">
                                {idx + 1}
                            </div>
                            
                            {/* Status Icon */}
                            <div className="absolute top-1 right-1">
                                {page.html ? (
                                    <div className="bg-emerald-500/20 p-0.5 rounded-full"><CheckIcon className="w-3 h-3 text-emerald-500" /></div>
                                ) : page.isGenerating ? (
                                    <div className="bg-indigo-500/20 p-0.5 rounded-full"><RefreshIcon className="w-3 h-3 text-indigo-400 animate-spin" /></div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 border-t border-slate-800 bg-[#0b1120]">
                    <button onClick={onBackToCompose} className="w-full mb-3 py-2 text-xs font-bold text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                        <ChevronLeftIcon className="w-3 h-3" /> 返回编辑
                    </button>
                    <button 
                        onClick={handleExportFull}
                        disabled={!allRendered || isExporting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-indigo-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                        导出 PDF 报告
                    </button>
                </div>
            </div>

            {/* Center: Canvas Area */}
            <div className="flex-1 bg-[#1e232f] relative flex flex-col min-w-0">
                
                {/* Floating Controls */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-2xl">
                     <button 
                        onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                        disabled={activeIdx === 0}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-mono font-bold text-white tracking-widest">
                        {activeIdx + 1} <span className="text-slate-500">/</span> {pages.length}
                    </span>
                    <button 
                        onClick={() => setActiveIdx(Math.min(pages.length - 1, activeIdx + 1))}
                        disabled={activeIdx === pages.length - 1}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Canvas Container */}
                <div 
                    ref={containerRef}
                    className="flex-1 flex items-center justify-center overflow-hidden relative"
                    id="ppt-canvas-container"
                >
                    {activePage && activePage.html && !activePage.isGenerating ? (
                        <div 
                            className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.5)]"
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
                        // Loading / Code View State
                        <div className="w-full max-w-4xl p-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="bg-[#0f172a] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[600px]">
                                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                                        {activePage?.isGenerating ? 'GENERATING...' : 'WAITING'}
                                    </div>
                                </div>
                                <div 
                                    ref={codeScrollRef}
                                    className="flex-1 p-6 overflow-y-auto custom-scrollbar-dark font-mono text-xs leading-relaxed text-emerald-400"
                                >
                                    {partialHtmls[activeIdx] ? (
                                        <pre className="whitespace-pre-wrap break-all">{partialHtmls[activeIdx]}</pre>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
                                            <BrainIcon className="w-12 h-12 opacity-20 animate-pulse" />
                                            <p>AI 正在构思页面布局...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Info Bar */}
                <div className="h-8 bg-[#0b1120] border-t border-slate-800 flex items-center justify-between px-4 text-[10px] text-slate-500 font-mono">
                    <div className="flex items-center gap-4">
                        <span>{activePage?.title || 'Unknown Slide'}</span>
                        {activePage?.isGenerating && <span className="text-indigo-400 animate-pulse">● Rendering</span>}
                    </div>
                    <div>
                        Scale: {Math.round(scale * 100)}%
                    </div>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { bg: transparent; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
};
