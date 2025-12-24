
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    DownloadIcon, RefreshIcon, CodeIcon, EyeIcon, 
    CheckCircleIcon, ShieldExclamationIcon, CheckIcon
} from '../../../../icons';

// 鲁棒的 HTML 提取（复用自 TechEval）
const robustExtractHtml = (fullText: string, jsonPart: string): string | null => {
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html_report: string }>(jsonPart);
            if (parsed && parsed.html_report) return parsed.html_report;
        } catch (e) { }
    }
    const htmlTagMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
    if (htmlTagMatch) return htmlTagMatch[0];
    return null;
};

export const HtmlGenStep: React.FC<{
    taskId: string;
    markdown: string;
    scenario: string;
    onRestart: () => void;
    onComplete: () => void;
}> = ({ taskId, markdown, scenario, onRestart, onComplete }) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [rawLog, setRawLog] = useState('');
    const [status, setStatus] = useState<'generating' | 'success' | 'failed'>('generating');
    const [isDownloading, setIsDownloading] = useState(false);
    const [showCode, setShowCode] = useState(false);
    
    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        
        let buffer = '';
        streamGenerate(
            {
                prompt_name: '新技术四象限html生成',
                variables: { markdown_content: markdown },
                scenario,
                task_id: taskId,
                phase_name: '新技术四象限html生成',
                session_id: undefined 
            },
            (chunk) => {
                buffer += chunk;
                setRawLog(buffer);
                const { jsonPart } = extractThoughtAndJson(buffer);
                const extracted = robustExtractHtml(buffer, jsonPart);
                if (extracted) setHtmlContent(extracted);
            },
            () => {
                const { jsonPart } = extractThoughtAndJson(buffer);
                const finalHtml = robustExtractHtml(buffer, jsonPart);
                if (finalHtml) {
                    setHtmlContent(finalHtml);
                    setStatus('success');
                } else {
                    setStatus('failed');
                }
            },
            (err) => { console.error(err); setStatus('failed'); }
        );
    }, [markdown, scenario, taskId]);

    const handleDownload = async () => {
        if (!htmlContent) return;
        setIsDownloading(true);
        try {
            const blob = await generatePdf(htmlContent, `INNO_TECH_${taskId.slice(0,6)}.pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `创新技术分析报告.pdf`;
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
        <div className="flex flex-col h-[650px] bg-slate-100">
            {/* Toolbar - integrated into card header style */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${status === 'success' ? 'bg-green-100 text-green-600' : status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {status === 'success' ? <CheckCircleIcon className="w-4 h-4"/> : status === 'failed' ? <ShieldExclamationIcon className="w-4 h-4"/> : <RefreshIcon className="w-4 h-4 animate-spin"/>}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">
                        {status === 'generating' ? '正在渲染可视化报告...' : status === 'success' ? '报告已就绪' : '生成异常'}
                    </span>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => setShowCode(!showCode)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="查看源码">
                        {showCode ? <EyeIcon className="w-4 h-4"/> : <CodeIcon className="w-4 h-4"/>}
                    </button>
                    {status === 'success' && (
                        <>
                            <button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isDownloading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5"/>}
                                下载 PDF
                            </button>
                            <button 
                                onClick={onComplete}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold shadow hover:bg-green-700 transition-all active:scale-95"
                            >
                                <CheckIcon className="w-3.5 h-3.5"/>
                                完成
                            </button>
                        </>
                    )}
                    {status !== 'generating' && (
                        <button onClick={onRestart} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                            重做
                        </button>
                    )}
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center p-6 bg-slate-200/50">
                {showCode ? (
                    <div className="w-full h-full bg-[#1e1e1e] rounded-xl shadow-inner p-4 overflow-auto custom-scrollbar-dark font-mono text-[10px] text-green-400 border border-slate-700">
                        <pre className="whitespace-pre-wrap break-all">{rawLog}</pre>
                    </div>
                ) : (
                    <div className="w-full max-w-[1000px] aspect-video bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 relative group">
                        {htmlContent ? (
                            <iframe 
                                srcDoc={htmlContent}
                                className="w-full h-full border-none"
                                title="Preview"
                                sandbox="allow-scripts"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-3">
                                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                                <p className="font-bold tracking-widest text-xs uppercase">Rendering 16:9 Slide...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
