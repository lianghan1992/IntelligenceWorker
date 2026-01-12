
import React, { useState, useEffect, useMemo } from 'react';
import { createQuotaConfig, getQuotaConfigs, deleteQuotaConfig } from '../../../api/user';
import { QuotaConfig } from '../../../types';
import { CloseIcon, PlusIcon, RefreshIcon, CheckIcon, TrashIcon, ChartIcon, LightningBoltIcon, ShieldCheckIcon, ShieldExclamationIcon } from '../../icons';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>;

const PLAN_TYPES = ['free', 'pro', 'enterprise'];

const RESOURCE_PRESETS = [
    { key: 'ppt_pages', label: 'PPT 生成页数', unit: '页' },
    { key: 'pdf_export', label: 'PDF 导出次数', unit: '次' },
    { key: 'deep_insight_report', label: '深度洞察报告', unit: '份' },
    { key: 'agent_chat_tokens', label: 'AI 对话 Token', unit: 'Token' },
    { key: 'video_analysis_mins', label: '视频分析时长', unit: '分钟' },
];

export const QuotaManager: React.FC = () => {
    const [configs, setConfigs] = useState<QuotaConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('free');
    
    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const [newItem, setNewItem] = useState<{
        resource_key: string;
        limit_type: 'limited' | 'unlimited' | 'forbidden';
        limit_val: number;
        allow_overage: boolean;
        overage_price: number;
    }>({
        resource_key: 'ppt_pages',
        limit_type: 'limited',
        limit_val: 10,
        allow_overage: false,
        overage_price: 1.0
    });

    const fetchConfigs = async () => {
        setIsLoading(true);
        try {
            const res = await getQuotaConfigs();
            setConfigs(res || []);
        } catch (e) {
            console.error("Failed to load quota configs", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const activeConfigs = useMemo(() => {
        return configs.filter(c => c.plan_type === activeTab);
    }, [configs, activeTab]);

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这条权益规则吗？')) return;
        try {
            await deleteQuotaConfig(id);
            setConfigs(prev => prev.filter(c => c.id !== id));
        } catch (e: any) {
            alert("删除失败: " + e.message);
        }
    };

    const handleCreate = async () => {
        setFormError('');
        if (!newItem.resource_key) {
            setFormError('请输入或选择资源标识');
            return;
        }
        
        // Check duplicate
        if (activeConfigs.some(c => c.resource_key === newItem.resource_key)) {
            setFormError(`当前计划下已存在 ${newItem.resource_key} 的配置，请先删除旧规则。`);
            return;
        }

        setIsSubmitting(true);
        try {
            let finalLimit = newItem.limit_val;
            if (newItem.limit_type === 'unlimited') finalLimit = -1;
            if (newItem.limit_type === 'forbidden') finalLimit = 0;

            await createQuotaConfig({
                plan_type: activeTab,
                resource_key: newItem.resource_key,
                limit_value: finalLimit,
                period: 'monthly', // Default strictly to monthly for now
                allow_overage: newItem.allow_overage,
                overage_unit_price: newItem.allow_overage ? newItem.overage_price : 0
            });
            
            await fetchConfigs();
            setIsAdding(false);
            // Reset form partly
            setNewItem({
                resource_key: 'ppt_pages',
                limit_type: 'limited',
                limit_val: 10,
                allow_overage: false,
                overage_price: 1.0
            });
        } catch (e: any) {
            setFormError(e.message || '创建失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getResourceLabel = (key: string) => {
        const preset = RESOURCE_PRESETS.find(p => p.key === key);
        return preset ? `${preset.label} (${key})` : key;
    };

    const getPlanLabel = (plan: string) => {
        switch(plan) {
            case 'free': return 'Free 免费版';
            case 'pro': return 'Pro 专业版';
            case 'enterprise': return 'Enterprise 企业版';
            default: return plan;
        }
    };

    const getPlanColor = (plan: string) => {
        switch(plan) {
            case 'free': return 'text-slate-600 bg-slate-100';
            case 'pro': return 'text-indigo-600 bg-indigo-50';
            case 'enterprise': return 'text-purple-600 bg-purple-50';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="h-full flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Sidebar Tabs */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col py-4 gap-1 shrink-0">
                {PLAN_TYPES.map(plan => (
                    <button
                        key={plan}
                        onClick={() => { setActiveTab(plan); setIsAdding(false); }}
                        className={`mx-3 px-4 py-3 rounded-xl text-sm font-bold text-left transition-all flex items-center justify-between group ${
                            activeTab === plan 
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' 
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                    >
                        <span>{getPlanLabel(plan)}</span>
                        {activeTab === plan && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                
                {/* Toolbar */}
                <div className="p-6 pb-2 flex justify-between items-center">
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getPlanColor(activeTab)}`}>
                        {activeTab} Plan Rules
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchConfigs} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all"
                        >
                            <PlusIcon className="w-4 h-4" /> 新增权益规则
                        </button>
                    </div>
                </div>

                {/* Config List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Add Form Card */}
                    {isAdding && (
                        <div className="mb-6 p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 animate-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                    <PlusIcon className="w-4 h-4" /> 配置新规则
                                </h4>
                                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Resource Select */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">资源类型 (Resource Key)</label>
                                    <div className="relative">
                                        <input 
                                            list="resource_options"
                                            value={newItem.resource_key}
                                            onChange={e => setNewItem({...newItem, resource_key: e.target.value})}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                            placeholder="输入或选择资源Key..."
                                        />
                                        <datalist id="resource_options">
                                            {RESOURCE_PRESETS.map(r => (
                                                <option key={r.key} value={r.key}>{r.label}</option>
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                {/* Quota Limits */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">额度限制 (Monthly)</label>
                                    <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                                        {(['limited', 'unlimited', 'forbidden'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setNewItem({...newItem, limit_type: type})}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                    newItem.limit_type === type 
                                                        ? 'bg-indigo-600 text-white shadow-sm' 
                                                        : 'text-slate-500 hover:bg-slate-50'
                                                }`}
                                            >
                                                {type === 'limited' ? '定额' : type === 'unlimited' ? '无限' : '禁止'}
                                            </button>
                                        ))}
                                    </div>
                                    {newItem.limit_type === 'limited' && (
                                        <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={newItem.limit_val}
                                                onChange={e => setNewItem({...newItem, limit_val: parseInt(e.target.value) || 0})}
                                                className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                                            />
                                            <span className="text-xs text-slate-500 font-medium">次/周期</span>
                                        </div>
                                    )}
                                </div>

                                {/* Overage Policy */}
                                <div className="md:col-span-2 border-t border-indigo-100 pt-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
                                        <input 
                                            type="checkbox"
                                            checked={newItem.allow_overage}
                                            onChange={e => setNewItem({...newItem, allow_overage: e.target.checked})}
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">允许超额使用 (按量计费)</span>
                                    </label>

                                    {newItem.allow_overage && (
                                        <div className="flex items-center gap-3 pl-6 animate-in fade-in">
                                            <span className="text-xs text-slate-500 font-bold uppercase">超额单价:</span>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">¥</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    min="0"
                                                    value={newItem.overage_price}
                                                    onChange={e => setNewItem({...newItem, overage_price: parseFloat(e.target.value)})}
                                                    className="w-32 bg-white border border-slate-200 rounded-lg pl-6 pr-3 py-1.5 text-sm font-mono font-bold text-slate-700 outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">/ 单位</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {formError && (
                                <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 font-medium flex items-center gap-2">
                                    <ShieldCheckIcon className="w-4 h-4"/> {formError}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsAdding(false)} 
                                    className="px-5 py-2 text-slate-500 font-bold text-sm hover:bg-white rounded-lg transition-colors"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleCreate} 
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                                    确认添加
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Existing Rules Table */}
                    {activeConfigs.length === 0 && !isAdding ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                            <LightningBoltIcon className="w-12 h-12 mb-3" />
                            <p className="text-sm font-medium">该计划暂未配置任何权益规则</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeConfigs.map(config => (
                                <div key={config.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                                            {config.resource_key.slice(0, 2)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-700 text-sm">{getResourceLabel(config.resource_key)}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                <span className="font-mono bg-slate-50 px-1.5 rounded">{config.resource_key}</span>
                                                <span className="text-slate-300">•</span>
                                                <span>{config.period}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 mr-8">
                                        <div className="text-center min-w-[80px]">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">额度</div>
                                            <div className={`text-sm font-bold ${config.limit_value === -1 ? 'text-purple-600' : config.limit_value === 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                                {config.limit_value === -1 ? '∞ 无限' : config.limit_value === 0 ? '🚫 禁止' : config.limit_value}
                                            </div>
                                        </div>

                                        <div className="text-center min-w-[100px]">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">超额策略</div>
                                            {config.allow_overage ? (
                                                <div className="text-sm font-bold text-green-600 flex items-center justify-center gap-1">
                                                    <CheckIcon className="w-3 h-3"/> 允许
                                                    <span className="text-xs text-slate-500 font-normal ml-1">¥{config.overage_unit_price}/次</span>
                                                </div>
                                            ) : (
                                                <div className="text-sm font-bold text-slate-400 flex items-center justify-center gap-1">
                                                    <CloseIcon className="w-3 h-3"/> 禁止超额
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => config.id && handleDelete(config.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="删除规则"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
