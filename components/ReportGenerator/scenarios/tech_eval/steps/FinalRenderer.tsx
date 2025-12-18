
import React, { useState, useEffect } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, DownloadIcon, SparklesIcon, BrainIcon, CloseIcon, ChevronLeftIcon } from '../../../../icons';

const TARGET_MODEL = "openrouter@tngtech/deepseek-r1t2-chimera:free";

interface FinalRendererProps {
    taskId: string;
    scenario: string;
    markdown: string;
    onComplete: () => void;
}

export const FinalRenderer: React.FC<FinalRendererProps> = ({ taskId, scenario, markdown, onComplete }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [thought, setThought] = useState('');

    useEffect(() => {
        const render = async () => {
            let buffer = '';
            setThought('Waking up High-Fidelity Layout Engine...\nInjecting Typography & Component Library...\n');
            
            await streamGenerate(
                { 
                    prompt_name: '04_Markdown2Html', 
                    variables: { markdown_report: markdown }, 
                    scenario, 
                    session_id: undefined, 
                    model_override: TARGET_MODEL 
                },
                (chunk) => {
                    buffer += chunk;
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    if (jsonPart) {
                        try {
                            const parsed = parseLlmJson<any>(jsonPart);
                            if (parsed && parsed.html_report) {
                                setHtmlContent(parsed.html_report);
                                return;
                            }
                        } catch (e) {}

                        const htmlStart = jsonPart.indexOf('<div');
                        if (htmlStart !== -1) {
                            let partialHtml = jsonPart.substring(htmlStart);
                            partialHtml = partialHtml.replace(/",?\s*$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
                            if (partialHtml.length > 800) {
                                setHtmlContent(partialHtml);
                            }
                        }
                    }
                },
                () => {
                    setIsRendering(false);
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    const parsed = parseLlmJson<any>(jsonPart);
                    if (parsed && parsed.html_report) setHtmlContent(parsed.html_report);
                },
                () => setIsRendering(false),
                undefined,
                (tChunk) => setThought(prev => prev + tChunk) 
            );
        };
        render();
    }, [markdown, scenario]);

    const handleDownloadPdf = async () => {
        if (!htmlContent) return;
        setIsDownloading(true);
        try {
            const blob = await generatePdf(htmlContent, `TECH_EVAL_${taskId.slice(0,8)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `技术深度评估报告_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('PDF 导出失败');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#e2e8f0]">
            {/* Header */}
            <div className="h-20 bg-white border-b border-slate-300 px-10 flex items-center justify-between z-20 shadow-md">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-emerald-600 rounded-[18px] flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                        <CheckIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-900 text-xl tracking-tight">高保真报告就绪</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                            <SparklesIcon className="w-3 h-3 text-indigo-500" />
                            Visual Component Factory v1.1
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={!htmlContent || isDownloading}
                        className="px-10 py-3 bg-indigo-600 text-white font-black text-sm rounded-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95"
                    >
                        {isDownloading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <DownloadIcon className="w-5 h-5" />}
                        <span>保存为 PDF 报告</span>
                    </button>
                    <button onClick={onComplete} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 p-6 md:p-10 flex gap-8 overflow-hidden">
                {/* Left: Layout Log - Retro Console Style */}
                <div className="w-80 bg-slate-900 rounded-[32px] border border-slate-800 p-8 flex flex-col shadow-2xl hidden xl:flex">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Layout Console</span>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-500 custom-scrollbar-dark leading-loose">
                        <div className="whitespace-pre-wrap break-words">
                            {thought || "Waking up Visual Agent..."}
                            {isRendering && <span className="inline-block w-1.5 h-3 bg-indigo-500 animate-pulse ml-1 align-middle"></span>}
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-widest">
                            <span>Engine Status</span>
                            <span className="text-emerald-500">Optimized</span>
                        </div>
                    </div>
                </div>

                {/* Right: The Magazine Style Preview */}
                <div className="flex-1 bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] rounded-[4px] overflow-hidden border border-slate-300 relative group">
                    {htmlContent ? (
                        <div className="w-full h-full relative">
                             {/* Preview Overlay for "Look" */}
                             <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 z-30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             
                             <iframe 
                                srcDoc={htmlContent}
                                className="w-full h-full border-none"
                                title="Report Preview"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 text-slate-300 bg-slate-50">
                            <div className="relative">
                                <div className="w-24 h-24 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <BrainIcon className="w-10 h-10 text-slate-200 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="font-black text-slate-900 text-2xl tracking-tighter uppercase">High Fidelity Rendering</p>
                                <p className="text-sm font-medium text-slate-400">正在构建可视化组件与动态图表...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
