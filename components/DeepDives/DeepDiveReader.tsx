
import React, { useState, useEffect } from 'react';
import { DeepInsightTask } from '../../types';
import { downloadDeepInsightOriginalPdf, downloadDeepInsightBundle } from '../../api/deepInsight';
import { 
    CloseIcon, DownloadIcon, DocumentTextIcon, CloudIcon
} from '../icons';

interface DeepDiveReaderProps {
    task: DeepInsightTask;
    onClose: () => void;
}

// --- 炫酷的加载动画组件 ---
const TechLoader: React.FC = () => (
    <div className="relative flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
            {/* Outer Ring */}
            <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
            {/* Middle Ring */}
            <div className="absolute inset-2 border-4 border-t-purple-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
            {/* Inner Core */}
            <div className="absolute inset-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full animate-pulse shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-white/80" />
            </div>
        </div>
        <div className="space-y-2 text-center">
            <h3 className="text-white font-bold tracking-widest text-sm uppercase animate-pulse">Loading Document</h3>
            <div className="flex gap-1 justify-center">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-0"></span>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-200"></span>
            </div>
        </div>
    </div>
);

export const DeepDiveReader: React.FC<DeepDiveReaderProps> = ({ task, onClose }) => {
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Trigger entrance animation
    useEffect(() => {
        setIsMounted(true);
        // Disable body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            setIsMounted(false);
            document.body.style.overflow = '';
        };
    }, []);

    // Load PDF Content
    useEffect(() => {
        // Cleanup previous blob
        if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }

        const loadContent = async () => {
            setIsLoadingContent(true);
            try {
                // Always load Original PDF
                const blob = await downloadDeepInsightOriginalPdf(task.id);
                const url = URL.createObjectURL(blob);
                setPdfBlobUrl(url);
            } catch (error) {
                console.error("Failed to load content", error);
            } finally {
                setIsLoadingContent(false);
            }
        };

        loadContent();
        
        return () => {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        };
    }, [task.id]);

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
        <div className={`fixed inset-0 z-[100] flex flex-col overflow-hidden transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* 1. Backdrop with heavy blur */}
            <div 
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl transition-all duration-500"
                onClick={onClose}
            ></div>

            {/* 2. Floating Header (Dynamic Island Style) */}
            <div className={`absolute top-4 left-4 right-4 md:top-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-5xl z-50 transition-all duration-500 delay-100 ${isMounted ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
                <div className="bg-white/10 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl p-2 pl-4 md:pl-6 flex items-center justify-between ring-1 ring-white/5">
                    
                    {/* Title Info */}
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden mr-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
                            <DocumentTextIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-white font-bold text-sm md:text-base truncate leading-tight tracking-tight">
                                {task.file_name}
                            </h2>
                            <p className="text-indigo-200/70 text-[10px] md:text-xs font-medium flex items-center gap-2 truncate">
                                <span>PDF 预览</span>
                                {task.status === 'completed' && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/30"></span>
                                        <span className="text-green-400">已解析</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="group relative overflow-hidden px-3 py-2 md:px-5 md:py-2.5 bg-white text-slate-900 rounded-xl text-xs md:text-sm font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-wait shadow-lg active:scale-95"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {isDownloading ? (
                                    <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <DownloadIcon className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                                )}
                                <span className="hidden sm:inline">下载</span>
                            </span>
                        </button>

                        <div className="w-px h-6 md:h-8 bg-white/10 mx-1"></div>

                        <button 
                            onClick={onClose} 
                            className="p-2 md:p-2.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors group relative"
                            title="关闭"
                        >
                            <CloseIcon className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Main Viewer Area */}
            <div className={`flex-1 relative flex items-center justify-center p-0 md:p-4 md:pt-24 md:pb-8 overflow-hidden transition-all duration-700 delay-200 ${isMounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                {isLoadingContent ? (
                    <TechLoader />
                ) : pdfBlobUrl ? (
                    <div className="relative w-full h-full max-w-6xl md:shadow-2xl md:rounded-lg overflow-hidden md:ring-1 md:ring-white/10 group bg-slate-900">
                        {/* Mobile Tip: If PDF doesn't render */}
                        <div className="md:hidden absolute top-24 left-0 right-0 flex justify-center z-0 pointer-events-none">
                            <div className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md">
                                如果无法预览，请点击右上角下载
                            </div>
                        </div>

                        <iframe 
                            src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full border-none relative z-10"
                            title="Original PDF"
                        />
                    </div>
                ) : (
                    <div className="text-center text-slate-400 bg-white/5 p-8 md:p-12 rounded-3xl border border-white/5 backdrop-blur-md mx-4">
                        <CloudIcon className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 text-slate-600 opacity-50" />
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">无法加载文档</h3>
                        <p className="text-sm md:text-base text-slate-400">预览文件暂时不可用，请尝试直接下载。</p>
                        <button 
                            onClick={handleDownload}
                            className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                        >
                            尝试下载
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
