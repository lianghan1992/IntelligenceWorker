
import React from 'react';
import { CloseIcon, CloudIcon, RefreshIcon, CheckIcon, ExternalLinkIcon } from '../../icons';

interface ExternalPdfPreviewProps {
    url: string;
    title: string;
    onClose: () => void;
    onImport: () => void;
    integrationStatus?: 'loading' | 'success' | 'error';
}

export const ExternalPdfPreview: React.FC<ExternalPdfPreviewProps> = ({ 
    url, title, onClose, onImport, integrationStatus 
}) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
                    <div className="flex-1 min-w-0 pr-8">
                        <h3 className="text-xl font-black text-slate-800 truncate leading-tight" title={title}>{title}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                             <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-widest">External Content Preview</span>
                             <div className="h-3 w-px bg-slate-200"></div>
                             <a href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-bold">
                                <ExternalLinkIcon className="w-3 h-3" /> 原始链接
                             </a>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onImport}
                            disabled={integrationStatus === 'loading' || integrationStatus === 'success'}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50
                                ${integrationStatus === 'success' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                }
                            `}
                        >
                            {integrationStatus === 'loading' ? (
                                <RefreshIcon className="w-4 h-4 animate-spin" />
                            ) : integrationStatus === 'success' ? (
                                <CheckIcon className="w-4 h-4" />
                            ) : (
                                <CloudIcon className="w-4 h-4" />
                            )}
                            {integrationStatus === 'success' ? '集成成功' : '一键导入分析库'}
                        </button>
                        
                        <div className="h-8 w-px bg-slate-200 mx-2"></div>

                        <button 
                            onClick={onClose} 
                            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all hover:rotate-90"
                        >
                            <CloseIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* Iframe Preview Area */}
                <div className="flex-1 bg-slate-800 relative">
                    <iframe 
                        src={url} 
                        className="w-full h-full border-none bg-white" 
                        title="PDF Viewer"
                        // Note: Some sites might block iframe previews via X-Frame-Options
                    />
                    
                    {/* Floating Helper Tip */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold rounded-full border border-white/10 shadow-2xl pointer-events-none select-none">
                        PRO TIP: 若内容加载失败，请尝试点击上方“原始链接”在新窗口打开
                    </div>
                </div>
                
                {/* Minimal Footer */}
                <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex-shrink-0"></div>
            </div>
        </div>
    );
};
