
import React, { useState, useEffect } from 'react';
import { StratifyScenarioFile } from '../../../types';
import { updateScenarioFile } from '../../../api/stratify';
import { CloseIcon, CheckIcon, CodeIcon } from '../../icons';

interface PromptEditorModalProps {
    file: StratifyScenarioFile;
    scenarioId: string;
    onClose: () => void;
    onSave: () => void;
    availableModels: string[];
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ file, scenarioId, onClose, onSave, availableModels }) => {
    const [name, setName] = useState(file.name);
    const [content, setContent] = useState(file.content);
    const [model, setModel] = useState(file.model || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await updateScenarioFile(scenarioId, name, content, model || undefined);
            onSave();
        } catch (e) {
            alert('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Modal Header */}
                <div className="px-10 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-5 flex-1">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
                            <CodeIcon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Instruction Editor</span>
                            {file.id === 'new' ? (
                                <input 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="bg-transparent border-b border-indigo-200 text-slate-800 font-black text-xl focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="Enter filename.md"
                                    autoFocus
                                />
                            ) : (
                                <h3 className="font-black text-slate-800 text-xl tracking-tight">{file.name}</h3>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || !name.trim()}
                            className="px-10 py-3.5 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 shadow-2xl shadow-indigo-200 flex items-center gap-3 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <CheckIcon className="w-5 h-5" />}
                            <span>保存指令</span>
                        </button>
                    </div>
                </div>

                {/* Toolbar for Model Config */}
                <div className="px-8 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Override:</label>
                    <select 
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-mono text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="">(Inherit from Scenario)</option>
                        {availableModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {/* Editor Content Area - Focus on Editor */}
                <div className="flex-1 flex flex-col bg-[#0f172a] relative">
                    <div className="absolute top-6 right-10 text-[10px] font-black text-indigo-400/30 uppercase tracking-[0.4em] pointer-events-none select-none z-10">Markdown Console</div>
                    
                    {/* Visual Line Numbers Decoration */}
                    <div className="absolute left-0 top-0 bottom-0 w-14 bg-slate-900/50 border-r border-slate-800/50 flex flex-col items-center pt-10 text-[11px] font-mono text-slate-600 select-none opacity-50">
                        {[...Array(30)].map((_, i) => <div key={i} className="h-6 flex items-center">{i + 1}</div>)}
                    </div>

                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="flex-1 w-full h-full bg-transparent text-indigo-50 font-mono text-sm pl-20 pr-12 py-10 outline-none resize-none leading-relaxed custom-scrollbar-dark selection:bg-indigo-500/30"
                        placeholder="# 在此处编写您的专家指令...\n\n支持 Markdown 格式，系统将解析此文件作为 AI Agent 的执行动作。"
                        spellCheck={false}
                    />
                    
                    {/* Compact Status Bar */}
                    <div className="h-10 bg-slate-950 border-t border-slate-800/50 px-8 flex items-center justify-between">
                        <div className="flex gap-6">
                            <span className="text-[10px] text-slate-500 font-black flex items-center gap-1.5 uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                Encoding: UTF-8
                            </span>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Length: {content.length} chars</span>
                        </div>
                        <span className="text-[10px] text-indigo-400/40 font-black italic tracking-widest">StratifyAI CORE ENGINE v3.1</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
