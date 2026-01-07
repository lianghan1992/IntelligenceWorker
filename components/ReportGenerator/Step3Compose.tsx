
import React, { useState, useEffect, useRef } from 'react';
import { PPTData, PPTStage, PPTPageData } from './types';
import { generateBatchPdf } from '../../api/stratify';
import { 
    SparklesIcon, DownloadIcon, RefreshIcon, ViewGridIcon, 
    PencilIcon, CheckIcon, DocumentTextIcon, ChevronRightIcon
} from '../icons';
import { Step2Outline } from './Step2Outline';

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

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
    stage, data, activePageIndex, setActivePageIndex, isLlmActive, setStage, setData
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const activePage = data.pages[activePageIndex];
    const editorScrollRef = useRef<HTMLDivElement>(null);

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

    // Auto-scroll effect for streaming content
    useEffect(() => {
        if (activePage?.isGenerating && editorScrollRef.current) {
            editorScrollRef.current.scrollTop = editorScrollRef.current.scrollHeight;
        }
    }, [activePage?.content, activePage?.isGenerating]);

    // Render Markdown Helper with Fix
    const renderMarkdown = (content: string): { __html: string } | undefined => {
        if (!content) return undefined;
        if (window.marked) {
            return { __html: window.marked.parse(content) };
        }
        return { __html: `<pre>${content}</pre>` };
    };

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

    // Stage: Compose
    if (!activePage) return <div className="p-10 text-center">Loading...</div>;

    const hasHtml = !!activePage.html;
    const isGenerating = activePage.isGenerating;
    const hasContent = !!activePage.content;

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
                             <div className="aspect-[16/9] bg-white rounded border border-slate-200 mb-2 overflow-hidden relative flex items-center justify-center">
                                 {p.html ? (
                                     <iframe srcDoc={p.html} className="w-[400%] h-[400%] pointer-events-none scale-[0.25] origin-top-left border-none" tabIndex={-1} />
                                 ) : p.content ? (
                                     <div className="p-1 text-[4px] text-slate-300 leading-tight overflow-hidden text-left h-full w-full select-none">
                                        {p.content.slice(0, 200)}
                                     </div>
                                 ) : (
                                     <span className="text-[10px] text-slate-300">{idx+1}</span>
                                 )}
                                 
                                 {p.isGenerating && (
                                     <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                         <RefreshIcon className="w-4 h-4 text-indigo-500 animate-spin"/>
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
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Page {activePageIndex + 1} • {hasHtml ? 'HTML Preview' : 'Content Editor'}
                        </span>
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8 relative">
                    <div className={`w-full max-w-[1000px] aspect-[16/9] bg-white shadow-2xl rounded-sm overflow-hidden relative group transition-all duration-500 ring-1 ring-slate-900/5 ${isGenerating ? 'ring-indigo-200 ring-4' : ''}`}>
                        
                        {/* 1. HTML View (Highest Priority if exists) */}
                        {hasHtml ? (
                            <iframe 
                                srcDoc={activePage.html}
                                className="w-full h-full border-none pointer-events-none select-none scale-[1]"
                                style={{ transformOrigin: 'top left' }} 
                                title="Preview"
                            />
                        ) : hasContent ? (
                            /* 2. Text/Markdown View */
                            <div ref={editorScrollRef} className="w-full h-full overflow-y-auto p-12 bg-white relative scroll-smooth">
                                <article 
                                    className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-h1:text-3xl prose-h2:text-2xl prose-strong:text-indigo-700"
                                    dangerouslySetInnerHTML={renderMarkdown(activePage.content)}
                                />
                                {isGenerating && (
                                    <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-bold text-indigo-600">AI Writing...</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* 3. Empty/Loading State */
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-20 text-center">
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
            `}</style>
        </div>
    );
};
