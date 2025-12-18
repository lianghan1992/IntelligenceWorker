
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { DownloadIcon, SparklesIcon, CloseIcon } from '../../../../icons';

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

/**
 * 强力流式 HTML 提取器：
 * 不依赖完整的 JSON 闭合，只要识别到 "html_report" 键值对开始，就开始提取字符串内容
 */
const extractStreamingHtml = (text: string): string => {
    // 1. 查找 "html_report"
    const key = '"html_report"';
    const keyIndex = text.indexOf(key);
    if (keyIndex === -1) return '';

    // 2. 查找键之后的第一个引号（值的起始）
    const afterKey = text.slice(keyIndex + key.length);
    const startQuoteIndex = afterKey.indexOf('"');
    if (startQuoteIndex === -1) return '';

    // 3. 截取从第一个引号之后的所有内容
    const rawContent = afterKey.slice(startQuoteIndex + 1);
    
    // 4. 处理 JSON 转义字符，并移除可能导致解析失败的结尾转义斜杠
    return rawContent
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\$/, ''); 
};

export const FinalRenderer: React.FC<{
    taskId: string;
    scenario: string;
    markdown: string;
    isReady: boolean;
    onComplete: () => void;
}> = ({ taskId, scenario, markdown, isReady, onComplete }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (isReady && !htmlContent && !isSynthesizing) {
            synthesize();
        }
    }, [isReady]);

    const synthesize = async () => {
        setIsSynthesizing(true);
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
                // 实时提取
                const extracted = extractStreamingHtml(buffer);
                if (extracted) {
                    setHtmlContent(extracted);
                }
            },
            () => {
                // 最终清洗
                const { jsonPart } = extractThoughtAndJson(buffer);
                const parsed = parseLlmJson<any>(jsonPart);
                if (parsed && parsed.html_report) {
                    setHtmlContent(parsed.html_report);
                }
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
        <div className="h-full flex flex-col bg-[#020617] overflow-hidden relative">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between z-30 bg-[#020617]/90 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Synthesis Engine</span>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSynthesizing ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_#6366f1]' : 'bg-slate-700'}`}></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {isSynthesizing ? 'Outputting...' : 'Live Preview'}
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {htmlContent.length > 20 && (
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-black transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-indigo-900/40"
                        >
                            {isDownloading ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                            EXPORT PDF
                        </button>
                    )}
                    <button onClick={onComplete} className="text-slate-500 hover:text-white p-1 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#0f172a] flex flex-col overflow-hidden">
                {/* 只要有内容，就立即显示 iframe (阈值设为 1) */}
                {htmlContent.length > 0 ? (
                    <div className="flex-1 w-full h-full relative overflow-hidden">
                        <iframe 
                            ref={iframeRef}
                            srcDoc={htmlContent}
                            className="w-full h-full border-none bg-white"
                            title="Live HTML Synthesis"
                        />
                        
                        {/* 扫描动画层 */}
                        {isSynthesizing && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="w-full h-24 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent absolute top-0 animate-[scan_3s_linear_infinite]"></div>
                                <div className="absolute bottom-6 right-8 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[10px] font-mono text-indigo-400 flex items-center gap-3 shadow-2xl">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                    STREAMING RENDERING...
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className={`w-24 h-24 rounded-full border-2 border-dashed border-indigo-500/20 ${isSynthesizing ? 'animate-spin' : ''}`}></div>
                            <SparklesIcon className="w-10 h-10 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Synthesis Lab</p>
                            <p className="text-[9px] font-mono text-indigo-400/30 uppercase tracking-widest animate-pulse">
                                {isSynthesizing ? 'Igniting Engine...' : 'Waiting for Data Particles...'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(1000%); }
                }
            `}</style>
        </div>
    );
};
