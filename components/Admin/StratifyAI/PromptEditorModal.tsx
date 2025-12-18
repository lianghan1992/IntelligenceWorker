
import React, { useState, useEffect } from 'react';
import { StratifyScenarioFile } from '../../../types';
import { updateScenarioFile } from '../../../api/stratify';
import { CloseIcon, DocumentTextIcon, CheckIcon } from '../../icons';

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
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900 animate-in fade-in duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center flex-shrink-0 shadow-xl">
                <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <DocumentTextIcon className="w-5 h-5" />
                    </div>
                    {file.id === 'new' ? (
                        <input 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="bg-slate-700 text-white border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 w-80 font-mono"
                            placeholder="filename.md"
                        />
                    ) : (
                        <h3 className="font-bold text-white text-lg font-mono">{file.name}</h3>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-900/40 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <CheckIcon className="w-5 h-5" />}
                        保存提示词
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Markdown Editor */}
                <div className="flex-1 flex flex-col bg-[#0f172a] relative">
                    <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest pointer-events-none">Editor</div>
                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="flex-1 w-full h-full bg-transparent text-slate-300 font-mono text-sm p-10 outline-none resize-none leading-relaxed custom-scrollbar-dark"
                        placeholder="# 在此处输入提示词指令 (Markdown格式)..."
                        spellCheck={false}
                    />
                </div>
                
                {/* Preview / Cheat Sheet (Optional split) */}
                <div className="hidden lg:flex w-[400px] border-l border-slate-700 bg-slate-800 flex-col overflow-y-auto p-8 text-slate-400 text-sm space-y-6">
                    <div>
                        <h4 className="font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">Prompt Variables</h4>
                        <div className="space-y-3">
                            <code className="block p-2 bg-slate-900 rounded border border-slate-700 text-indigo-400">{"{{ user_input }}"}</code>
                            <p className="text-xs">用户的原始输入主题或想法。</p>
                            
                            <code className="block p-2 bg-slate-900 rounded border border-slate-700 text-indigo-400">{"{{ current_outline }}"}</code>
                            <p className="text-xs">当前生成的大纲 JSON (用于微调阶段)。</p>
                            
                            <code className="block p-2 bg-slate-900 rounded border border-slate-700 text-indigo-400">{"{{ reference_materials }}"}</code>
                            <p className="text-xs">用户注入的参考资料文本汇总。</p>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-slate-700">
                        <h4 className="font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">Output Convention</h4>
                        <p className="text-xs leading-relaxed">
                            为了配合前端 Plumber 模式，请确保：
                            <br/><br/>
                            1. 生成大纲时必须输出符合规范的 JSON。<br/>
                            2. 章节内容应为标准 Markdown。<br/>
                            3. 所有的 JSON 必须包裹在 ```json ``` 块中。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
