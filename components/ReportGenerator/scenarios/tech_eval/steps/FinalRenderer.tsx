
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { DownloadIcon, CloseIcon, CodeIcon, EyeIcon, ArrowRightIcon, LightningBoltIcon } from '../../../../icons';

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

const extractStreamingHtml = (text: string): string => {
    const keyMatch = text.match(/"html_report"\s*:\s*"/);
    if (!keyMatch || keyMatch.index === undefined) return '';
    const startIndex = keyMatch.index + keyMatch[0].length;
    let rawContent = text.slice(startIndex);
    const endMatch = rawContent.match(/"\s*}\s*$/);
    if (endMatch) rawContent = rawContent.slice(0, endMatch.index);
    return rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\').replace(/\\$/, ''); 
};

const formatModelName = (model: string) => {
    return model.includes('@') ? model.split('@')[1] : model;
};

export const FinalRenderer: React.FC<{
    taskId: string;
    scenario: string;
    markdown: string;
    isReady: boolean;
    onComplete: () => void;
    onBack: () => void; // New prop
}> = ({ taskId, scenario, markdown, isReady, onComplete, onBack }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [rawStream, setRawStream] = useState<string>('');
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const codeScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSynthesizing && codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [htmlContent, rawStream, isSynthesizing]);

    useEffect(() => {
        if (isReady && !htmlContent && !isSynthesizing) {
            synthesize();
        }
    }, [isReady]);

    const synthesize = async () => {
        setIsSynthesizing(true);
        setHtmlContent(''); 
        setRawStream('');
        let buffer = '';
        
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
                setRawStream(buffer);
                const extracted = extractStreamingHtml(buffer);
                if (extracted) setHtmlContent(extracted);
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
            const blob = await generatePdf(htmlContent, `TECH_REPORT_${taskId.slice(0,8)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `技术评估报告_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] overflow-hidden relative">
            {/* Header */}
            <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between z-30 bg-[#0f172a]/90 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                         ← Back to Edit
                    </button>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Synthesis Engine</span>
                        <span className="text-[9px] text-indigo-400 font-mono mt-0.5 flex items-center gap-1">
                            <LightningBoltIcon className="w-2.5 h-2.5" />
                            {formatModelName(TARGET_MODEL)}
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {!isSynthesizing && htmlContent.length > 0 && (
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-black transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-indigo-900/40"
                        >
                            {isDownloading ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                            EXPORT PDF
                        </button>
                    )}
                    <button onClick={onComplete} className="text-slate-500 hover:text-white p-1 transition-colors" title="Close">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#0f172a] flex flex-col overflow-hidden">
                {isSynthesizing ? (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div ref={codeScrollRef} className="flex-1 overflow-auto p-8 font-mono text-[11px] leading-relaxed custom-scrollbar-dark selection:bg-cyan-500/30">
                            <div className="flex items-center gap-2 mb-6 opacity-50">
                                <CodeIcon className="w-4 h-4 text-cyan-400" />
                                <span className="text-white text-[10px] font-black tracking-widest uppercase">Generating HTML Structure...</span>
                            </div>
                            <pre className="text-cyan-400/90 whitespace-pre-wrap break-all">
                                {htmlContent || rawStream || '> Initializing secure link to synthesis core...'}
                                <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
                            </pre>
                        </div>
                    </div>
                ) : htmlContent.length > 0 ? (
                    <div className="flex-1 w-full h-full relative overflow-hidden animate-in fade-in duration-1000">
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none bg-white"
                            title="Final HTML Synthesis"
                            sandbox="allow-scripts allow-same-origin"
                        />
                        <div className="absolute bottom-6 right-6 pointer-events-none">
                            <div className="flex items-center gap-2 bg-black/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-white shadow-2xl opacity-0 animate-in fade-in delay-1000 fill-mode-forwards slide-in-from-bottom-4">
                                <EyeIcon className="w-3.5 h-3.5 text-green-400" />
                                Preview Mode Active
                            </div>
                        </div>
                    </div>
                ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 animate-spin"></div>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Awaiting Input...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
