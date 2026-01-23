
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LLMChannel } from '../../../types';
import { getChannels, createChannel, updateChannel, deleteChannel } from '../../../api/stratify';
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, CloseIcon, CheckIcon, ServerIcon, KeyIcon, ChipIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

// --- Helper: Tag Input Component ---
interface TagInputProps {
    values: string[];
    onChange: (newValues: string[]) => void;
    placeholder?: string;
    icon?: React.ReactNode;
}

const TagInput: React.FC<TagInputProps> = ({ values, onChange, placeholder, icon }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !values.includes(trimmed)) {
                onChange([...values, trimmed]);
                setInputValue('');
            }
        }
        if (e.key === 'Backspace' && !inputValue && values.length > 0) {
            onChange(values.slice(0, -1));
        }
    };

    const handleDelete = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    // Color cycle for tags
    const colors = [
        'bg-blue-50 text-blue-700 border-blue-200',
        'bg-indigo-50 text-indigo-700 border-indigo-200',
        'bg-purple-50 text-purple-700 border-purple-200',
        'bg-emerald-50 text-emerald-700 border-emerald-200',
        'bg-orange-50 text-orange-700 border-orange-200',
    ];

    return (
        <div 
            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all flex flex-wrap gap-2 min-h-[44px] items-center"
            onClick={() => inputRef.current?.focus()}
        >
            {values.map((tag, idx) => (
                <span 
                    key={idx} 
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${colors[idx % colors.length]} animate-in zoom-in duration-200`}
                >
                    {tag}
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                        className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    >
                        <CloseIcon className="w-3 h-3" />
                    </button>
                </span>
            ))}
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                {icon && <span className="text-slate-400 pl-1">{icon}</span>}
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 h-full"
                    placeholder={values.length === 0 ? placeholder : ''}
                />
            </div>
        </div>
    );
};

interface ChannelEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    channel?: LLMChannel;
}

const ChannelEditorModal: React.FC<ChannelEditorModalProps> = ({ isOpen, onClose, onSave, channel }) => {
    const isEditing = !!channel;
    const [form, setForm] = useState<Partial<LLMChannel>>({
        channel_code: '',
        name: '',
        base_url: '', // Will be hidden but kept in state if needed or default
        api_key: '',
        models: '',
        is_active: true
    });
    
    // Local state for tags
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [models, setModels] = useState<string[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (channel) {
                setForm({ ...channel });
                setApiKeys(channel.api_key ? channel.api_key.split(',').map(k => k.trim()).filter(Boolean) : []);
                setModels(channel.models ? channel.models.split(',').map(m => m.trim()).filter(Boolean) : []);
            } else {
                setForm({ 
                    channel_code: '',
                    name: '',
                    base_url: '', // Default empty or handled by backend if not sent
                    api_key: '',
                    models: '',
                    is_active: true
                });
                setApiKeys([]);
                setModels([]);
            }
        }
    }, [isOpen, channel]);

    const handleSubmit = async () => {
        if (!form.channel_code || !form.name) return;
        setIsSaving(true);
        
        // Join tags back to comma-separated strings
        const finalForm = {
            ...form,
            api_key: apiKeys.join(','),
            models: models.join(',')
        };

        try {
            if (isEditing && channel) {
                await updateChannel(channel.id, finalForm);
            } else {
                await createChannel(finalForm);
            }
            onSave();
            onClose();
        } catch (e) {
            alert('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ServerIcon className="w-5 h-5 text-indigo-600" />
                        {isEditing ? '编辑渠道' : '新建渠道'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">渠道代码 (Code)</label>
                            <input 
                                value={form.channel_code} 
                                onChange={e => setForm({...form, channel_code: e.target.value})}
                                disabled={isEditing}
                                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${isEditing ? 'cursor-not-allowed opacity-70' : ''}`}
                                placeholder="e.g. openrouter"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">显示名称</label>
                            <input 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. OpenRouter"
                            />
                        </div>
                    </div>

                    {/* Base URL Input Removed as requested */}
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            API Key (支持多Key轮询)
                        </label>
                        <TagInput 
                            values={apiKeys}
                            onChange={setApiKeys}
                            placeholder="输入 Key 并按回车添加..."
                            icon={<KeyIcon className="w-4 h-4" />}
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                            支持配置多个 Key 实现负载均衡，系统将自动轮询。
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">支持模型 (Models)</label>
                        <TagInput 
                            values={models}
                            onChange={setModels}
                            placeholder="输入模型 ID 并按回车添加 (如 gpt-4o)..."
                            icon={<ChipIcon className="w-4 h-4" />}
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                id="is_active"
                                checked={form.is_active}
                                onChange={e => setForm({...form, is_active: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                            />
                            <span className="text-sm font-bold text-slate-700">启用此渠道</span>
                        </label>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.channel_code || !form.name}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChannelManager: React.FC = () => {
    const [channels, setChannels] = useState<LLMChannel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<LLMChannel | undefined>(undefined);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const fetchChannels = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getChannels();
            setChannels(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    const handleEdit = (channel: LLMChannel) => {
        setEditingChannel(channel);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingChannel(undefined);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (confirmDeleteId === null) return;
        try {
            await deleteChannel(confirmDeleteId);
            fetchChannels();
        } catch (e) {
            alert('删除失败');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <ServerIcon className="w-5 h-5 text-indigo-500" />
                    模型渠道配置
                </h3>
                <div className="flex gap-2">
                    <button onClick={fetchChannels} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={handleCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
                    >
                        <PlusIcon className="w-3.5 h-3.5" /> 新建渠道
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels.map(channel => (
                        <div key={channel.id} className={`group bg-white p-5 rounded-xl border transition-all hover:shadow-lg ${channel.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${channel.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {channel.channel_code.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{channel.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono">{channel.channel_code}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(channel)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                        <PencilIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(channel.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {/* Base URL hidden if not relevant to new design, or show if backend returns it */}
                                {channel.base_url && (
                                    <div className="text-xs bg-slate-50 p-2 rounded border border-slate-100 font-mono text-slate-500 truncate" title={channel.base_url}>
                                        {channel.base_url}
                                    </div>
                                )}
                                <div className="text-[10px] text-slate-400">
                                    <span className="font-bold text-slate-500">Models: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {channel.models.split(',').slice(0, 5).map((m, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 border border-slate-200 truncate max-w-[120px]">
                                                {m.trim()}
                                            </span>
                                        ))}
                                        {channel.models.split(',').length > 5 && <span className="text-slate-300">...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!isLoading && channels.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-400 italic">暂无渠道配置</div>
                    )}
                </div>
            </div>

            <ChannelEditorModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={fetchChannels} 
                channel={editingChannel}
            />

            {confirmDeleteId && (
                <ConfirmationModal 
                    title="删除渠道"
                    message="确定要删除此渠道吗？相关配置将丢失。"
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDeleteId(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
