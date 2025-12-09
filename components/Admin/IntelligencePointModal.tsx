

import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, ServerIcon, RssIcon, ClockIcon, ArrowRightIcon } from '../icons';
import { createPoint } from '../../api/intelligence';
import { IntelligencePointPublic, IntelligenceSourcePublic } from '../../types';

interface IntelligencePointModalProps {
    onClose: () => void;
    onSuccess: () => void;
    pointToEdit: IntelligencePointPublic | null; // Null for create
    sources: IntelligenceSourcePublic[];
    preSelectedSourceId?: string; // Optional: name of the source
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const IntelligencePointModal: React.FC<IntelligencePointModalProps> = ({ onClose, onSuccess, pointToEdit, sources, preSelectedSourceId }) => {
    const [formData, setFormData] = useState({
        source_name: preSelectedSourceId || '', // actually ID
        name: '',
        url: '',
        cron_schedule: '0 */6 * * *',
        url_filters: '',
        extra_hint: '',
        enable_pagination: false,
        initial_pages: 0,
        pagination_type: 'none', // 'none' | 'scroll' | 'click'
        pagination_selector: '',
        mode: 'markdown' 
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Cron Builder State
    const [scheduleType, setScheduleType] = useState<'interval' | 'daily' | 'days'>('interval');
    const [intervalNum, setIntervalNum] = useState(6);
    const [intervalUnit, setIntervalUnit] = useState<'hour' | 'minute'>('hour');
    const [timeValue, setTimeValue] = useState('08:00'); // HH:mm
    const [daysNum, setDaysNum] = useState(1);

    // Sync Cron
    useEffect(() => {
        let cron = '';
        const [hh, mm] = timeValue.split(':').map(v => parseInt(v, 10) || 0);
        
        if (scheduleType === 'interval') {
            if (intervalUnit === 'minute') {
                cron = `*/${Math.max(1, intervalNum)} * * * *`;
            } else {
                cron = `0 */${Math.max(1, intervalNum)} * * *`;
            }
        } else if (scheduleType === 'daily') {
            cron = `${mm} ${hh} * * *`;
        } else if (scheduleType === 'days') {
            cron = `${mm} ${hh} */${Math.max(1, daysNum)} * *`;
        }
        setFormData(prev => ({ ...prev, cron_schedule: cron }));
    }, [scheduleType, intervalNum, intervalUnit, timeValue, daysNum]);

    const isFormValid = () => {
        if (!formData.source_name.trim() || !formData.name.trim() || !formData.url.trim() || !formData.cron_schedule.trim()) return false;
        return true;
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

    const handleSubmit = async () => {
        if (!isFormValid()) return;
        setIsLoading(true);
        setError('');
        try {
            await createPoint({
                source_name: formData.source_name, // This is source UUID
                name: formData.name,
                url: formData.url,
                cron_schedule: formData.cron_schedule,
                url_filters: formData.url_filters ? formData.url_filters.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                extra_hint: formData.extra_hint || undefined,
                enable_pagination: formData.enable_pagination,
                initial_pages: formData.initial_pages,
                pagination_type: formData.enable_pagination && formData.pagination_type !== 'none' ? formData.pagination_type as 'scroll' | 'click' : undefined,
                pagination_selector: formData.enable_pagination && formData.pagination_selector.trim() !== '' ? formData.pagination_selector : undefined,
                mode: formData.mode
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">新建采集点</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                     {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                            <strong>错误:</strong> {error}
                        </div>
                    )}

                    {/* Source Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <ServerIcon className="w-4 h-4 text-indigo-600"/> 所属情报源
                        </label>
                        <select 
                            name="source_name" 
                            value={formData.source_name} 
                            onChange={handleChange} 
                            className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                            disabled={isLoading || !!preSelectedSourceId}
                        >
                            <option value="">-- 请选择情报源 --</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.name || s.source_name}</option>)}
                        </select>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* Point Details Section */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <RssIcon className="w-4 h-4 text-blue-600"/> 采集点配置
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">采集点名称 <span className="text-red-500">*</span></label>
                                <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="例如：行业新闻" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" disabled={isLoading} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">解析模式 (Mode)</label>
                                <select name="mode" value={formData.mode} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                    <option value="markdown">Markdown (默认)</option>
                                    <option value="html">HTML</option>
                                    <option value="text">纯文本</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">列表页 URL <span className="text-red-500">*</span></label>
                                <input name="url" type="url" value={formData.url} onChange={handleChange} placeholder="https://..." className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" disabled={isLoading} />
                            </div>

                            {/* Enhanced Cron Builder */}
                            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase flex items-center gap-1.5">
                                    <ClockIcon className="w-3.5 h-3.5" /> 采集频率配置
                                </label>
                                
                                <div className="flex gap-2 mb-3">
                                    <button type="button" onClick={() => setScheduleType('interval')} className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${scheduleType === 'interval' ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm font-bold' : 'border-transparent text-slate-500 hover:bg-white'}`}>间隔循环</button>
                                    <button type="button" onClick={() => setScheduleType('daily')} className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${scheduleType === 'daily' ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm font-bold' : 'border-transparent text-slate-500 hover:bg-white'}`}>每天定时</button>
                                    <button type="button" onClick={() => setScheduleType('days')} className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${scheduleType === 'days' ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm font-bold' : 'border-transparent text-slate-500 hover:bg-white'}`}>间隔天数</button>
                                </div>

                                <div className="min-h-[40px] flex items-center">
                                    {scheduleType === 'interval' && (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <span className="text-sm text-slate-600">每</span>
                                            <input type="number" min="1" value={intervalNum} onChange={e => setIntervalNum(Math.max(1, parseInt(e.target.value)||1))} className="w-16 p-1.5 border border-gray-300 rounded text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            <select value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as any)} className="p-1.5 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none">
                                                <option value="minute">分钟</option>
                                                <option value="hour">小时</option>
                                            </select>
                                            <span className="text-sm text-slate-600">执行一次</span>
                                        </div>
                                    )}

                                    {scheduleType === 'daily' && (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <span className="text-sm text-slate-600">每天</span>
                                            <input type="time" value={timeValue} onChange={e => setTimeValue(e.target.value)} className="p-1.5 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer" />
                                            <span className="text-sm text-slate-600">执行</span>
                                        </div>
                                    )}

                                    {scheduleType === 'days' && (
                                        <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-300">
                                            <span className="text-sm text-slate-600">每</span>
                                            <input type="number" min="1" value={daysNum} onChange={e => setDaysNum(Math.max(1, parseInt(e.target.value)||1))} className="w-16 p-1.5 border border-gray-300 rounded text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            <span className="text-sm text-slate-600">天，在</span>
                                            <input type="time" value={timeValue} onChange={e => setTimeValue(e.target.value)} className="p-1.5 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer" />
                                            <span className="text-sm text-slate-600">执行</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono flex justify-between">
                                    <span>CRON Expression:</span>
                                    <span className="font-bold text-slate-500">{formData.cron_schedule}</span>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">URL 过滤 (前缀过滤, 逗号分隔)</label>
                                <input name="url_filters" type="text" value={formData.url_filters} onChange={handleChange} placeholder="https://site.com/news/, https://site.com/tech/" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" disabled={isLoading} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    LLM 智能筛选提示 (Extra Hint)
                                    <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 px-1 rounded">Generic 模式</span>
                                </label>
                                <textarea name="extra_hint" value={formData.extra_hint} onChange={handleChange} placeholder="例如：只提取包含“智能座舱”的条目。留空则使用默认列表提取逻辑。" className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20 resize-none" disabled={isLoading} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* Pagination Config */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
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
                            <div className="pl-6 animate-in fade-in slide-in-from-top-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            首次采集页数 (增量默认为1)
                                        </label>
                                        <input 
                                            name="initial_pages" 
                                            type="number" 
                                            min="0"
                                            max="50"
                                            value={formData.initial_pages} 
                                            onChange={handleNumberChange} 
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                                            disabled={isLoading} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">翻页策略</label>
                                        <select 
                                            name="pagination_type" 
                                            value={formData.pagination_type} 
                                            onChange={handleChange} 
                                            className="w-full bg-white border border-gray-300 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            disabled={isLoading}
                                        >
                                            <option value="none">自动 / 无</option>
                                            <option value="scroll">滚动加载 (Scroll)</option>
                                            <option value="click">点击按钮 (Click)</option>
                                        </select>
                                    </div>
                                </div>

                                {(formData.pagination_type === 'click' || formData.pagination_type === 'scroll') && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            翻页元素选择器 (CSS Selector)
                                        </label>
                                        <input 
                                            name="pagination_selector" 
                                            type="text" 
                                            value={formData.pagination_selector} 
                                            onChange={handleChange} 
                                            placeholder={formData.pagination_type === 'click' ? ".next-page-btn (可选，留空则尝试自动识别)" : ".loading-spinner (可选, Wait For Selector)"}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" 
                                            disabled={isLoading} 
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0 rounded-b-2xl gap-3">
                    <button onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-50">取消</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isLoading}
                        className="py-2 px-6 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                        {isLoading ? <Spinner /> : '创建'}
                    </button>
                </div>
            </div>
        </div>
    );
};