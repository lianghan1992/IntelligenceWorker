
import React, { useState, useEffect, useCallback } from 'react';
import { LLMChannel } from '../../../types';
import { getChannels, createChannel, updateChannel, deleteChannel } from '../../../api/stratify';
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, CloseIcon, CheckIcon, ServerIcon, KeyIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

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
        api_key: '',
        models: '',
        is_active: true
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm(channel ? { ...channel } : { 
                channel_code: '',
                name: '',
                api_key: '',
                models: '',
                is_active: true
            });
        }
    }, [isOpen, channel]);

    const handleSubmit = async () => {
        if (!form.channel_code || !form.name) return;
        setIsSaving(true);
        try {
            if (isEditing && channel) {
                await updateChannel(channel.id, form);
            } else {
                await createChannel(form);
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
                            <p className="text-[9px] text-slate-400 mt-1 italic">后端将自动匹配 Base URL</p>
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

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            API Key (支持多Key轮询与重试)
                        </label>
                        <div className="relative">
                            <KeyIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <textarea 
                                value={form.api_key} 
                                onChange={e => setForm({...form, api_key: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] resize-y placeholder:text-slate-400 leading-relaxed"
                                placeholder="sk-key1,\nsk-key2"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100">
                            <strong>提示：</strong> 支持配置多个 API Key 以实现负载均衡与故障重试。请使用英文逗号分隔。
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">支持模型 (逗号分隔)</label>
                        <textarea 
                            value={form.models} 
                            onChange={e => setForm({...form, models: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-y"
                            placeholder="gpt-4o, claude-3-5-sonnet, gemini-pro..."
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
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.channel_code || !form.name}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
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
                                <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed italic">
                                    模型服务由后端通过渠道代码动态路由
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    <span className="font-bold text-slate-500">Models: </span>
                                    {channel.models.split(',').slice(0, 3).join(', ')}
                                    {channel.models.split(',').length > 3 && '...'}
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
