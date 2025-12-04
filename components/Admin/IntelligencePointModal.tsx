
import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, ChevronUpDownIcon, ServerIcon, RssIcon } from '../icons';
import { createPoint, createSource, deletePoints } from '../../api'; // Added createSource
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
    const [sourceMode, setSourceMode] = useState<'existing' | 'new'>('existing');
    const [formData, setFormData] = useState({
        source_name: '',
        source_main_url: '', // New field for creating source
        point_name: '',
        point_url: '',
        cron_schedule: '0 */6 * * *',
        url_filters: '',
        extra_hint: '',
        enable_pagination: false,
        initial_pages: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCronDropdownOpen, setIsCronDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (pointToEdit) {
            setSourceMode('existing'); // Always existing when editing
            setFormData({
                source_name: pointToEdit.source_name,
                source_main_url: '',
                point_name: pointToEdit.point_name,
                point_url: pointToEdit.point_url,
                cron_schedule: pointToEdit.cron_schedule,
                url_filters: pointToEdit.url_filters ? pointToEdit.url_filters.join(',') : '',
                extra_hint: pointToEdit.extra_hint || '',
                enable_pagination: false, // Not available in Subscription type yet, assume default
                initial_pages: 0
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

    const isFormValid = () => {
        const basicValid = formData.point_name.trim() && formData.point_url.trim() && formData.cron_schedule.trim();
        if (sourceMode === 'new') {
            return basicValid && formData.source_name.trim() && formData.source_main_url.trim();
        }
        return basicValid && formData.source_name.trim();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    };

    const handleCronSelect = (value: string) => {
        setFormData(prev => ({ ...prev, cron_schedule: value }));
        setIsCronDropdownOpen(false);
    }

    const handleSubmit = async () => {
        if (!isFormValid()) return;
        setIsLoading(true);
        setError('');
        try {
            // 1. If creating a NEW source
            if (sourceMode === 'new') {
                await createSource({
                    name: formData.source_name,
                    main_url: formData.source_main_url
                });
            }

            // 2. If editing existing point, we delete and recreate (as per previous logic)
            // Note: In a real scenario, we might want a proper update endpoint
            if (pointToEdit) {
                await deletePoints([pointToEdit.id]);
            }
            
            // 3. Create Point
            await createPoint({
                source_name: formData.source_name,
                name: formData.point_name,
                url: formData.point_url,
                cron_schedule: formData.cron_schedule,
                url_filters: formData.url_filters ? formData.url_filters.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                extra_hint: formData.extra_hint || undefined,
                enable_pagination: formData.enable_pagination,
                initial_pages: formData.initial_pages
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };
    
    const mode = pointToEdit ? '修改' : '新建';
    const currentCronLabel = cronOptions.find(opt => opt.value === formData.cron_schedule)?.label || formData.cron_schedule;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">{mode}情报点</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                     {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                            <strong>错误:</strong> {error}
                        </div>
                    )}

                    {/* Source Selection Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                                <ServerIcon className="w-4 h-4 text-indigo-600"/> 所属情报源
                            </label>
                            
                            {!pointToEdit && (
                                <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                                    <button 
                                        type="button"
                                        onClick={() => setSourceMode('existing')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${sourceMode === 'existing' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        选择已有
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setSourceMode('new'); setFormData(prev => ({...prev, source_name: ''})); }}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${sourceMode === 'new' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        创建新源
                                    </button>
                                </div>
                            )}
                        </div>

                        {sourceMode === 'existing' ? (
                            <div>
                                <select 
                                    name="source_name" 
                                    value={formData.source_name} 
                                    onChange={handleChange} 
                                    className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                                    disabled={isLoading || !!pointToEdit}
                                >
                                    <option value="">-- 请选择情报源 --</option>
                                    {sources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in zoom-in-95">
                                <input 
                                    name="source_name" 
                                    type="text" 
                                    value={formData.source_name} 
                                    onChange={handleChange} 
                                    placeholder="输入新情报源名称 (如: 懂车帝)" 
                                    className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                                    disabled={isLoading} 
                                />
                                <input 
                                    name="source_main_url" 
                                    type="url" 
                                    value={formData.source_main_url} 
                                    onChange={handleChange} 
                                    placeholder="输入主页 URL (如: https://www.dongchedi.com)" 
                                    className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                                    disabled={isLoading} 
                                />
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* Point Details Section */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <RssIcon className="w-4 h-4 text-blue-600"/> 情报点配置
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">情报点名称 <span className="text-red-500">*</span></label>
                                <input name="point_name" type="text" value={formData.point_name} onChange={handleChange} placeholder="例如：行业新闻" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" disabled={isLoading} />
                            </div>
                            
                            <div ref={dropdownRef} className="relative">
                                <label className="block text-xs font-medium text-gray-500 mb-1">采集频率 <span className="text-red-500">*</span></label>
                                <button type="button" onClick={() => setIsCronDropdownOpen(!isCronDropdownOpen)} disabled={isLoading} className="relative w-full cursor-default rounded-lg bg-gray-50 border border-gray-300 py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm">
                                    <span className="block truncate">{currentCronLabel}</span>
                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </span>
                                </button>
                                {isCronDropdownOpen && (
                                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                                        {cronOptions.map((opt) => (
                                            <li key={opt.value} onClick={() => handleCronSelect(opt.value)} className="text-gray-900 relative cursor-default select-none py-2 px-4 hover:bg-blue-50 hover:text-blue-700">
                                                {opt.label}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">列表页 URL <span className="text-red-500">*</span></label>
                                <input name="point_url" type="url" value={formData.point_url} onChange={handleChange} placeholder="https://..." className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" disabled={isLoading} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">URL 过滤 (前缀过滤, 逗号分隔)</label>
                                <input name="url_filters" type="text" value={formData.url_filters} onChange={handleChange} placeholder="https://site.com/news/, https://site.com/tech/" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" disabled={isLoading} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">LLM 提取提示 (Extra Hint)</label>
                                <textarea name="extra_hint" value={formData.extra_hint} onChange={handleChange} placeholder="例如：只提取包含“智能座舱”的条目" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20 resize-none" disabled={isLoading} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* Pagination Config (Optional) */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <input 
                                id="enable_pagination"
                                name="enable_pagination" 
                                type="checkbox" 
                                checked={formData.enable_pagination} 
                                onChange={handleCheckboxChange} 
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                disabled={isLoading}
                            />
                            <label htmlFor="enable_pagination" className="text-sm font-bold text-gray-700">启用分页采集</label>
                        </div>
                        
                        {formData.enable_pagination && (
                            <div className="pl-6 animate-in fade-in slide-in-from-top-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">初始采集页数</label>
                                <input 
                                    name="initial_pages" 
                                    type="number" 
                                    min="0"
                                    max="50"
                                    value={formData.initial_pages} 
                                    onChange={handleNumberChange} 
                                    className="w-32 bg-gray-50 border border-gray-300 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                                    disabled={isLoading} 
                                />
                                <p className="text-[10px] text-gray-400 mt-1">首次运行时尝试翻页的数量，0 为自动或不限制。</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0 rounded-b-2xl">
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isLoading}
                        className="py-2 px-6 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                        {isLoading ? <Spinner /> : '保存配置'}
                    </button>
                </div>
            </div>
        </div>
    );
};
