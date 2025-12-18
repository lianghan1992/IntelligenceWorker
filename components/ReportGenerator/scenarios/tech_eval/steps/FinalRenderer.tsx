
import React, { useState, useEffect } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, DownloadIcon, SparklesIcon, CodeIcon, CloseIcon } from '../../../../icons';

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

export const FinalRenderer: React.FC<{
    taskId: string;
    scenario: string;
    markdown: string;
    onFinish: () => void;
    onComplete: () => void;
}> = ({ taskId, scenario, markdown, onFinish, onComplete }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [codeStream, setCodeStream] = useState('');
    const [isSynthesizing, setIsSynthesizing] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const synthesize = async () => {
            let buffer = '';
            // 使用全新会话
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
                    // 展示原始代码流，增加炫酷感
                    setCodeStream(prev => (prev + chunk).slice(-2000));
                },
                () => {
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    const parsed = parseLlmJson<any>(jsonPart);
                    if (parsed && parsed.html_report) {
                        setHtmlContent(parsed.html_report);
                    } else {
                        // 兜底：尝试从文本中直接找 html 标签
                        const htmlMatch = buffer.match(/<div[\s\S]*<\/div>/i);
                        if (htmlMatch) setHtmlContent(htmlMatch[0]);
                    }
                    setIsSynthesizing(false);
                    onFinish();
                }
            );
        };
        synthesize();
    }, [markdown, scenario, onFinish]);

    const handleDownload = async () => {
        if (!htmlContent) return;
        setIsDownloading(true);
        try {
            const blob = await generatePdf(htmlContent, `TECH_REPORT_${taskId.slice(0,8)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `新技术评估报告_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md z-30">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-600 rounded-lg">
                        <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Visual Synthesis Engine</span>
                </div>
                <div className="flex items-center gap-4">
                    {!isSynthesizing && (
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-6 py-2 bg-white text-slate-900 text-[10px] font-black rounded-full hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2"
                        >
                            {isDownloading ? <div className="animate-spin h-3 w-3 border-2 border-slate-900 border-t-transparent rounded-full"></div> : <DownloadIcon className="w-4 h-4" />}
                            SAVE TO PDF
                        </button>
                    )}
                    <button onClick={onComplete} className="p-2 text-slate-500 hover:text-white"><CloseIcon className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="flex-1 relative">
                {isSynthesizing ? (
                    <div className="h-full flex flex-col bg-[#020617] p-10 font-mono text-[11px] text-emerald-500/60 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent z-10"></div>
                        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-indigo-500/5 to-transparent z-10"></div>
                        
                        <div className="mb-8 flex items-center gap-4 border-b border-emerald-500/20 pb-4">
                            <CodeIcon className="w-5 h-5 animate-pulse" />
                            <span className="font-bold tracking-widest">SYNTHESIZING UI COMPONENTS...</span>
                        </div>
                        
                        <div className="whitespace-pre-wrap break-all leading-relaxed">
                            {codeStream}
                            <span className="w-2 h-4 bg-emerald-500 animate-pulse inline-block align-middle ml-1"></span>
                        </div>

                        {/* Scanline Effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
                    </div>
                ) : (
                    <div className="h-full w-full bg-slate-100 flex items-center justify-center p-4 lg:p-10">
                         <div className="w-full h-full max-w-5xl bg-white shadow-2xl rounded-[2px] overflow-hidden border border-slate-200">
                             <iframe 
                                srcDoc={htmlContent || ''}
                                className="w-full h-full border-none"
                                title="Final Report"
                                sandbox="allow-scripts allow-same-origin"
                            />
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
