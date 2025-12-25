
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StratifyPrompt, LLMChannel } from '../../../types';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, getChannels } from '../../../api/stratify';
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, CloseIcon, CheckIcon, DocumentTextIcon, ServerIcon, LightningBoltIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

interface PromptEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    prompt?: StratifyPrompt;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ isOpen, onClose, onSave, prompt }) => {
    const isEditing = !!prompt;
    const [form, setForm] = useState<Partial<StratifyPrompt>>({
        name: '',
        description: '',
        content: '',
        variables: []
    });
    const [isSaving, setIsSaving] = useState(false);
    
    // Channel & Model Config
    const [channels, setChannels] = useState<LLMChannel[]>([]);
    const [selectedChannelCode, setSelectedChannelCode] = useState('');
    const [selectedModelId, setSelectedModelId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm(prompt ? { ...prompt } : {
                name: '',
                description: '',
                content: '',
                variables: []
            });
            
            setSelectedChannelCode(prompt?.channel_code || '');
            setSelectedModelId(prompt?.model_id || '');

            getChannels().then(setChannels).catch(console.error);
        }
    }, [isOpen, prompt]);

    const availableModels = useMemo(() => {
        const channel = channels.find(c => c.channel_code === selectedChannelCode);
        if (!channel || !channel.models) return [];
        return channel.models.split(',').map(m => m.trim()).filter(Boolean);
    }, [channels, selectedChannelCode]);

    const handleSubmit = async () => {
        if (!form.name || !form.content) return;
        setIsSaving(true);
        try {
            // Extract variables from {{...}}
            const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
            const vars = new Set<string>();
            let match;
            while ((match = regex.exec(form.content || '')) !== null) {
                vars.add(match[1]);
            }
            const dataToSave = { 
                ...form, 
                variables: Array.from(vars),
                channel_code: selectedChannelCode || undefined,
                model_id: selectedModelId || undefined
            };

            if (isEditing && prompt) {
                await updatePrompt(prompt.id, dataToSave);
            } else {
                await createPrompt(dataToSave);
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
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 h-[85vh]">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                        {isEditing ? '编辑提示词' : '新建提示词'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4 custom-scrollbar overflow-y-auto">
                     <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">唯一标识 (Name)</label>
                            <input 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})}
                                disabled={isEditing}
                                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${isEditing ? 'cursor-not-allowed opacity-70' : ''}`}
                                placeholder="e.g. generate_outline"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">描述</label>
                            <input 
                                value={form.description} 
                                onChange={e => setForm({...form, description: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="用途说明..."
                            />
                        </div>
                    </div>

                    {/* Model Configuration */}
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 mb-3">
                            <LightningBoltIcon className="w-3.5 h-3.5" /> 默认执行模型 (可选)
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1 uppercase">Channel</label>
                                <div className="relative">
                                    <ServerIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <select 
                                        value={selectedChannelCode}
                                        onChange={e => {
                                            setSelectedChannelCode(e.target.value);
                                            setSelectedModelId('');
                                        }}
                                        className="w-full bg-white border border-indigo-200 rounded-lg pl-8 pr-2 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">(Inherit from Scenario)</option>
                                        {channels.map(c => (
                                            <option key={c.id} value={c.channel_code}>{c.name} ({c.channel_code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1 uppercase">Model</label>
                                <select 
                                    value={selectedModelId}
                                    onChange={e => setSelectedModelId(e.target.value)}
                                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    disabled={!selectedChannelCode}
                                >
                                    <option value="">{selectedChannelCode ? '-- Select Model --' : '(Select Channel First)'}</option>
                                    {availableModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            提示词内容 (支持 Jinja2 变量 &#123;&#123; var &#125;&#125;)
                        </label>
                        <textarea 
                            value={form.content} 
                            onChange={e => setForm({...form, content: e.target.value})}
                            className="flex-1 w-full bg-[#0f172a] text-slate-200 border border-slate-700 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed custom-scrollbar-dark"
                            placeholder="You are a helpful assistant..."
                            spellCheck={false}
                        />
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.name || !form.content}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PromptManager: React.FC = () => {
    const [prompts, setPrompts] = useState<StratifyPrompt[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<StratifyPrompt | undefined>(undefined);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchPrompts = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getPrompts();
            setPrompts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrompts();
    }, [fetchPrompts]);

    const handleEdit = (prompt: StratifyPrompt) => {
        setEditingPrompt(prompt);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingPrompt(undefined);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await deletePrompt(confirmDeleteId);
            fetchPrompts();
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
                    <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                    提示词库管理
                </h3>
                <div className="flex gap-2">
                    <button onClick={fetchPrompts} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={handleCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
                    >
                        <PlusIcon className="w-3.5 h-3.5" /> 新建提示词
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prompts.map(prompt => (
                        <div key={prompt.id} className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h4 className="font-bold text-slate-800 text-sm truncate" title={prompt.name}>{prompt.name}</h4>
                                    {prompt.channel_code && prompt.model_id && (
                                        <div className="text-[10px] text-indigo-500 font-mono mt-0.5 truncate bg-indigo-50 px-1.5 py-0.5 rounded w-fit">
                                            {prompt.channel_code}@{prompt.model_id}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(prompt)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                        <PencilIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(prompt.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3 h-8">{prompt.description || '无描述'}</p>
                            
                            <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                                {(prompt.variables || []).slice(0, 3).map(v => (
                                    <span key={v} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200 font-mono">
                                        {v}
                                    </span>
                                ))}
                                {(prompt.variables || []).length > 3 && <span className="text-[10px] text-slate-400">...</span>}
                                {(prompt.variables || []).length === 0 && <span className="text-[10px] text-slate-300 italic">无变量</span>}
                            </div>
                        </div>
                    ))}
                    {!isLoading && prompts.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-400 italic">暂无提示词</div>
                    )}
                </div>
            </div>

            <PromptEditorModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={fetchPrompts} 
                prompt={editingPrompt}
            />

            {confirmDeleteId && (
                <ConfirmationModal 
                    title="删除提示词"
                    message="确定要删除此提示词吗？引用此提示词的场景可能会出错。"
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDeleteId(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
