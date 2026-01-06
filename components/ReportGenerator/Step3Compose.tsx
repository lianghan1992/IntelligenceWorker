
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PPTData, PPTStage, PPTPageData } from './types';
import { streamChatCompletions, getPromptDetail, generateBatchPdf } from '../../api/stratify';
import { 
    SparklesIcon, DownloadIcon, RefreshIcon, ViewGridIcon, 
    PencilIcon
} from '../icons';

// --- Prompt Constants ---
const COMPOSE_PROMPT_ID = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2";
const HTML_PROMPT_ID = "14920b9c-604f-4066-bb80-da7a47b65572";

interface MainCanvasProps {
    stage: PPTStage;
    data: PPTData;
    activePageIndex: number;
    setActivePageIndex: (i: number) => void;
    isLlmActive: boolean;
}

const extractStreamingHtml = (rawText: string): string => {
    // Remove markdown code blocks if present
    return rawText.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
};

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
    stage, data, activePageIndex, setActivePageIndex, isLlmActive 
}) => {
    // We use a local state to trigger updates, but data flows from props mostly in this design,
    // however, we need to mutate the pages array to store generated content.
    // Ideally, this should propagate back to parent, but for this component we can mutate the object ref if parent state isn't strictly immutable or if we rely on local refresh.
    // Better: use a local forced update or state to track generation progress.
    const [pages, setPages] = useState<PPTPageData[]>(data.pages);
    const [isExporting, setIsExporting] = useState(false);
    
    // Sync with props
    useEffect(() => {
        setPages(data.pages);
    }, [data.pages]);

    const activePage = pages[activePageIndex];

    // --- Generation Logic ---

    const generateContent = useCallback(async (idx: number) => {
        const page = pages[idx];
        // If already generating or has content, skip unless forced (not implemented here)
        if (!page || page.isGenerating || (page.content && page.html)) return;

        // 1. Mark as generating
        const updatePage = (updates: Partial<PPTPageData>) => {
            setPages(prev => {
                const newPages = [...prev];
                newPages[idx] = { ...newPages[idx], ...updates };
                // Also update the parent data ref if possible, but React state flow usually goes down.
                // Here we cheat a bit by modifying the prop object reference for persistence across re-renders if parent doesn't update.
                // In a real app, use a dispatch function passed from parent.
                data.pages[idx] = newPages[idx]; 
                return newPages;
            });
        };

        updatePage({ isGenerating: true });

        try {
            // Step A: Generate Text Content
            if (!page.content) {
                const prompt = await getPromptDetail(COMPOSE_PROMPT_ID);
                const instruction = prompt.content
                    .replace('{{ page_index }}', String(idx + 1))
                    .replace('{{ page_title }}', page.title)
                    .replace('{{ page_summary }}', page.summary);

                let accumulatedContent = '';
                await streamChatCompletions({
                    model: `${prompt.channel_code}@${prompt.model_id}`,
                    messages: [{ role: 'user', content: instruction }],
                    stream: true
                }, (chunk) => {
                     if (chunk.content) {
                         accumulatedContent += chunk.content;
                     }
                });
                
                updatePage({ content: accumulatedContent });
            }

            // Step B: Generate HTML (Immediately after content is ready)
            // We read the latest content from the object or the accumulated string
            const currentContent = data.pages[idx].content; 
            
            const htmlPrompt = await getPromptDetail(HTML_PROMPT_ID);
            const userPrompt = `主题: ${data.topic}\n内容:\n${currentContent}`;
            let htmlAccumulated = '';

            await streamChatCompletions({
                model: `${htmlPrompt.channel_code}@${htmlPrompt.model_id}`,
                messages: [
                    { role: 'system', content: htmlPrompt.content },
                    { role: 'user', content: userPrompt }
                ],
                stream: true
            }, (chunk) => {
                if (chunk.content) htmlAccumulated += chunk.content;
            });

            const finalHtml = extractStreamingHtml(htmlAccumulated);
            updatePage({ html: finalHtml, isGenerating: false });

            // Auto-advance logic? Maybe not, let user click.
            // But we can trigger the next page generation if we want sequential auto-gen.
            // For now, let's keep it parallel if the useEffect triggers it.

        } catch (e) {
            console.error(`Generation failed for page ${idx}`, e);
            updatePage({ isGenerating: false });
        }
    }, [pages, data]);

    // Auto-trigger generation
    useEffect(() => {
        if (stage === 'compose' && pages.length > 0) {
            // Find first page that needs generation
            // We can generate the active page, or all pages sequentially.
            // Let's generate the active page first if needed.
            if (activePage && !activePage.html && !activePage.isGenerating) {
                 generateContent(activePageIndex);
            }
            
            // Optionally, look ahead and generate next pages in background?
            // For simplicity, let's just do active page + 1 lookahead
            const nextIdx = activePageIndex + 1;
            if (nextIdx < pages.length && !pages[nextIdx].html && !pages[nextIdx].isGenerating) {
                // Small delay to prioritize active
                setTimeout(() => generateContent(nextIdx), 1000);
            }
        }
    }, [stage, activePageIndex, pages, generateContent]);


    const handleExport = async () => {
        setIsExporting(true);
        try {
             const pdfPages = pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);
            
            if (pdfPages.length === 0) {
                alert("没有可导出的页面。请等待生成完成。");
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

    // --- Renderers ---

    if (stage === 'collect') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border border-slate-100">
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
            <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-50 animate-in fade-in duration-500">
                 <div className="max-w-2xl w-full space-y-6 text-center">
                    <div className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-800">架构蓝图规划中...</h2>
                        <p className="text-slate-500 mt-2">请在左侧侧边栏确认生成的章节结构。确认后将开始生成内容。</p>
                    </div>
                    {/* Visual Placeholder */}
                    <div className="w-full h-64 border-2 border-dashed border-slate-300 rounded-3xl flex items-center justify-center bg-slate-100/50">
                        <div className="grid grid-cols-3 gap-4 p-8 w-full h-full opacity-50">
                             <div className="bg-slate-200 rounded-xl col-span-2"></div>
                             <div className="bg-slate-200 rounded-xl"></div>
                             <div className="bg-slate-200 rounded-xl"></div>
                             <div className="bg-slate-200 rounded-xl col-span-2"></div>
                        </div>
                    </div>
                 </div>
            </div>
        );
    }

    // Stage: compose / finalize
    if (!activePage) return <div className="p-10">Loading...</div>;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Toolbar */}
            <div className="h-16 px-8 flex items-center justify-between bg-white border-b border-slate-200 z-10 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page {activePageIndex + 1} / {pages.length}</span>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <h2 className="font-bold text-slate-800 truncate max-w-md">{activePage.title}</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => generateContent(activePageIndex)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" 
                        title="重新生成本页"
                    >
                        <RefreshIcon className={`w-5 h-5 ${activePage.isGenerating ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors shadow-lg disabled:opacity-50">
                        {isExporting ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <DownloadIcon className="w-4 h-4"/>}
                        导出 PDF
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4 md:p-8 lg:p-12 relative">
                <div className="w-full max-w-[1200px] aspect-[16/9] bg-white shadow-2xl rounded-sm overflow-hidden relative group transition-all duration-500">
                    {activePage.html ? (
                        <iframe 
                            srcDoc={activePage.html}
                            className="w-full h-full border-none pointer-events-none select-none scale-[1]"
                            style={{ transformOrigin: 'top left' }} 
                            title="Preview"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-20 text-center">
                            {activePage.isGenerating ? (
                                <>
                                    <div className="w-16 h-16 relative mb-6">
                                         <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                                         <div className="relative z-10 w-full h-full bg-white rounded-full border-2 border-indigo-100 flex items-center justify-center">
                                             <SparklesIcon className="w-8 h-8 text-indigo-500 animate-pulse" />
                                         </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">AI 正在绘制...</h3>
                                    <p className="text-slate-500 text-sm max-w-sm">正在生成页面内容并进行排版，请稍候。</p>
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
                    
                    {/* Hover Controls */}
                    {activePage.html && !activePage.isGenerating && (
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                             <button className="p-3 bg-black/70 text-white rounded-xl hover:bg-black/90 backdrop-blur shadow-lg transition-transform hover:scale-105">
                                <PencilIcon className="w-5 h-5" />
                             </button>
                        </div>
                    )}
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
            `}</style>
        </div>
    );
};
