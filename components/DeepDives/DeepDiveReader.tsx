
import React, { useState, useEffect, useRef } from 'react';
import { DeepInsightTask } from '../../types';
import { downloadDeepInsightOriginalPdf, getDeepInsightPagePreviewUrl } from '../../api/deepInsight';
import { 
    CloseIcon, DownloadIcon, DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon,
    RefreshIcon, ViewGridIcon, SearchIcon, SparklesIcon, BrainIcon, ShieldCheckIcon,
    CalendarIcon, CloudIcon, LockClosedIcon, MenuIcon, PlusIcon
} from '../icons';

interface DeepDiveReaderProps {
    task: DeepInsightTask;
    onClose: () => void;
}

// Helper for formatting bytes
const formatFileSize = (bytes?: number) => {
    if (!bytes) return '未知大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Single Page Image Component with Lazy Loading
const PageImage: React.FC<{ docId: string; pageNum: number; scale: number }> = ({ docId, pageNum, scale }) => {
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
        }, { rootMargin: '500px' }); // Preload when 500px away

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        
        let active = true;
        setLoading(true);
        // Using the preview API for page image
        getDeepInsightPagePreviewUrl(docId, pageNum)
            .then(url => {
                if (active) {
                    if (url) setImageUrl(url);
                    else setError(true);
                }
            })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; if (imageUrl) URL.revokeObjectURL(imageUrl); };
    }, [docId, pageNum, isVisible]);

    return (
        <div 
            ref={ref} 
            className="bg-white relative shadow-lg transition-transform origin-top mx-auto mb-6"
            style={{ 
                width: `${100 * scale}%`, 
                aspectRatio: '1/1.414', // A4 Aspect Ratio approx
                maxWidth: '900px'
            }}
        >
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-400">正在加载第 {pageNum} 页...</span>
                </div>
            ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-400 text-xs flex-col gap-2">
                    <span className="text-2xl">⚠️</span>
                    页面加载失败
                </div>
            ) : imageUrl ? (
                <img src={imageUrl} alt={`Page ${pageNum}`} className="w-full h-full object-contain block" loading="lazy" />
            ) : null}
            
            {/* Page Number Footer */}
            <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-slate-400">
                - {pageNum} -
            </div>
        </div>
    );
};

export const DeepDiveReader: React.FC<DeepDiveReaderProps> = ({ task, onClose }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [scale, setScale] = useState(1.0);
    const [currentPage, setCurrentPage] = useState(1);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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

    // Handle scroll to update current page indicator
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const children = container.children[0].children; // The inner div's children (pages)
        
        let bestVisiblePage = 1;
        let maxVisibility = 0;

        // Simple visibility check
        // Ideally we would use IntersectionObserver for this too, but scroll check is fine for the indicator
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        // Approximate logic: Find element closest to center
        // Note: This assumes `PageImage` wraps are direct children or wrapped simply.
    };

    const pages = Array.from({ length: task.total_pages }, (_, i) => i + 1);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#f6f7f8] text-slate-900 font-sans animate-in fade-in duration-200">
            
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 bg-white px-6 py-3 shadow-sm h-16">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 text-slate-900 cursor-pointer" onClick={onClose}>
                        <div className="flex items-center justify-center size-8 bg-blue-600/10 rounded-lg text-blue-600">
                            <ViewGridIcon className="w-5 h-5" />
                        </div>
                        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">智车智库</h2>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                        <span className="text-slate-300">|</span>
                        <span className="font-medium text-slate-700 truncate max-w-md" title={task.file_name}>
                            {task.file_name}
                        </span>
                    </div>
                </div>

                <div className="flex flex-1 justify-end gap-6 items-center">
                     {/* Scale Controls */}
                    <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button 
                            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                            className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
                        >
                            <span className="text-lg font-bold select-none">-</span>
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
                         <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 mr-2">
                             {/* Simple Page Indicator - could be improved with scroll listener */}
                            <span>共 {task.total_pages} 页</span>
                        </div>
                        <div className="h-4 w-px bg-slate-300 mx-1"></div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Layout */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto overflow-hidden relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
                    
                    {/* Left Column: PDF Viewer (Scrollable) */}
                    <div className="lg:col-span-8 xl:col-span-9 h-full bg-slate-100/50 border-r border-slate-200 overflow-hidden relative">
                        <div 
                            ref={scrollContainerRef}
                            className="h-full overflow-y-auto custom-scrollbar p-8 scroll-smooth"
                        >
                            {pages.length > 0 ? (
                                <div className="flex flex-col items-center min-h-full pb-20">
                                    {pages.map(page => (
                                        <PageImage key={page} docId={task.id} pageNum={page} scale={scale} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                    <DocumentTextIcon className="w-16 h-16 opacity-20" />
                                    <p>该文档暂无预览页面</p>
                                    <button onClick={handleDownload} className="text-blue-600 hover:underline text-sm">下载原文件查看</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sidebar (Metadata & Actions) */}
                    <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-6 p-6 overflow-y-auto bg-white">
                        
                        {/* Report Header Info */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                    {task.category_name || '通用'}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                    {task.file_type}
                                </span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">
                                {task.file_name}
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                                <span>智车研究院 · 严选</span>
                            </div>
                        </div>

                        {/* Main Action */}
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 px-4 rounded-lg shadow-sm shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70"
                        >
                            {isDownloading ? <RefreshIcon className="w-5 h-5 animate-spin"/> : <DownloadIcon className="w-5 h-5" />}
                            <span>下载完整报告 (PDF)</span>
                        </button>

                        {/* AI Summary Card */}
                        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-5 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none text-blue-600">
                                <BrainIcon className="w-20 h-20" />
                            </div>
                            <div className="flex items-center gap-2 mb-3 text-blue-800">
                                <SparklesIcon className="w-5 h-5" />
                                <h3 className="font-bold">AI 核心解读</h3>
                            </div>
                            
                            {task.summary ? (
                                <div className="text-sm text-slate-600 leading-relaxed space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {task.summary.split('\n').map((para, i) => (
                                        para.trim() && <p key={i}>{para}</p>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">
                                    暂无摘要，请联系管理员生成。
                                </p>
                            )}
                        </div>

                        {/* Metadata Details */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-semibold text-slate-900 text-sm">文档信息</h3>
                            </div>
                            <div className="px-5 py-2">
                                <div className="grid grid-cols-[30%_1fr] gap-y-4 py-3 items-center text-sm">
                                    <div className="text-slate-500">发布时间</div>
                                    <div className="font-medium text-slate-900">
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </div>
                                    
                                    <div className="text-slate-500">文件大小</div>
                                    <div className="font-medium text-slate-900">
                                        {formatFileSize(task.file_size)}
                                    </div>
                                    
                                    <div className="text-slate-500">页数</div>
                                    <div className="font-medium text-slate-900">
                                        {task.total_pages} 页
                                    </div>
                                    
                                    <div className="text-slate-500">阅读权限</div>
                                    <div className="font-medium text-green-600 flex items-center gap-1">
                                        <LockClosedIcon className="w-3.5 h-3.5" />
                                        免费公开
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};
