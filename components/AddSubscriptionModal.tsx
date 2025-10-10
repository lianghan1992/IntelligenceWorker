import React, { useState, useEffect } from 'react';
import { CloseIcon, PencilIcon } from './icons';
import { Subscription, SystemSource, AllPrompts, Prompt } from '../types';
import { getSources, getPrompts } from '../api';
import { PromptManagerModal } from './PromptManagerModal';

interface AddSubscriptionModalProps {
  onClose: () => void;
  onSave: (subscription: Partial<Subscription>) => void;
  isLoading?: boolean;
  mode: 'add' | 'edit';
  subscriptionToEdit?: Subscription | null;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const cronOptions = [
    { label: '每5分钟', value: '*/5 * * * *' },
    { label: '每30分钟', value: '*/30 * * * *' },
    { label: '每1小时', value: '0 * * * *' },
    { label: '每3小时', value: '0 */3 * * *' },
    { label: '每6小时', value: '0 */6 * * *' },
    { label: '每12小时', value: '0 */12 * * *' },
    { label: '每天', value: '0 0 * * *' },
    { label: '每周', value: '0 0 * * 0' },
];

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({ onClose, onSave, isLoading = false, mode, subscriptionToEdit }) => {
    const [formData, setFormData] = useState({
        point_name: subscriptionToEdit?.point_name || '',
        source_name: subscriptionToEdit?.source_name || '',
        point_url: subscriptionToEdit?.point_url || '',
        cron_schedule: subscriptionToEdit?.cron_schedule || cronOptions[2].value,
        url_prompt_key: subscriptionToEdit?.url_prompt_key || 'default_list_parser',
        summary_prompt_key: subscriptionToEdit?.summary_prompt_key || 'default_summary',
    });
    
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [prompts, setPrompts] = useState<AllPrompts | null>(null);
    const [isPromptManagerOpen, setIsPromptManagerOpen] = useState(false);
    const [promptManagerType, setPromptManagerType] = useState<'url_extraction_prompts' | 'content_summary_prompts'>('url_extraction_prompts');

    const fetchInitialData = async () => {
        try {
            const [fetchedSources, fetchedPrompts] = await Promise.all([getSources(), getPrompts()]);
            setSources(fetchedSources);
            setPrompts(fetchedPrompts);
        } catch (error) {
            console.error("Failed to fetch initial data for modal:", error);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const isFormValid = formData.point_name.trim() && formData.source_name.trim() && formData.point_url.trim() && formData.cron_schedule.trim();

    const handleSave = () => {
        if (!isFormValid || isLoading) return;
        const saveData: Partial<Subscription> = { ...formData };
        if (mode === 'edit' && subscriptionToEdit) {
            saveData.id = subscriptionToEdit.id;
        }
        onSave(saveData);
    };

    const handlePromptManagerUpdate = async (newKey?: string) => {
        await fetchInitialData(); // Refetch all prompts
        if (newKey) {
            if (promptManagerType === 'url_extraction_prompts') {
                setFormData(prev => ({...prev, url_prompt_key: newKey}));
            } else {
                 setFormData(prev => ({...prev, summary_prompt_key: newKey}));
            }
        }
        setIsPromptManagerOpen(false);
    };

    const renderPromptSelector = (
        type: 'url_extraction_prompts' | 'content_summary_prompts',
        label: string
    ) => {
        const promptCollection = prompts ? prompts[type] : {};
        const selectedKey = type === 'url_extraction_prompts' ? formData.url_prompt_key : formData.summary_prompt_key;
        
        return (
            <div>
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <div className="flex items-center gap-2 mt-1">
                    <select
                        value={selectedKey}
                        onChange={e => setFormData(f => ({...f, [type === 'url_extraction_prompts' ? 'url_prompt_key' : 'summary_prompt_key']: e.target.value}))}
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    >
                        {/* FIX: Cast prompt to `Prompt` to resolve property 'name' does not exist on type 'unknown' error. */}
                        {promptCollection && Object.entries(promptCollection).map(([key, prompt]) => (
                            <option key={key} value={key}>{(prompt as Prompt).name}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setPromptManagerType(type);
                            setIsPromptManagerOpen(true);
                        }}
                        className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
                        title="管理提示词"
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {mode === 'add' ? '添加新的情报关注点' : '编辑情报关注点'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">情报源名称</label>
                                <input 
                                    type="text" 
                                    value={formData.source_name} 
                                    onChange={e => setFormData(f => ({...f, source_name: e.target.value}))}
                                    list="sources-datalist"
                                    placeholder="选择或输入新的情报源 (例如 '盖世汽车')"
                                    className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <datalist id="sources-datalist">
                                    {sources.map(source => <option key={source.id} value={source.name} />)}
                                </datalist>
                            </div>
                             <div>
                                <label className="text-sm font-medium text-gray-700">情报点名称 (例如 "前沿技术")</label>
                                <input type="text" value={formData.point_name} onChange={e => setFormData(f => ({...f, point_name: e.target.value}))} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading}/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">网页 URL</label>
                                <input type="url" value={formData.point_url} onChange={e => setFormData(f => ({...f, point_url: e.target.value}))} placeholder="https://auto.gasgoo.com/new-energy/" className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading}/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">刷新周期</label>
                                 <select 
                                    value={formData.cron_schedule} 
                                    onChange={e => setFormData(f => ({...f, cron_schedule: e.target.value}))}
                                    className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                >
                                    {cronOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 border-t">
                                <h4 className="text-md font-semibold text-gray-800 mb-2">AI 配置</h4>
                                <div className="space-y-4">
                                     {renderPromptSelector('url_extraction_prompts', 'URL 提取提示词')}
                                     {renderPromptSelector('content_summary_prompts', '内容总结提示词')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-2xl">
                        <button onClick={onClose} className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors" disabled={isLoading}>
                            取消
                        </button>
                        <button onClick={handleSave} disabled={!isFormValid || isLoading} className="w-32 py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex justify-center items-center">
                            {isLoading ? <Spinner /> : '保存'}
                        </button>
                    </div>
                </div>
            </div>
            {isPromptManagerOpen && prompts && (
                <PromptManagerModal
                    onClose={() => setIsPromptManagerOpen(false)}
                    promptType={promptManagerType}
                    prompts={prompts}
                    onUpdate={handlePromptManagerUpdate}
                />
            )}
        </>
    );
};