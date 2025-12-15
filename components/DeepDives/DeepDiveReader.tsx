
import React, { useState, useEffect } from 'react';
import { DeepInsightTask, DeepInsightPage } from '../../types';
import { getDeepInsightTaskPages, getDeepInsightPageHtml, downloadDeepInsightBundle, downloadDeepInsightOriginalPdf } from '../../api/deepInsight';
import { 
    CloseIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, 
    DocumentTextIcon, ViewGridIcon, SparklesIcon
} from '../icons';

interface DeepDiveReaderProps {
    task: DeepInsightTask;
    onClose: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const DeepDiveReader: React.FC<DeepDiveReaderProps> = ({ task, onClose }) => {
    const [pages, setPages] = useState<DeepInsightPage[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [pageContent, setPageContent] = useState<string | null>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [isLoadingPages, setIsLoadingPages] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Mode: 'html' (Smart Reconstruct) or 'pdf' (Original Full PDF)
    // Force 'pdf' mode if task is not completed
    const [viewMode, setViewMode] = useState<'html' | 'pdf'>(task.status === 'completed' ? 'html' : 'pdf');

    const isProcessing = task.status !== 'completed';

    // Load pages list (only useful for HTML/Smart mode navigation)
    useEffect(() => {
        if (viewMode === 'pdf') return; // PDF mode doesn't strictly need page list from API if showing full PDF

        const fetchPages = async () => {
            setIsLoadingPages(true);
            try {
                // Fetch all pages
                const response = await getDeepInsightTaskPages(task.id, 1, 200);
                setPages(response.items || []);
            } catch (error) {
                console.error("Failed to load pages", error);
            } finally {
                setIsLoadingPages(false);
            }
        };
        fetchPages();
    }, [task.id, viewMode]);

    // Load Content
    useEffect(() => {
        // Cleanup previous blob
        if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }
        setPageContent(null);

        const loadContent = async () => {
            setIsLoadingContent(true);
            try {
                if (viewMode === 'html') {
                    // HTML Mode: Load specific page content
                    if (pages.length === 0) return;
                    const targetPage = pages[currentPageIndex];
                    if (!targetPage) return;

                    const html = await getDeepInsightPageHtml(task.id, targetPage.page_index);
                    const styledHtml = `
                        <style>
                            body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; background-color: #ffffff; }
                            body > * { max-width: 100%; max-height: 100%; overflow: auto; }
                            img { max-width: 100%; max-height: 100%; object-fit: contain; }
                            ::-webkit-scrollbar { width: 6px; height: 6px; }
                            ::-webkit-scrollbar-track { background: transparent; }
                            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                        </style>
                        ${html}
                    `;
                    setPageContent(styledHtml);
                } else {
                    // PDF Mode: Load FULL Original PDF
                    const blob = await downloadDeepInsightOriginalPdf(task.id);
                    const url = URL.createObjectURL(blob);
                    setPdfBlobUrl(url);
                }
            } catch (error) {
                console.error("Failed to load content", error);
            } finally {
                setIsLoadingContent(false);
            }
        };

        loadContent();
        
        // Cleanup function
        return () => {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task.id, viewMode, currentPageIndex]); 
    // Note: currentPageIndex is only a dependency for 'html' mode. 
    // For 'pdf', we load the full file once.

    // Keyboard navigation (Only for HTML mode)
    useEffect(() => {
        if (viewMode === 'pdf') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPageIndex, pages.length, viewMode]);

    const handleNext = () => {
        if (currentPageIndex < pages.length - 1) {
            setCurrentPageIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(prev => prev - 1);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            // Prefer Bundle if completed, otherwise Original
            const blob = task.status === 'completed' 
                ? await downloadDeepInsightBundle(task.id)
                : await downloadDeepInsightOriginalPdf(task.id);
                
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.file_name}${task.status === 'completed' ? '_full_report.pdf' : '.pdf'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('下载失败，请稍后重试');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0 shadow-md z-20">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300 hover:text-white flex-shrink-0">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-lg font-bold leading-tight truncate max-w-md md:max-w-xl">{task.file_name}</h2>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                            {isProcessing && <span className="text-yellow-400 flex items-center gap-1">⚡ AI 处理中 - 仅提供原始预览</span>}
                            {viewMode === 'html' && pages.length > 0 && ` • 第 ${currentPageIndex + 1} / ${pages.length} 页`}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 flex-shrink-0">
                    {/* View Mode Toggle - Only if completed */}
                    {!isProcessing && (
                        <div className="bg-slate-700/50 rounded-lg p-1 flex border border-slate-600">
                            <button 
                                onClick={() => setViewMode('html')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'html' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                智能重构
                            </button>
                            <button 
                                onClick={() => setViewMode('pdf')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'pdf' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                原始文件
                            </button>
                        </div>
                    )}

                    <div className="h-6 w-px bg-slate-700"></div>

                    {viewMode === 'html' && (
                        <button 
                            onClick={() => setShowSidebar(!showSidebar)} 
                            className={`p-2 rounded-lg transition-colors hidden md:block ${showSidebar ? 'bg-slate-700 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                            title="切换目录侧边栏"
                        >
                            <ViewGridIcon className="w-5 h-5" />
                        </button>
                    )}
                    
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isDownloading ? (
                            <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <DownloadIcon className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">下载</span>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 bg-slate-900 relative flex flex-col">
                    {/* Viewer */}
                    <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 bg-[#0f172a] overflow-hidden">
                        {isLoadingContent ? (
                            <div className="flex flex-col items-center gap-4">
                                <Spinner />
                                <p className="text-slate-400 text-sm animate-pulse">
                                    {viewMode === 'html' ? 'AI 正在渲染页面...' : '正在加载原始 PDF...'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'html' && pageContent && (
                                    <iframe 
                                        srcDoc={pageContent}
                                        className="w-full h-full max-w-5xl bg-white shadow-2xl rounded-sm border border-slate-700"
                                        title={`Page ${currentPageIndex + 1}`}
                                        sandbox="allow-scripts allow-same-origin"
                                    />
                                )}
                                {viewMode === 'pdf' && pdfBlobUrl && (
                                    <iframe 
                                        src={pdfBlobUrl}
                                        className="w-full h-full max-w-6xl bg-white shadow-2xl rounded-sm border border-slate-700"
                                        title="Original PDF"
                                    />
                                )}
                                {!pageContent && !pdfBlobUrl && (
                                    <div className="text-center text-slate-500">
                                        <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p>无法加载内容</p>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {/* Navigation Arrows (HTML Mode Only) */}
                        {viewMode === 'html' && (
                            <>
                                <button 
                                    onClick={handlePrev}
                                    disabled={currentPageIndex === 0}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-indigo-600 text-white backdrop-blur-sm transition-all disabled:opacity-0 disabled:pointer-events-none z-30"
                                >
                                    <ChevronLeftIcon className="w-6 h-6" />
                                </button>
                                <button 
                                    onClick={handleNext}
                                    disabled={currentPageIndex === pages.length - 1}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-indigo-600 text-white backdrop-blur-sm transition-all disabled:opacity-0 disabled:pointer-events-none z-30"
                                >
                                    <ChevronRightIcon className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Sidebar (Thumbnails) - HTML Mode Only */}
                {viewMode === 'html' && (
                    <div className={`
                        bg-slate-800 border-l border-slate-700 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col
                        ${showSidebar ? 'w-64 translate-x-0' : 'w-0 translate-x-full opacity-0 overflow-hidden'}
                    `}>
                        <div className="p-4 border-b border-slate-700 font-semibold text-sm text-slate-300">
                            页面概览
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {isLoadingPages ? (
                                <div className="text-center py-8 text-slate-500 text-sm">加载目录...</div>
                            ) : (
                                pages.map((page, index) => (
                                    <button
                                        key={page.id}
                                        onClick={() => setCurrentPageIndex(index)}
                                        className={`w-full text-left group flex flex-col gap-2 p-2 rounded-xl transition-all ${
                                            index === currentPageIndex 
                                                ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-800' 
                                                : 'hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className={`aspect-video w-full rounded-lg bg-white/10 flex items-center justify-center border ${index === currentPageIndex ? 'border-transparent' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                            <span className={`text-xs font-mono ${index === currentPageIndex ? 'text-indigo-200' : 'text-slate-500'}`}>Page {page.page_index}</span>
                                        </div>
                                        <span className={`text-xs font-medium text-center ${index === currentPageIndex ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                            第 {page.page_index} 页
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
