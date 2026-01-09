
import React, { useState, useEffect, useCallback } from 'react';
import { ModelPricing, LLMChannel } from '../../../types';
import { getPricings, setPricing, getChannels } from '../../../api/stratify';
import { 
    RefreshIcon, PlusIcon, PencilIcon, CheckCircleIcon, 
    ShieldExclamationIcon, ChartIcon, LightningBoltIcon, 
    ServerIcon, CloseIcon, CheckIcon 
} from '../../icons';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

interface PricingEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    pricing?: ModelPricing;
    channels: LLMChannel[];
}

const PricingEditorModal: React.FC<PricingEditorModalProps> = ({ isOpen, onClose, onSave, pricing, channels }) => {
    const isEditing = !!pricing;
    const [form, setForm] = useState<Partial<ModelPricing>>({
        model_name: '',
        input_price: 1.0,
        output_price: 2.0,
        multiplier: 1.0,
        is_active: true
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm(pricing || {
                model_name: '',
                input_price: 1.0,
                output_price: 2.0,
                multiplier: 1.0,
                is_active: true
            });
        }
    }, [isOpen, pricing]);

    const allModels = channels.flatMap(c => 
        c.models.split(',').map(m => `${c.channel_code}@${m.trim()}`)
    );

    const handleSubmit = async () => {
        if (!form.model_name) return;
        setIsSaving(true);
        try {
            await setPricing(form);
            onSave();
            onClose();
        } catch (e) {
            alert('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ChartIcon className="w-5 h-5 text-indigo-600" />
                        {isEditing ? '编辑定价' : '新增模型定价'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">模型名称 (model_name)</label>
                        {isEditing ? (
                            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-500">
                                {form.model_name}
                            </div>
                        ) : (
                            <select 
                                value={form.model_name} 
                                onChange={e => setForm({...form, model_name: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">-- 请选择已配置的模型 --</option>
                                {allModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1 italic">格式: channel_code@model_id</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">输入价格 (CNY/1M Tokens)</label>
                            <input 
                                type="number"
                                step="0.01"
                                value={form.input_price} 
                                onChange={e => setForm({...form, input_price: parseFloat(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">输出价格 (CNY/1M Tokens)</label>
                            <input 
                                type="number"
                                step="0.01"
                                value={form.output_price} 
                                onChange={e => setForm({...form, output_price: parseFloat(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">用户结算倍率 (Multiplier)</label>
                        <input 
                            type="number"
                            step="0.1"
                            value={form.multiplier} 
                            onChange={e => setForm({...form, multiplier: parseFloat(e.target.value)})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">最终扣费 = 原始成本 * 倍率</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="is_active_pricing"
                            checked={form.is_active}
                            onChange={e => setForm({...form, is_active: e.target.checked})}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="is_active_pricing" className="text-sm font-bold text-slate-700">启用此定价规则</label>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors">取消</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving || !form.model_name}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4" />}
                        保存定价
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PricingManager: React.FC = () => {
    const [pricings, setPricings] = useState<ModelPricing[]>([]);
    const [channels, setChannels] = useState<LLMChannel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPricing, setEditingPricing] = useState<ModelPricing | undefined>(undefined);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [pData, cData] = await Promise.all([getPricings(), getChannels()]);
            setPricings(pData);
            setChannels(cData);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = (pricing: ModelPricing) => {
        setEditingPricing(pricing);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingPricing(undefined);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex flex-col">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <ChartIcon className="w-5 h-5 text-indigo-600" />
                        计费与定价规则管理
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">管理模型 Token 价格与计费倍率</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={handleCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
                    >
                        <PlusIcon className="w-3.5 h-3.5" /> 新增定价
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/80 border-b font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4">模型名称 (Model)</th>
                                <th className="px-6 py-4">输入单价 (Input)</th>
                                <th className="px-6 py-4">输出单价 (Output)</th>
                                <th className="px-6 py-4">用户倍率 (x)</th>
                                <th className="px-6 py-4">状态</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pricings.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                                                <LightningBoltIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="font-mono font-bold text-slate-800 text-xs">{p.model_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-slate-600">¥{p.input_price.toFixed(2)}</span>
                                        <span className="text-[9px] text-slate-400 ml-1">/ 1M</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-slate-600">¥{p.output_price.toFixed(2)}</span>
                                        <span className="text-[9px] text-slate-400 ml-1">/ 1M</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold border border-purple-100">
                                            x {p.multiplier.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {p.is_active ? (
                                            <span className="flex items-center gap-1 text-green-600 font-bold text-[10px]">
                                                <CheckCircleIcon className="w-3 h-3" /> ACTIVE
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-slate-400 font-bold text-[10px]">
                                                <ShieldExclamationIcon className="w-3 h-3" /> INACTIVE
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleEdit(p)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && pricings.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-20 text-slate-400 italic">暂无定价规则配置</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Billing Summary Info */}
                <div className="mt-6 p-5 bg-indigo-900 rounded-2xl text-white relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <ChartIcon className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="max-w-xl">
                            <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-indigo-300" />
                                计费逻辑说明
                            </h4>
                            <p className="text-indigo-100/70 text-xs leading-relaxed">
                                系统将根据模型输入/输出 Token 数量，按百万 Token 单价结合用户倍率实时扣费。
                                允许账户余额透支至 <b>-1.0 CNY</b>。超过此额度后，API 调用将返回 403 余额不足错误。
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex-shrink-0">
                            <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">计算公式</div>
                            <div className="font-mono text-sm font-bold">
                                (In/1M * P_in * M) + (Out/1M * P_out * M)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PricingEditorModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={fetchData} 
                pricing={editingPricing}
                channels={channels}
            />
        </div>
    );
};
