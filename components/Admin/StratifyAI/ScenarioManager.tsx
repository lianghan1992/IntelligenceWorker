
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StratifyScenario, LLMChannel, StratifyPrompt } from '../../../types';
import { 
    getScenarios, createScenario, updateScenario, deleteScenario, 
    getChannels, getPrompts, createPrompt, updatePrompt, deletePrompt 
} from '../../../api/stratify';
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

// --- Prompt Editor Modal (Linked to Scenario) ---
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-white/20">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                            {isEditing ? '编辑提示词' : '添加提示词'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">关联场景: {scenarioName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6 custom-scrollbar overflow-y-auto bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">标识符 (Name)</label>
                            <input 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                placeholder="e.g. step_1_analysis"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">描述 (Description)</label>
                            <input 
                                value={form.description} 
                                onChange={e => setForm({...form, description: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="用途说明..."
                            />
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 mb-4">
                            <LightningBoltIcon className="w-3.5 h-3.5" /> 模型覆盖 (Optional Override)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1.5 uppercase tracking-wide">Channel</label>
                                <select 
                                    value={selectedChannelCode}
                                    onChange={e => { setSelectedChannelCode(e.target.value); setSelectedModelId(''); }}
                                    className="w-full bg-white border border-indigo-200 rounded-xl pl-3 pr-2 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                >
                                    <option value="">(Inherit from Scenario Default)</option>
                                    {channels.map(c => <option key={c.id} value={c.channel_code}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1.5 uppercase tracking-wide">Model</label>
                                <select 
                                    value={selectedModelId}
                                    onChange={e => setSelectedModelId(e.target.value)}
                                    className="w-full bg-white border border-indigo-200 rounded-xl px-2 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    disabled={!selectedChannelCode}
                                >
                                    <option value="">{selectedChannelCode ? '-- 选择模型 --' : '(需先选渠道)'}</option>
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">提示词内容 (Markdown + Jinja2)</label>
                        <textarea 
                            value={form.content} 
                            onChange={e => setForm({...form, content: e.target.value})}
                            className="flex-1 w-full bg-[#0f172a] text-slate-200 border border-slate-700 rounded-2xl p-6 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed custom-scrollbar-dark shadow-inner"
                            placeholder="# System Prompt Here..."
                            spellCheck={false}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.name || !form.content}
                        className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        保存指令
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Scenario Editor Modal (Simplified & Dynamic) ---
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

    // ID Auto-generation
    useEffect(() => {
        if (!isEditing && form.title) {
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
                workflow_config: {} // No longer used in UI but kept for backend compatibility if needed
            });
            onClose();
        } catch (e) {
            // Handled in parent
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-white/20">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <ViewGridIcon className="w-6 h-6 text-indigo-600" />
                        {isEditing ? '配置业务场景' : '创建新场景'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-[0.15em]">场景显示标题 (Title)</label>
                        <input 
                            value={form.title} 
                            onChange={e => setForm({...form, title: e.target.value})}
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-base font-bold focus:border-indigo-500 outline-none transition-all shadow-sm"
                            placeholder="例如：技术深度对标分析"
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-[0.15em]">唯一标识码 (System ID)</label>
                        <input 
                            value={form.name} 
                            onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full bg-slate-100/50 border-2 border-transparent rounded-2xl px-4 py-3 text-sm font-mono text-slate-600 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                            placeholder="auto-generated-id"
                        />
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">系统根据标题自动生成 Slug，也可手动调整为更精确的标识。</p>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100 space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-widest mb-1">
                            <LightningBoltIcon className="w-4 h-4" /> 默认模型链路
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1.5 uppercase">Channel</label>
                                <select 
                                    value={form.channel_code}
                                    onChange={e => setForm({ ...form, channel_code: e.target.value, model_id: '' })}
                                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                >
                                    <option value="">-- 请选择 --</option>
                                    {channels.map(c => <option key={c.id} value={c.channel_code}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-400 mb-1.5 uppercase">Model</label>
                                <select 
                                    value={form.model_id}
                                    onChange={e => setForm({ ...form, model_id: e.target.value })}
                                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    disabled={!form.channel_code}
                                >
                                    <option value="">-- 请选择 --</option>
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-[0.15em]">场景描述</label>
                        <textarea 
                            value={form.description} 
                            onChange={e => setForm({...form, description: e.target.value})}
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm h-24 focus:border-indigo-500 outline-none resize-none transition-all shadow-sm"
                            placeholder="描述该场景的使用范畴与业务价值..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.name || !form.title}
                        className="px-10 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 shadow-2xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        {isEditing ? '更新配置' : '立即创建'}
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

    // Fetch associated prompts when scenario changes
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
            <div className="w-72 bg-white rounded-[32px] border border-slate-200 flex flex-col overflow-hidden shadow-sm flex-shrink-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">业务场景</h3>
                    <button 
                        onClick={() => { setIsEditingScenario(false); setIsScenarioModalOpen(true); }} 
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="新建场景"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar bg-white">
                    {scenarios.map(s => (
                        <div 
                            key={s.id}
                            onClick={() => setSelectedScenario(s)}
                            className={`group flex items-center justify-between px-4 py-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedScenario?.id === s.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm truncate ${selectedScenario?.id === s.id ? 'text-indigo-900' : 'text-slate-700'}`}>{s.title}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{s.name}</p>
                            </div>
                        </div>
                    ))}
                    {scenarios.length === 0 && !isLoading && (
                        <div className="text-center py-10 text-slate-400 italic text-xs">暂无可用场景</div>
                    )}
                </div>
            </div>

            {/* Scenario Detail (Right Workspace) */}
            <div className="flex-1 bg-white rounded-[32px] border border-slate-200 flex flex-col overflow-hidden shadow-sm relative">
                {selectedScenario ? (
                    <>
                        {/* Detail Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedScenario.title}</h2>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm uppercase">{selectedScenario.name}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                    <p className="line-clamp-1 max-w-xl">{selectedScenario.description || '暂无描述'}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        {selectedScenario.channel_code ? (
                                            <span className="flex items-center gap-1.5 bg-white text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 font-mono text-[10px] shadow-sm">
                                                <ServerIcon className="w-3 h-3"/> {selectedScenario.channel_code}@{selectedScenario.model_id}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic">未配置默认模型</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button 
                                    onClick={() => { setIsEditingScenario(true); setIsScenarioModalOpen(true); }}
                                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl border border-transparent hover:border-slate-100 transition-all shadow-sm group"
                                >
                                    <PencilIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                                <button 
                                    onClick={() => setConfirmDeleteScenario(selectedScenario)}
                                    disabled={selectedScenario.name === 'default'}
                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-white rounded-2xl border border-transparent hover:border-slate-100 transition-all shadow-sm disabled:opacity-0 group"
                                >
                                    <TrashIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Integrated Prompt List Section */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
                            <div className="px-8 py-5 flex justify-between items-center flex-shrink-0">
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CodeIcon className="w-4 h-4 text-indigo-500"/> 关联指令库 ({prompts.length})
                                </h3>
                                <div className="flex gap-3">
                                    <button onClick={refreshPrompts} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl shadow-sm transition-all">
                                        <RefreshIcon className={`w-4 h-4 ${isLoadingPrompts ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button 
                                        onClick={() => { setEditingPrompt(undefined); setIsPromptModalOpen(true); }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                                    >
                                        <PlusIcon className="w-4 h-4" /> 添加核心指令
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                    {prompts.map(prompt => (
                                        <div key={prompt.id} className="bg-white p-6 rounded-[24px] border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100/20 transition-all group flex flex-col h-full relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-black text-slate-800 text-base truncate pr-2" title={prompt.name}>{prompt.name}</span>
                                                        {prompt.model_id && (
                                                            <span className="flex-shrink-0 text-[9px] font-mono font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                                {prompt.channel_code}@{prompt.model_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{prompt.description || '暂无描述信息'}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <button 
                                                        onClick={() => { setEditingPrompt(prompt); setIsPromptModalOpen(true); }} 
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    >
                                                        <PencilIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmDeletePrompt(prompt)} 
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap gap-1.5">
                                                {(prompt.variables || []).length > 0 ? (
                                                    prompt.variables?.map(v => (
                                                        <span key={v} className="text-[10px] font-mono font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded-md border border-slate-100">{v}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic font-medium">无动态变量</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!isLoadingPrompts && prompts.length === 0 && (
                                        <div className="col-span-full py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[32px] bg-white/50 space-y-4">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                <CodeIcon className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <div>
                                                <p className="text-slate-500 font-bold">暂无关联提示词</p>
                                                <p className="text-slate-400 text-xs mt-1">每个场景至少需要一个核心提示词方可运行</p>
                                            </div>
                                            <button 
                                                onClick={() => { setEditingPrompt(undefined); setIsPromptModalOpen(true); }}
                                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                            >
                                                立即添加
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center animate-in fade-in duration-1000">
                        <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 shadow-inner ring-4 ring-white">
                            <ViewGridIcon className="w-16 h-16 opacity-10" />
                        </div>
                        <h3 className="text-xl font-black text-slate-400 tracking-tight mb-2">未选中场景</h3>
                        <p className="text-sm font-medium text-slate-400 max-w-xs">请在左侧列表选择一个业务场景进行提示词流水线配置</p>
                    </div>
                )}
            </div>

            {/* Scenario Creation/Edit Modal */}
            <ScenarioEditorModal 
                isOpen={isScenarioModalOpen}
                onClose={() => setIsScenarioModalOpen(false)}
                onSave={handleSaveScenario}
                initialData={isEditingScenario ? selectedScenario! : undefined}
                channels={channels}
            />

            {/* Prompt Editor Modal */}
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

            {/* Confirmation Modals */}
            {confirmDeleteScenario && (
                <ConfirmationModal 
                    title="彻底删除场景"
                    message={`确定要永久删除 "${confirmDeleteScenario.title}" 吗？该操作将导致该业务入口失效并移除所有关联指令，无法恢复。`}
                    onConfirm={handleDeleteScenario}
                    onCancel={() => setConfirmDeleteScenario(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
            {confirmDeletePrompt && (
                <ConfirmationModal 
                    title="删除指令"
                    message={`确定要从当前场景中移除指令 "${confirmDeletePrompt.name}" 吗？`}
                    onConfirm={handleDeletePrompt}
                    onCancel={() => setConfirmDeletePrompt(null)}
                    confirmText="删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
