
import React, { useState, useEffect, useRef } from 'react';
import { streamGenerate, parseLlmJson, generatePdf, getScenarios, getScenarioFiles } from '../../../../../api/stratify';
import { extractThoughtAndJson } from '../../../utils';
import { DownloadIcon, CloseIcon, CodeIcon, EyeIcon, ArrowRightIcon, LightningBoltIcon, RefreshIcon, ShieldExclamationIcon } from '../../../../icons';

// 增强后的 HTML 提取逻辑
const robustExtractHtml = (fullText: string, jsonPart: string): string | null => {
    // 1. 尝试从 JSON 对象中解析 (标准路径)
    if (jsonPart) {
        try {
            const parsed = parseLlmJson<{ html_report: string }>(jsonPart);
            if (parsed && parsed.html_report) return parsed.html_report;
        } catch (e) { /* continue */ }
    }

    // 2. 尝试正则提取 JSON 字段 (应对 JSON 截断或格式微瑕疵)
    const keyMatch = fullText.match(/"html_report"\s*:\s*"(?<content>(?:[^"\\]|\\.)*)/s);
    if (keyMatch && keyMatch.groups?.content) {
        try {
             return JSON.parse(`"${keyMatch.groups.content}"`);
        } catch(e) {
             return keyMatch.groups.content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
        }
    }

    // 3. 尝试提取 Markdown 代码块 (模型有时会忽略 JSON 约束直接输出代码)
    const codeBlockMatch = fullText.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) return codeBlockMatch[1];

    // 4. 尝试提取纯 HTML 标签 (最坏情况兜底)
    const htmlTagMatch = fullText.match(/<(!DOCTYPE\s+)?html[\s\S]*<\/html>/i);
    if (htmlTagMatch) return htmlTagMatch[0];

    return null;
};

const formatModelName = (model: string) => {
    if (!model) return 'Auto';
    let name = model.includes('@') ? model.split('@')[1] : model;
    if (name.includes('/')) {
        name = name.split('/')[1];
    }
    name = name.replace(':free', '').replace(':beta', '');
    return name;
};

export const FinalRenderer: React.FC<{
    taskId: string;
    scenario: string;
    markdown: string;
    isReady: boolean;
    onComplete: () => void;
    onBack: () => void; 
}> = ({ taskId, scenario, markdown, isReady, onComplete, onBack }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [rawStream, setRawStream] = useState<string>('');
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentModel, setCurrentModel] = useState<string>('Loading...');
    const [renderModel, setRenderModel] = useState<string>('');
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRawDebug, setShowRawDebug] = useState(false);
    
    const codeScrollRef = useRef<HTMLDivElement>(null);
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (isSynthesizing && codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [htmlContent, rawStream, isSynthesizing]);

    // Fetch scenario info
    useEffect(() => {
        const fetchModelInfo = async () => {
            try {
                const scenarios = await getScenarios();
                const current = scenarios.find(s => s.id === scenario || s.name === scenario);
                if (current) {
                    const defModel = current.default_model || 'System Default';
                    const files = await getScenarioFiles(current.id);
                    const renderPromptFile = files.find(f => f.name.includes('04_Markdown2Html'));
                    const specificModel = renderPromptFile?.model || defModel;
                    setRenderModel(specificModel);
                    setCurrentModel(specificModel);
                } else {
                    setCurrentModel('Unknown');
                }
            } catch (err) {
                console.warn("Failed to fetch scenario details", err);
                setCurrentModel("Unknown");
            } finally {
                setIsModelLoaded(true);
            }
        };
        fetchModelInfo();
    }, [scenario]);

    // Trigger synthesis
    useEffect(() => {
        if (isReady && isModelLoaded && !htmlContent && !isSynthesizing && !hasStartedRef.current) {
            synthesize();
        }
    }, [isReady, isModelLoaded]);

    const synthesize = async () => {
        hasStartedRef.current = true;
        setIsSynthesizing(true);
        setHtmlContent(''); 
        setRawStream('');
        setError(null);
        let buffer = '';
        
        try {
            await streamGenerate(
                { 
                    prompt_name: '04_Markdown2Html', 
                    variables: { markdown_report: markdown }, 
                    scenario, 
                    session_id: undefined, 
                    model_override: renderModel || undefined
                },
                (chunk) => { 
                    buffer += chunk; 
                    setRawStream(buffer);
                    
                    // 实时尝试提取 (如果模型是流式输出 JSON)
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    const extracted = robustExtractHtml(buffer, jsonPart);
                    if (extracted) {
                        setHtmlContent(extracted);
                    }
                },
                () => {
                    // 完成时的最终提取尝试
                    const { jsonPart } = extractThoughtAndJson(buffer);
                    const finalHtml = robustExtractHtml(buffer, jsonPart);
                    
                    if (finalHtml) {
                        setHtmlContent(finalHtml);
                    } else {
                        // 如果最后还是空的，说明提取失败
                        setError("生成完成，但未能识别有效的 HTML 结构。请点击右下角查看原始输出。");
                    }
                    setIsSynthesizing(false);
                },
                (err) => {
                    setError(`生成中断: ${err.message || '未知错误'}`);
                    setIsSynthesizing(false);
                }
            );
        } catch (e: any) {
            setError(`调用失败: ${e.message}`);
            setIsSynthesizing(false);
        }
    };

    const handleRetry = () => {
        hasStartedRef.current = false;
        synthesize();
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
        <div className="h-full flex flex-col bg-[#0f172a] overflow-hidden relative">
            {/* Header */}
            <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between z-30 bg-[#0f172a]/90 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                         ← Back to Edit
                    </button>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Synthesis Engine</span>
                        <span className="text-[9px] text-indigo-400 font-mono mt-0.5 flex items-center gap-1">
                            <LightningBoltIcon className="w-2.5 h-2.5" />
                            {formatModelName(currentModel)}
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {!isSynthesizing && (htmlContent.length > 0 || error) && (
                         <button 
                            onClick={handleRetry}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title="Retry"
                        >
                            <RefreshIcon className="w-4 h-4" />
                        </button>
                    )}
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
                    <button onClick={onComplete} className="text-slate-500 hover:text-white p-1 transition-colors" title="Close">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#0f172a] flex flex-col overflow-hidden">
                {isSynthesizing ? (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div ref={codeScrollRef} className="flex-1 overflow-auto p-8 font-mono text-[11px] leading-relaxed custom-scrollbar-dark selection:bg-cyan-500/30">
                            <div className="flex items-center gap-2 mb-6 opacity-50">
                                <CodeIcon className="w-4 h-4 text-cyan-400" />
                                <span className="text-white text-[10px] font-black tracking-widest uppercase">Generating HTML Structure...</span>
                            </div>
                            <pre className="text-cyan-400/90 whitespace-pre-wrap break-all">
                                {htmlContent || rawStream || '> Initializing secure link to synthesis core...'}
                                <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
                            </pre>
                        </div>
                    </div>
                ) : htmlContent.length > 0 && !showRawDebug ? (
                    <div className="flex-1 w-full h-full relative overflow-hidden animate-in fade-in duration-1000">
                        <iframe 
                            srcDoc={htmlContent}
                            className="w-full h-full border-none bg-white"
                            title="Final HTML Synthesis"
                            sandbox="allow-scripts allow-same-origin"
                        />
                        <div className="absolute bottom-6 right-6 pointer-events-none flex gap-2">
                             {/* Debug Toggle */}
                             <button 
                                onClick={() => setShowRawDebug(true)}
                                className="pointer-events-auto flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                <CodeIcon className="w-3 h-3" /> Raw Code
                            </button>
                            <div className="flex items-center gap-2 bg-black/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-white shadow-2xl">
                                <EyeIcon className="w-3.5 h-3.5 text-green-400" />
                                Preview Mode Active
                            </div>
                        </div>
                    </div>
                ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 p-10">
                        {error ? (
                            <div className="max-w-xl w-full bg-red-900/20 border border-red-500/30 rounded-2xl p-8 backdrop-blur-sm">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                    <ShieldExclamationIcon className="w-8 h-8 text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-red-200 mb-2">生成异常</h3>
                                <p className="text-sm text-red-300/80 mb-6">{error}</p>
                                <div className="flex justify-center gap-3">
                                    <button onClick={handleRetry} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors">
                                        重试
                                    </button>
                                    <button onClick={() => setShowRawDebug(true)} className="px-6 py-2 bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-300 rounded-lg text-xs font-bold transition-colors">
                                        查看原始输出
                                    </button>
                                </div>
                            </div>
                        ) : showRawDebug ? (
                             <div className="flex-1 w-full h-full flex flex-col min-h-0 relative">
                                <div className="absolute top-4 right-4 z-10">
                                    <button onClick={() => setShowRawDebug(false)} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded border border-white/20">
                                        Close Raw View
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-8 font-mono text-[11px] leading-relaxed custom-scrollbar-dark bg-[#0a0f1c] text-slate-300 w-full text-left">
                                    <div className="mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Raw LLM Output Stream</div>
                                    <pre className="whitespace-pre-wrap break-all">{rawStream}</pre>
                                </div>
                             </div>
                        ) : (
                            // Loading or Waiting State
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                </div>
                            </div>
                        )}
                        {!error && !showRawDebug && <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Initializing Environment...</p>}
                    </div>
                )}
            </div>
        </div>
    );
};
