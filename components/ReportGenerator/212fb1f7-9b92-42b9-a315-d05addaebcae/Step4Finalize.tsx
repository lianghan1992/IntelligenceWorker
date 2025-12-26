
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PPTData } from './index';
import { streamChatCompletions, getPromptDetail, generatePdf } from '../../../api/stratify'; 
import { 
    SparklesIcon, RefreshIcon, DownloadIcon, ChevronRightIcon, 
    ChevronLeftIcon, ViewGridIcon, PhotoIcon, CloseIcon, CheckIcon
} from '../../icons';

interface Step4FinalizeProps {
    topic: string;
    pages: PPTData['pages'];
    onBackToCompose: () => void;
}

const PROMPT_ID_HTML = "14920b9c-604f-4066-bb80-da7a47b65572";

export const Step4Finalize: React.FC<Step4FinalizeProps> = ({ topic, pages: initialPages, onBackToCompose }) => {
    const [pages, setPages] = useState(initialPages);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(1);
    
    // HTML Generation
    const generateHtml = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.html) return;

        setPages(prev => prev.map((p, i) => i === idx ? { ...p, isGenerating: true } : p));

        try {
            const prompt = await getPromptDetail(PROMPT_ID_HTML);
            const userPrompt = `主题: ${topic}\n内容:\n${page.content}`;

            let accumulatedHtml = '';
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: [
                    { role: 'system', content: prompt.content },
                    { role: 'user', content: userPrompt }
                ],
                stream: true
            }, (data) => {
                if (data.content) {
                    accumulatedHtml += data.content;
                }
            }, () => {
                // Clean markdown fences
                const cleanHtml = accumulatedHtml.replace(/^```html?\s*/i, '').replace(/```$/, '').trim();
                setPages(prev => prev.map((p, i) => i === idx ? { ...p, html: cleanHtml, isGenerating: false } : p));
            }, (err) => {
                setPages(prev => prev.map((p, i) => i === idx ? { ...p, isGenerating: false, html: `<div class="p-10 text-red-500">渲染失败: ${err.message}</div>` } : p));
            });

        } catch (e) {
            setPages(prev => prev.map((p, i) => i === idx ? { ...p, isGenerating: false } : p));
        }
    }, [pages, topic]);

    useEffect(() => {
        pages.forEach((p, i) => {
            if (!p.html && !p.isGenerating) {
                generateHtml(i);
            }
        });
    }, []);

    // Export Logic
    const handleExportFull = async () => {
        setIsExporting(true);
        try {
            // Merge all HTMLs into one long document with page breaks
            const combinedHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { margin: 0; padding: 0; }
                        .page-break { page-break-after: always; }
                    </style>
                </head>
                <body>
                    ${pages.map(p => `<div>${p.html}</div><div class="page-break"></div>`).join('')}
                </body>
                </html>
            `;
            const blob = await generatePdf(combinedHtml, `${topic}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${topic}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('导出失败');
        } finally {
            setIsExporting(false);
        }
    };

    // Auto-scale logic
    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('ppt-canvas-container');
            if (container) {
                const cw = container.offsetWidth;
                const ch = container.offsetHeight;
                const scaleW = (cw - 80) / 1600;
                const scaleH = (ch - 80) / 900;
                setScale(Math.min(Math.min(scaleW, scaleH), 1));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        const timer = setInterval(handleResize, 500);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(timer);
        };
    }, []);

    const activePage = pages[activeIdx];
    const allRendered = pages.every(p => p.html && !p.isGenerating);

    return (
        <div className="h-full flex divide-x divide-slate-200">
            {/* Left: Thumbs Navigator */}
            <div className="w-1/5 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Slide Navigator</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {pages.map((page, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                                group relative aspect-[16/9] w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden
                                ${activeIdx === idx ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-lg' : 'border-slate-100 hover:border-indigo-300'}
                            `}
                        >
                            {page.html ? (
                                <div className="w-full h-full scale-[0.1] origin-top-left pointer-events-none" style={{ width: '1600px', height: '900px' }}>
                                    <iframe srcDoc={page.html} className="w-full h-full border-none" />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                    <RefreshIcon className="w-6 h-6 animate-spin" />
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 flex justify-between">
                                <span>SLIDE {idx + 1}</span>
                                {page.html && <CheckIcon className="w-3 h-3 text-emerald-400" />}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
                    <button 
                        onClick={handleExportFull}
                        disabled={!allRendered || isExporting}
                        className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                        导出高清 PDF 报告
                    </button>
                    <p className="text-[9px] text-slate-400 text-center font-bold tracking-widest uppercase">Combine all slides into one bundle</p>
                </div>
            </div>

            {/* Right: High-Fidelity Preview Area */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
                <div className="absolute top-6 left-6 z-20 flex gap-4">
                     <button onClick={onBackToCompose} className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-2">
                        <ChevronLeftIcon className="w-4 h-4" /> 返回微调稿件
                    </button>
                </div>
                
                <div className="absolute top-6 right-6 z-20">
                    <div className="bg-indigo-500/90 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-black/20 uppercase tracking-widest border border-indigo-400">
                        High Fidelity Rendering
                    </div>
                </div>

                <div id="ppt-canvas-container" className="flex-1 flex items-center justify-center overflow-hidden">
                    {activePage && activePage.html ? (
                        <div 
                            className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] origin-center transition-transform duration-500"
                            style={{ 
                                width: '1600px', 
                                height: '900px',
                                transform: `scale(${scale})`,
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
                        <div className="text-white/20 flex flex-col items-center gap-6">
                            <div className="w-20 h-20 border-4 border-white/5 border-t-indigo-500 rounded-full animate-spin"></div>
                            <p className="text-lg font-black tracking-widest animate-pulse uppercase">Engine Rendering...</p>
                        </div>
                    )}
                </div>

                {/* Page Controls Overlay */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 px-8 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                    <button 
                        onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
                        disabled={activeIdx === 0}
                        className="p-2 text-white/50 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                         <span className="text-white font-black text-xl tabular-nums">{activeIdx + 1}</span>
                         <div className="w-8 h-[2px] bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(activeIdx + 1) / pages.length * 100}%` }}></div>
                         </div>
                         <span className="text-white/40 font-black text-xl tabular-nums">{pages.length}</span>
                    </div>
                    <button 
                        onClick={() => setActiveIdx(prev => Math.min(pages.length - 1, prev + 1))}
                        disabled={activeIdx === pages.length - 1}
                        className="p-2 text-white/50 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
};
