
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PPTPageData, ChatMessage } from './index';
import { streamChatCompletions, getPromptDetail, generateBatchPdf } from '../../../api/stratify'; 
import { 
    RefreshIcon, DownloadIcon, ChevronRightIcon, 
    ChevronLeftIcon, CheckIcon, CodeIcon, BrainIcon
} from '../../icons';

interface Step4FinalizeProps {
    topic: string;
    pages: PPTPageData[];
    onBackToCompose: () => void;
    onUpdatePages: (newPages: PPTPageData[]) => void;
    onLlmStatusChange?: (isActive: boolean) => void;
    onStreamingUpdate?: (msg: ChatMessage | null) => void;
}

const PROMPT_ID_HTML = "14920b9c-604f-4066-bb80-da7a47b65572";

/**
 * 实时提取流式 HTML 代码块
 */
const extractStreamingHtml = (rawText: string): string => {
    // 移除 markdown 代码块标签
    return rawText
        .replace(/^```html?\s*/i, '')
        .replace(/```$/, '')
        .trim();
};

export const Step4Finalize: React.FC<Step4FinalizeProps> = ({ 
    topic, 
    pages: initialPages, 
    onBackToCompose,
    onUpdatePages,
    onLlmStatusChange,
    onStreamingUpdate
}) => {
    const [pages, setPages] = useState<PPTPageData[]>(initialPages);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [scale, setScale] = useState(1);
    
    // 用于存储正在流式生成的代码片段
    const [partialHtmls, setPartialHtmls] = useState<Record<number, string>>({});
    const codeScrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动代码框
    useEffect(() => {
        if (codeScrollRef.current) {
            codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
        }
    }, [partialHtmls]);

    const generateHtml = useCallback(async (idx: number) => {
        const page = pages[idx];
        if (!page || page.html) return;

        onLlmStatusChange?.(true);
        // 设置当前页面为正在生成
        // NOTE: We don't need to persist 'isGenerating' to parent, transient state is fine here
        setPages(prev => prev.map((p, i) => i === idx ? { ...p, isGenerating: true } : p));

        try {
            const prompt = await getPromptDetail(PROMPT_ID_HTML);
            const userPrompt = `主题: ${topic}\n内容:\n${page.content}`;

            let accumulatedText = '', accumulatedReasoning = '';
            
            await streamChatCompletions({
                model: `${prompt.channel_code}@${prompt.model_id}`,
                messages: [
                    { role: 'system', content: prompt.content },
                    { role: 'user', content: userPrompt }
                ],
                stream: true
            }, (data) => {
                if (data.reasoning) accumulatedReasoning += data.reasoning;
                if (data.content) {
                    accumulatedText += data.content;
                    const codeOnly = extractStreamingHtml(accumulatedText);
                    setPartialHtmls(prev => ({ ...prev, [idx]: codeOnly }));
                }

                // 实时同步到左侧聊天
                onStreamingUpdate?.({
                    role: 'assistant',
                    content: `正在渲染第 ${idx + 1} 页视觉组件...`,
                    reasoning: accumulatedReasoning
                });

            }, () => {
                const finalHtml = extractStreamingHtml(accumulatedText);
                // Update Local State
                const newPages = pages.map((p, i) => i === idx ? { ...p, html: finalHtml, isGenerating: false } : p);
                setPages(newPages);
                // Sync to Parent for Persistence
                onUpdatePages(newPages);
                
                onLlmStatusChange?.(false);
                onStreamingUpdate?.(null);
            }, (err) => {
                // Handle Error
                const newPages = pages.map((p, i) => i === idx ? { ...p, isGenerating: false, html: `<div class="p-10 text-red-500">渲染失败: ${err.message}</div>` } : p);
                setPages(newPages);
                onUpdatePages(newPages); // Save error state too so it doesn't infinite retry on reload
                
                onLlmStatusChange?.(false);
                onStreamingUpdate?.(null);
            });

        } catch (e) {
            const newPages = pages.map((p, i) => i === idx ? { ...p, isGenerating: false } : p);
            setPages(newPages);
            onLlmStatusChange?.(false);
            onStreamingUpdate?.(null);
        }
    }, [pages, topic, onLlmStatusChange, onStreamingUpdate, onUpdatePages]);

    useEffect(() => {
        // --- 核心修复：强制串行执行 ---
        
        // 1. 检查是否已有任何页面正在生成中
        const isBusy = pages.some(p => p.isGenerating);
        
        // 2. 如果正忙，说明前一个任务还未完成，直接返回。
        //    当该任务完成时，setPages 会更新 isGenerating 为 false，从而再次触发此 useEffect
        if (isBusy) return;

        // 3. 只有在完全空闲时，才寻找下一个未完成的页面
        const nextIdx = pages.findIndex(p => !p.html);
        
        if (nextIdx !== -1) {
            // 将视图切换到即将生成的页面，提升体验
            setActiveIdx(nextIdx); 
            generateHtml(nextIdx);
        }
    }, [pages, generateHtml]);

    const handleExportFull = async () => {
        setIsExporting(true);
        try {
            // 构建批量导出参数
            const pdfPages = pages.map((p, idx) => ({
                html: p.html || '',
                filename: `page_${idx + 1}`
            })).filter(item => item.html);

            if (pdfPages.length === 0) throw new Error("没有可导出的已渲染页面");

            const blob = await generateBatchPdf(pdfPages);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${topic}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            alert('导出失败: ' + (e.message || '未知错误'));
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('ppt-canvas-container');
            if (container) {
                const cw = container.offsetWidth;
                const ch = container.offsetHeight;
                const scaleW = (cw - 80) / 1600;
                const scaleH = (ch - 80) / 900;
                setScale(Math.min(Math.min(scaleW, scaleH), 1));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const activePage = pages[activeIdx];
    const allRendered = pages.every(p => p.html && !p.isGenerating);

    return (
        <div className="h-full flex divide-x divide-slate-200 bg-white">
            {/* Left: Thumbs Navigator */}
            <div className="w-1/5 flex flex-col bg-white border-r">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Slide Navigator</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {pages.map((page, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                                group relative aspect-[16/9] w-full rounded-xl border-2 transition-all cursor-pointer overflow-hidden
                                ${activeIdx === idx ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-lg' : 'border-slate-100 hover:border-indigo-300'}
                            `}
                        >
                            {page.html ? (
                                <div className="w-full h-full scale-[0.1] origin-top-left pointer-events-none" style={{ width: '1600px', height: '900px' }}>
                                    <iframe srcDoc={page.html} className="w-full h-full border-none" />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-indigo-400">
                                    <RefreshIcon className={`w-6 h-6 ${page.isGenerating ? 'animate-spin' : ''}`} />
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 flex justify-between">
                                <span>SLIDE {idx + 1}</span>
                                {page.html ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <CodeIcon className={`w-3 h-3 ${page.isGenerating ? 'animate-pulse' : ''}`}/>}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
                    <button 
                        onClick={handleExportFull}
                        disabled={!allRendered || isExporting}
                        className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                        导出高清 PDF 报告
                    </button>
                </div>
            </div>

            {/* Right: High-Fidelity Preview Area */}
            <div className="flex-1 flex flex-col bg-[#111111] overflow-hidden relative">
                <div className="absolute top-6 left-6 z-20 flex gap-4">
                     <button onClick={onBackToCompose} className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-2">
                        <ChevronLeftIcon className="w-4 h-4" /> 返回微调稿件
                    </button>
                </div>
                
                <div id="ppt-canvas-container" className="flex-1 flex items-center justify-center overflow-hidden">
                    {activePage && activePage.html && !activePage.isGenerating ? (
                        <div 
                            className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] origin-center"
                            style={{ 
                                width: '1600px', 
                                height: '900px',
                                transform: `scale(${scale})`,
                                flexShrink: 0
                            }}
                        >
                            <iframe 
                                srcDoc={activePage.html} 
                                className="w-full h-full border-none pointer-events-none select-none"
                                title="Page Preview"
                            />
                        </div>
                    ) : (
                        <div className="w-full max-w-4xl p-6 h-[80%] animate-in fade-in duration-700">
                            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl h-full flex flex-col overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1.5 mr-4">
                                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                                        </div>
                                        <CodeIcon className="w-4 h-4 text-indigo-400" />
                                        <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest">
                                            {activePage?.isGenerating ? 'Streaming Visual Component...' : 'Awaiting Engine...'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-mono text-indigo-500/80 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                                        LIVE CODE RENDERER
                                    </div>
                                </div>
                                <div 
                                    ref={codeScrollRef}
                                    className="flex-1 p-6 overflow-y-auto custom-scrollbar-dark font-mono text-sm leading-relaxed"
                                >
                                    <pre className="text-emerald-400/90 whitespace-pre-wrap break-all">
                                        {partialHtmls[activeIdx] || '<!-- 引擎正在初始化，请关注左侧 AI 助手思考过程 -->'}
                                        {activePage?.isGenerating && <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />}
                                    </pre>
                                </div>
                                <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <BrainIcon className="w-4 h-4 text-indigo-400 animate-pulse" />
                                        <span className="text-[10px] text-white/30 font-bold">神经网络正在生成视觉拓扑...</span>
                                    </div>
                                    <div className="text-[10px] text-white/20 font-mono">
                                        {partialHtmls[activeIdx]?.length || 0} bytes
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Page Controls Overlay */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 px-8 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                    <button 
                        onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
                        disabled={activeIdx === 0}
                        className="p-2 text-white/50 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                         <span className="text-white font-black text-xl tabular-nums">{activeIdx + 1}</span>
                         <div className="w-8 h-[2px] bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(activeIdx + 1) / pages.length * 100}%` }}></div>
                         </div>
                         <span className="text-white/40 font-black text-xl tabular-nums">{pages.length}</span>
                    </div>
                    <button 
                        onClick={() => setActiveIdx(prev => Math.min(pages.length - 1, prev + 1))}
                        disabled={activeIdx === pages.length - 1}
                        className="p-2 text-white/50 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
