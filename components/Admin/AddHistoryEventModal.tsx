import React, { useState, useRef, useMemo } from 'react';
import { CloseIcon, PlusIcon } from '../icons';

interface AddHistoryEventModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AddHistoryEventModal: React.FC<AddHistoryEventModalProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        url: '',
        livestream_name: '',
        entity: '',
        host_name: '',
        start_time: '',
        summary_report: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const isFormValid = useMemo(() => {
        return formData.url.trim() !== '' && formData.livestream_name.trim() !== '' && formData.start_time.trim() !== '' && formData.summary_report.trim() !== '';
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!isFormValid) {
            setError("请填写所有必填项。");
            return;
        }
        setIsLoading(true);
        setError('');
        // FIX: createHistoryLivestreamTask is deprecated and has been removed from the API.
        // This feature is no longer available.
        setTimeout(() => {
            setError('创建历史任务的功能已被移除。');
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">创建历史发布会任务</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg mb-4">
                            <strong>错误:</strong> {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">发布会名称 <span className="text-red-500">*</span></label>
                            <input name="livestream_name" type="text" value={formData.livestream_name} onChange={handleChange} placeholder="例如：2023年度技术大会" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">关联实体 (可选)</label>
                            <input name="entity" type="text" value={formData.entity} onChange={handleChange} placeholder="例如：某科技公司" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">主播/公司名 (可选)</label>
                            <input name="host_name" type="text" value={formData.host_name} onChange={handleChange} placeholder="默认使用发布会名称" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">关联URL <span className="text-red-500">*</span></label>
                            <input name="url" type="text" value={formData.url} onChange={handleChange} placeholder="官网、历史直播链接等" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 <span className="text-red-500">*</span></label>
                            <input name="start_time" type="datetime-local" value={formData.start_time} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">封面图片 (可选)</label>
                            <div onClick={() => !isLoading && fileInputRef.current?.click()} className={`mt-1 w-full h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'} transition-colors overflow-hidden`}>
                                {imagePreview ? (
                                    <img src={imagePreview} alt="封面预览" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-gray-500 text-sm">
                                        <PlusIcon className="w-6 h-6 mx-auto text-gray-400" />
                                        <span>点击上传</span>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={isLoading} />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">总结报告 (Markdown) <span className="text-red-500">*</span></label>
                            <textarea name="summary_report" value={formData.summary_report} onChange={handleChange} rows={8} placeholder="在此处粘贴已有的Markdown格式总结报告..." className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" disabled={isLoading}></textarea>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-2xl">
                    <button onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors" disabled={isLoading}>
                        取消
                    </button>
                    <button onClick={handleSubmit} disabled={!isFormValid || isLoading} className="py-2 px-4 w-32 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center">
                        {isLoading ? <Spinner /> : '创建任务'}
                    </button>
                </div>
            </div>
        </div>
    );
};
