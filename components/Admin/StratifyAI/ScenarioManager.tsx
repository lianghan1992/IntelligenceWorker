
import React, { useState, useEffect, useCallback } from 'react';
import { StratifyScenario, StratifyScenarioFile } from '../../../types';
import { getScenarios, createScenario, updateScenario, deleteScenario, getScenarioFiles, updateScenarioFile, deleteScenarioFile, getAvailableModels } from '../../../api/stratify';
// Added SparklesIcon to the imports
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, ChevronRightIcon, DocumentTextIcon, CloseIcon, CheckIcon, ViewGridIcon, CodeIcon, GearIcon, SparklesIcon } from '../../icons';
import { PromptEditorModal } from './PromptEditorModal';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

export const ScenarioManager: React.FC = () => {
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<StratifyScenario | null>(null);
    const [files, setFiles] = useState<StratifyScenarioFile[]>([]);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFilesLoading, setIsFilesLoading] = useState(false);
    
    const [isEditingScenario, setIsEditingScenario] = useState(false);
    const [scenarioForm, setScenarioForm] = useState({ name: '', title: '', description: '', model_config: '' });
    
    const [editingFile, setEditingFile] = useState<StratifyScenarioFile | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'scenario' | 'file', id: string, name: string } | null>(null);

    const fetchScenarios = useCallback(async () => {
        setIsLoading(true);
        try {
            const [scenarioData, modelData] = await Promise.all([
                getScenarios(),
                getAvailableModels()
            ]);
            setScenarios(scenarioData);
            setAvailableModels(modelData);
            if (scenarioData.length > 0 && !selectedScenario) {
                setSelectedScenario(scenarioData[0]);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [selectedScenario]);

    const fetchFiles = useCallback(async (sid: string) => {
        setIsFilesLoading(true);
        try {
            const data = await getScenarioFiles(sid);
            setFiles(data);
        } catch (e) { console.error(e); }
        finally { setIsFilesLoading(false); }
    }, []);

    useEffect(() => { fetchScenarios(); }, [fetchScenarios]);
    useEffect(() => { 
        if (selectedScenario) fetchFiles(selectedScenario.id); 
    }, [selectedScenario, fetchFiles]);

    const handleSaveScenario = async () => {
        if (!scenarioForm.name || !scenarioForm.title) return;
        try {
            if (selectedScenario && isEditingScenario && selectedScenario.id !== 'new') {
                await updateScenario(selectedScenario.id, scenarioForm);
            } else {
                await createScenario(scenarioForm);
            }
            setIsEditingScenario(false);
            fetchScenarios();
        } catch (e) { alert('保存失败'); }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'scenario') {
                await deleteScenario(confirmDelete.id);
                setSelectedScenario(null);
                fetchScenarios();
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
            <div className="w-64 bg-slate-900 rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-slate-800">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.2em]">Scenario List</h3>
                    <button onClick={() => { 
                        setSelectedScenario(null); 
                        setScenarioForm({ name: '', title: '', description: '', model_config: '' });
                        setIsEditingScenario(true);
                    }} className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar-dark">
                    {scenarios.map(s => (
                        <div 
                            key={s.id}
                            onClick={() => { setSelectedScenario(s); setIsEditingScenario(false); }}
                            className={`group flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all ${selectedScenario?.id === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{s.title}</p>
                                <p className={`text-[10px] truncate ${selectedScenario?.id === s.id ? 'text-indigo-200' : 'text-slate-500'}`}>{s.name}</p>
                            </div>
                            {selectedScenario?.id === s.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsEditingScenario(true); setScenarioForm({ name: s.name, title: s.title, description: s.description, model_config: s.model_config || '' }); }}
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
                {isEditingScenario || (selectedScenario && !selectedScenario.id) ? (
                    <div className="p-10 max-w-2xl mx-auto w-full space-y-8 mt-12 bg-white rounded-[40px] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedScenario ? '编辑场景设置' : '定义新生成场景'}</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">唯一标识 (Unique Slug)</label>
                                <input 
                                    value={scenarioForm.name} 
                                    onChange={e => setScenarioForm({...scenarioForm, name: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. market_insight_pro"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">显示标题</label>
                                <input 
                                    value={scenarioForm.title} 
                                    onChange={e => setScenarioForm({...scenarioForm, title: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. 深度市场洞察"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                    <SparklesIcon className="w-3 h-3" /> 指定执行模型 (LLM Engine)
                                </label>
                                <select 
                                    value={scenarioForm.model_config}
                                    onChange={e => setScenarioForm({...scenarioForm, model_config: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">跟随系统默认 (mistral-devstral)</option>
                                    {availableModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">场景描述</label>
                                <textarea 
                                    value={scenarioForm.description} 
                                    onChange={e => setScenarioForm({...scenarioForm, description: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                                    placeholder="该场景下 AI 将扮演何种专家角色？"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => setIsEditingScenario(false)} className="px-8 py-3 text-slate-500 font-bold text-sm hover:text-slate-800">取消</button>
                            <button onClick={handleSaveScenario} className="px-10 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all active:scale-95">保存场景</button>
                        </div>
                    </div>
                ) : selectedScenario ? (
                    <>
                        {/* Selected Scenario Header */}
                        <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedScenario.title}</h2>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-tighter">ID: {selectedScenario.name}</span>
                                    {selectedScenario.model_config && (
                                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                                            <SparklesIcon className="w-2.5 h-2.5" /> {selectedScenario.model_config}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 font-medium">{selectedScenario.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => fetchFiles(selectedScenario.id)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                    <RefreshIcon className={`w-5 h-5 ${isFilesLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button 
                                    onClick={() => setConfirmDelete({ type: 'scenario', id: selectedScenario.id, name: selectedScenario.title })}
                                    disabled={selectedScenario.name === 'default'}
                                    className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Files Grid - Smaller & More Colorful Cards */}
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
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                            {new Date(file.updated_at).toLocaleDateString()}
                                        </p>
                                        
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
                                className="group h-[162px] border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-300 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all duration-300"
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

            {editingFile && selectedScenario && (
                <PromptEditorModal 
                    file={editingFile} 
                    scenarioId={selectedScenario.id}
                    onClose={() => setEditingFile(null)} 
                    onSave={() => { setEditingFile(null); fetchFiles(selectedScenario.id); }} 
                />
            )}

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
