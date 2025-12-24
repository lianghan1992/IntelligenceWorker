
import React, { useState, useEffect, useCallback } from 'react';
import { StratifyScenario } from '../../../types';
import { getScenarios, createScenario, updateScenario, deleteScenario, getAvailableModels } from '../../../api/stratify';
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, CloseIcon, CheckIcon, ViewGridIcon } from '../../icons';
import { ConfirmationModal } from '../ConfirmationModal';
import { WorkflowEditor } from './WorkflowEditor';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

// --- Scenario Editor Modal ---
interface ScenarioEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; title: string; description: string; default_model?: string; workflow_config?: any }) => Promise<void>;
    initialData?: { name: string; title: string; description: string; default_model?: string; workflow_config?: any };
    isEditing: boolean;
    availableModels: string[];
}

const ScenarioEditorModal: React.FC<ScenarioEditorModalProps> = ({ isOpen, onClose, onSave, initialData, isEditing, availableModels }) => {
    const [form, setForm] = useState({ name: '', title: '', description: '', default_model: '' });
    const [workflowConfig, setWorkflowConfig] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm({
                name: initialData?.name || '',
                title: initialData?.title || '',
                description: initialData?.description || '',
                default_model: initialData?.default_model || ''
            });
            // Ensure we have a valid object structure or null, defaulting to structure if empty
            setWorkflowConfig(initialData?.workflow_config || { variables: [], steps: [] });
        }
    }, [isOpen, initialData]);

    const handleSubmit = async () => {
        if (!form.name || !form.title) return;
        setIsSaving(true);
        try {
            await onSave({
                ...form,
                default_model: form.default_model || undefined,
                workflow_config: workflowConfig
            });
            onClose();
        } catch (e) {
            // Error handling done in parent or here
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 h-[85vh]">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ViewGridIcon className="w-5 h-5 text-indigo-600" />
                        {isEditing ? '编辑场景配置' : '创建新场景'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left: Basic Info */}
                    <div className="w-full md:w-1/4 p-6 space-y-5 overflow-y-auto custom-scrollbar border-r border-slate-100 bg-white">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">基础信息</h4>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">唯一标识 (ID)</label>
                            <input 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})}
                                disabled={isEditing} 
                                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${isEditing ? 'cursor-not-allowed opacity-70' : ''}`}
                                placeholder="e.g. market_insight"
                            />
                            {!isEditing && <p className="text-[10px] text-slate-400 mt-1">创建后不可修改。</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">显示标题</label>
                            <input 
                                value={form.title} 
                                onChange={e => setForm({...form, title: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. 深度市场洞察"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">默认模型</label>
                            <select 
                                value={form.default_model} 
                                onChange={e => setForm({...form, default_model: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">使用系统默认</option>
                                {availableModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">描述</label>
                            <textarea 
                                value={form.description} 
                                onChange={e => setForm({...form, description: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="描述该场景的用途..."
                            />
                        </div>
                    </div>

                    {/* Right: Workflow Editor */}
                    <div className="flex-1 p-0 bg-slate-50/50 flex flex-col overflow-hidden">
                        <WorkflowEditor 
                            value={workflowConfig}
                            onChange={setWorkflowConfig}
                        />
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.name || !form.title}
                        className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        {isEditing ? '保存更新' : '立即创建'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Manager ---

export const ScenarioManager: React.FC = () => {
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<StratifyScenario | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScenarioData, setEditingScenarioData] = useState<{ name: string; title: string; description: string; default_model?: string; workflow_config?: any } | undefined>(undefined);
    const [isEditingMode, setIsEditingMode] = useState(false);
    
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sData, mData] = await Promise.all([
                getScenarios(),
                getAvailableModels()
            ]);
            setScenarios(sData);
            setAvailableModels(mData);
            
            // Auto select first if none selected
            if (sData.length > 0 && !selectedScenario) {
                setSelectedScenario(sData[0]);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [selectedScenario]); 

    // Effect to handle initial load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateClick = () => {
        setEditingScenarioData(undefined);
        setIsEditingMode(false);
        setIsModalOpen(true);
    };

    const handleEditClick = (s: StratifyScenario) => {
        setEditingScenarioData({ 
            name: s.name, 
            title: s.title, 
            description: s.description,
            default_model: s.default_model,
            workflow_config: s.workflow_config
        });
        setIsEditingMode(true);
        // Ensure we are selecting the one we are editing
        setSelectedScenario(s);
        setIsModalOpen(true);
    };

    const handleSaveScenario = async (data: { name: string; title: string; description: string; default_model?: string; workflow_config?: any }) => {
        try {
            if (isEditingMode && selectedScenario) {
                const updated = await updateScenario(selectedScenario.id, data);
                // Update local list
                setScenarios(prev => prev.map(s => s.id === updated.id ? updated : s));
                setSelectedScenario(updated);
            } else {
                const created = await createScenario(data);
                setScenarios(prev => [...prev, created]);
                setSelectedScenario(created);
            }
        } catch (e) {
            alert('保存失败，请检查网络或重试');
            throw e;
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteScenario(confirmDelete.id);
            setScenarios(prev => prev.filter(s => s.id !== confirmDelete.id));
            if (selectedScenario?.id === confirmDelete.id) {
                setSelectedScenario(null);
            }
        } catch (e) { alert('删除失败'); }
        finally { setConfirmDelete(null); }
    };

    return (
        <div className="h-full flex gap-6 overflow-hidden">
            {/* Scenarios List (Left) - Dark Themed */}
            <div className="w-64 bg-slate-900 rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-slate-800 flex-shrink-0">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.2em]">Scenario List</h3>
                    <button 
                        onClick={handleCreateClick} 
                        className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                        title="创建新场景"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar-dark">
                    {scenarios.map(s => (
                        <div 
                            key={s.id}
                            onClick={() => setSelectedScenario(s)}
                            className={`group flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all ${selectedScenario?.id === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{s.title}</p>
                                <p className={`text-[10px] truncate ${selectedScenario?.id === s.id ? 'text-indigo-200' : 'text-slate-500'}`}>{s.name}</p>
                            </div>
                            {selectedScenario?.id === s.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(s); }}
                                    className="p-1 hover:bg-white/20 rounded-md transition-colors"
                                >
                                    <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Scenario Detail Workspace (Right) */}
            <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-inner relative">
                {selectedScenario ? (
                    <>
                        {/* Selected Scenario Header */}
                        <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedScenario.title}</h2>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-tighter">ID: {selectedScenario.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                    <span>{selectedScenario.description}</span>
                                    {selectedScenario.default_model && (
                                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono text-[10px]">
                                            Model: {selectedScenario.default_model}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleEditClick(selectedScenario)}
                                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => setConfirmDelete({ id: selectedScenario.id, name: selectedScenario.title })}
                                    disabled={selectedScenario.name === 'default'} // Default scenario protection
                                    className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Workflow Read-Only View */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-8">
                                {/* Variables Section */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> 输入变量
                                    </h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(selectedScenario.workflow_config?.variables || []).map((v: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-700">{v.label}</span>
                                                    {v.required && <span className="text-[10px] text-red-500 font-bold">*</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">{v.name} ({v.type})</div>
                                            </div>
                                        ))}
                                        {(!selectedScenario.workflow_config?.variables || selectedScenario.workflow_config.variables.length === 0) && (
                                            <div className="col-span-full text-center py-4 text-slate-400 text-xs italic">无全局变量</div>
                                        )}
                                    </div>
                                </div>

                                {/* Steps Flow Visualization */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 px-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div> 执行流程
                                    </h3>
                                    <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                                        {(selectedScenario.workflow_config?.steps || []).map((step: any, idx: number) => (
                                            <div key={idx} className="relative pl-6">
                                                <div className="absolute -left-[21px] top-4 w-4 h-4 rounded-full border-4 border-slate-50 bg-indigo-500 shadow-sm"></div>
                                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-800">{step.name}</h4>
                                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{step.id}</div>
                                                        </div>
                                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{step.type}</span>
                                                    </div>
                                                    
                                                    {/* LLM Details */}
                                                    {step.type === 'generation' && (
                                                        <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-4 text-xs">
                                                            <div>
                                                                <span className="text-slate-400 block mb-0.5">Prompt ID</span>
                                                                <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{step.prompt_id || 'N/A'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400 block mb-0.5">Model</span>
                                                                <span className="font-mono text-slate-600">{step.llm_config?.model || '(Default)'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {(!selectedScenario.workflow_config?.steps || selectedScenario.workflow_config.steps.length === 0) && (
                                            <div className="pl-6 text-slate-400 text-xs italic">暂无步骤配置</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="p-12 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-1000">
                            <ViewGridIcon className="w-24 h-24 opacity-5 mb-6 text-indigo-600" />
                            <p className="font-black text-slate-400 text-sm tracking-wide">请在侧边栏选择一个生成场景</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Scenario Editor Modal */}
            <ScenarioEditorModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveScenario}
                initialData={editingScenarioData}
                isEditing={isEditingMode}
                availableModels={availableModels}
            />

            {/* Confirmation Modal */}
            {confirmDelete && (
                <ConfirmationModal 
                    title="删除场景"
                    message={`确定要删除 "${confirmDelete.name}" 吗？该操作会将所有关联内容彻底移除，无法撤销。`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(null)}
                    confirmText="确认删除"
                />
            )}
        </div>
    );
};
