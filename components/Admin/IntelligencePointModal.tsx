import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, ChevronUpDownIcon } from '../icons';
import { createIntelligencePoint, deleteIntelligencePoints } from '../../api';
import { Subscription, SystemSource } from '../../types';

interface IntelligencePointModalProps {
    onClose: () => void;
    onSuccess: () => void;
    pointToEdit: Subscription | null;
    sources: SystemSource[];
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const cronOptions = [
    { label: '每30分钟', value: '*/30 * * * *' },
    { label: '每小时', value: '0 * * * *' },
    { label: '每3小时', value: '0 */3 * * *' },
    { label: '每6小时', value: '0 */6 * * *' },
    { label: '每8小时', value: '0 */8 * * *' },
    { label: '每12小时', value: '0 */12 * * *' },
    { label: '每24小时', value: '0 0 * * *' },
    { label: '每1周', value: '0 0 * * 0' },
];

export const IntelligencePointModal: React.FC<IntelligencePointModalProps> = ({ onClose, onSuccess, pointToEdit, sources }) => {
    const [formData, setFormData] = useState({
        source_name: '',
        point_name: '',
        point_url: '',
        cron_schedule: '0 */6 * * *', // Default
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCronDropdownOpen, setIsCronDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (pointToEdit) {
            setFormData({
                source_name: pointToEdit.source_name,
                point_name: pointToEdit.point_name,
                point_url: pointToEdit.point_url,
                cron_schedule: pointToEdit.cron_schedule,
            });
        }
    }, [pointToEdit]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCronDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isFormValid = formData.source_name.trim() && formData.point_name.trim() && formData.point_url.trim() && formData.cron_schedule.trim();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCronSelect = (value: string) => {
        setFormData(prev => ({ ...prev, cron_schedule: value }));
        setIsCronDropdownOpen(false);
    }

    const handleSubmit = async () => {
        if (!isFormValid) return;
        setIsLoading(true);
        setError('');
        try {
            if (pointToEdit) {
                // "Edit" is implemented as Create + Delete since there's no update API
                await createIntelligencePoint(formData);
                await deleteIntelligencePoints([pointToEdit.id]);
            } else {
                await createIntelligencePoint(formData);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };
    
    const mode = pointToEdit ? '修改' : '添加';
    const currentCronLabel = cronOptions.find(opt => opt.value === formData.cron_schedule)?.label || formData.cron_schedule;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{mode}情报点</h3>
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
                        <input name="source_name" type="text" value={formData.source_name} onChange={handleChange} list="sources-list" placeholder="输入新名称或选择已有名称" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                        <datalist id="sources-list">
                            {sources.map(s => <option key={s.id} value={s.source_name} />)}
                        </datalist>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报点名称 <span className="text-red-500">*</span></label>
                        <input name="point_name" type="text" value={formData.point_name} onChange={handleChange} placeholder="例如：行业资讯" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">情报点URL <span className="text-red-500">*</span></label>
                        <input name="point_url" type="url" value={formData.point_url} onChange={handleChange} placeholder="https://auto.gasgoo.com/news/C-101" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} />
                    </div>
                    {/* Custom Dropdown for Cron */}
                    <div ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">采集频率 <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <button type="button" onClick={() => setIsCronDropdownOpen(!isCronDropdownOpen)} disabled={isLoading} className="relative w-full cursor-default rounded-lg bg-gray-50 border border-gray-300 py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                                <span className="block truncate">{currentCronLabel}</span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </span>
                            </button>
                            {isCronDropdownOpen && (
                                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                                    {cronOptions.map((opt) => (
                                        <li key={opt.value} onClick={() => handleCronSelect(opt.value)} className="text-gray-900 relative cursor-default select-none py-2 px-4 hover:bg-blue-100 hover:text-blue-900">
                                            {opt.label}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isLoading}
                        className="py-2 px-4 w-28 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
};