
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { DownloadIcon, CloseIcon, CodeIcon, EyeIcon } from '../../../../icons';

const TARGET_MODEL = "openrouter@mistralai/devstral-2512:free";

/**
 * 严格提取 HTML 字符串流
 */
const extractStreamingHtml = (text: string): string => {
    // 尝试定位 JSON 中的 html_report 字段
    const keyMatch = text.match(/"html_report"\s*:\s*"/);
    if (!keyMatch || keyMatch.index === undefined) return '';

    // 获取值开始的位置
    const startIndex = keyMatch.index + keyMatch[0].length;
    let rawContent = text.slice(startIndex);
    
    // 如果末尾包含了 JSON 的结束引号和括号，尝试去除（简单的流式处理）
    // 注意：这只是为了视觉展示，最终解析依赖 parseLlmJson
    const endMatch = rawContent.match(/"\s*}\s*$/);
    if (endMatch) {
        rawContent = rawContent.slice(0, endMatch.index);
    }
    
    // 清理转义字符以便在终端中展示
    return rawContent
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\$/, ''); // 移除末尾可能的挂起转义符
};

export const FinalRenderer: React.FC<{
    taskId: string;
    scenario: string;
    markdown: string;
    isReady: boolean;
    onComplete: () => void;
}> = ({ taskId, scenario, markdown, isReady, onComplete }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [rawStream, setRawStream] = useState<string>(''); // 新增：原始流数据，用于兜底显示
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const codeScrollRef = useRef<HTMLDivElement>(null);

    // 终端模式下自动滚动到底部
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
                setRawStream(buffer); // 实时更新原始流，确保界面有动静

                // 尝试提取清洗后的 HTML 用于更好看的展示
                const extracted = extractStreamingHtml(buffer);
                if (extracted) {
                    setHtmlContent(extracted);
                }
            },
            () => {
                // 生成完全结束后，进行最终解析
                const { jsonPart } = extractThoughtAndJson(buffer);
                const parsed = parseLlmJson<any>(jsonPart);
                
                if (parsed && parsed.html_report) {
                    setHtmlContent(parsed.html_report);
                }
                
                // 关键点：只有在这里才关闭 Synthesizing 状态
                // 状态切换后，iframe 才会挂载，此时接收到的是完整的 HTML，CSS 样式会瞬间正确加载
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
                            {isSynthesizing ? 'Outputting Source...' : 'Render Complete'}
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
                    /* 阶段一：深色终端代码流模式 */
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div ref={codeScrollRef} className="flex-1 overflow-auto p-8 font-mono text-[11px] leading-relaxed custom-scrollbar-dark selection:bg-cyan-500/30">
                            <div className="flex items-center gap-2 mb-6 opacity-30">
                                <CodeIcon className="w-4 h-4 text-cyan-400" />
                                <span className="text-white text-[10px] font-black tracking-widest uppercase">Streaming HTML Buffer</span>
                            </div>
                            {/* 优先显示提取出的 HTML，如果没有提取到（如还在输出 JSON 头部），则显示原始流，保证不卡顿 */}
                            <pre className="text-cyan-400/90 whitespace-pre-wrap break-all">
                                {htmlContent || rawStream || '> Initializing secure link to synthesis core...'}
                                <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
                            </pre>
                        </div>
                        <div className="h-6 bg-[#020617] border-t border-white/5 flex items-center px-4 justify-between text-[9px] text-slate-600 font-mono">
                            <span>TYPE: HTML_REPORT / STREAM_V2</span>
                            <span>UTF-8</span>
                        </div>
                    </div>
                ) : htmlContent.length > 0 ? (
                    /* 阶段二：代码接收完毕后的预览渲染 */
                    <div className="flex-1 w-full h-full relative overflow-hidden animate-in fade-in duration-1000">
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none bg-white"
                            title="Final HTML Synthesis"
                            sandbox="allow-scripts allow-same-origin"
                        />
                        {/* 渲染完成提示浮层 */}
                        <div className="absolute top-4 right-4 pointer-events-none">
                            <div className="flex items-center gap-2 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black text-white uppercase tracking-widest shadow-2xl opacity-0 animate-in fade-in delay-1000 fill-mode-forwards">
                                <EyeIcon className="w-3 h-3 text-green-400" />
                                Interactive View
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 初始等待状态 */
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-500/10 animate-spin"></div>
                            <CodeIcon className="w-10 h-10 text-slate-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                        </div>
                        <div className="space-y-1 opacity-20">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Synthesis Engine</p>
                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                                Awaiting Pipeline Trigger...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
