
import React, { useEffect, useRef, useState } from 'react';
import { WorkStage } from './types';
import { DocumentTextIcon, ViewGridIcon, DownloadIcon } from '../../icons';
import { generatePdf } from '../../../api/stratify'; // Re-use existing PDF gen

interface PreviewPanelProps {
    stage: WorkStage;
    markdownContent: string;
    htmlCode: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ stage, markdownContent, htmlCode }) => {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Auto-scale the HTML canvas to fit the container
    useEffect(() => {
        const handleResize = () => {
            if (stage === 'visual' && containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const targetWidth = 1600; // Fixed canvas width
                const padding = 40;
                
                // Calculate scale
                const newScale = Math.min(1, (containerWidth - padding) / targetWidth);
                setScale(newScale);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
        
        // Polling size changes (for sidebar collapse animations)
        const interval = setInterval(handleResize, 500); 

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, [stage, htmlCode]);

    const handleDownloadPdf = async () => {
        if (!htmlCode) return;
        setIsDownloading(true);
        try {
            const blob = await generatePdf(htmlCode, "insight-report.pdf");
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "insight-report.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            alert('PDF 生成失败');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="h-full bg-slate-100 flex flex-col overflow-hidden relative" ref={containerRef}>
            {/* Toolbar */}
            <div className="absolute top-4 right-6 z-10 flex gap-2">
                {stage === 'visual' && htmlCode && (
                     <button 
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="bg-white/90 backdrop-blur border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-white flex items-center gap-2 transition-all"
                    >
                        {isDownloading ? '生成中...' : <><DownloadIcon className="w-3.5 h-3.5" /> 下载 PDF</>}
                    </button>
                )}
                <div className="bg-white/90 backdrop-blur border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2">
                    {stage === 'analysis' ? <DocumentTextIcon className="w-3.5 h-3.5" /> : <ViewGridIcon className="w-3.5 h-3.5" />}
                    {stage === 'analysis' ? '分析报告预览' : '视觉看板预览'}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto custom-scrollbar flex flex-col items-center">
                
                {stage === 'analysis' ? (
                    <div className="w-full max-w-4xl bg-white min-h-full p-8 md:p-12 shadow-sm my-4 md:my-8 rounded-xl">
                         {markdownContent ? (
                            <article 
                                className="prose prose-slate max-w-none 
                                    prose-headings:font-bold prose-headings:text-slate-900 
                                    prose-h1:text-3xl prose-h1:mb-8 prose-h1:pb-4 prose-h1:border-b prose-h1:border-slate-100
                                    prose-h2:text-xl prose-h2:text-indigo-700 prose-h2:mt-8 prose-h2:mb-4
                                    prose-p:text-slate-600 prose-p:leading-7
                                    prose-strong:text-slate-800
                                    prose-li:text-slate-600
                                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:rounded-r-lg"
                                dangerouslySetInnerHTML={{ 
                                    __html: window.marked ? window.marked.parse(markdownContent) : markdownContent 
                                }} 
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-96 text-slate-300">
                                <DocumentTextIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p>等待分析内容生成...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-8">
                         {htmlCode ? (
                            <div 
                                className="origin-center shadow-2xl rounded-2xl overflow-hidden bg-white ring-1 ring-slate-900/5 transition-all duration-500 ease-out"
                                style={{
                                    width: '1600px',
                                    height: '900px',
                                    transform: `scale(${scale})`,
                                    flexShrink: 0
                                }}
                            >
                                <iframe 
                                    srcDoc={htmlCode}
                                    className="w-full h-full border-none pointer-events-none select-none" // Disable interaction inside iframe for preview
                                    title="Visual Dashboard"
                                />
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-slate-400">
                                <ViewGridIcon className="w-16 h-16 mb-4 opacity-20 animate-pulse" />
                                <p className="font-medium">正在构建视觉看板...</p>
                                <p className="text-xs mt-2">AI 正在编写代码并渲染布局</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
