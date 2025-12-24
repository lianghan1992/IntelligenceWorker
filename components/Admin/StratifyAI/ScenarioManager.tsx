
import React, { useState, useEffect, useCallback } from 'react';
import { StratifyScenario, StratifyScenarioFile } from '../../../types';
import { getScenarios, createScenario, updateScenario, deleteScenario, getScenarioFiles, deleteScenarioFile, getAvailableModels } from '../../../api/stratify';
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, CodeIcon, CloseIcon, CheckIcon, ViewGridIcon } from '../../icons';
import { PromptEditorModal } from './PromptEditorModal';
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
            setWorkflowConfig(initialData?.workflow_config || { input_schema: { fields: [] }, steps: [] });
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
            <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 h-[85vh]">
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
                    <div className="w-full md:w-1/3 p-6 space-y-5 overflow-y-auto custom-scrollbar border-r border-slate-100 bg-white">
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
                    <div className="flex-1 p-6 bg-slate-50/50 flex flex-col overflow-hidden">
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
    const [files, setFiles] = useState<StratifyScenarioFile[]>([]);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFilesLoading, setIsFilesLoading] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScenarioData, setEditingScenarioData] = useState<{ name: string; title: string; description: string; default_model?: string; workflow_config?: any } | undefined>(undefined);
    const [isEditingMode, setIsEditingMode] = useState(false);
    
    const [editingFile, setEditingFile] = useState<StratifyScenarioFile | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'scenario' | 'file', id: string, name: string } | null>(null);

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

    const fetchFiles = useCallback(async (sid: string) => {
        setIsFilesLoading(true);
        try {
            const data = await getScenarioFiles(sid);
            setFiles(data);
        } catch (e) { console.error(e); }
        finally { setIsFilesLoading(false); }
    }, []);

    useEffect(() => { 
        if (selectedScenario) fetchFiles(selectedScenario.id); 
    }, [selectedScenario, fetchFiles]);

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
                setFiles([]); // New scenario has no files
            }
        } catch (e) {
            alert('保存失败，请检查网络或重试');
            throw e;
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'scenario') {
                await deleteScenario(confirmDelete.id);
                setScenarios(prev => prev.filter(s => s.id !== confirmDelete.id));
                if (selectedScenario?.id === confirmDelete.id) {
                    setSelectedScenario(null);
                    setFiles([]);
                }
            } else {
                if (selectedScenario) {
                    await deleteScenarioFile(selectedScenario.id, confirmDelete.name);
                    fetchFiles(selectedScenario.id);
                }
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

            {/* Prompt Workspace (Right) */}
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
                                <button onClick={() => fetchFiles(selectedScenario.id)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                    <RefreshIcon className={`w-5 h-5 ${isFilesLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button 
                                    onClick={() => setConfirmDelete({ type: 'scenario', id: selectedScenario.id, name: selectedScenario.title })}
                                    disabled={selectedScenario.name === 'default'} // Default scenario protection
                                    className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Files Grid */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 custom-scrollbar">
                            {files.map((file, idx) => {
                                // Dynamic theme for each card to avoid "素"
                                const themes = [
                                    { border: 'border-indigo-200', icon: 'text-indigo-600 bg-indigo-50', btn: 'bg-indigo-600' },
                                    { border: 'border-emerald-200', icon: 'text-emerald-600 bg-emerald-50', btn: 'bg-emerald-600' },
                                    { border: 'border-purple-200', icon: 'text-purple-600 bg-purple-50', btn: 'bg-purple-600' },
                                    { border: 'border-blue-200', icon: 'text-blue-600 bg-blue-50', btn: 'bg-blue-600' },
                                    { border: 'border-amber-200', icon: 'text-amber-600 bg-amber-50', btn: 'bg-amber-600' }
                                ];
                                const theme = themes[idx % themes.length];

                                return (
                                    <div 
                                        key={file.id} 
                                        className={`group relative bg-white p-5 rounded-3xl border-2 transition-all hover:shadow-2xl hover:-translate-y-1 ${theme.border} h-fit`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2 rounded-2xl shadow-inner ${theme.icon}`}>
                                                <CodeIcon className="w-5 h-5" />
                                            </div>
                                            <button 
                                                onClick={() => setConfirmDelete({ type: 'file', id: file.id, name: file.name })}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <h4 className="font-black text-slate-800 text-sm mb-1 truncate leading-tight" title={file.name}>
                                            {file.name}
                                        </h4>
                                        <div className="flex flex-col gap-1 mb-6">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(file.updated_at).toLocaleDateString()}
                                            </p>
                                            {file.model && (
                                                <p className="text-[9px] font-mono text-indigo-400 truncate" title={file.model}>
                                                    {file.model}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => setEditingFile(file)}
                                            className={`w-full py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 ${theme.btn} hover:brightness-110`}
                                        >
                                            Edit Prompt
                                        </button>
                                    </div>
                                );
                            })}
                            
                            {/* New Prompt Card */}
                            <button 
                                onClick={() => setEditingFile({ id: 'new', name: '', content: '', updated_at: '' })}
                                className="group h-[180px] border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-300 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all duration-300"
                            >
                                <PlusIcon className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-black text-[10px] uppercase tracking-widest">New Instruction</span>
                            </button>
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

            {/* Prompt Editor Modal */}
            {editingFile && selectedScenario && (
                <PromptEditorModal 
                    file={editingFile} 
                    scenarioId={selectedScenario.id}
                    onClose={() => setEditingFile(null)} 
                    onSave={() => { setEditingFile(null); fetchFiles(selectedScenario.id); }}
                    availableModels={availableModels}
                />
            )}

            {/* Confirmation Modal */}
            {confirmDelete && (
                <ConfirmationModal 
                    title={confirmDelete.type === 'scenario' ? "删除场景" : "移除指令"}
                    message={`确定要删除 "${confirmDelete.name}" 吗？该操作会将所有关联内容彻底移除，无法撤销。`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(null)}
                    confirmText="确认删除"
                />
            )}
        </div>
    );
};
