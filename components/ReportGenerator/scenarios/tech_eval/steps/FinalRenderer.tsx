
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
                    // 展示银白色代码流
                    setCodeStream(prev => (prev + chunk).slice(-1500));
                },
                () => {
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    const parsed = parseLlmJson<any>(jsonPart);
                    if (parsed && parsed.html_report) setHtmlContent(parsed.html_report);
                    else {
                        const htmlMatch = buffer.match(/<div[\s\S]*<\/div>/i);
                        if (htmlMatch) setHtmlContent(htmlMatch[0]);
                    }
                    setTimeout(() => {
                        setIsSynthesizing(false);
                        onFinish();
                    }, 1000);
                }
            );
        };
        synthesize();
    }, [markdown, scenario, onFinish]);

    const handleDownload = async () => {
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
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] overflow-hidden relative">
            {/* 精致页眉 */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/80 backdrop-blur-md z-30">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-600 rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                        <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Hifi Layout Synthesis Engine</span>
                </div>
                <div className="flex items-center gap-4">
                    {!isSynthesizing && (
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-6 py-2 bg-white text-slate-900 text-[10px] font-black rounded-full hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-2xl"
                        >
                            {isDownloading ? <div className="animate-spin h-3 w-3 border-2 border-slate-900 border-t-transparent rounded-full"></div> : <DownloadIcon className="w-4 h-4" />}
                            SAVE TO PDF
                        </button>
                    )}
                    <button onClick={onComplete} className="p-2 text-slate-500 hover:text-white transition-colors"><CloseIcon className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center bg-slate-100/5">
                {isSynthesizing ? (
                    <div className="h-full w-full flex flex-col bg-[#020617] p-12 font-mono text-[11px] text-slate-400 overflow-hidden relative border-l border-white/5">
                        {/* 工程网格底纹 */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                        
                        <div className="relative z-10 mb-8 flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <CodeIcon className="w-5 h-5 text-indigo-400 animate-pulse" />
                                <span className="font-black tracking-[0.2em] text-white">SYSTEM_COMPILING_LAYOUT_BLUEPRINT</span>
                            </div>
                            <span className="text-[9px] text-indigo-500/50">V_ENGINE 3.2</span>
                        </div>
                        
                        <div className="relative z-10 whitespace-pre-wrap break-all leading-loose opacity-80">
                            {codeStream}
                            <span className="w-2 h-4 bg-indigo-500 animate-pulse inline-block align-middle ml-1"></span>
                        </div>

                        {/* 扫描线动画 */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                            <div className="w-full h-[20%] bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent absolute top-0 animate-blueprint-scan"></div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full bg-[#eef2f6] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-1000">
                         <div className="w-full h-full max-w-5xl bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden border border-slate-200 ring-1 ring-black/5">
                             <iframe 
                                srcDoc={htmlContent || ''}
                                className="w-full h-full border-none"
                                title="Hifi Engineering Report"
                                sandbox="allow-scripts allow-same-origin"
                            />
                         </div>
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes blueprint-scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(500%); }
                }
                .animate-blueprint-scan {
                    animation: blueprint-scan 3s linear infinite;
                }
            `}</style>
        </div>
    );
};
