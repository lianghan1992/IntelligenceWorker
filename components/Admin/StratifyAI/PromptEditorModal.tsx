
import React, { useState, useEffect } from 'react';
import { StratifyScenarioFile } from '../../../types';
import { updateScenarioFile } from '../../../api/stratify';
import { CloseIcon, DocumentTextIcon, CheckIcon, CodeIcon } from '../../icons';

interface PromptEditorModalProps {
    file: StratifyScenarioFile;
    scenarioId: string;
    onClose: () => void;
    onSave: () => void;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ file, scenarioId, onClose, onSave }) => {
    const [name, setName] = useState(file.name);
    const [content, setContent] = useState(file.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await updateScenarioFile(scenarioId, name, content);
            onSave();
        } catch (e) {
            alert('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Modal Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <CodeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Prompt Editor</span>
                            {file.id === 'new' ? (
                                <input 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="bg-transparent border-b border-indigo-200 text-slate-800 font-bold text-lg focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="请输入文件名.md"
                                    autoFocus
                                />
                            ) : (
                                <h3 className="font-black text-slate-800 text-lg tracking-tight">{file.name}</h3>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || !name.trim()}
                            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 shadow-xl shadow-slate-200 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <CheckIcon className="w-4 h-4" />}
                            保存更改
                        </button>
                    </div>
                </div>

                {/* Editor Content Area */}
                <div className="flex-1 flex flex-col bg-[#0f172a] relative">
                    <div className="absolute top-4 right-6 text-[10px] font-bold text-indigo-400/40 uppercase tracking-[0.3em] pointer-events-none select-none z-10">Markdown Prompt Console</div>
                    
                    {/* Line Numbers Decoration */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900/50 border-r border-slate-800 flex flex-col items-center pt-8 text-[10px] font-mono text-slate-600 select-none">
                        {[...Array(20)].map((_, i) => <div key={i} className="h-6 flex items-center">{i + 1}</div>)}
                    </div>

                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="flex-1 w-full h-full bg-transparent text-indigo-100 font-mono text-sm pl-16 pr-10 py-8 outline-none resize-none leading-relaxed custom-scrollbar-dark selection:bg-indigo-500/30"
                        placeholder="# 在此输入提示词指令...\n\n你可以使用 {{变量}} 语法来引用上下文。"
                        spellCheck={false}
                    />
                    
                    {/* Bottom Status Bar */}
                    <div className="h-8 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between">
                        <div className="flex gap-4">
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                UTF-8
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">CHARS: {content.length}</span>
                        </div>
                        <span className="text-[10px] text-indigo-400/60 font-black italic">StratifyAI PROMPT ENGINE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
