

import React, { useState, useEffect, useRef } from 'react';
import { DeepInsightTask } from '../../types';
import { downloadDeepInsightOriginalPdf, getDeepInsightPagePreviewUrl } from '../../api/deepInsight';
import { 
    CloseIcon, DownloadIcon, DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon,
    RefreshIcon
} from '../icons';

interface DeepDiveReaderProps {
    task: DeepInsightTask;
    onClose: () => void;
}

// Single Page Image Component with Lazy Loading behavior
const PageImage: React.FC<{ docId: string; pageNum: number }> = ({ docId, pageNum }) => {
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
        }, { rootMargin: '200px' }); // Preload when close

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        
        let active = true;
        setLoading(true);
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
        <div ref={ref} className="w-full mb-4 bg-white shadow-sm relative min-h-[500px] flex items-center justify-center border border-slate-100 rounded-lg overflow-hidden">
            {loading ? (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-xs">Loading Page {pageNum}...</span>
                </div>
            ) : error ? (
                <div className="text-xs text-red-400">Page {pageNum} failed to load</div>
            ) : imageUrl ? (
                <img src={imageUrl} alt={`Page ${pageNum}`} className="w-full h-auto object-contain block" loading="lazy" />
            ) : null}
            
            {/* Page Number Overlay */}
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                {pageNum}
            </div>
        </div>
    );
};

export const DeepDiveReader: React.FC<DeepDiveReaderProps> = ({ task, onClose }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            setIsMounted(false);
            document.body.style.overflow = '';
        };
    }, []);

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

    const pages = Array.from({ length: task.total_pages }, (_, i) => i + 1);

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm" onClick={onClose}></div>

            {/* Header (Floating) */}
            <div className={`absolute top-0 left-0 right-0 z-50 p-4 flex justify-center transition-transform duration-500 ${isMounted ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 shadow-xl rounded-full px-4 md:px-6 py-3 flex items-center justify-between w-full max-w-4xl gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                            <DocumentTextIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-white font-bold text-sm truncate">{task.file_name}</span>
                            <span className="text-white/50 text-xs truncate">{task.total_pages} Pages • {task.file_size ? `${(task.file_size / 1024 / 1024).toFixed(1)} MB` : ''}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button 
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-1.5 bg-white text-indigo-900 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                        >
                            {isDownloading ? <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span> : <DownloadIcon className="w-4 h-4" />}
                            <span className="hidden md:inline">下载 PDF</span>
                        </button>
                        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area - Image Based Reader */}
            <div className="flex-1 relative z-40 flex items-start justify-center pt-24 pb-0 h-full overflow-y-auto custom-scrollbar-dark" onClick={(e) => e.stopPropagation()}>
                <div className="w-full max-w-3xl px-4 md:px-0 pb-10">
                    {pages.length > 0 ? (
                        pages.map(page => (
                            <PageImage key={page} docId={task.id} pageNum={page} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 py-20 bg-white/5 rounded-xl border border-white/10">
                            <DocumentTextIcon className="w-16 h-16 opacity-20 mb-4" />
                            <p>该文档暂无预览页面</p>
                            <button onClick={handleDownload} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm underline">
                                尝试下载原文件
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
            `}</style>
        </div>
    );
};
