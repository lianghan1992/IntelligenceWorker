
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
            setThought('正在启动高保真排版引擎，解析合稿内容...\n');
            
            // 重要：04_Markdown2Html 将 Markdown 转换为 HTML
            await streamGenerate(
                { 
                    prompt_name: '04_Markdown2Html', 
                    variables: { markdown_report: markdown }, 
                    scenario, 
                    session_id: undefined, // 开启全新会话
                    model_override: TARGET_MODEL 
                },
                (chunk) => {
                    buffer += chunk;
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    if (jsonPart && jsonPart.length > 200) {
                        const parsed = parseLlmJson<any>(jsonPart);
                        if (parsed && parsed.html_report) {
                            setHtmlContent(parsed.html_report);
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
            const blob = await generatePdf(htmlContent, `技术评估报告_${new Date().toISOString().slice(0,10)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `技术评估报告.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('PDF 生成失败');
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
                        <h2 className="font-black text-slate-800 text-lg">评估报告生成完成</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">High-Fidelity Rendering Mode</p>
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
                        完成并关闭
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 flex gap-6 overflow-hidden">
                {/* 左：排版逻辑流 */}
                <div className="w-80 bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col shadow-2xl">
                    <div className="flex items-center gap-2 mb-4 text-indigo-400">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">UI Layout Engine</span>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-500 custom-scrollbar-dark leading-relaxed">
                        {thought || "Waking up UI Agent..."}
                    </div>
                </div>

                {/* 右：HTML 报告预览 */}
                <div className="flex-1 bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200 relative">
                    {htmlContent ? (
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none"
                            title="Final Report Preview"
                            sandbox="allow-scripts"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-slate-300">
                            <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                            <div className="text-center">
                                <p className="font-black text-slate-400 text-xl tracking-tight uppercase">Rendering Layout...</p>
                                <p className="text-sm font-medium text-slate-300 mt-2">注入样式与可视化组件</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};
