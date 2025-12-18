
import React, { useState, useEffect } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';
import { CheckIcon, DownloadIcon, ChevronLeftIcon } from '../../../../icons';

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
            // 使用全新的独立会话调用 04_Markdown2Html
            await streamGenerate(
                { 
                    prompt_name: '04_Markdown2Html', 
                    variables: { markdown_report: markdown }, 
                    scenario, 
                    session_id: undefined, // 独立会话确保排版纯净
                    model_override: TARGET_MODEL // 注入指定模型
                },
                (chunk) => {
                    buffer += chunk;
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    if (jsonPart && jsonPart.length > 100) {
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
                setThought
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
            <ReasoningModal 
                isOpen={isRendering && !htmlContent} 
                onClose={() => {}} 
                content={thought} 
                status="AI 视觉专家正在进行杂志级排版..." 
            />

            <div className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <CheckIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-800 text-lg">评估报告已就绪</h2>
                        <p className="text-xs text-slate-400 font-medium">渲染报告 • 导出 PDF</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={!htmlContent || isDownloading}
                        className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isDownloading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <DownloadIcon className="w-5 h-5" />}
                        导出为 PDF
                    </button>
                    <button onClick={onComplete} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95">
                        完成并关闭
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 md:p-12 overflow-hidden flex justify-center">
                <div className="w-full max-w-[1100px] h-full bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200 relative">
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
                                <p className="font-black text-slate-400 text-xl tracking-tight">正在构建高保真 HTML 布局</p>
                                <p className="text-sm font-medium text-slate-300 mt-1">注入样式、生成动态图表、优化视觉层级...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
