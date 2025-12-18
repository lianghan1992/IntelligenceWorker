
import React, { useState, useEffect } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { ReasoningModal } from '../../../shared/ReasoningModal';
import { CheckIcon, DownloadIcon, ChevronLeftIcon, BrainIcon } from '../../../../icons';

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
            // 使用全新的会话调用渲染指令
            await streamGenerate(
                { 
                    prompt_name: '04_Markdown2Html', 
                    variables: { markdown_report: markdown }, 
                    scenario, 
                    session_id: undefined // 关键：独立会话
                },
                (chunk) => {
                    buffer += chunk;
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    if (jsonPart && jsonPart.length > 50) {
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
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('PDF 生成失败');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#eef2f6]">
            <ReasoningModal 
                isOpen={isRendering && !htmlContent} 
                onClose={() => {}} 
                content={thought} 
                status="AI 设计师正在进行视觉重构..." 
            />

            <div className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                        <CheckIcon className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-slate-800">报告预览与交付</h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={!htmlContent || isDownloading}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isDownloading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <DownloadIcon className="w-4 h-4" />}
                        导出 PDF
                    </button>
                    <button onClick={onComplete} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
                        完成并返回
                    </button>
                </div>
            </div>

            <div className="flex-1 p-6 md:p-12 overflow-hidden flex justify-center">
                <div className="w-full max-w-[1100px] h-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 relative">
                    {htmlContent ? (
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none"
                            title="Final Report Preview"
                            sandbox="allow-scripts"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-300">
                            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                            <p className="font-bold text-slate-400">正在生成杂志级 HTML 布局...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
