
import React, { useState, useEffect } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { DownloadIcon, SparklesIcon, CloseIcon } from '../../../../icons';

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

export const FinalRenderer: React.FC<{
    taskId: string;
    scenario: string;
    markdown: string;
    isReady: boolean;
    onComplete: () => void;
}> = ({ taskId, scenario, markdown, isReady, onComplete }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (isReady && !htmlContent) {
            synthesize();
        }
    }, [isReady]);

    const synthesize = async () => {
        setIsSynthesizing(true);
        let buffer = '';
        await streamGenerate(
            { prompt_name: '04_Markdown2Html', variables: { markdown_report: markdown }, scenario, session_id: undefined, model_override: TARGET_MODEL },
            (chunk) => { 
                buffer += chunk; 
                // 实时解析，虽然性能消耗大，但能满足“输出时显示HTML”的要求
                const { jsonPart } = extractThoughtAndJson(buffer);
                const parsed = parseLlmJson<any>(jsonPart);
                if (parsed && parsed.html_report) setHtmlContent(parsed.html_report);
            },
            () => {
                const { jsonPart } = extractThoughtAndJson(buffer);
                const parsed = parseLlmJson<any>(jsonPart);
                if (parsed && parsed.html_report) setHtmlContent(parsed.html_report);
                setIsSynthesizing(false);
            }
        );
    };

    const handleDownload = async () => {
        if (!htmlContent) return;
        setIsDownloading(true);
        try {
            const blob = await generatePdf(htmlContent, `TECH_EVAL_${taskId.slice(0,8)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `研报_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] overflow-hidden relative">
            {/* Control Bar */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between z-30 bg-[#020617]/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Render Preview</span>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'} ${isSynthesizing ? 'animate-pulse' : ''}`}></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isSynthesizing ? 'Synthesizing...' : 'Live Sync'}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {htmlContent && (
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-bold transition-all disabled:opacity-30 flex items-center gap-2"
                        >
                            {isDownloading ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                            PDF
                        </button>
                    )}
                    <button onClick={onComplete} className="text-slate-500 hover:text-white p-1 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Render Area - Allows Scrolling */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {htmlContent ? (
                    <div className="flex-1 w-full h-full animate-in fade-in duration-1000">
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none bg-white"
                            title="HTML Content"
                        />
                        {/* Stream Overlay Effect during synthesis */}
                        {isSynthesizing && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="w-full h-[30%] bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent absolute top-0 animate-[scan_2s_linear_infinite]"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className={`w-20 h-20 rounded-full border-2 border-dashed border-indigo-500/30 ${isSynthesizing ? 'animate-spin' : ''}`}></div>
                            <SparklesIcon className="w-8 h-8 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Synthesis Lab</p>
                            <p className="text-[9px] font-mono text-indigo-400/50 uppercase">Waiting for Data Particles...</p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(400%); }
                }
            `}</style>
        </div>
    );
};
