
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

const TechLoader: React.FC = () => (
    <div className="flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide animate-pulse">LOADING DOCUMENT...</p>
    </div>
);

export const DeepDiveReader: React.FC<DeepDiveReaderProps> = ({ task, onClose }) => {
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
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

    useEffect(() => {
        if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }

        const loadContent = async () => {
            setIsLoadingContent(true);
            try {
                // Determine whether to show Bundle or Original
                // Usually we want to show original for preview if possible, 
                // but bundle if processed. Let's stick to original for preview consistency.
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
        <div className={`fixed inset-0 z-[100] flex flex-col transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm" onClick={onClose}></div>

            {/* Header (Floating) */}
            <div className={`absolute top-0 left-0 right-0 z-50 p-4 flex justify-center transition-transform duration-500 ${isMounted ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 shadow-xl rounded-full px-6 py-3 flex items-center justify-between w-full max-w-4xl gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                            <DocumentTextIcon className="w-4 h-4" />
                        </div>
                        <span className="text-white font-bold text-sm truncate">{task.file_name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Desktop Download Button in Header */}
                        <button 
                            onClick={handleDownload}
                            className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-white text-indigo-900 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                        >
                            {isDownloading ? <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span> : <DownloadIcon className="w-4 h-4" />}
                            下载
                        </button>
                        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative z-40 flex items-center justify-center p-4 pt-24 pb-8 h-full">
                
                {/* 1. Mobile View (No Iframe, Card Only) */}
                <div className="md:hidden w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                        <DocumentTextIcon className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{task.file_name}</h3>
                    <div className="text-xs text-slate-400 mb-6 bg-slate-50 px-3 py-1 rounded-full">PDF 文档</div>
                    
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        移动端暂不支持在线预览此 PDF。<br/>请点击下方按钮下载后查看。
                    </p>
                    
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isDownloading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <DownloadIcon className="w-5 h-5" />
                        )}
                        <span>{isDownloading ? '正在下载...' : '下载文件'}</span>
                    </button>
                </div>

                {/* 2. Desktop View (Iframe) */}
                <div className="hidden md:block w-full h-full max-w-6xl bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-white/10 relative">
                    {isLoadingContent ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <TechLoader />
                        </div>
                    ) : pdfBlobUrl ? (
                        <iframe 
                            src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full border-none bg-white"
                            title="PDF Viewer"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            <CloudIcon className="w-16 h-16 mb-4 opacity-50" />
                            <p>无法加载预览，请尝试下载</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
