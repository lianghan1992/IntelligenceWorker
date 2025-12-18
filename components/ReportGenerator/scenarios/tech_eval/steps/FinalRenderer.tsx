
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { DownloadIcon, SparklesIcon, CloseIcon, CodeIcon, EyeIcon } from '../../../../icons';

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

/**
 * 实时提取 HTML 字符串流
 */
const extractStreamingHtml = (text: string): string => {
    const key = '"html_report"';
    const keyIndex = text.indexOf(key);
    if (keyIndex === -1) return '';

    const afterKey = text.slice(keyIndex + key.length);
    const startQuoteIndex = afterKey.indexOf('"');
    if (startQuoteIndex === -1) return '';

    const rawContent = afterKey.slice(startQuoteIndex + 1);
    
    // 基础转义处理，保持源码的可读性
    return rawContent
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\$/, ''); // 移除末尾可能的转义符
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
    
    // 自动滚动 Ref
    const codeScrollRef = useRef<HTMLDivElement>(null);

    // 监听内容变化，生成时自动滚动到底部
    useEffect(() => {
        if (isSynthesizing && codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [htmlContent, isSynthesizing]);

    useEffect(() => {
        if (isReady && !htmlContent && !isSynthesizing) {
            synthesize();
        }
    }, [isReady]);

    const synthesize = async () => {
        setIsSynthesizing(true);
        setHtmlContent(''); // 清空历史
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
                // 实时提取源码用于展示
                const extracted = extractStreamingHtml(buffer);
                if (extracted) {
                    setHtmlContent(extracted);
                }
            },
            () => {
                // 生成结束：进行最终的 JSON 解析以确保内容完整无误
                const { jsonPart } = extractThoughtAndJson(buffer);
                const parsed = parseLlmJson<any>(jsonPart);
                
                // 如果解析成功，使用清洗后的完整 HTML；否则使用流式积累的内容
                if (parsed && parsed.html_report) {
                    setHtmlContent(parsed.html_report);
                }
                
                // 关键点：只有在这里才将 isSynthesizing 置为 false
                // 这会触发从“代码视图”到“预览视图”的切换
                // 此时 HTML 结构已完整，iframe 渲染将带上所有 CSS，不会出现样式缺失
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
        <div className="h-full flex flex-col bg-[#020617] overflow-hidden relative border-l border-white/5">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between z-30 bg-[#020617]/90 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Synthesis Engine</span>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSynthesizing ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isSynthesizing ? 'text-cyan-400' : 'text-green-500'}`}>
                            {isSynthesizing ? 'Generating Source Code...' : 'Render Complete'}
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
                    <button onClick={onComplete} className="text-slate-500 hover:text-white p-1 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#020617] flex flex-col overflow-hidden">
                {isSynthesizing ? (
                    /* 阶段一：代码终端模式 (Dark Terminal) */
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#020617] to-transparent z-10 pointer-events-none"></div>
                        
                        <div ref={codeScrollRef} className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed custom-scrollbar-dark selection:bg-cyan-500/30">
                            <div className="flex items-center gap-2 mb-4 opacity-50 sticky top-0">
                                <CodeIcon className="w-4 h-4 text-cyan-400" />
                                <span className="text-white text-[10px] font-black tracking-widest uppercase">Stream Buffer</span>
                            </div>
                            {/* 代码流展示 */}
                            <pre className="text-cyan-400/90 whitespace-pre-wrap break-all">
                                {htmlContent || '> Initializing connection to synthesis core...'}
                                <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
                            </pre>
                        </div>
                        
                        {/* 底部装饰条 */}
                        <div className="h-6 bg-[#020617] border-t border-white/5 flex items-center px-4 justify-between text-[9px] text-slate-600 font-mono select-none">
                            <span>MODE: RAW_STREAM</span>
                            <span>UTF-8</span>
                        </div>
                    </div>
                ) : htmlContent.length > 0 ? (
                    /* 阶段二：完整预览模式 (Full Render) */
                    <div className="flex-1 w-full h-full relative overflow-hidden animate-in fade-in duration-700">
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none bg-white"
                            title="Final HTML Synthesis"
                            sandbox="allow-scripts" 
                        />
                        {/* 浮动标签：提示用户这是渲染后的结果 */}
                        <div className="absolute top-4 right-4 pointer-events-none opacity-0 animate-in fade-in delay-500 fill-mode-forwards duration-1000">
                            <div className="flex items-center gap-2 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black text-white uppercase tracking-widest shadow-2xl">
                                <EyeIcon className="w-3 h-3 text-green-400" />
                                Live Preview
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 初始等待状态 */
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-500/20 animate-spin"></div>
                            <SparklesIcon className="w-10 h-10 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">Synthesis Lab</p>
                            <p className="text-[9px] font-mono text-indigo-400/30 uppercase tracking-widest animate-pulse">
                                Awaiting Agent Final Payload...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
