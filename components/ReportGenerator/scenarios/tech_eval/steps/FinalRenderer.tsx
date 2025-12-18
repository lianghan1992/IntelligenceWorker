
import React, { useState, useEffect } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, DownloadIcon, SparklesIcon, CodeIcon, CloseIcon } from '../../../../icons';

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
            (chunk) => { buffer += chunk; },
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
            {/* Header: Reference Style */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between z-30">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Render Preview</span>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'} ${isSynthesizing ? 'animate-pulse' : ''}`}></div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isReady ? 'Live Sync' : 'Waiting'}</span>
                    </div>
                </div>
                <button onClick={onComplete} className="text-slate-500 hover:text-white transition-colors">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 p-8 flex flex-col relative overflow-hidden">
                
                {/* PDF Export Button: Reference Style */}
                <div className="flex justify-center mb-8">
                    <button 
                        onClick={handleDownload}
                        disabled={!htmlContent || isDownloading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(79,70,229,0.4)] flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale"
                    >
                        {isDownloading ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <DownloadIcon className="w-4 h-4" />}
                        Export PDF
                    </button>
                </div>

                {/* Synthesis Mockup View */}
                <div className="flex-1 bg-[#0f172a] rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center group">
                    {/* The Grid/Pattern Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                    
                    {htmlContent ? (
                        <div className="w-full h-full p-6 animate-in fade-in zoom-in-95 duration-700">
                             <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-2xl scale-[0.98] transition-transform group-hover:scale-100">
                                 <iframe 
                                    srcDoc={htmlContent}
                                    className="w-full h-full border-none pointer-events-none"
                                    title="Synthesis Engine"
                                />
                             </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="relative inline-block">
                                <div className={`w-16 h-16 rounded-full border-2 border-dashed border-indigo-500/30 ${isSynthesizing ? 'animate-spin' : ''}`}></div>
                                <SparklesIcon className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Layout Engine</p>
                                <p className="text-[9px] font-mono text-indigo-400/50">HiFi-Synth v4.0</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Progress Scan Line (When synthesizing) */}
                    {isSynthesizing && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="w-full h-[20%] bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent absolute top-0 animate-[scan_3s_linear_infinite]"></div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(500%); }
                }
            `}</style>
        </div>
    );
};
