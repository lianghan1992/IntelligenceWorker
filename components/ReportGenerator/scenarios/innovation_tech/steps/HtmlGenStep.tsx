
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { streamGenerate, parseLlmJson, generatePdf } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { 
    DownloadIcon, RefreshIcon, CodeIcon, EyeIcon, 
    CheckCircleIcon, ShieldExclamationIcon, CheckIcon, CloseIcon,
    LightningBoltIcon, SparklesIcon
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

// 全屏预览模态框 - 升级版
const ZoomModal: React.FC<{ html: string; onClose: () => void }> = ({ html, onClose }) => {
    // ESC 键退出支持
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300" onClick={onClose}>
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 z-[110] p-4 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full transition-all backdrop-blur-md group"
                title="关闭预览 (ESC)"
            >
                <CloseIcon className="w-8 h-8 transition-transform group-hover:rotate-90" />
            </button>
            <div 
                className="relative w-[95vw] h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-white/10" 
                onClick={e => e.stopPropagation()}
            >
                 <iframe 
                    srcDoc={html} 
                    className="w-full h-full border-none bg-white"
                    title="Full Preview"
                    sandbox="allow-scripts"
                 />
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
    
    // 生成控制
    const generationRef = useRef(false);

    // 核心生成逻辑
    const startGeneration = useCallback(() => {
        if (generationRef.current) return;
        generationRef.current = true;
        
        setStatus('generating');
        setHtmlContent('');
        setRawLog('');
        
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
                } else {
                    setStatus('failed');
                }
                generationRef.current = false;
            },
            (err) => {
                console.error(err);
                setStatus('failed');
                generationRef.current = false;
            }
        );
    }, [markdown, scenario, taskId]);

    // 初始加载
    useEffect(() => {
        startGeneration();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    const handleRegenerate = () => {
        generationRef.current = false; // Reset lock
        startGeneration();
    };

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
        <div className="flex flex-col h-[650px] bg-[#f8fafc] relative overflow-hidden rounded-b-2xl">
            {/* Toolbar */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center z-20 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status === 'success' ? 'bg-green-100 text-green-600' : status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {status === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : status === 'failed' ? <ShieldExclamationIcon className="w-5 h-5"/> : <RefreshIcon className="w-5 h-5 animate-spin"/>}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">
                            {status === 'generating' ? '正在渲染可视化报告...' : status === 'success' ? '报告渲染完成' : '生成异常'}
                        </div>
                        {status === 'generating' && <div className="text-[10px] text-slate-400">AI 正在构建 16:9 布局...</div>}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCode(!showCode)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="查看源码">
                        {showCode ? <EyeIcon className="w-5 h-5"/> : <CodeIcon className="w-5 h-5"/>}
                    </button>
                    
                    {/* 重做按钮：现在是真正的重新生成 */}
                    <button 
                        onClick={handleRegenerate} 
                        disabled={status === 'generating'}
                        className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <LightningBoltIcon className="w-4 h-4" />
                        重新生成
                    </button>

                    {status === 'success' && (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isDownloading ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <DownloadIcon className="w-4 h-4"/>}
                                导出PDF
                            </button>
                            <button 
                                onClick={onComplete}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-all active:scale-95"
                            >
                                <CheckIcon className="w-4 h-4"/>
                                完成任务
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center p-6 bg-slate-100/50">
                {showCode ? (
                    <div className="w-full max-w-5xl h-full bg-[#1e1e1e] rounded-xl shadow-inner p-6 overflow-auto custom-scrollbar-dark font-mono text-xs text-green-400 border border-slate-700">
                        <pre className="whitespace-pre-wrap break-all">{rawLog}</pre>
                    </div>
                ) : (
                    <div 
                        className={`w-full max-w-[1200px] aspect-video bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 relative group transition-all ${htmlContent ? 'cursor-zoom-in hover:shadow-indigo-500/10 hover:border-indigo-300' : ''}`}
                        onDoubleClick={() => htmlContent && setIsZoomed(true)}
                        onClick={() => htmlContent && setIsZoomed(true)}
                    >
                        {htmlContent ? (
                            <>
                                <div className="w-full h-full pointer-events-none select-none">
                                    <iframe 
                                        srcDoc={htmlContent}
                                        className="w-full h-full border-none"
                                        title="Preview"
                                        sandbox="allow-scripts"
                                    />
                                </div>
                                
                                {/* Hint Overlay */}
                                <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <div className="bg-white/90 backdrop-blur text-slate-800 px-5 py-2.5 rounded-full text-sm font-bold shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2 ring-1 ring-slate-200">
                                        <EyeIcon className="w-4 h-4 text-indigo-600" />
                                        点击全屏预览
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white text-slate-400 gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <SparklesIcon className="w-6 h-6 text-indigo-500 animate-pulse" />
                                    </div>
                                </div>
                                <p className="font-bold tracking-widest text-xs uppercase text-slate-500">正在构建 16:9 演示布局...</p>
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
