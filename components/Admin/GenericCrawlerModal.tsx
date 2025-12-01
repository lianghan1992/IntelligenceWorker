
import React, { useState, useEffect } from 'react';
import { CloseIcon, ChevronUpDownIcon } from '../icons';
import { createGenericPoint, updateGenericPoint, getGenericSources } from '../../api';
import { Subscription } from '../../types';

interface GenericCrawlerModalProps {
    onClose: () => void;
    onSuccess: () => void;
    pointToEdit: Subscription | null;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const scheduleOptions = [
    { label: '每3小时', value: '0 */3 * * *' },
    { label: '每8小时', value: '0 */8 * * *' },
    { label: '每24小时', value: '0 0 * * *' },
    { label: '每3天', value: '0 0 */3 * *' },
    { label: '每周', value: '0 0 * * 0' },
];

export const GenericCrawlerModal: React.FC<GenericCrawlerModalProps> = ({ onClose, onSuccess, pointToEdit }) => {
    const [formData, setFormData] = useState({
        source_name: '',
        point_name: '',
        point_url: '',
        cron_schedule: '0 */8 * * *',
    });
    const [existingSources, setExistingSources] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const loadSources = async () => {
            try {
                const sources = await getGenericSources();
                setExistingSources(sources.map(s => s.source_name));
            } catch (e) {
                console.error("Failed to load generic sources", e);
            }
        };
        loadSources();

        if (pointToEdit) {
            setFormData({
                source_name: pointToEdit.source_name,
                point_name: pointToEdit.point_name,
                point_url: pointToEdit.point_url,
                cron_schedule: pointToEdit.cron_schedule,
            });
        }
    }, [pointToEdit]);

    const isFormValid = formData.source_name.trim() && formData.point_name.trim() && formData.point_url.trim();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleScheduleSelect = (value: string) => {
        setFormData(prev => ({ ...prev, cron_schedule: value }));
        setIsDropdownOpen(false);
    };

    const handleSubmit = async () => {
        if (!isFormValid) return;
        setIsLoading(true);
        setError('');
        try {
            if (pointToEdit) {
                await updateGenericPoint(pointToEdit.id, formData);
            } else {
                await createGenericPoint(formData);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const currentScheduleLabel = scheduleOptions.find(opt => opt.value === formData.cron_schedule)?.label || formData.cron_schedule;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{pointToEdit ? '编辑' : '新建'}通用情报点</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg border border-red-200">
                            <strong>错误:</strong> {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报源名称 <span className="text-red-500">*</span></label>
                        <input 
                            name="source_name" 
                            type="text" 
                            value={formData.source_name} 
                            onChange={handleChange} 
                            list="generic-sources-list" 
                            placeholder="选择现有或输入新名称" 
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                            disabled={isLoading} 
                        />
                        <datalist id="generic-sources-list">
                            {existingSources.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <p className="text-xs text-gray-500 mt-1">例如：盖世汽车、36氪</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报点名称 <span className="text-red-500">*</span></label>
                        <input 
                            name="point_name" 
                            type="text" 
                            value={formData.point_name} 
                            onChange={handleChange} 
                            placeholder="例如：行业资讯列表" 
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                            disabled={isLoading} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报点 URL <span className="text-red-500">*</span></label>
                        <input 
                            name="point_url" 
                            type="url" 
                            value={formData.point_url} 
                            onChange={handleChange} 
                            placeholder="https://example.com/news" 
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                            disabled={isLoading} 
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">采集频率 <span className="text-red-500">*</span></label>
                        <button 
                            type="button" 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                            disabled={isLoading} 
                            className="relative w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            <span className="block truncate">{currentScheduleLabel}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                            </span>
                        </button>
                        {isDropdownOpen && (
                            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm animate-in fade-in zoom-in-95">
                                {scheduleOptions.map((opt) => (
                                    <li 
                                        key={opt.value} 
                                        onClick={() => handleScheduleSelect(opt.value)} 
                                        className={`relative cursor-pointer select-none py-2 px-4 hover:bg-blue-50 hover:text-blue-700 ${formData.cron_schedule === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                                    >
                                        {opt.label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors" disabled={isLoading}>
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center transition-colors shadow-sm"
                    >
                        {isLoading ? <Spinner /> : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
};
