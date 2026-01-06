
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PPTData, PPTStage, PPTPageData } from './types';
import { streamChatCompletions, getPromptDetail, generateBatchPdf } from '../../api/stratify';
import { 
    SparklesIcon, DocumentTextIcon, DownloadIcon, 
    RefreshIcon, ViewGridIcon, 
    ChevronLeftIcon, ChevronRightIcon,
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

const extractContent = (raw: string) => {
    // Basic extraction, improvement needed for robust JSON/Markdown parsing
    return raw.replace(/```json|```/g, '').trim(); 
};

const extractStreamingHtml = (rawText: string): string => {
    return rawText.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
};

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
    stage, data, activePageIndex, setActivePageIndex, isLlmActive 
}) => {
    // Local state for page content to allow instant optimistic updates before syncing up
    const [pages, setPages] = useState<PPTPageData[]>(data.pages);
    const [isExporting, setIsExporting] = useState(false);

    // Sync from props
    useEffect(() => {
        setPages(data.pages);
    }, [data.pages]);

    const activePage = pages[activePageIndex];

    // --- Generation Logic ---

    const generateContent = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.content || page.isGenerating) return;

        // Optimistic update
        setPages(prev => {
            const copy = [...prev];
            copy[idx].isGenerating = true;
            return copy;
        });

        try {
            const prompt = await getPromptDetail(COMPOSE_PROMPT_ID);
            const instruction = prompt.content
                .replace('{{ page_index }}', String(idx + 1))
                .replace('{{ page_title }}', page.title)
                .replace('{{ page_summary }}', page.summary);

            let accumulated = '';
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: [{ role: 'user', content: instruction }],
                stream: true
            }, (chunk) => {
                 if (chunk.content) {
                     accumulated += chunk.content;
                     // Real-time streaming update? Maybe too heavy for state.
                     // Let's update in chunks or at end for now to avoid jitter.
                     setPages(prev => {
                        const copy = [...prev];
                        copy[idx].content = accumulated; 
                        return copy;
                     });
                 }
            });
            
            // Finalize
            setPages(prev => {
                const copy = [...prev];
                copy[idx].isGenerating = false;
                copy[idx].content = accumulated;
                return copy;
            });
            
            // Trigger HTML generation immediately after content
            generateHtml(idx, accumulated);

        } catch (e) {
            setPages(prev => {
                const copy = [...prev];
                copy[idx].isGenerating = false;
                return copy;
            });
        }
    }, [pages]);

    const generateHtml = async (idx: number, content: string) => {
        if (!content) return;
        
        try {
             setPages(prev => {
                const copy = [...prev];
                copy[idx].isGenerating = true; // Re-use generating flag for HTML phase
                return copy;
            });

            const prompt = await getPromptDetail(HTML_PROMPT_ID);
            const userPrompt = `主题: ${data.topic}\n内容:\n${content}`;
            let htmlAccumulated = '';

            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: [
                    { role: 'system', content: prompt.content },
                    { role: 'user', content: userPrompt }
                ],
                stream: true
            }, (chunk) => {
                if (chunk.content) htmlAccumulated += chunk.content;
            });

            const finalHtml = extractStreamingHtml(htmlAccumulated);
            setPages(prev => {
                const copy = [...prev];
                copy[idx].html = finalHtml;
                copy[idx].isGenerating = false;
                return copy;
            });

        } catch (e) {
            console.error("HTML gen failed", e);
             setPages(prev => {
                const copy = [...prev];
                copy[idx].isGenerating = false;
                return copy;
            });
        }
    };

    // Auto-trigger generation when entering compose stage
    useEffect(() => {
        if (stage === 'compose' && activePage && !activePage.content && !activePage.isGenerating) {
            generateContent(activePageIndex);
        }
    }, [stage, activePageIndex, activePage, generateContent]);


    const handleExport = async () => {
        setIsExporting(true);
        try {
             const pdfPages = pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);
            const blob = await generateBatchPdf(pdfPages);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.topic || 'report'}.pdf`;
            a.click();
        } catch(e) { alert('导出失败'); } finally { setIsExporting(false); }
    };

    // --- Renderers ---

    const renderWelcome = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 border border-slate-100">
                <SparklesIcon className="w-16 h-16 text-indigo-500" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Auto Insight Canvas</h1>
            <p className="text-slate-500 max-w-md text-lg">
                请在左侧侧边栏输入研究主题。AI 将为您构建逻辑架构并实时生成可视化幻灯片。
            </p>
        </div>
    );

    const renderOutlineView = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-50">
             <div className="max-w-2xl w-full space-y-6">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-slate-800">架构蓝图规划中...</h2>
                    <p className="text-slate-500 mt-2">请在左侧侧边栏确认或调整生成的章节结构。</p>
                </div>
                {/* Visual Placeholder for MindMap */}
                <div className="relative h-64 border-2 border-dashed border-slate-300 rounded-3xl flex items-center justify-center bg-slate-100/50">
                    <ViewGridIcon className="w-12 h-12 text-slate-300" />
                </div>
             </div>
        </div>
    );

    const renderSlideEditor = () => {
        if (!activePage) return <div>Loading...</div>;

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Toolbar */}
                <div className="h-16 px-8 flex items-center justify-between bg-white border-b border-slate-200 z-10 shadow-sm">
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
                        <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors">
                            {isExporting ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <DownloadIcon className="w-4 h-4"/>}
                            导出 PDF
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8 md:p-12">
                    <div className="w-full max-w-5xl aspect-video bg-white shadow-2xl rounded-sm overflow-hidden relative group">
                        {activePage.html ? (
                            <iframe 
                                srcDoc={activePage.html}
                                className="w-full h-full border-none pointer-events-none select-none scale-[1]"
                                style={{ transformOrigin: 'top left' }} // iframe scaling might need adjustment based on container
                            />
                        ) : activePage.content ? (
                            <div className="p-12 prose max-w-none h-full overflow-hidden">
                                <h1>{activePage.title}</h1>
                                <div className="whitespace-pre-wrap">{activePage.content}</div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
                                {activePage.isGenerating ? (
                                    <>
                                        <SparklesIcon className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
                                        <p className="text-slate-500 font-medium animate-pulse">AI 正在绘制...</p>
                                    </>
                                ) : (
                                    <p className="text-slate-300 font-bold text-lg">等待生成...</p>
                                )}
                            </div>
                        )}
                        
                        {/* Overlay Controls */}
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                             <button className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 backdrop-blur">
                                <PencilIcon className="w-4 h-4" />
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Render ---
    if (stage === 'collect') return renderWelcome();
    if (stage === 'outline') return renderOutlineView();
    return renderSlideEditor();
};
