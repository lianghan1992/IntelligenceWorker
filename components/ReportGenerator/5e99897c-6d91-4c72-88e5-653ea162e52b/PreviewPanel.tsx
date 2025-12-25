
import React, { useEffect, useRef, useState } from 'react';
import { WorkStage } from './types';
import { DocumentTextIcon, ViewGridIcon, DownloadIcon } from '../../icons';
import { generatePdf } from '../../../api/stratify'; 

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
                const containerHeight = containerRef.current.offsetHeight;
                const targetWidth = 1600; // Fixed canvas width
                const targetHeight = 900;
                const padding = 60;
                
                // Calculate scale
                const scaleW = (containerWidth - padding) / targetWidth;
                const scaleH = (containerHeight - padding) / targetHeight;
                const newScale = Math.min(Math.min(scaleW, scaleH), 1);
                
                setScale(newScale);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
        
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
        <div className="h-full bg-[#1e1e1e] flex flex-col overflow-hidden relative font-sans" ref={containerRef}>
            {/* Toolbar */}
            <div className="absolute top-4 right-6 z-20 flex gap-3">
                {stage === 'visual' && htmlCode && (
                     <button 
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-black/20 flex items-center gap-2 transition-all active:scale-95 border border-white/10"
                    >
                        {isDownloading ? '生成中...' : <><DownloadIcon className="w-3.5 h-3.5" /> 导出 PDF</>}
                    </button>
                )}
                <div className="bg-white/10 backdrop-blur-md border border-white/10 text-white/80 px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2">
                    {stage === 'analysis' ? <DocumentTextIcon className="w-3.5 h-3.5" /> : <ViewGridIcon className="w-3.5 h-3.5" />}
                    {stage === 'analysis' ? '分析报告 (Markdown)' : '视觉看板 (HTML Canvas)'}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-dark flex flex-col items-center py-10 relative">
                
                {stage === 'analysis' ? (
                    <div className="w-full max-w-[900px] bg-white min-h-[1100px] h-fit p-12 md:p-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] my-4 rounded-sm animate-in zoom-in-95 duration-500 relative overflow-hidden">
                         {/* Paper Texture Overlay */}
                         <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                         
                         {markdownContent ? (
                            <article 
                                className="prose prose-slate max-w-none 
                                    prose-headings:font-bold prose-headings:text-slate-900 
                                    prose-h1:text-4xl prose-h1:mb-10 prose-h1:pb-6 prose-h1:border-b-2 prose-h1:border-slate-900
                                    prose-h2:text-2xl prose-h2:text-slate-800 prose-h2:mt-10 prose-h2:mb-5 prose-h2:flex prose-h2:items-center
                                    prose-h3:text-lg prose-h3:text-indigo-700 prose-h3:mt-6 prose-h3:mb-3
                                    prose-p:text-slate-800 prose-p:leading-8 prose-p:text-justify
                                    prose-strong:text-slate-900 prose-strong:font-bold
                                    prose-li:text-slate-700
                                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:not-italic prose-blockquote:rounded-r-lg prose-blockquote:text-indigo-900 prose-blockquote:font-medium
                                    prose-pre:bg-slate-100 prose-pre:text-slate-800 prose-pre:border prose-pre:border-slate-200"
                                dangerouslySetInnerHTML={{ 
                                    __html: window.marked ? window.marked.parse(markdownContent) : markdownContent 
                                }} 
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[600px] text-slate-300">
                                <DocumentTextIcon className="w-20 h-20 mb-6 opacity-20" />
                                <p className="font-medium text-lg">等待生成分析内容...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-8 overflow-hidden">
                         {htmlCode ? (
                            <div 
                                className="origin-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] rounded-none bg-white ring-8 ring-white/5 transition-all duration-500 ease-out relative"
                                style={{
                                    width: '1600px',
                                    height: '900px',
                                    transform: `scale(${scale})`,
                                    flexShrink: 0
                                }}
                            >
                                <iframe 
                                    srcDoc={htmlCode}
                                    className="w-full h-full border-none pointer-events-none select-none"
                                    title="Visual Dashboard"
                                />
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-white/30">
                                <ViewGridIcon className="w-24 h-24 mb-6 opacity-20 animate-pulse" />
                                <p className="font-medium text-xl">正在构建视觉看板...</p>
                                <p className="text-sm mt-3 opacity-60">AI 正在编写代码并渲染高保真布局</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: #2a2a2a; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background-color: #4a4a4a; border-radius: 5px; border: 2px solid #2a2a2a; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background-color: #5a5a5a; }
            `}</style>
        </div>
    );
};
