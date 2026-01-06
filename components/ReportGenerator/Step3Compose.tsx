
import React, { useState, useEffect, useCallback } from 'react';
import { PPTData, PPTStage, PPTPageData } from './types';
import { streamChatCompletions, getPromptDetail, generateBatchPdf } from '../../api/stratify';
import { 
    SparklesIcon, DownloadIcon, RefreshIcon, ViewGridIcon, 
    PencilIcon, ChevronRightIcon, CheckIcon
} from '../icons';
import { Step2Outline } from './Step2Outline';

// --- Prompt Constants ---
const COMPOSE_PROMPT_ID = "c56f00b8-4c7d-4c80-b3da-f43fe5bd17b2";
const HTML_PROMPT_ID = "14920b9c-604f-4066-bb80-da7a47b65572";

interface MainCanvasProps {
    stage: PPTStage;
    data: PPTData;
    activePageIndex: number;
    setActivePageIndex: (i: number) => void;
    isLlmActive: boolean;
    // Optional callbacks from parent to control flow
    setStage?: (stage: PPTStage) => void; 
    setData?: React.Dispatch<React.SetStateAction<PPTData>>;
}

const extractStreamingHtml = (rawText: string): string => {
    return rawText.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
};

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
    stage, data, activePageIndex, setActivePageIndex, isLlmActive, setStage, setData
}) => {
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
        if (!page || page.isGenerating || (page.content && page.html)) return;

        const updatePage = (updates: Partial<PPTPageData>) => {
            setPages(prev => {
                const newPages = [...prev];
                newPages[idx] = { ...newPages[idx], ...updates };
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

            // Step B: Generate HTML
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

        } catch (e) {
            console.error(`Generation failed for page ${idx}`, e);
            updatePage({ isGenerating: false });
        }
    }, [pages, data]);

    // Auto-trigger generation
    useEffect(() => {
        if (stage === 'compose' && pages.length > 0) {
            if (activePage && !activePage.html && !activePage.isGenerating) {
                 generateContent(activePageIndex);
            }
            const nextIdx = activePageIndex + 1;
            if (nextIdx < pages.length && !pages[nextIdx].html && !pages[nextIdx].isGenerating) {
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
                alert("没有可导出的页面。");
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

    // 1. Welcome View (Stage: Collect)
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

    // 2. Outline View (Stage: Outline)
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

    // 3. Compose View (Stage: Compose/Finalize)
    if (!activePage) return <div className="p-10">Loading...</div>;

    return (
        <div className="flex h-full overflow-hidden bg-slate-100">
            {/* Left Rail: Thumbnails */}
            <div className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white">
                 <div className="p-4 border-b border-slate-100">
                     <h3 className="font-bold text-slate-800 text-sm truncate" title={data.topic}>{data.topic}</h3>
                     <p className="text-xs text-slate-400 mt-1">{pages.length} Pages</p>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                     {pages.map((p, idx) => (
                         <div 
                            key={idx}
                            onClick={() => setActivePageIndex(idx)}
                            className={`
                                group relative p-2 rounded-lg border-2 cursor-pointer transition-all
                                ${activePageIndex === idx ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}
                            `}
                         >
                             <div className="aspect-[16/9] bg-white rounded border border-slate-200 mb-2 overflow-hidden relative">
                                 {p.html ? (
                                     <iframe srcDoc={p.html} className="w-full h-full pointer-events-none scale-[0.25] origin-top-left w-[400%] h-[400%]" tabIndex={-1} />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                         {p.isGenerating ? <RefreshIcon className="w-4 h-4 text-indigo-400 animate-spin"/> : <span className="text-[10px] text-slate-300">{idx+1}</span>}
                                     </div>
                                 )}
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className={`text-xs font-bold w-4 ${activePageIndex === idx ? 'text-indigo-600' : 'text-slate-400'}`}>{idx + 1}</span>
                                 <span className="text-xs text-slate-600 truncate flex-1">{p.title}</span>
                                 {p.html && <CheckIcon className="w-3 h-3 text-green-500" />}
                             </div>
                         </div>
                     ))}
                 </div>
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
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Slide {activePageIndex + 1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => generateContent(activePageIndex)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" 
                            title="重新生成本页"
                        >
                            <RefreshIcon className={`w-5 h-5 ${activePage.isGenerating ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8 relative">
                    <div className="w-full max-w-[1000px] aspect-[16/9] bg-white shadow-2xl rounded-sm overflow-hidden relative group transition-all duration-500 ring-1 ring-slate-900/5">
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
