import React, { useRef, useEffect, useState } from 'react';
import { ReportSection, StepId } from './types';
import VisualEditor from '../../../shared/VisualEditor';
import { marked } from 'marked';
import { RefreshIcon, DocumentTextIcon, ChartIcon, CheckCircleIcon, SparklesIcon, ServerIcon, PencilIcon, CloseIcon, PhotoIcon, DownloadIcon } from '../../../icons';
import { toBlob, toPng } from 'html-to-image';

interface ReportCanvasProps {
    sections: Record<StepId, ReportSection>;
    currentStep: StepId;
    techName: string;
    onUpdateSection?: (stepId: StepId, updates: Partial<ReportSection>) => void;
}

const stepsOrder: StepId[] = ['route', 'risk', 'solution', 'compare'];

// --- VisualWidget with Edit Modal ---
const VisualWidget: React.FC<{ 
    html: string; 
    onEdit: (newHtml: string) => void;
    title: string;
}> = ({ html, onEdit, title }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const renderRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    const [isEditing, setIsEditing] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    const containerWidth = entry.contentRect.width;
                    const newScale = Math.min(1, containerWidth / 1600);
                    setScale(newScale);
                }
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const containerHeight = 900 * scale;

    const handleCopyImage = async () => {
        if (!renderRef.current) return;
        setIsCopying(true);
        try {
            const innerDiv = renderRef.current.firstChild as HTMLElement;
            const blob = await toBlob(innerDiv as HTMLElement, { 
                width: 1600, 
                height: 900,
                style: { transform: 'scale(1)', transformOrigin: 'top left' } // Force scale 1 for capture
            });
            
            if (blob) {
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
                alert("图片已复制到剪贴板");
            }
        } catch (e) {
            console.error("Copy failed", e);
            alert("复制图片失败，请重试");
        } finally {
            setIsCopying(false);
        }
    };

    const handleDownloadImage = async () => {
        if (!renderRef.current) return;
        setIsDownloading(true);
        try {
            const innerDiv = renderRef.current.firstChild as HTMLElement;
            const dataUrl = await toPng(innerDiv as HTMLElement, { 
                width: 1600, 
                height: 900,
                style: { transform: 'scale(1)', transformOrigin: 'top left' }
            });
            
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '_')}_visualization.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error("Download failed", e);
            alert("下载图片失败，请重试");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 relative group w-full">
            {/* Header Bar */}
            <div className="h-10 px-4 bg-white border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <ChartIcon className="w-4 h-4 text-indigo-500" />
                    <span>可视化分析图表</span>
                </div>
                <div className="flex items-center gap-2">
                     <button 
                        onClick={handleCopyImage}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="复制图片"
                        disabled={isCopying}
                     >
                        {isCopying ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <PhotoIcon className="w-3.5 h-3.5" />}
                     </button>
                     <button 
                        onClick={handleDownloadImage}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="下载图片"
                        disabled={isDownloading}
                     >
                        {isDownloading ? <RefreshIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5" />}
                     </button>
                     <div className="w-px h-3 bg-slate-200 mx-1"></div>
                     <button 
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="编辑图表 (或双击图表区域)"
                     >
                        <PencilIcon className="w-3.5 h-3.5" />
                     </button>
                </div>
            </div>
            
            {/* Canvas Container */}
            <div 
                ref={containerRef} 
                onDoubleClick={() => setIsEditing(true)}
                style={{ height: containerHeight, transition: 'height 0.2s' }} 
                className="w-full bg-slate-100 relative overflow-hidden cursor-pointer"
                title="双击进入编辑模式"
            >
                 <div ref={renderRef} style={{
                     width: 1600,
                     height: 900,
                     transform: `scale(${scale})`,
                     transformOrigin: 'top left',
                     position: 'absolute',
                     top: 0,
                     left: 0,
                     pointerEvents: 'none' // Prevent interactions with internal iframe while in preview mode to allow double click on container
                 }}>
                     <VisualEditor 
                        initialHtml={html} 
                        onSave={() => {}} 
                        scale={1} 
                        canvasSize={{ width: 1600, height: 900 }}
                        hideToolbar={true} 
                     />
                 </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                    <div className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm flex-shrink-0">
                        <h3 className="font-bold text-slate-800 text-lg">编辑图表: {title}</h3>
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold">取消</button>
                            <button 
                                onClick={() => setIsEditing(false)} 
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm"
                            >
                                完成编辑
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-slate-200">
                         <VisualEditor 
                            initialHtml={html}
                            onSave={onEdit}
                            scale={0.8} // Default decent scale for modal
                            canvasSize={{ width: 1600, height: 900 }}
                         />
                    </div>
                </div>
            )}
        </div>
    );
};

export const ReportCanvas: React.FC<ReportCanvasProps> = ({ sections, currentStep, techName, onUpdateSection }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom when new content arrives
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [sections]);

    // Initialize Math Rendering (KaTeX)
    useEffect(() => {
        // Assume window.renderMathInElement is available from index.html injection
        if ((window as any).renderMathInElement) {
             (window as any).renderMathInElement(document.body, {
                delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$', right: '$', display: false},
                  {left: '\\(', right: '\\)', display: false},
                  {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError : false
            });
        }
    });

    const renderSection = (key: StepId) => {
        const section = sections[key];
        if (section.status === 'pending' && !section.markdown) return null;
        
        const isGenerating = section.status === 'generating';
        const isDone = section.status === 'done' || section.status === 'review';

        return (
            <div key={key} className="mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 relative pl-4 md:pl-0">
                
                {/* 左侧时间轴线条 (Desktop) */}
                <div className="hidden md:block absolute left-[-29px] top-0 bottom-0 w-0.5 bg-slate-200 last:bottom-auto last:h-full"></div>
                <div className={`hidden md:flex absolute left-[-36px] top-0 w-4 h-4 rounded-full border-2 items-center justify-center bg-slate-50 transition-colors z-10 ${isDone ? 'border-indigo-500' : 'border-slate-300'}`}>
                    {isDone && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                </div>

                <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    {/* Section Header */}
                    <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg text-white shadow-sm transition-colors ${isGenerating ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-600'}`}>
                                {key === 'compare' ? <ChartIcon className="w-5 h-5"/> : <DocumentTextIcon className="w-5 h-5"/>}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{section.title}</h2>
                                    {section.usedModel && (
                                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                            <ServerIcon className="w-2.5 h-2.5" />
                                            {section.usedModel}
                                        </span>
                                    )}
                                </div>
                                {isGenerating && <p className="text-xs text-indigo-500 font-medium mt-0.5">AI 正在深度分析中...</p>}
                            </div>
                        </div>
                        {isDone && <CheckCircleIcon className="w-5 h-5 text-green-500 opacity-50" />}
                    </div>

                    <div className="p-6 md:p-8">
                        {/* Markdown Content */}
                        <div className="prose prose-slate prose-sm md:prose-base max-w-none text-slate-600 leading-relaxed math-content">
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(section.markdown) as string }} />
                        </div>

                        {/* HTML Widget (Integrated) */}
                        {section.html && (
                            <VisualWidget 
                                html={section.html} 
                                title={section.title}
                                onEdit={(newHtml) => {
                                    if (onUpdateSection) {
                                        onUpdateSection(key, { html: newHtml });
                                    }
                                }}
                            />
                        )}
                        
                        {/* Generating Placeholder if needed */}
                        {isGenerating && !section.html && !section.markdown && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                <RefreshIcon className="w-6 h-6 animate-spin text-indigo-400"/>
                                <span className="text-sm font-medium">正在生成内容...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc]">
            {/* Canvas Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto relative md:pl-8">
                    {/* Timeline Vertical Line Container */}
                    <div className="hidden md:block absolute left-0 top-0 bottom-0 w-px bg-transparent"></div>

                    {techName ? (
                        <>
                            {stepsOrder.map(step => renderSection(step))}
                            {/* Scroll Anchor */}
                            <div ref={bottomRef} className="h-20"></div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 opacity-60">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                                <SparklesIcon className="w-12 h-12 text-indigo-300"/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700">技术决策评估助手</h3>
                            <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
                                请在右侧对话框输入您想要评估的技术主题，AI 将为您生成深度分析报告。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};