
import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CodeIcon, ViewListIcon, MenuIcon, ChevronRightIcon, ChevronUpDownIcon } from '../../icons';

interface WorkflowEditorProps {
    value: any;
    onChange: (newValue: any) => void;
}

type Tab = 'inputs' | 'flow' | 'json';

const UI_COMPONENTS = [
    { value: 'ChatBubble', label: '对话气泡 (思考/分析)' },
    { value: 'MarkdownEditor', label: '文档编辑器 (生成/撰写)' },
    { value: 'HtmlRenderer', label: 'HTML 预览 (排版)' },
    { value: 'InputForm', label: '表单输入' }
];

const INPUT_TYPES = [
    { value: 'text', label: '单行文本' },
    { value: 'textarea', label: '多行文本' },
    { value: 'select', label: '下拉选择' },
    { value: 'file', label: '文件上传' }
];

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ value, onChange }) => {
    const [activeTab, setActiveTab] = useState<Tab>('flow');
    const [jsonError, setJsonError] = useState('');
    const [localJson, setLocalJson] = useState('');

    // Initialize local state from props
    useEffect(() => {
        setLocalJson(JSON.stringify(value || { input_schema: { fields: [] }, steps: [] }, null, 2));
    }, [value]);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setLocalJson(newVal);
        try {
            const parsed = JSON.parse(newVal);
            setJsonError('');
            onChange(parsed);
        } catch (e) {
            setJsonError('无效的 JSON 格式');
        }
    };

    // --- Helpers for Structured Editing ---
    
    const getSafeValue = () => {
        try {
            return value || { input_schema: { fields: [] }, steps: [] };
        } catch (e) {
            return { input_schema: { fields: [] }, steps: [] };
        }
    };

    const updateFields = (newFields: any[]) => {
        const current = getSafeValue();
        const newVal = {
            ...current,
            input_schema: { ...current.input_schema, fields: newFields }
        };
        onChange(newVal);
    };

    const updateSteps = (newSteps: any[]) => {
        const current = getSafeValue();
        const newVal = {
            ...current,
            steps: newSteps
        };
        onChange(newVal);
    };

    // --- Inputs Tab Logic ---

    const addField = () => {
        const currentFields = getSafeValue().input_schema?.fields || [];
        updateFields([...currentFields, { name: 'new_field', label: '新字段', type: 'text', required: true }]);
    };

    const removeField = (idx: number) => {
        const currentFields = getSafeValue().input_schema?.fields || [];
        updateFields(currentFields.filter((_: any, i: number) => i !== idx));
    };

    const updateField = (idx: number, key: string, val: any) => {
        const currentFields = [...(getSafeValue().input_schema?.fields || [])];
        currentFields[idx] = { ...currentFields[idx], [key]: val };
        updateFields(currentFields);
    };

    // --- Steps Tab Logic ---

    const addStep = () => {
        const currentSteps = getSafeValue().steps || [];
        const id = `step_${currentSteps.length + 1}`;
        updateSteps([...currentSteps, { 
            id, 
            name: '新步骤', 
            prompt_file: '', 
            ui_component: 'ChatBubble',
            auto_run: true 
        }]);
    };

    const removeStep = (idx: number) => {
        const currentSteps = getSafeValue().steps || [];
        updateSteps(currentSteps.filter((_: any, i: number) => i !== idx));
    };

    const updateStep = (idx: number, key: string, val: any) => {
        const currentSteps = [...(getSafeValue().steps || [])];
        currentSteps[idx] = { ...currentSteps[idx], [key]: val };
        updateSteps(currentSteps);
    };

    const config = getSafeValue();

    return (
        <div className="flex flex-col h-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('inputs')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'inputs' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <MenuIcon className="w-4 h-4" /> 输入表单
                    </button>
                    <button 
                        onClick={() => setActiveTab('flow')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'flow' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <ViewListIcon className="w-4 h-4" /> 流程编排
                    </button>
                    <button 
                        onClick={() => setActiveTab('json')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'json' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <CodeIcon className="w-4 h-4" /> 源代码
                    </button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                    Workflow Config
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                
                {/* --- INPUTS EDITOR --- */}
                {activeTab === 'inputs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-slate-500">定义用户在开始任务前需要填写的信息。</p>
                            <button onClick={addField} className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded">
                                <PlusIcon className="w-3 h-3" /> 添加字段
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {(config.input_schema?.fields || []).map((field: any, idx: number) => (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 group">
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">字段 ID (Key)</label>
                                            <input 
                                                value={field.name} 
                                                onChange={e => updateField(idx, 'name', e.target.value)}
                                                className="w-full text-sm font-mono border-b border-slate-200 focus:border-indigo-500 outline-none py-1"
                                                placeholder="e.g. topic"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">显示名称 (Label)</label>
                                            <input 
                                                value={field.label} 
                                                onChange={e => updateField(idx, 'label', e.target.value)}
                                                className="w-full text-sm border-b border-slate-200 focus:border-indigo-500 outline-none py-1"
                                                placeholder="e.g. 研究主题"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">类型</label>
                                            <select 
                                                value={field.type} 
                                                onChange={e => updateField(idx, 'type', e.target.value)}
                                                className="w-full text-sm border-b border-slate-200 focus:border-indigo-500 outline-none py-1 bg-transparent"
                                            >
                                                {INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={() => removeField(idx)} className="text-slate-300 hover:text-red-500 self-end mb-1">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={field.required} 
                                            onChange={e => updateField(idx, 'required', e.target.checked)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs text-slate-600">必填项</span>
                                        
                                        {field.type === 'select' && (
                                            <input 
                                                value={field.options?.join(',') || ''}
                                                onChange={e => updateField(idx, 'options', e.target.value.split(','))}
                                                className="flex-1 ml-4 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                placeholder="选项 (逗号分隔), e.g. 简报,深度报告"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(config.input_schema?.fields || []).length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-xs bg-white rounded-xl border border-dashed">暂无输入字段</div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- FLOW EDITOR --- */}
                {activeTab === 'flow' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-slate-500">定义 Agent 执行的顺序步骤。</p>
                            <button onClick={addStep} className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded">
                                <PlusIcon className="w-3 h-3" /> 添加步骤
                            </button>
                        </div>

                        <div className="space-y-4 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 -z-10"></div>
                            
                            {(config.steps || []).map((step: any, idx: number) => (
                                <div key={idx} className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm flex-shrink-0 z-10">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">步骤 ID</label>
                                                <input 
                                                    value={step.id} 
                                                    onChange={e => updateStep(idx, 'id', e.target.value)}
                                                    className="w-full text-sm font-mono border rounded px-2 py-1.5 focus:border-indigo-500 outline-none bg-slate-50"
                                                    placeholder="e.g. analyze"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">步骤名称</label>
                                                <input 
                                                    value={step.name} 
                                                    onChange={e => updateStep(idx, 'name', e.target.value)}
                                                    className="w-full text-sm border rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                                    placeholder="e.g. 需求分析"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">关联 Prompt 文件</label>
                                                <input 
                                                    value={step.prompt_file} 
                                                    onChange={e => updateStep(idx, 'prompt_file', e.target.value)}
                                                    className="w-full text-sm font-mono border rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                                    placeholder="e.g. 01_analyze.md"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">UI 组件</label>
                                                <select 
                                                    value={step.ui_component} 
                                                    onChange={e => updateStep(idx, 'ui_component', e.target.value)}
                                                    className="w-full text-sm border rounded px-2 py-1.5 focus:border-indigo-500 outline-none bg-white"
                                                >
                                                    {UI_COMPONENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={step.auto_run !== false} 
                                                    onChange={e => updateStep(idx, 'auto_run', e.target.checked)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                自动执行
                                            </label>
                                            <button onClick={() => removeStep(idx)} className="text-slate-300 hover:text-red-500 text-xs flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded transition-colors">
                                                <TrashIcon className="w-3.5 h-3.5" /> 删除步骤
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                             {(config.steps || []).length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-xs bg-white rounded-xl border border-dashed ml-12">点击上方“添加步骤”开始编排</div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- JSON EDITOR --- */}
                {activeTab === 'json' && (
                    <div className="h-full flex flex-col">
                         <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-xs mb-2 border border-amber-100">
                             高级模式：直接编辑底层配置。请确保 JSON 格式正确。
                         </div>
                        <textarea 
                            value={localJson}
                            onChange={handleJsonChange}
                            className="w-full flex-1 bg-[#0f172a] text-slate-300 border border-slate-800 rounded-xl px-4 py-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                            spellCheck={false}
                        />
                        {jsonError && <div className="mt-2 text-red-500 text-xs font-bold">{jsonError}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};
