
import React, { useState, useEffect } from 'react';
import { CloseIcon } from '../icons';
import { createIntelligencePoint, getAllPrompts } from '../../api';
import { AllPrompts, Prompt } from '../../types';

interface IntelligencePointModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const promptToArray = (promptCollection: { [key: string]: Prompt }): { key: string, name: string }[] => {
    return Object.entries(promptCollection).map(([key, value]) => ({ key, name: value.name }));
};


export const IntelligencePointModal: React.FC<IntelligencePointModalProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        source_name: '',
        point_name: '',
        point_url: '',
        cron_schedule: '0 */4 * * *', // Default to every 4 hours
        url_prompt_key: 'default_list_parser',
        summary_prompt_key: 'default_summary'
    });
    const [prompts, setPrompts] = useState<AllPrompts | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const isFormValid = formData.source_name.trim() && formData.point_name.trim() && formData.point_url.trim() && formData.cron_schedule.trim();

    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const fetchedPrompts = await getAllPrompts();
                setPrompts(fetchedPrompts);
            } catch (err: any) {
                setError("无法加载提示词列表: " + err.message);
            }
        };
        fetchPrompts();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!isFormValid) return;
        setIsLoading(true);
        setError('');
        try {
            await createIntelligencePoint(formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '创建失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };
    
    const urlExtractionPrompts = prompts ? promptToArray(prompts.url_extraction_prompts) : [];
    const contentSummaryPrompts = prompts ? promptToArray(prompts.content_summary_prompts) : [];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">添加情报点</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                            <strong>错误:</strong> {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报源名称 <span className="text-red-500">*</span></label>
                        <input name="source_name" type="text" value={formData.source_name} onChange={handleChange} placeholder="例如：盖世汽车 (若已存在则关联)" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报点名称 <span className="text-red-500">*</span></label>
                        <input name="point_name" type="text" value={formData.point_name} onChange={handleChange} placeholder="例如：行业资讯" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报点URL <span className="text-red-500">*</span></label>
                        <input name="point_url" type="url" value={formData.point_url} onChange={handleChange} placeholder="https://auto.gasgoo.com/news/C-101" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CRON 计划 <span className="text-red-500">*</span></label>
                        <input name="cron_schedule" type="text" value={formData.cron_schedule} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" disabled={isLoading} />
                        <p className="text-xs text-gray-500 mt-1">默认为每4小时执行一次。格式: 分 时 日 月 周。</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL提取提示词</label>
                        <select name="url_prompt_key" value={formData.url_prompt_key} onChange={handleChange} disabled={!prompts || isLoading} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {urlExtractionPrompts.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">内容总结提示词</label>
                        <select name="summary_prompt_key" value={formData.summary_prompt_key} onChange={handleChange} disabled={!prompts || isLoading} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                           {contentSummaryPrompts.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isLoading}
                        className="py-2 px-4 w-28 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : '创建'}
                    </button>
                </div>
            </div>
        </div>
    );
};
