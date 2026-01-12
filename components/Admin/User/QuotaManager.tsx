
import React, { useState, useEffect, useMemo } from 'react';
import { createQuotaConfig, getQuotaConfigs, deleteQuotaConfig } from '../../../api/user';
import { QuotaConfig } from '../../../types';
import { CloseIcon, PlusIcon, RefreshIcon, CheckIcon, TrashIcon, LightningBoltIcon, ShieldCheckIcon, QuestionMarkCircleIcon, DocumentTextIcon, ClockIcon } from '../../icons';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>;

const PLAN_TYPES = ['free', 'pro', 'enterprise'];

const RESOURCE_PRESETS = [
    { key: 'ppt_pages', label: 'PPT 生成页数', unit: '页' },
    { key: 'pdf_export', label: 'PDF 导出次数', unit: '次' },
    { key: 'deep_insight_report', label: '深度洞察报告', unit: '份' },
    { key: 'agent_chat_tokens', label: 'AI 对话 Token', unit: 'Token' },
    { key: 'video_analysis_mins', label: '视频分析时长', unit: '分钟' },
];

interface CreateQuotaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    planType: string;
    existingKeys: string[];
}

const CreateQuotaModal: React.FC<CreateQuotaModalProps> = ({ isOpen, onClose, onSuccess, planType, existingKeys }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        resource_key: '',
        limit_type: 'limited' as 'limited' | 'unlimited' | 'forbidden',
        limit_value: 100,
        period: 'monthly',
        allow_overage: false,
        overage_unit_price: 0,
        remark: ''
    });
    const [error, setError] = useState('');

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setForm({
                resource_key: '',
                limit_type: 'limited',
                limit_value: 100,
                period: 'monthly',
                allow_overage: false,
                overage_unit_price: 0,
                remark: ''
            });
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!form.resource_key) {
            setError('请输入资源标识 Key');
            return;
        }
        if (existingKeys.includes(form.resource_key)) {
            setError(`当前计划下已存在 ${form.resource_key} 的配置，请先删除旧规则。`);
            return;
        }

        setIsSubmitting(true);
        try {
            let finalLimit = form.limit_value;
            if (form.limit_type === 'unlimited') finalLimit = -1;
            if (form.limit_type === 'forbidden') finalLimit = 0;

            await createQuotaConfig({
                plan_type: planType,
                resource_key: form.resource_key,
                limit_value: finalLimit,
                period: form.period as any,
                allow_overage: form.allow_overage,
                overage_unit_price: form.allow_overage ? form.overage_unit_price : 0,
                remark: form.remark
            });
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || '创建失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">新增权益规则</h3>
                        <p className="text-xs text-slate-500 mt-0.5">为 <span className="font-bold text-indigo-600 uppercase">{planType}</span> 计划配置资源限制</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Resource Key */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">资源标识 (Resource Key) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input 
                                list="resource_options"
                                value={form.resource_key}
                                onChange={e => setForm({...form, resource_key: e.target.value})}
                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="选择或输入资源Key..."
                            />
                            <datalist id="resource_options">
                                {RESOURCE_PRESETS.map(r => (
                                    <option key={r.key} value={r.key}>{r.label}</option>
                                ))}
                            </datalist>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {RESOURCE_PRESETS.find(r => r.key === form.resource_key)?.label || '自定义资源Key'}
                        </p>
                    </div>

                    {/* Limit Config */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">额度限制策略</label>
                        <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm mb-4">
                            {(['limited', 'unlimited', 'forbidden'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setForm({...form, limit_type: type})}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                        form.limit_type === type 
                                            ? 'bg-indigo-600 text-white shadow-sm' 
                                            : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {type === 'limited' ? '定额限制' : type === 'unlimited' ? '无限使用' : '完全禁止'}
                                </button>
                            ))}
                        </div>

                        {form.limit_type === 'limited' && (
                            <div className="animate-in fade-in slide-in-from-top-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-400 font-bold mb-1">数量限制</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={form.limit_value}
                                            onChange={e => setForm({...form, limit_value: parseInt(e.target.value) || 0})}
                                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-400 font-bold mb-1">重置周期</label>
                                        <select 
                                            value={form.period}
                                            onChange={e => setForm({...form, period: e.target.value})}
                                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                        >
                                            <option value="monthly">Monthly (每月)</option>
                                            <option value="daily">Daily (每天)</option>
                                            <option value="total">Lifetime (总量)</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center gap-1">
                                    <QuestionMarkCircleIcon className="w-3 h-3" />
                                    说明: 当前系统按订阅日滚动 30 天计算周期。
                                </p>
                            </div>
                        )}
                        
                        {form.limit_type === 'unlimited' && (
                            <p className="text-xs text-green-600 font-medium text-center py-2">
                                该套餐用户可无限制使用此资源 (-1)。
                            </p>
                        )}
                        
                        {form.limit_type === 'forbidden' && (
                            <p className="text-xs text-red-500 font-medium text-center py-2">
                                该套餐用户无法使用此功能 (0)。
                            </p>
                        )}
                    </div>

                    {/* Overage Policy */}
                    {form.limit_type !== 'unlimited' && form.limit_type !== 'forbidden' && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">超额策略</label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={form.allow_overage}
                                        onChange={e => setForm({...form, allow_overage: e.target.checked})}
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-bold text-slate-700">允许超额付费</span>
                                </label>
                            </div>

                            {form.allow_overage ? (
                                <div className="animate-in fade-in space-y-2">
                                    <label className="block text-[10px] text-slate-400 font-bold">超额单价 (CNY)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">¥</span>
                                        <input 
                                            type="number" 
                                            step="0.000001"
                                            min="0"
                                            value={form.overage_unit_price}
                                            onChange={e => setForm({...form, overage_unit_price: parseFloat(e.target.value)})}
                                            className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                                            placeholder="0.0001"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">/ 单位</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">当额度用尽时，将从用户余额扣除费用。例如 Token 计费可设为 0.0001</p>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">
                                    当额度用尽时，直接拒绝服务请求。
                                </p>
                            )}
                        </div>
                    )}

                    {/* Remark */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">运营备注 (Remark)</label>
                        <textarea 
                            value={form.remark}
                            onChange={e => setForm({...form, remark: e.target.value})}
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                            placeholder="例如：2024 新年活动调整，Token 单价 5 折..."
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 font-medium flex items-center gap-2">
                            <ShieldCheckIcon className="w-4 h-4"/> {error}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        确认保存
                    </button>
                </div>
            </div>
        </div>
    );
};

export const QuotaManager: React.FC = () => {
    const [configs, setConfigs] = useState<QuotaConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('free');
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                        onClick={() => setActiveTab(plan)}
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
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all"
                        >
                            <PlusIcon className="w-4 h-4" /> 新增规则
                        </button>
                    </div>
                </div>

                {/* Config List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeConfigs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                            <LightningBoltIcon className="w-12 h-12 mb-3" />
                            <p className="text-sm font-medium">该计划暂未配置任何权益规则</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeConfigs.map(config => (
                                <div key={config.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-indigo-200 hover:shadow-md transition-all">
                                    {/* Left: Info */}
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm uppercase shadow-sm">
                                            {config.resource_key.slice(0, 2)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-base">{getResourceLabel(config.resource_key)}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{config.resource_key}</span>
                                                <span className="text-slate-300">|</span>
                                                <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3"/> {config.period}</span>
                                            </div>
                                            {config.remark && (
                                                <p className="text-xs text-slate-400 mt-2 italic border-l-2 border-slate-200 pl-2">
                                                    {config.remark}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Limits & Actions */}
                                    <div className="flex items-center gap-8">
                                        <div className="text-center min-w-[80px]">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">额度</div>
                                            <div className={`text-base font-black ${config.limit_value === -1 ? 'text-purple-600' : config.limit_value === 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                                {config.limit_value === -1 ? '∞ 无限' : config.limit_value === 0 ? '🚫 禁止' : config.limit_value}
                                            </div>
                                        </div>

                                        <div className="text-center min-w-[100px]">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">超额策略</div>
                                            {config.allow_overage ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-100">
                                                        <CheckIcon className="w-3 h-3"/> 允许
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-mono mt-1">¥{config.overage_unit_price}/次</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">
                                                        <CloseIcon className="w-3 h-3"/> 禁止
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => config.id && handleDelete(config.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="删除规则"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CreateQuotaModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchConfigs}
                planType={activeTab}
                existingKeys={activeConfigs.map(c => c.resource_key)}
            />
        </div>
    );
};
