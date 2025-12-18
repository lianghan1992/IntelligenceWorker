
import React, { useState, useEffect, useCallback } from 'react';
import { StratifyScenario, StratifyScenarioFile } from '../../../types';
import { getScenarios, createScenario, updateScenario, deleteScenario, getScenarioFiles, updateScenarioFile, deleteScenarioFile } from '../../../api/stratify';
import { PlusIcon, RefreshIcon, TrashIcon, PencilIcon, ChevronRightIcon, DocumentTextIcon, CloseIcon, CheckIcon, ViewGridIcon, CodeIcon } from '../../icons';
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
            <div className="w-64 bg-slate-900 rounded-2xl flex flex-col overflow-hidden shadow-xl border border-slate-800">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em]">Scenarios</h3>
                    <button onClick={() => { 
                        setSelectedScenario(null); 
                        setScenarioForm({ name: '', title: '', description: '' });
                        setIsEditingScenario(true);
                    }} className="p-1 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar-dark">
                    {scenarios.map(s => (
                        <div 
                            key={s.id}
                            onClick={() => { setSelectedScenario(s); setIsEditingScenario(false); }}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedScenario?.id === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{s.title}</p>
                                <p className={`text-[10px] truncate ${selectedScenario?.id === s.id ? 'text-indigo-200' : 'text-slate-500'}`}>{s.name}</p>
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
            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-inner relative">
                {isEditingScenario || (selectedScenario && !selectedScenario.id) ? (
                    <div className="p-8 max-w-xl mx-auto w-full space-y-6 mt-10 bg-white rounded-3xl shadow-xl border border-slate-100">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedScenario ? '编辑场景属性' : '创建新报告场景'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">场景标识 (Unique Slug)</label>
                                <input 
                                    value={scenarioForm.name} 
                                    onChange={e => setScenarioForm({...scenarioForm, name: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. general_ppt_gen"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">显示名称</label>
                                <input 
                                    value={scenarioForm.title} 
                                    onChange={e => setScenarioForm({...scenarioForm, title: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. 通用PPT报告生成"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">功能描述</label>
                                <textarea 
                                    value={scenarioForm.description} 
                                    onChange={e => setScenarioForm({...scenarioForm, description: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-28 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                                    placeholder="描述该场景的用途和特点..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setIsEditingScenario(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800">取消</button>
                            <button onClick={handleSaveScenario} className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 shadow-lg shadow-slate-200 transition-all active:scale-95">保存场景</button>
                        </div>
                    </div>
                ) : selectedScenario ? (
                    <>
                        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">{selectedScenario.title}</h2>
                                    <span className="text-[10px] font-mono text-slate-400">#{selectedScenario.name}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{selectedScenario.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => fetchFiles(selectedScenario.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                    <RefreshIcon className={`w-5 h-5 ${isFilesLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button 
                                    onClick={() => setConfirmDelete({ type: 'scenario', id: selectedScenario.id, name: selectedScenario.title })}
                                    disabled={selectedScenario.name === 'default'}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 custom-scrollbar">
                            {files.map((file, idx) => {
                                // 简单的颜色映射，让界面不单调
                                const colors = ['border-indigo-200 text-indigo-600 bg-indigo-50/30', 'border-purple-200 text-purple-600 bg-purple-50/30', 'border-blue-200 text-blue-600 bg-blue-50/30', 'border-emerald-200 text-emerald-600 bg-emerald-50/30', 'border-amber-200 text-amber-600 bg-amber-50/30'];
                                const colorClass = colors[idx % colors.length];
                                
                                return (
                                    <div 
                                        key={file.id} 
                                        className={`group relative bg-white p-4 rounded-2xl border-2 transition-all hover:shadow-xl hover:-translate-y-1 ${colorClass.split(' ')[0]} cursor-default`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`p-1.5 rounded-lg ${colorClass.split(' ')[2]} ${colorClass.split(' ')[1]}`}>
                                                <CodeIcon className="w-4 h-4" />
                                            </div>
                                            <button 
                                                onClick={() => setConfirmDelete({ type: 'file', id: file.id, name: file.name })}
                                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <h4 className="font-black text-slate-800 text-xs mb-1 truncate" title={file.name}>{file.name}</h4>
                                        <p className="text-[9px] text-slate-400 font-mono mb-4">
                                            {new Date(file.updated_at).toLocaleDateString()}
                                        </p>
                                        <button 
                                            onClick={() => setEditingFile(file)}
                                            className={`w-full py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 bg-slate-900 text-white hover:bg-indigo-600`}
                                        >
                                            编辑指令
                                        </button>
                                    </div>
                                );
                            })}
                            
                            {/* Compact Add Button */}
                            <button 
                                onClick={() => setEditingFile({ id: 'new', name: '', content: '', updated_at: '' })}
                                className="group h-[142px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-indigo-400 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all"
                            >
                                <PlusIcon className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-[10px] uppercase tracking-wider">Add Prompt</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <div className="p-8 bg-white rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-700">
                            <ViewGridIcon className="w-20 h-20 opacity-10 mb-4" />
                            <p className="font-bold text-sm text-slate-400">请选择侧边栏中的场景以管理提示词</p>
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
                    title={confirmDelete.type === 'scenario' ? "删除场景" : "删除提示词"}
                    message={`确定要彻底移除 "${confirmDelete.name}" 吗？该操作不可恢复。`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(null)}
                    confirmText="彻底删除"
                />
            )}
        </div>
    );
};
