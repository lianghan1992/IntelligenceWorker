
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DeepInsightTask, DeepInsightPage } from '../../types';
import { 
    downloadDeepInsightOriginalPdf, 
    fetchDeepInsightPageImage
} from '../../api/deepInsight';
import { 
    CloseIcon, DownloadIcon, DocumentTextIcon, PlusIcon, TagIcon
} from '../icons';

interface DeepDiveReaderProps {
    task: DeepInsightTask;
    onClose: () => void;
}

// Helper for formatting bytes
const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Single Page Image Component with Lazy Loading
const PageImage: React.FC<{ docId: string; pageIndex: number; scale: number }> = ({ docId, pageIndex, scale }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '800px' }); // Preload aggressively

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        
        let active = true;
        setLoading(true);
        
        // Fetch the image securely using Blob
        fetchDeepInsightPageImage(docId, pageIndex)
            .then(url => {
                if (active) {
                    if (url) {
                        setImageUrl(url);
                        setError(false);
                    } else {
                        setError(true);
                    }
                }
            })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; if (imageUrl) URL.revokeObjectURL(imageUrl); };
    }, [docId, pageIndex, isVisible]);

    return (
        <div 
            ref={ref} 
            className="bg-white relative shadow-lg transition-transform origin-top mx-auto mb-6"
            style={{ 
                width: `${100 * scale}%`, 
                aspectRatio: '1/1.414', // A4 Aspect Ratio approx
                maxWidth: '900px',
                minHeight: '400px'
            }}
        >
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-400">正在加载第 {pageIndex} 页...</span>
                </div>
            ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-400 text-xs flex-col gap-2">
                    <span className="text-2xl">⚠️</span>
                    页面加载失败
                </div>
            ) : imageUrl ? (
                <img src={imageUrl} alt={`Page ${pageIndex}`} className="w-full h-full object-contain block" loading="lazy" />
            ) : null}
            
            {/* Page Number Footer */}
            <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-slate-400">
                - {pageIndex} -
            </div>
        </div>
    );
};

export const DeepDiveReader: React.FC<DeepDiveReaderProps> = ({ task, onClose }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [scale, setScale] = useState(1.0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Generate page numbers based on total_pages count
    const pageIndices = useMemo(() => {
        const count = task.total_pages || 0;
        return Array.from({ length: count }, (_, i) => i + 1);
    }, [task.total_pages]);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const blob = await downloadDeepInsightOriginalPdf(task.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.file_name}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('下载失败，请稍后重试');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#f6f7f8] text-slate-900 font-sans animate-in fade-in duration-200 pt-16 sm:pt-[72px]">
            
            {/* Reader Toolbar */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 bg-white px-4 md:px-6 py-3 shadow-sm h-14 flex-shrink-0 z-10">
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <div className="flex items-center gap-2 text-slate-900">
                        <div className="flex items-center justify-center size-8 bg-indigo-50 rounded-lg text-indigo-600">
                            <TagIcon className="w-4 h-4" />
                        </div>
                        <h2 className="text-sm md:text-base font-bold leading-tight tracking-tight truncate max-w-[120px] md:max-w-xs">
                            {task.category_name || '文档详情'}
                        </h2>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                        <span className="text-slate-300">|</span>
                        <span className="font-medium text-slate-700 truncate max-w-md" title={task.file_name}>
                            {task.file_name}
                        </span>
                    </div>
                </div>

                <div className="flex flex-1 justify-end gap-3 md:gap-6 items-center">
                     {/* Scale Controls */}
                    <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button 
                            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                            className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
                        >
                            <span className="text-lg font-bold select-none leading-none px-1">-</span>
                        </button>
                        <span className="text-xs font-semibold w-12 text-center text-slate-700">
                            {Math.round(scale * 100)}%
                        </span>
                        <button 
                            onClick={() => setScale(s => Math.min(1.5, s + 0.1))}
                            className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
                        >
                             <PlusIcon className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 mr-2">
                            <span>共 {task.total_pages} 页</span>
                        </div>
                        <div className="hidden md:block h-4 w-px bg-slate-300 mx-1"></div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Layout */}
            <main className="flex-1 w-full max-w-[1920px] mx-auto overflow-hidden relative">
                <div className="flex h-full flex-col lg:flex-row">
                    
                    {/* Left Column: Page Viewer */}
                    <div className="flex-1 h-full bg-slate-100/50 lg:border-r border-slate-200 overflow-hidden relative">
                        <div 
                            ref={scrollContainerRef}
                            className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 scroll-smooth"
                        >
                            {pageIndices.length > 0 ? (
                                <div className="flex flex-col items-center min-h-full pb-20">
                                    {pageIndices.map(index => (
                                        <PageImage key={index} docId={task.id} pageIndex={index} scale={scale} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                    <DocumentTextIcon className="w-16 h-16 opacity-20" />
                                    <p>该文档暂无预览页面或正在处理中 (Pages: {task.total_pages})</p>
                                    <button onClick={handleDownload} className="text-blue-600 hover:underline text-sm">下载原文件查看</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col gap-6 p-6 overflow-y-auto bg-white border-t lg:border-t-0 z-10">
                        
                        <div className="flex flex-col gap-4">
                            <h1 className="text-xl font-bold text-slate-900 leading-tight break-words">
                                {task.file_name}
                            </h1>
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                    {task.file_type}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                    {formatFileSize(task.file_size)}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 px-4 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-70"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>下载完整 PDF</span>
                        </button>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="font-bold text-slate-700 mb-2 text-sm">AI 摘要</h3>
                            {task.summary ? (
                                <div className="text-xs text-slate-600 leading-relaxed space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {task.summary}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">暂无摘要信息</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
