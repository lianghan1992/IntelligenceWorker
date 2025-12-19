
import React, { useState, useRef } from 'react';
import { DocTag } from '../../../types';
import { uploadDocs } from '../../../api/intelligence';
import { CloseIcon, CloudIcon, CheckIcon } from '../../icons';

interface DocUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tags: DocTag[];
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const DocUploadModal: React.FC<DocUploadModalProps> = ({ isOpen, onClose, onSuccess, tags }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [tagUuid, setTagUuid] = useState('');
    const [publishDate, setPublishDate] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0 || !tagUuid) return;
        setIsUploading(true);
        try {
            await uploadDocs({
                files: selectedFiles,
                point_uuid: tagUuid,
                publish_date: publishDate || undefined
            });
            onSuccess();
        } catch (e: any) {
            alert(`上传失败: ${e.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <CloudIcon className="w-5 h-5 text-indigo-600" /> 上传文档
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-5 h-5"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">选择分类标签 <span className="text-red-500">*</span></label>
                        <select 
                            value={tagUuid} 
                            onChange={e => setTagUuid(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">-- 请选择 --</option>
                            {tags.map(t => <option key={t.uuid} value={t.uuid}>{t.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">发布日期 (可选)</label>
                        <input 
                            type="datetime-local" 
                            value={publishDate} 
                            onChange={e => setPublishDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">若不填，系统将尝试从文件元数据中提取，提取失败则使用当前时间。</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">选择文件 <span className="text-red-500">*</span></label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-center"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                multiple 
                                className="hidden" 
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                            />
                            {selectedFiles.length > 0 ? (
                                <div className="space-y-1">
                                    <div className="p-2 bg-indigo-100 rounded-full w-fit mx-auto mb-2 text-indigo-600"><CheckIcon className="w-5 h-5"/></div>
                                    <p className="text-sm font-bold text-gray-700">已选择 {selectedFiles.length} 个文件</p>
                                    <p className="text-xs text-gray-400 max-w-[200px] truncate mx-auto">{selectedFiles[0].name}...</p>
                                </div>
                            ) : (
                                <div className="space-y-1 text-gray-400">
                                    <CloudIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">点击选择文件</p>
                                    <p className="text-xs">支持 PDF, Word, PPT</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">取消</button>
                    <button 
                        onClick={handleUpload} 
                        disabled={isUploading || !tagUuid || selectedFiles.length === 0}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                        {isUploading ? <Spinner /> : <CloudIcon className="w-4 h-4"/>} 开始上传
                    </button>
                </div>
            </div>
        </div>
    );
};
