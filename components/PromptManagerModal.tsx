import React, { useState, useEffect, useMemo } from 'react';
import { CloseIcon, PlusIcon, TrashIcon, PencilIcon } from './icons';
import { AllPrompts, Prompt, PromptCollection } from '../types';
import { createPrompt, updatePrompt, deletePrompt } from '../api';

interface PromptManagerModalProps {
    onClose: () => void;
    promptType: 'url_extraction_prompts' | 'content_summary_prompts';
    prompts: AllPrompts;
    onUpdate: (newSelectedKey?: string) => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const defaultKeys = ['default_list_parser', 'default_summary'];

export const PromptManagerModal: React.FC<PromptManagerModalProps> = ({ onClose, promptType, prompts, onUpdate }) => {
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [mode, setMode] = useState<'view' | 'edit' | 'add'>('view');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        prompt: '',
    });

    const promptCollection: PromptCollection = prompts[promptType];
    const promptList = useMemo(() => Object.entries(promptCollection), [promptCollection]);

    useEffect(() => {
        if (selectedKey && promptCollection[selectedKey]) {
            const currentPrompt = promptCollection[selectedKey];
            setFormData({
                name: currentPrompt.name,
                description: currentPrompt.description,
                prompt: currentPrompt.prompt,
            });
            setMode('view');
        } else {
            setFormData({ name: '', description: '', prompt: '' });
            setMode('view');
        }
    }, [selectedKey, promptCollection]);

    const handleSelect = (key: string) => {
        setSelectedKey(key);
    };

    const handleAddNew = () => {
        setSelectedKey(null);
        setFormData({ name: '', description: '', prompt: '' });
        setMode('add');
    };

    const handleEdit = () => {
        if (selectedKey) setMode('edit');
    };
    
    const handleDelete = async () => {
        if (!selectedKey || defaultKeys.includes(selectedKey)) return;
        if (window.confirm(`确定要删除提示词 "${promptCollection[selectedKey].name}" 吗？`)) {
            setIsLoading(true);
            setError('');
            try {
                await deletePrompt(promptType, selectedKey);
                setSelectedKey(null);
                onUpdate();
            } catch (err: any) {
                setError(err.message || '删除失败');
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data: Prompt = { name: formData.name, description: formData.description, prompt: formData.prompt };
            if (mode === 'add') {
                // Auto-generate a unique key from the name
                let baseKey = formData.name.trim().toLowerCase()
                    .replace(/\s+/g, '_') // Replace spaces with underscores
                    .replace(/[^a-z0-9_]/g, ''); // Remove invalid characters
                
                if (!baseKey) {
                    baseKey = 'custom_prompt'; // Fallback for empty or invalid names
                }

                let finalKey = baseKey;
                let counter = 1;
                const existingKeys = Object.keys(promptCollection);

                while (existingKeys.includes(finalKey)) {
                    finalKey = `${baseKey}_${counter}`;
                    counter++;
                }
                
                await createPrompt(promptType, finalKey, data);
                onUpdate(finalKey);
            } else if (mode === 'edit' && selectedKey) {
                await updatePrompt(promptType, selectedKey, data);
                onUpdate(selectedKey);
            }
        } catch (err: any) {
            setError(err.message || '保存失败');
        } finally {
            setIsLoading(false);
        }
    };

    const canSave = formData.name && formData.description && formData.prompt;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                        管理 {promptType === 'url_extraction_prompts' ? 'URL 提取' : '内容总结'} 提示词
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Prompt List */}
                    <div className="w-1/3 border-r overflow-y-auto">
                        <div className="p-3">
                            <button onClick={handleAddNew} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700">
                                <PlusIcon className="w-5 h-5" /> 新增提示词
                            </button>
                        </div>
                        <nav>
                            <ul>
                                {promptList.map(([key, prompt]) => (
                                    <li key={key}>
                                        <button
                                            onClick={() => handleSelect(key)}
                                            className={`w-full text-left p-3 border-l-4 transition-colors ${
                                                selectedKey === key
                                                    ? 'bg-blue-50 border-blue-500'
                                                    : 'border-transparent hover:bg-gray-50'
                                            }`}
                                        >
                                            <p className="font-semibold text-sm text-gray-800">{prompt.name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-2">{prompt.description}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    {/* Right: Details & Editor */}
                    <div className="w-2/3 flex flex-col overflow-y-auto p-6">
                        {selectedKey || mode === 'add' ? (
                            <>
                                {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">名称</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} readOnly={mode === 'view'} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg read-only:bg-gray-100" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">描述</label>
                                        <textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} readOnly={mode === 'view'} rows={2} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg resize-none read-only:bg-gray-100" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">提示词内容</label>
                                        <textarea value={formData.prompt} onChange={e => setFormData(f => ({ ...f, prompt: e.target.value }))} readOnly={mode === 'view'} rows={8} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg resize-y font-mono text-xs read-only:bg-gray-100" />
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t flex justify-between">
                                    <div>
                                        {selectedKey && !defaultKeys.includes(selectedKey) && (
                                            <button onClick={handleDelete} className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 text-sm flex items-center gap-2">
                                                <TrashIcon className="w-4 h-4" /> 删除
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        {mode !== 'view' ? (
                                            <>
                                                <button onClick={() => { selectedKey ? setMode('view') : handleSelect(promptList[0]?.[0])}} className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 text-sm">取消</button>
                                                <button onClick={handleSave} disabled={!canSave || isLoading} className="w-28 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm disabled:bg-blue-300 flex items-center justify-center">
                                                    {isLoading ? <Spinner /> : '保存'}
                                                </button>
                                            </>
                                        ) : (
                                            selectedKey && !defaultKeys.includes(selectedKey) && (
                                                <button onClick={handleEdit} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                                                    <PencilIcon className="w-4 h-4" /> 编辑
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500">
                                <p>从左侧选择一个提示词进行查看或编辑，<br />或点击“新增提示词”来创建一个新的。</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};