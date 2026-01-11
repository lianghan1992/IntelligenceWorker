
import React, { useState, useEffect } from 'react';
import { createQuotaConfig, getQuotaConfigs } from '../../api/user';
import { QuotaConfig } from '../../types';
import { CloseIcon, PlusIcon, RefreshIcon, CheckIcon } from '../icons';

interface QuotaConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

export const QuotaConfigModal: React.FC<QuotaConfigModalProps> = ({ isOpen, onClose }) => {
    const [configs, setConfigs] = useState<QuotaConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [newConfig, setNewConfig] = useState<Partial<QuotaConfig>>({
        plan_type: 'free',
        resource_key: '',
        limit_value: 10,
        period: 'monthly',
        allow_overage: false,
        overage_unit_price: 0
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
        if (isOpen) fetchConfigs();
    }, [isOpen]);

    const handleCreate = async () => {
        if (!newConfig.resource_key) return;
        setIsCreating(true);
        try {
            await createQuotaConfig(newConfig);
            setNewConfig({
                plan_type: 'free',
                resource_key: '',
                limit_value: 10,
                period: 'monthly',
                allow_overage: false,
                overage_unit_price: 0
            });
            fetchConfigs();
        } catch (e: any) {
            alert("创建失败: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">权益配置管理 (Admin)</h3>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar border-r border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-700">现有规则</h4>
                            <button onClick={fetchConfigs}><RefreshIcon className={`w-4 h-4 text-slate-400 hover:text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} /></button>
                        </div>
                        {isLoading ? <div className="text-center py-10 text-slate-400">Loading...</div> : (
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-50 font-bold">
                                    <tr>
                                        <th className="px-4 py-2">Plan</th>
                                        <th className="px-4 py-2">Resource</th>
                                        <th className="px-4 py-2">Limit</th>
                                        <th className="px-4 py-2">Period</th>
                                        <th className="px-4 py-2">Overage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {configs.map((c, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-bold text-indigo-600 uppercase">{c.plan_type}</td>
                                            <td className="px-4 py-3 font-mono text-slate-700">{c.resource_key}</td>
                                            <td className="px-4 py-3">{c.limit_value === -1 ? '∞' : c.limit_value}</td>
                                            <td className="px-4 py-3 capitalize">{c.period}</td>
                                            <td className="px-4 py-3">
                                                {c.allow_overage ? (
                                                    <span className="text-green-600 text-xs font-bold flex items-center gap-1">Yes (¥{c.overage_unit_price})</span>
                                                ) : <span className="text-slate-400 text-xs">No</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Create Form */}
                    <div className="w-full md:w-80 bg-slate-50 p-6 flex-shrink-0 overflow-y-auto">
                        <h4 className="font-bold text-slate-700 mb-4">新增规则</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plan Type</label>
                                <select 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                    value={newConfig.plan_type}
                                    onChange={e => setNewConfig({...newConfig, plan_type: e.target.value})}
                                >
                                    <option value="free">Free</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Resource Key</label>
                                <input 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm" 
                                    placeholder="e.g. ppt_pages"
                                    value={newConfig.resource_key}
                                    onChange={e => setNewConfig({...newConfig, resource_key: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Limit (-1 unl.)</label>
                                    <input 
                                        type="number"
                                        className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                        value={newConfig.limit_value}
                                        onChange={e => setNewConfig({...newConfig, limit_value: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Period</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                        value={newConfig.period}
                                        onChange={e => setNewConfig({...newConfig, period: e.target.value as any})}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="daily">Daily</option>
                                        <option value="total">Total</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t border-slate-200">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-2">
                                    <input 
                                        type="checkbox"
                                        checked={newConfig.allow_overage}
                                        onChange={e => setNewConfig({...newConfig, allow_overage: e.target.checked})}
                                        className="rounded text-indigo-600"
                                    />
                                    Allow Overage
                                </label>
                                {newConfig.allow_overage && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Price (CNY)</label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                            value={newConfig.overage_unit_price}
                                            onChange={e => setNewConfig({...newConfig, overage_unit_price: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleCreate}
                                disabled={isCreating || !newConfig.resource_key}
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Spinner /> : <PlusIcon className="w-4 h-4"/>} 创建规则
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
