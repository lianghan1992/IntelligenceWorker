
import React, { useState } from 'react';
import { UploadedDocument } from '../../../types';
import { regenerateDocumentSummary, regenerateDocumentCover } from '../../../api/intelligence';
import { CloseIcon, RefreshIcon, DocumentTextIcon, PhotoIcon, CheckIcon } from '../../icons';

interface DocDetailInfoModalProps {
    isOpen: boolean;
    doc: UploadedDocument;
    onClose: () => void;
    onRefresh: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const DocDetailInfoModal: React.FC<DocDetailInfoModalProps> = ({ isOpen, doc, onClose, onRefresh }) => {
    const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
    const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    if (!isOpen) return null;

    const handleRegenerateSummary = async () => {
        setIsRegeneratingSummary(true);
        setMessage(null);
        try {
            await regenerateDocumentSummary(doc.uuid);
            setMessage({ text: '摘要生成任务已触发，请稍后刷新查看。', type: 'success' });
            setTimeout(onRefresh, 1000); // Trigger a refresh after a delay
        } catch (e: any) {
            setMessage({ text: `生成失败: ${e.message}`, type: 'error' });
        } finally {
            setIsRegeneratingSummary(false);
        }
    };

    const handleRegenerateCover = async () => {
        setIsRegeneratingCover(true);
        setMessage(null);
        try {
            await regenerateDocumentCover(doc.uuid);
            setMessage({ text: '封面生成任务已触发，请稍后刷新查看。', type: 'success' });
            setTimeout(onRefresh, 1000);
        } catch (e: any) {
            setMessage({ text: `生成失败: ${e.message}`, type: 'error' });
        } finally {
            setIsRegeneratingCover(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                            文档详情与操作
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">{doc.original_filename}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Cover Image Section */}
                        <div className="w-full md:w-64 flex-shrink-0">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <PhotoIcon className="w-4 h-4" /> 封面预览
                            </h4>
                            <div className="aspect-[3/4] bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner relative group">
                                {doc.cover_image ? (
                                    <img src={doc.cover_image} alt="Cover" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-slate-300 flex flex-col items-center">
                                        <PhotoIcon className="w-12 h-12 opacity-50 mb-2" />
                                        <span className="text-xs">暂无封面</span>
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <button 
                                        onClick={handleRegenerateCover}
                                        disabled={isRegeneratingCover}
                                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                    >
                                        {isRegeneratingCover ? <Spinner /> : <RefreshIcon className="w-4 h-4" />}
                                        重新生成
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                    来源: CogView-3
                                </span>
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <DocumentTextIcon className="w-4 h-4" /> 智能摘要
                                </h4>
                                <button 
                                    onClick={handleRegenerateSummary}
                                    disabled={isRegeneratingSummary}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                    {isRegeneratingSummary ? <RefreshIcon className="w-3 h-3 animate-spin"/> : <RefreshIcon className="w-3 h-3"/>}
                                    重新生成摘要
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-inner overflow-y-auto custom-scrollbar min-h-[300px]">
                                {doc.summary ? (
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                                        {doc.summary}
                                    </p>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <DocumentTextIcon className="w-8 h-8 opacity-20 mb-2" />
                                        <p className="text-xs">暂无摘要信息</p>
                                        <p className="text-[10px] mt-1 text-slate-300">点击右上方重新生成</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Status Message */}
                {message && (
                    <div className={`px-6 py-3 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2 ${message.type === 'success' ? 'bg-green-50 text-green-600 border-t border-green-100' : 'bg-red-50 text-red-600 border-t border-red-100'}`}>
                        {message.type === 'success' ? <CheckIcon className="w-4 h-4" /> : <CloseIcon className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
};
