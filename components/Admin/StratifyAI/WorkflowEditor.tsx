
import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CodeIcon, ViewListIcon, MenuIcon, ChevronDownIcon, ChevronRightIcon, LightningBoltIcon, FilterIcon, DocumentTextIcon } from '../../icons';
import { WorkflowConfig, StratifyPrompt, LLMChannel } from '../../../types';
import { getPrompts, getChannels } from '../../../api/stratify';

interface WorkflowEditorProps {
    value: WorkflowConfig | any;
    onChange: (newValue: any) => void;
}

type Tab = 'variables' | 'steps' | 'json';

const UI_COMPONENTS = [
    { value: 'ChatBubble', label: '对话气泡 (思考/分析)' },
    { value: 'MarkdownEditor', label: '文档编辑器 (生成/撰写)' },
    { value: 'HtmlRenderer', label: 'HTML 预览 (排版)' },
    { value: 'InputForm', label: '表单输入' }
];

const VARIABLE_TYPES = [
    { value: 'text', label: '单行文本' },
    { value: 'textarea', label: '多行文本' },
    { value: 'select', label: '下拉选择' },
    { value: 'file', label: '文件上传' },
    { value: 'boolean', label: '布尔开关' }
];

const STEP_TYPES = [
    { value: 'generation', label: 'AI 生成' },
    { value: 'user_input', label: '用户输入' },
    { value: 'approval', label: '人工审批' }
];

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ value, onChange }) => {
    const [activeTab, setActiveTab] = useState<Tab>('steps');
    const [localJson, setLocalJson] = useState('');
    const [jsonError, setJsonError] = useState('');
    
    // Metadata for dropdowns
    const [prompts, setPrompts] = useState<StratifyPrompt[]>([]);
    const [channels, setChannels] = useState<LLMChannel[]>([]);
    
    // Expanded step state
    const [expandedStepIdx, setExpandedStepIdx] = useState<number | null>(null);

    useEffect(() => {
        // Load metadata
        getPrompts().then(setPrompts);
        getChannels().then(setChannels);
    }, []);

    useEffect(() => {
        setLocalJson(JSON.stringify(value || { variables: [], steps: [] }, null, 2));
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

    const getSafeConfig = (): WorkflowConfig => {
        const defaultCfg = { variables: [], steps: [] };
        if (!value) return defaultCfg;
        
        // Basic schema check
        if (!Array.isArray(value.variables)) value.variables = [];
        if (!Array.isArray(value.steps)) value.steps = [];
        
        return value as WorkflowConfig;
    };

    const updateConfig = (updater: (cfg: WorkflowConfig) => void) => {
        const current = JSON.parse(JSON.stringify(getSafeConfig())); // Deep copy
        updater(current);
        onChange(current);
    };

    // --- Variable Helpers ---
    const addVariable = () => {
        updateConfig(cfg => {
            cfg.variables.push({ name: 'new_var', label: '新变量', type: 'text', required: true });
        });
    };

    const removeVariable = (idx: number) => {
        updateConfig(cfg => {
            cfg.variables.splice(idx, 1);
        });
    };

    const updateVariable = (idx: number, key: string, val: any) => {
        updateConfig(cfg => {
            (cfg.variables[idx] as any)[key] = val;
        });
    };

    // --- Step Helpers ---
    const addStep = () => {
        updateConfig(cfg => {
            const newId = `step_${cfg.steps.length + 1}`;
            cfg.steps.push({
                id: newId,
                name: '新步骤',
                type: 'generation',
                ui: { component: 'MarkdownEditor', editable: true }
            });
            setExpandedStepIdx(cfg.steps.length - 1);
        });
    };

    const removeStep = (idx: number) => {
        updateConfig(cfg => {
            cfg.steps.splice(idx, 1);
        });
        setExpandedStepIdx(null);
    };

    const updateStep = (idx: number, key: string, val: any) => {
        updateConfig(cfg => {
            (cfg.steps[idx] as any)[key] = val;
        });
    };
    
    const updateStepNested = (idx: number, parentKey: string, key: string, val: any) => {
        updateConfig(cfg => {
            if (!(cfg.steps[idx] as any)[parentKey]) (cfg.steps[idx] as any)[parentKey] = {};
            (cfg.steps[idx] as any)[parentKey][key] = val;
        });
    };

    const config = getSafeConfig();

    return (
        <div className="flex flex-col h-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('variables')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'variables' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <MenuIcon className="w-4 h-4" /> 全局变量
                    </button>
                    <button onClick={() => setActiveTab('steps')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'steps' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <ViewListIcon className="w-4 h-4" /> 流程编排
                    </button>
                    <button onClick={() => setActiveTab('json')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'json' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <CodeIcon className="w-4 h-4" /> 源代码
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                
                {/* --- VARIABLES TAB --- */}
                {activeTab === 'variables' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-slate-500">定义任务启动时需要的输入字段。</p>
                            <button onClick={addVariable} className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded">
                                <PlusIcon className="w-3 h-3" /> 添加变量
                            </button>
                        </div>
                        <div className="space-y-3">
                            {config.variables.map((v, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 hover:border-indigo-200 transition-colors">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Variable Name (Key)</label>
                                            <input 
                                                value={v.name} 
                                                onChange={e => updateVariable(idx, 'name', e.target.value)} 
                                                className="w-full text-sm font-mono border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white" 
                                                placeholder="e.g. topic" 
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Display Label</label>
                                            <input 
                                                value={v.label} 
                                                onChange={e => updateVariable(idx, 'label', e.target.value)} 
                                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white" 
                                                placeholder="e.g. 研究主题" 
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Type</label>
                                            <select 
                                                value={v.type} 
                                                onChange={e => updateVariable(idx, 'type', e.target.value)} 
                                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                            >
                                                {VARIABLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={() => removeVariable(idx)} className="text-slate-300 hover:text-red-500 self-end mb-2 p-1 hover:bg-red-50 rounded transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={v.required} 
                                                onChange={e => updateVariable(idx, 'required', e.target.checked)} 
                                                className="rounded text-indigo-600 w-4 h-4 focus:ring-indigo-500 border-gray-300" 
                                            />
                                            <span className="font-medium">必填项</span>
                                        </label>
                                        <div className="h-4 w-px bg-slate-300"></div>
                                        {v.type === 'select' && (
                                            <input 
                                                value={v.options?.join(',') || ''} 
                                                onChange={e => updateVariable(idx, 'options', e.target.value.split(','))} 
                                                className="flex-1 text-xs border border-slate-200 rounded px-3 py-1.5 outline-none focus:border-indigo-400" 
                                                placeholder="选项列表 (逗号分隔)" 
                                            />
                                        )}
                                        <input 
                                            value={v.default || ''} 
                                            onChange={e => updateVariable(idx, 'default', e.target.value)} 
                                            className="flex-1 text-xs border border-slate-200 rounded px-3 py-1.5 outline-none focus:border-indigo-400" 
                                            placeholder="默认值 (可选)" 
                                        />
                                    </div>
                                </div>
                            ))}
                            {config.variables.length === 0 && <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-xl bg-slate-50/50">暂无变量</div>}
                        </div>
                    </div>
                )}

                {/* --- STEPS TAB --- */}
                {activeTab === 'steps' && (
                    <div className="space-y-4 pb-12">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-slate-500">定义 Agent 执行的顺序步骤。</p>
                        </div>

                        <div className="space-y-3">
                            {config.steps.map((step, idx) => (
                                <div key={idx} className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${expandedStepIdx === idx ? 'border-indigo-300 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                                    {/* Header / Summary */}
                                    <div 
                                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${expandedStepIdx === idx ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                        onClick={() => setExpandedStepIdx(expandedStepIdx === idx ? null : idx)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${expandedStepIdx === idx ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{step.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{step.id}</div>
                                            </div>
                                            {step.type && <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase font-bold tracking-wider">{step.type}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); removeStep(idx); }} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                            <button className="p-1.5 text-slate-400 hover:text-indigo-600">{expandedStepIdx === idx ? <ChevronDownIcon className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>}</button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {expandedStepIdx === idx && (
                                        <div className="p-5 border-t border-slate-100 bg-white animate-in slide-in-from-top-2 fade-in space-y-6">
                                            
                                            {/* Basic Info */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Step ID (Unique)</label>
                                                    <input 
                                                        value={step.id} 
                                                        onChange={e => updateStep(idx, 'id', e.target.value)} 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Display Name</label>
                                                    <input 
                                                        value={step.name} 
                                                        onChange={e => updateStep(idx, 'name', e.target.value)} 
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Step Type</label>
                                                    <select 
                                                        value={step.type} 
                                                        onChange={e => updateStep(idx, 'type', e.target.value)} 
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                                    >
                                                        {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                        <FilterIcon className="w-3 h-3"/> Condition (JS Expression)
                                                    </label>
                                                    <input 
                                                        value={step.condition || ''} 
                                                        onChange={e => updateStep(idx, 'condition', e.target.value)} 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-orange-600 focus:ring-2 focus:ring-orange-500 outline-none transition-shadow placeholder:text-slate-300" 
                                                        placeholder="e.g. !inputs.has_outline" 
                                                    />
                                                </div>
                                            </div>

                                            {/* LLM & Prompt Config (Only for generation) */}
                                            {step.type === 'generation' && (
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                                                        <LightningBoltIcon className="w-4 h-4 text-indigo-600" />
                                                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">LLM Configuration</span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-5">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Prompt Template</label>
                                                            <select 
                                                                value={step.prompt_id || ''} 
                                                                onChange={e => updateStep(idx, 'prompt_id', e.target.value)} 
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                                            >
                                                                <option value="">(Select Prompt)</option>
                                                                {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Model Channel</label>
                                                            <select 
                                                                value={step.llm_config?.channel_code || ''} 
                                                                onChange={e => {
                                                                    updateStepNested(idx, 'llm_config', 'channel_code', e.target.value);
                                                                    // Reset model when channel changes
                                                                    updateStepNested(idx, 'llm_config', 'model', '');
                                                                }} 
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                                            >
                                                                <option value="">(Default)</option>
                                                                {channels.map(c => <option key={c.id} value={c.channel_code}>{c.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Model Selection</label>
                                                        {step.llm_config?.channel_code ? (
                                                            <select 
                                                                value={step.llm_config?.model || ''} 
                                                                onChange={e => updateStepNested(idx, 'llm_config', 'model', e.target.value)} 
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                                            >
                                                                <option value="">(Use Channel Default)</option>
                                                                {channels.find(c => c.channel_code === step.llm_config?.channel_code)?.models.split(',').map(m => {
                                                                    const trimmedModel = m.trim();
                                                                    return <option key={trimmedModel} value={trimmedModel}>{trimmedModel}</option>;
                                                                })}
                                                            </select>
                                                        ) : (
                                                            <input 
                                                                value={step.llm_config?.model || ''} 
                                                                onChange={e => updateStepNested(idx, 'llm_config', 'model', e.target.value)} 
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                                                placeholder="e.g. gpt-4-turbo (Requires Channel selection first for dropdown)"
                                                            />
                                                        )}
                                                        {step.llm_config?.channel_code && step.llm_config?.model && (
                                                            <p className="text-[10px] text-indigo-500 mt-1.5 font-mono bg-indigo-50 px-2 py-1 rounded inline-block border border-indigo-100">
                                                                Full ID: {step.llm_config.channel_code}@{step.llm_config.model}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Input Mapping */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Input Mapping (JSON)</label>
                                                        <textarea 
                                                            value={JSON.stringify(step.input_mapping || {}, null, 2)}
                                                            onChange={e => {
                                                                try {
                                                                    const val = JSON.parse(e.target.value);
                                                                    updateStep(idx, 'input_mapping', val);
                                                                } catch(e) {} // Silent fail on invalid json while typing
                                                            }}
                                                            className="w-full h-24 bg-[#0f172a] text-slate-300 border border-slate-700 rounded-lg p-3 text-xs font-mono resize-none focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                                            placeholder='{ "topic": "{{inputs.topic}}" }'
                                                        />
                                                        <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                                                            <CodeIcon className="w-3 h-3" />
                                                            Use <code>{`{{ inputs.var }}`}</code> or <code>{`{{ steps.step_id.result }}`}</code>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* UI Config */}
                                            <div className="grid grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                                                 <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                        <DocumentTextIcon className="w-3 h-3" /> UI Component
                                                    </label>
                                                    <select 
                                                        value={step.ui?.component || 'MarkdownEditor'} 
                                                        onChange={e => updateStepNested(idx, 'ui', 'component', e.target.value)} 
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                                    >
                                                        {UI_COMPONENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2 mt-7">
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={step.ui?.editable !== false} 
                                                            onChange={e => updateStepNested(idx, 'ui', 'editable', e.target.checked)} 
                                                            className="rounded text-indigo-600 w-4 h-4 focus:ring-indigo-500 border-gray-300" 
                                                        />
                                                        <span className="text-sm font-bold text-slate-700">允许用户修改结果</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            <button 
                                onClick={addStep} 
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group mt-6"
                            >
                                <div className="p-1 bg-slate-100 rounded-full group-hover:bg-indigo-100 transition-colors">
                                    <PlusIcon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm">添加新步骤</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* --- JSON EDITOR --- */}
                {activeTab === 'json' && (
                    <div className="h-full flex flex-col">
                        <textarea 
                            value={localJson}
                            onChange={handleJsonChange}
                            className="w-full flex-1 bg-[#0f172a] text-slate-300 border border-slate-800 rounded-xl px-4 py-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed custom-scrollbar-dark"
                            spellCheck={false}
                        />
                        {jsonError && <div className="mt-2 text-red-500 text-xs font-bold">{jsonError}</div>}
                    </div>
                )}
            </div>
            
            <style>{`
                .label-xs { @apply block text-[10px] font-bold text-slate-400 uppercase mb-2; }
                .input-sm { @apply w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow; }
            `}</style>
        </div>
    );
};
