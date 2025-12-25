
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StratifyScenario, LLMChannel, StratifyPrompt } from '../../../types';
import { getScenarios, createScenario, updateScenario, deleteScenario, getChannels, getPrompts, createPrompt, updatePrompt, deletePrompt } from '../../../api/stratify';
import { PlusIcon, TrashIcon, PencilIcon, CloseIcon, CheckIcon, ViewGridIcon, ServerIcon, LightningBoltIcon, CodeIcon, DocumentTextIcon, RefreshIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

// --- ID Generation Helper ---
const generateScenarioId = (title: string): string => {
    if (!title) return '';
    // If predominantly English, slugify it
    if (/^[a-zA-Z0-9\s_-]+$/.test(title)) {
        return title.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    // If contains other chars (e.g. Chinese), generate a short random ID
    return `sc_${Math.random().toString(36).substring(2, 8)}`;
};

// --- Prompt Editor Modal (Inline) ---
interface PromptModalProps {
    isOpen: boolean;
    scenarioId: string;
    scenarioName: string;
    onClose: () => void;
    onSave: () => void;
    prompt?: StratifyPrompt;
    channels: LLMChannel[];
}

const PromptModal: React.FC<PromptModalProps> = ({ isOpen, scenarioId, scenarioName, onClose, onSave, prompt, channels }) => {
    const isEditing = !!prompt;
    const [form, setForm] = useState<Partial<StratifyPrompt>>({
        name: '',
        description: '',
        content: '',
        variables: [],
        scenario_id: scenarioId
    });
    const [selectedChannelCode, setSelectedChannelCode] = useState('');
    const [selectedModelId, setSelectedModelId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm(prompt ? { ...prompt } : {
                name: '',
                description: '',
                content: '',
                variables: [],
                scenario_id: scenarioId
            });
            setSelectedChannelCode(prompt?.channel_code || '');
            setSelectedModelId(prompt?.model_id || '');
        }
    }, [isOpen, prompt, scenarioId]);

    const availableModels = useMemo(() => {
        const channel = channels.find(c => c.channel_code === selectedChannelCode);
        if (!channel || !channel.models) return [];
        return channel.models.split(',').map(m => m.trim()).filter(Boolean);
    }, [channels, selectedChannelCode]);

    const handleSubmit = async () => {
        if (!form.name || !form.content) return;
        setIsSaving(true);
        try {
            // Extract variables
            const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
            const vars = new Set<string>();
            let match;
            while ((match = regex.exec(form.content || '')) !== null) {
                vars.add(match[1]);
            }

            const payload = {
                ...form,
                scenario_id: scenarioId,
                variables: Array.from(vars),
                channel_code: selectedChannelCode || undefined,
                model_id: selectedModelId || undefined
            };

            if (isEditing && prompt) {
                await updatePrompt(prompt.id, payload);
            } else {
                await createPrompt(payload);
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-white/20">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                            {isEditing ? '编辑提示词' : '添加提示词'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">关联场景：{scenarioName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4 custom-scrollbar overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">标识符 (Name)</label>
                            <input 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. step_1_analysis"
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

                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 mb-3">
                            <LightningBoltIcon className="w-3.5 h-3.5" /> 模型覆盖 (可选)
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <select 
                                    value={selectedChannelCode}
                                    onChange={e => { setSelectedChannelCode(e.target.value); setSelectedModelId(''); }}
                                    className="w-full bg-white border border-indigo-200 rounded-lg pl-3 pr-2 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">(继承场景默认)</option>
                                    {channels.map(c => <option key={c.id} value={c.channel_code}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <select 
                                    value={selectedModelId}
                                    onChange={e => setSelectedModelId(e.target.value)}
                                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    disabled={!selectedChannelCode}
                                >
                                    <option value="">{selectedChannelCode ? '-- 选择模型 --' : '(需先选渠道)'}</option>
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">提示词内容 (Markdown + Jinja2)</label>
                        <textarea 
                            value={form.content} 
                            onChange={e => setForm({...form, content: e.target.value})}
                            className="flex-1 w-full bg-[#0f172a] text-slate-200 border border-slate-700 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed custom-scrollbar-dark"
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

// --- Scenario Editor Modal (Simplified) ---
interface ScenarioEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: StratifyScenario;
    channels: LLMChannel[];
}

const ScenarioEditorModal: React.FC<ScenarioEditorModalProps> = ({ isOpen, onClose, onSave, initialData, channels }) => {
    const isEditing = !!initialData;
    const [form, setForm] = useState({ 
        name: '', 
        title: '', 
        description: '',
        channel_code: '',
        model_id: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setForm({
                name: initialData?.name || '',
                title: initialData?.title || '',
                description: initialData?.description || '',
                channel_code: initialData?.channel_code || '',
                model_id: initialData?.model_id || ''
            });
        }
    }, [isOpen, initialData]);

    // Auto-generate ID logic
    useEffect(() => {
        if (!isEditing && form.title) {
            // Only auto-gen if user hasn't manually messed with it too much (simple heuristic)
            // Or strictly enforce auto-gen
            const generated = generateScenarioId(form.title);
            setForm(prev => ({ ...prev, name: generated }));
        }
    }, [form.title, isEditing]);

    const availableModels = useMemo(() => {
        const channel = channels.find(c => c.channel_code === form.channel_code);
        if (!channel || !channel.models) return [];
        return channel.models.split(',').map(m => m.trim()).filter(Boolean);
    }, [channels, form.channel_code]);

    const handleSubmit = async () => {
        if (!form.name || !form.title) return;
        setIsSaving(true);
        try {
            await onSave({
                ...form,
                channel_code: form.channel_code || undefined,
                model_id: form.model_id || undefined,
                workflow_config: {} // No longer using workflow config UI
            });
            onClose();
        } catch (e) {
            // Handled parent
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-white/20">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ViewGridIcon className="w-5 h-5 text-indigo-600" />
                        {isEditing ? '编辑场景' : '创建新场景'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">场景标题</label>
                        <input 
                            value={form.title} 
                            onChange={e => setForm({...form, title: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 深度市场洞察"
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">唯一标识 (ID)</label>
                        <input 
                            value={form.name} 
                            onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="auto-generated..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1">系统根据标题自动生成，亦可手动修改。</p>
                    </div>

                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                            <LightningBoltIcon className="w-3.5 h-3.5" /> 默认执行配置
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1 uppercase">Channel</label>
                                <select 
                                    value={form.channel_code}
                                    onChange={e => setForm({ ...form, channel_code: e.target.value, model_id: '' })}
                                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">-- Select --</option>
                                    {channels.map(c => <option key={c.id} value={c.channel_code}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1 uppercase">Model</label>
                                <select 
                                    value={form.model_id}
                                    onChange={e => setForm({ ...form, model_id: e.target.value })}
                                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    disabled={!form.channel_code}
                                >
                                    <option value="">-- Select --</option>
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">描述</label>
                        <textarea 
                            value={form.description} 
                            onChange={e => setForm({...form, description: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="描述该场景的用途..."
                        />
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.name || !form.title}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        {isEditing ? '保存' : '创建'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Manager ---

export const ScenarioManager: React.FC = () => {
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [channels, setChannels] = useState<LLMChannel[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<StratifyScenario | null>(null);
    const [prompts, setPrompts] = useState<StratifyPrompt[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
    
    // Modal States
    const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    
    const [editingPrompt, setEditingPrompt] = useState<StratifyPrompt | undefined>(undefined);
    const [isEditingScenario, setIsEditingScenario] = useState(false);
    
    const [confirmDeleteScenario, setConfirmDeleteScenario] = useState<StratifyScenario | null>(null);
    const [confirmDeletePrompt, setConfirmDeletePrompt] = useState<StratifyPrompt | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sData, cData] = await Promise.all([getScenarios(), getChannels()]);
            setScenarios(sData);
            setChannels(cData);
            if (sData.length > 0 && !selectedScenario) setSelectedScenario(sData[0]);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [selectedScenario]);

    useEffect(() => { loadData(); }, [loadData]);

    // Load prompts when scenario selection changes
    useEffect(() => {
        if (!selectedScenario) {
            setPrompts([]);
            return;
        }
        setIsLoadingPrompts(true);
        getPrompts({ scenario_id: selectedScenario.id })
            .then(setPrompts)
            .catch(console.error)
            .finally(() => setIsLoadingPrompts(false));
    }, [selectedScenario]);

    const handleSaveScenario = async (data: any) => {
        if (isEditingScenario && selectedScenario) {
            const updated = await updateScenario(selectedScenario.id, data);
            setScenarios(prev => prev.map(s => s.id === updated.id ? updated : s));
            setSelectedScenario(updated);
        } else {
            const created = await createScenario(data);
            setScenarios(prev => [...prev, created]);
            setSelectedScenario(created);
        }
    };

    const handleDeleteScenario = async () => {
        if (!confirmDeleteScenario) return;
        try {
            await deleteScenario(confirmDeleteScenario.id);
            setScenarios(prev => prev.filter(s => s.id !== confirmDeleteScenario.id));
            if (selectedScenario?.id === confirmDeleteScenario.id) setSelectedScenario(null);
        } catch (e) { alert('删除失败'); }
        finally { setConfirmDeleteScenario(null); }
    };

    const handleDeletePrompt = async () => {
        if (!confirmDeletePrompt) return;
        try {
            await deletePrompt(confirmDeletePrompt.id);
            setPrompts(prev => prev.filter(p => p.id !== confirmDeletePrompt.id));
        } catch (e) { alert('删除失败'); }
        finally { setConfirmDeletePrompt(null); }
    };

    const refreshPrompts = () => {
        if (selectedScenario) {
            getPrompts({ scenario_id: selectedScenario.id }).then(setPrompts);
        }
    };

    return (
        <div className="h-full flex gap-6 overflow-hidden">
            {/* Scenarios List (Left) */}
            <div className="w-64 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm flex-shrink-0">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-700 text-sm">场景列表</h3>
                    <button 
                        onClick={() => { setIsEditingScenario(false); setIsScenarioModalOpen(true); }} 
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="新建场景"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {scenarios.map(s => (
                        <div 
                            key={s.id}
                            onClick={() => setSelectedScenario(s)}
                            className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all ${selectedScenario?.id === s.id ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm' : 'text-slate-600 hover:bg-gray-50 border border-transparent'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{s.title}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{s.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scenario Detail (Right) */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm relative">
                {selectedScenario ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-gray-50/30">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedScenario.title}</h2>
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedScenario.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="truncate max-w-md">{selectedScenario.description || '无描述'}</span>
                                    {selectedScenario.channel_code && (
                                        <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono">
                                            <ServerIcon className="w-3 h-3"/> {selectedScenario.channel_code}@{selectedScenario.model_id}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setIsEditingScenario(true); setIsScenarioModalOpen(true); }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setConfirmDeleteScenario(selectedScenario)}
                                    disabled={selectedScenario.name === 'default'}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Prompt List Section */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                            <div className="px-6 py-4 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <CodeIcon className="w-4 h-4 text-indigo-500"/> 关联提示词 ({prompts.length})
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={refreshPrompts} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded shadow-sm border border-transparent hover:border-slate-200">
                                        <RefreshIcon className={`w-4 h-4 ${isLoadingPrompts ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button 
                                        onClick={() => { setEditingPrompt(undefined); setIsPromptModalOpen(true); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" /> 添加提示词
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {prompts.map(prompt => (
                                        <div key={prompt.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-slate-800">{prompt.name}</span>
                                                    {prompt.model_id && (
                                                        <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                            {prompt.channel_code}@{prompt.model_id}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingPrompt(prompt); setIsPromptModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><PencilIcon className="w-3.5 h-3.5"/></button>
                                                    <button onClick={() => setConfirmDeletePrompt(prompt)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{prompt.description || '暂无描述'}</p>
                                            <div className="mt-auto pt-3 border-t border-slate-50 flex flex-wrap gap-1">
                                                {(prompt.variables || []).length > 0 ? (
                                                    prompt.variables?.map(v => (
                                                        <span key={v} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200">{v}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic">无变量</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!isLoadingPrompts && prompts.length === 0 && (
                                        <div className="col-span-full py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                            暂无关联提示词，请添加
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                        <ViewGridIcon className="w-16 h-16 opacity-10 mb-4" />
                        <p>请选择一个场景进行配置</p>
                    </div>
                )}
            </div>

            {/* Scenario Modal */}
            <ScenarioEditorModal 
                isOpen={isScenarioModalOpen}
                onClose={() => setIsScenarioModalOpen(false)}
                onSave={handleSaveScenario}
                initialData={isEditingScenario ? selectedScenario! : undefined}
                channels={channels}
            />

            {/* Prompt Modal */}
            {selectedScenario && (
                <PromptModal 
                    isOpen={isPromptModalOpen}
                    scenarioId={selectedScenario.id}
                    scenarioName={selectedScenario.title}
                    onClose={() => setIsPromptModalOpen(false)}
                    onSave={refreshPrompts}
                    prompt={editingPrompt}
                    channels={channels}
                />
            )}

            {/* Confirmations */}
            {confirmDeleteScenario && (
                <ConfirmationModal 
                    title="删除场景"
                    message={`确定要删除 "${confirmDeleteScenario.title}" 吗？所有关联数据将被移除。`}
                    onConfirm={handleDeleteScenario}
                    onCancel={() => setConfirmDeleteScenario(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
            {confirmDeletePrompt && (
                <ConfirmationModal 
                    title="删除提示词"
                    message={`确定要删除提示词 "${confirmDeletePrompt.name}" 吗？`}
                    onConfirm={handleDeletePrompt}
                    onCancel={() => setConfirmDeletePrompt(null)}
                    confirmText="删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
