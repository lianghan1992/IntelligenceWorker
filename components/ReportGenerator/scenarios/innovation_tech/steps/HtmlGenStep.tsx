
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    DownloadIcon, RefreshIcon, CodeIcon, EyeIcon, 
    CheckCircleIcon, ShieldExclamationIcon, CheckIcon, CloseIcon
} from '../../../../icons';

// 鲁棒的 HTML 提取（复用自 TechEval）
const robustExtractHtml = (fullText: string, jsonPart: string): string | null => {
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html_report: string }>(jsonPart);
            if (parsed && parsed.html_report) return parsed.html_report;
        } catch (e) { }
    }
    // 尝试正则
    const htmlTagMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
    if (htmlTagMatch) return htmlTagMatch[0];
    return null;
};

// 全屏预览模态框
const ZoomModal: React.FC<{ html: string; onClose: () => void }> = ({ html, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300" onClick={onClose}>
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90 backdrop-blur-sm"
                title="关闭预览"
            >
                <CloseIcon className="w-8 h-8" />
            </button>
            <div 
                className="w-full h-full p-4 md:p-10 flex items-center justify-center" 
                onClick={e => e.stopPropagation()}
            >
                <div className="w-full max-w-[95vw] aspect-video bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-700/50">
                     <iframe 
                        srcDoc={html} 
                        className="w-full h-full border-none"
                        title="Full Preview"
                        sandbox="allow-scripts"
                     />
                </div>
            </div>
        </div>
    );
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
    const [isZoomed, setIsZoomed] = useState(false);
    
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
                session_id: undefined // Explicitly start new session for clean HTML generation context
            },
            (chunk) => {
                buffer += chunk;
                setRawLog(buffer);
                // 实时尝试提取预览
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
                    // 修复：移除自动调用 onComplete，防止预览界面被跳过
                    // onComplete(); 
                } else {
                    setStatus('failed');
                }
            },
            (err) => {
                console.error(err);
                setStatus('failed');
            }
        );
    }, [markdown, scenario, taskId]); // Removed onComplete from dependency

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
        <div className="flex h-full bg-[#eef2f6] flex-col overflow-hidden relative">
            {/* Toolbar */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status === 'success' ? 'bg-green-100 text-green-600' : status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {status === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : status === 'failed' ? <ShieldExclamationIcon className="w-5 h-5"/> : <RefreshIcon className="w-5 h-5 animate-spin"/>}
                    </div>
                    <span className="font-bold text-slate-700">
                        {status === 'generating' ? '正在渲染可视化报告...' : status === 'success' ? '报告已就绪' : '生成异常'}
                    </span>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={() => setShowCode(!showCode)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="查看源码">
                        {showCode ? <EyeIcon className="w-5 h-5"/> : <CodeIcon className="w-5 h-5"/>}
                    </button>
                    {status === 'success' && (
                        <>
                            <button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isDownloading ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <DownloadIcon className="w-4 h-4"/>}
                                下载 PDF
                            </button>
                            {/* 新增：手动完成按钮 */}
                            <button 
                                onClick={onComplete}
                                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-all active:scale-95"
                            >
                                <CheckIcon className="w-4 h-4"/>
                                完成
                            </button>
                        </>
                    )}
                    {/* 只有在非生成状态或失败状态才显示新任务，避免误触 */}
                    {status !== 'generating' && (
                        <button onClick={onRestart} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
                            重做
                        </button>
                    )}
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 md:p-10">
                {showCode ? (
                    <div className="w-full max-w-5xl h-full bg-[#1e1e1e] rounded-xl shadow-2xl p-6 overflow-auto custom-scrollbar-dark font-mono text-xs text-green-400">
                        <pre className="whitespace-pre-wrap break-all">{rawLog}</pre>
                    </div>
                ) : (
                    <div 
                        className={`w-full max-w-[1280px] aspect-video bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 relative group transition-all ${htmlContent ? 'cursor-pointer hover:shadow-indigo-500/20 hover:border-indigo-300' : ''}`}
                        onDoubleClick={() => htmlContent && setIsZoomed(true)}
                    >
                        {htmlContent ? (
                            <>
                                {/* Pointer events none allows click to pass through to the div for double click handling, 
                                    but prevents interaction with iframe content in preview mode which is desired for a thumbnail/preview */}
                                <div className="w-full h-full pointer-events-none select-none">
                                    <iframe 
                                        srcDoc={htmlContent}
                                        className="w-full h-full border-none"
                                        title="Preview"
                                        sandbox="allow-scripts"
                                    />
                                </div>
                                
                                {/* Hint Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur text-slate-800 px-4 py-2 rounded-full text-sm font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
                                        <EyeIcon className="w-4 h-4 text-indigo-600" />
                                        双击全屏预览
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
                                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                                <p className="font-bold tracking-widest text-sm">RENDERING 16:9 SLIDE...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Fullscreen Zoom Modal */}
            {isZoomed && htmlContent && (
                <ZoomModal html={htmlContent} onClose={() => setIsZoomed(false)} />
            )}
        </div>
    );
};
