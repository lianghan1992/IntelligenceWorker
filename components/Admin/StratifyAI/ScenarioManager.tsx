
import React, { useState, useEffect, useCallback } from 'react';
import { StratifyScenario, StratifyScenarioFile } from '../../../types';
import { getScenarios, createScenario, updateScenario, deleteScenario, getScenarioFiles, updateScenarioFile, deleteScenarioFile } from '../../../api/stratify';
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, ChevronRightIcon, DocumentTextIcon, CloseIcon, CheckIcon, ViewGridIcon } from '../../icons';
import { PromptEditorModal } from './PromptEditorModal';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

export const ScenarioManager: React.FC = () => {
    const [scenarios, setScenarios] = useState<StratifyScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<StratifyScenario | null>(null);
    const [files, setFiles] = useState<StratifyScenarioFile[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFilesLoading, setIsFilesLoading] = useState(false);
    
    const [isEditingScenario, setIsEditingScenario] = useState(false);
    const [scenarioForm, setScenarioForm] = useState({ name: '', title: '', description: '' });
    
    const [editingFile, setEditingFile] = useState<StratifyScenarioFile | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'scenario' | 'file', id: string, name: string } | null>(null);

    const fetchScenarios = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getScenarios();
            setScenarios(data);
            if (data.length > 0 && !selectedScenario) {
                setSelectedScenario(data[0]);
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
            {/* Scenarios List (Left) */}
            <div className="w-72 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">场景列表</h3>
                    <button onClick={() => { 
                        setSelectedScenario(null); 
                        setScenarioForm({ name: '', title: '', description: '' });
                        setIsEditingScenario(true);
                    }} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {scenarios.map(s => (
                        <div 
                            key={s.id}
                            onClick={() => { setSelectedScenario(s); setIsEditingScenario(false); }}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedScenario?.id === s.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{s.title}</p>
                                <p className={`text-[10px] truncate ${selectedScenario?.id === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>{s.name}</p>
                            </div>
                            {selectedScenario?.id === s.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsEditingScenario(true); setScenarioForm({ name: s.name, title: s.title, description: s.description }); }}
                                    className="p-1 hover:bg-white/20 rounded"
                                >
                                    <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Prompt Workspace (Right) */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm relative">
                {isEditingScenario || (selectedScenario && !selectedScenario.id) ? (
                    <div className="p-8 max-w-2xl mx-auto w-full space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">{selectedScenario ? '编辑场景' : '新建生成场景'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">唯一标识 (Slug)</label>
                                <input 
                                    value={scenarioForm.name} 
                                    onChange={e => setScenarioForm({...scenarioForm, name: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. tech_assessment"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">显示标题</label>
                                <input 
                                    value={scenarioForm.title} 
                                    onChange={e => setScenarioForm({...scenarioForm, title: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. 深度技术评估"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">场景描述</label>
                                <textarea 
                                    value={scenarioForm.description} 
                                    onChange={e => setScenarioForm({...scenarioForm, description: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="描述该场景的用途..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsEditingScenario(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">取消</button>
                            <button onClick={handleSaveScenario} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md">保存</button>
                        </div>
                    </div>
                ) : selectedScenario ? (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 sticky top-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{selectedScenario.title}</h2>
                                <p className="text-xs text-slate-500 mt-1">{selectedScenario.description}</p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setConfirmDelete({ type: 'scenario', id: selectedScenario.id, name: selectedScenario.title })}
                                    disabled={selectedScenario.name === 'default'}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => fetchFiles(selectedScenario.id)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg">
                                    <RefreshIcon className={`w-5 h-5 ${isFilesLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar">
                            {files.map(file => (
                                <div key={file.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <DocumentTextIcon className="w-6 h-6" />
                                        </div>
                                        <button 
                                            onClick={() => setConfirmDelete({ type: 'file', id: file.id, name: file.name })}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{file.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono flex-1">
                                        Updated: {new Date(file.updated_at).toLocaleString()}
                                    </p>
                                    <button 
                                        onClick={() => setEditingFile(file)}
                                        className="mt-4 w-full py-2 bg-slate-50 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                                    >
                                        编辑提示词
                                    </button>
                                </div>
                            ))}
                            {/* New File Placeholder */}
                            <button 
                                onClick={() => setEditingFile({ id: 'new', name: '', content: '', updated_at: '' })}
                                className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-white/50"
                            >
                                <PlusIcon className="w-8 h-8 mb-2 opacity-30" />
                                <span className="font-bold text-sm">新增提示词文件</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <ViewGridIcon className="w-16 h-16 opacity-10 mb-4" />
                        <p>请选择或创建一个报告场景</p>
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
                    title={confirmDelete.type === 'scenario' ? "删除场景" : "删除提示词文件"}
                    message={`确定要删除 "${confirmDelete.name}" 吗？此操作无法撤销。`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(null)}
                    confirmText="彻底删除"
                />
            )}
        </div>
    );
};
