
import React, { useState, useEffect } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { CheckIcon, DownloadIcon, SparklesIcon, BrainIcon } from '../../../../icons';

// 场景指定使用的模型引擎
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
            setThought('正在启动高保真排版引擎，注入杂志级样式表...\n');
            
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
                    
                    // 增量解析尝试：不需要等待结束
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    if (jsonPart) {
                        // 1. 尝试直接解析 JSON
                        try {
                            const parsed = parseLlmJson<any>(jsonPart);
                            if (parsed && parsed.html_report) {
                                setHtmlContent(parsed.html_report);
                                return;
                            }
                        } catch (e) { /* partial json, ignore */ }

                        // 2. 兜底：如果 JSON 还没闭合，但已经能看到 HTML 的特征，尝试手动截取
                        const htmlStart = jsonPart.indexOf('<div');
                        if (htmlStart !== -1) {
                            // 简单的流式预览处理：提取当前已有的所有内容作为预览
                            // 注意：由于 HTML 标签可能不完整，预览可能存在偏差，但在最终完成后会修正
                            let partialHtml = jsonPart.substring(htmlStart);
                            // 简单清理结尾可能的引号或不完整 JSON
                            partialHtml = partialHtml.replace(/",?\s*$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
                            if (partialHtml.length > 500) { // 积累足够多再展示，避免过于频繁闪烁
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
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            {/* 顶栏 */}
            <div className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <CheckIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-800 text-lg">高保真报告预览</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Fidelity Rendering Engine v1.1</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={!htmlContent || isDownloading}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isDownloading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <DownloadIcon className="w-4 h-4" />}
                        下载 PDF
                    </button>
                    <button onClick={onComplete} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
                        关闭
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-8 flex gap-6 overflow-hidden">
                {/* 左：渲染日志 (可收起) */}
                <div className="w-72 bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col shadow-2xl hidden lg:flex">
                    <div className="flex items-center gap-2 mb-4 text-indigo-400">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Layout Engine Log</span>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-500 custom-scrollbar-dark leading-relaxed">
                        {thought || "Waking up Visual Agent..."}
                        {isRendering && <span className="inline-block w-1 h-3 bg-indigo-500 animate-pulse ml-1"></span>}
                    </div>
                </div>

                {/* 右：预览 */}
                <div className="flex-1 bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200 relative">
                    {htmlContent ? (
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none"
                            title="Report Preview"
                            sandbox="allow-scripts"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-slate-300">
                            <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                            <div className="text-center">
                                <p className="font-black text-slate-400 text-xl tracking-tight uppercase">Initializing High Fidelity Layout...</p>
                                <p className="text-sm font-medium text-slate-300 mt-2">正在将 Markdown 转换为杂志级排版，请稍候</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
