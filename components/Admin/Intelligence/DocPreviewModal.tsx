
import React, { useState, useEffect } from 'react';
import { UploadedDocument } from '../../../types';
import { getDocPreview } from '../../../api/intelligence';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon } from '../../icons';

interface DocPreviewModalProps {
    isOpen: boolean;
    doc: UploadedDocument;
    onClose: () => void;
}

const Spinner: React.FC = () => (
    <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

export const DocPreviewModal: React.FC<DocPreviewModalProps> = ({ isOpen, doc, onClose }) => {
    const [page, setPage] = useState(1);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        
        let active = true;
        setIsLoading(true);
        setError('');
        
        const loadPage = async () => {
            try {
                const blob = await getDocPreview(doc.uuid, page);
                const url = URL.createObjectURL(blob);
                if (active) {
                    if (imageUrl) URL.revokeObjectURL(imageUrl); // clean previous
                    setImageUrl(url);
                }
            } catch (e) {
                if (active) setError('无法加载预览页，可能是文件格式不支持或页码超出范围。');
            } finally {
                if (active) setIsLoading(false);
            }
        };

        loadPage();

        return () => {
            active = false;
        };
    }, [page, doc.uuid, isOpen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [imageUrl]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><EyeIcon className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-base font-bold text-gray-800 truncate max-w-md">{doc.original_filename}</h3>
                            <p className="text-xs text-gray-500">{doc.point_name} • {doc.page_count} Pages</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><CloseIcon className="w-6 h-6"/></button>
                </div>

                {/* Viewer Area */}
                <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center relative p-4 custom-scrollbar">
                    {isLoading ? (
                        <Spinner />
                    ) : error ? (
                        <div className="text-center text-gray-400 p-8 border-2 border-dashed border-gray-300 rounded-xl">
                            <p>{error}</p>
                        </div>
                    ) : imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={`Page ${page}`} 
                            className="max-h-full max-w-full shadow-lg object-contain bg-white"
                        />
                    ) : null}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center z-10">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    
                    <span className="font-mono text-sm font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded border border-gray-200">
                        {page} / {doc.page_count > 0 ? doc.page_count : '?'}
                    </span>
                    
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        disabled={doc.page_count > 0 && page >= doc.page_count}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
