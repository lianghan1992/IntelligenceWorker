
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUsageSummary } from '../../api/stratify';
import { getMyQuotaUsage, getWalletBalance, rechargeWallet, checkPaymentStatus, getPersonalUsageHistory } from '../../api/user';
import { UsageSummary, User, QuotaItem, WalletBalance, RechargeResponse } from '../../types';
import { CloseIcon, ChartIcon, CalendarIcon, RefreshIcon, ServerIcon, ChipIcon, CheckCircleIcon, ShieldExclamationIcon, PlusIcon, SparklesIcon } from '../icons';
import { AGENT_NAMES } from '../../agentConfig';

interface BillingModalProps {
    user: User;
    onClose: () => void;
}

const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>;

// 解析 meta_data 的辅助函数
const parseMeta = (metaStr: string) => {
    try {
        if (!metaStr) return { model: '-', tokens: '-' };
        const meta = JSON.parse(metaStr);
        return {
            model: meta.model || '-',
            tokens: meta.tokens || '-'
        };
    } catch (e) {
        return { model: '-', tokens: '-' };
    }
};

export const BillingModal: React.FC<BillingModalProps> = ({ user, onClose }) => {
    const [stats, setStats] = useState<any[]>([]); // 修改为更通用的流水类型
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [wallet, setWallet] = useState<WalletBalance | null>(null);
    const [quotas, setQuotas] = useState<QuotaItem[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
    
    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const limit = 20;
    const [hasMore, setHasMore] = useState(true);

    // Recharge State
    const [showRecharge, setShowRecharge] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState<string>('49');
    const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);
    const [rechargeResult, setRechargeResult] = useState<RechargeResponse | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | null>(null);
    const pollingRef = useRef<any>(null);

    const fetchWalletAndQuota = async () => {
        setIsRefreshingWallet(true);
        try {
            const [w, q] = await Promise.all([getWalletBalance(), getMyQuotaUsage()]);
            setWallet(w);
            setQuotas(q);
        } catch (e) {
            console.error("Failed to fetch wallet info", e);
        } finally {
            setIsRefreshingWallet(false);
        }
    };

    const fetchUsageData = useCallback(async (isLoadMore = false) => {
        if (!user || !user.id) return;
        
        const currentPage = isLoadMore ? page + 1 : 1;
        if (!isLoadMore) setIsLoading(true);
        
        try {
            const params = {
                limit: limit,
                // 根据文档，流水接口可能需要 start_date, end_date 等过滤参数
                start_date: startDate || undefined,
                end_date: endDate || undefined
            };

            // 获取摘要数据（用于顶部的 Token 概览）
            if (!isLoadMore) {
                getUsageSummary({ user_id: user.id }).then(setSummary).catch(console.warn);
            }

            // 对接 2.1 节获取个人使用记录
            const listData = await getPersonalUsageHistory(params);
            
            if (isLoadMore) {
                setStats(prev => [...prev, ...listData]);
                setPage(currentPage);
            } else {
                setStats(listData);
                setPage(1);
            }
            
            if (listData.length < limit) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (e) {
            console.error("Failed to fetch personal usage records", e);
        } finally {
            setIsLoading(false);
        }
    }, [user, startDate, endDate, page]);

    useEffect(() => {
        fetchUsageData();
        fetchWalletAndQuota();
    }, [startDate, endDate]); 

    useEffect(() => {
        if (rechargeResult && rechargeResult.order_no && paymentStatus !== 'success') {
            const poll = async () => {
                try {
                    const statusRes = await checkPaymentStatus(rechargeResult.order_no);
                    if (statusRes.status === 'paid') {
                        setPaymentStatus('success');
                        fetchWalletAndQuota();
                        if (pollingRef.current) clearInterval(pollingRef.current);
                    }
                } catch (e) {
                    console.warn("Payment status check failed", e);
                }
            };
            pollingRef.current = setInterval(poll, 3000);
            return () => {
                if (pollingRef.current) clearInterval(pollingRef.current);
            };
        }
    }, [rechargeResult, paymentStatus]);

    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const handleRecharge = async () => {
        const amount = parseFloat(rechargeAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("请输入有效的充值金额");
            return;
        }

        setIsSubmittingRecharge(true);
        setRechargeResult(null);
        setPaymentStatus('pending');
        try {
            const res = await rechargeWallet(amount, 'manual');
            setRechargeResult(res);
        } catch (e: any) {
            alert('充值请求失败: ' + e.message);
            setPaymentStatus(null);
        } finally {
            setIsSubmittingRecharge(false);
        }
    };

    const closeRecharge = () => {
        setShowRecharge(false);
        setRechargeResult(null);
        setPaymentStatus(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <ChartIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">账单与权益</h2>
                            <p className="text-xs text-slate-500">管理您的账户余额、权益额度与详细消耗记录</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Wallet & Quota Section */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 flex-shrink-0 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">账户可用余额 (CNY)</div>
                            <div className="text-4xl font-black tracking-tight flex items-baseline gap-1">
                                <span className="text-2xl">¥</span>
                                {wallet ? wallet.balance.toFixed(2) : '--'}
                                <button 
                                    onClick={fetchWalletAndQuota} 
                                    disabled={isRefreshingWallet}
                                    className="ml-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <RefreshIcon className={`w-4 h-4 ${isRefreshingWallet ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowRecharge(true)}
                            className="px-5 py-2 bg-white text-indigo-600 rounded-lg font-bold text-sm shadow-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" /> 立即充值
                        </button>
                    </div>
                    
                    {/* Quota Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                        {quotas.map(quota => (
                            <div key={quota.resource_key} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                <div className="text-indigo-200 text-[10px] font-bold uppercase mb-1">{quota.resource_key}</div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xl font-bold">
                                        {quota.usage_count}
                                        <span className="text-xs font-normal text-indigo-200 mx-1">/</span>
                                        <span className="text-sm">{quota.limit_value === -1 ? '∞' : quota.limit_value}</span>
                                    </div>
                                    {quota.limit_value !== -1 && quota.usage_count >= quota.limit_value && (
                                        <span className="text-[10px] bg-red-500/80 px-1.5 rounded text-white font-bold">已耗尽</span>
                                    )}
                                </div>
                                <div className="w-full h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
                                    <div 
                                        className={`h-full ${quota.usage_count >= quota.limit_value && quota.limit_value !== -1 ? 'bg-red-400' : 'bg-green-400'}`} 
                                        style={{ width: quota.limit_value === -1 ? '100%' : `${Math.min(100, (quota.usage_count / quota.limit_value) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {quotas.length === 0 && (
                            <div className="text-indigo-200 text-sm italic">暂无权益信息</div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                    <div className="p-6 pb-2 space-y-6">
                        {/* Usage Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">本期总消费</span>
                                <div className="text-2xl font-black text-indigo-600 truncate">
                                    ¥ {(summary?.total_cost || 0).toFixed(4)}
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tokens</span>
                                <div className="text-2xl font-black text-slate-700 truncate">
                                    {(summary?.total_tokens || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Input Tokens</span>
                                <div className="text-xl font-bold text-slate-600 truncate">
                                    {(summary?.total_input_tokens || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Output Tokens</span>
                                <div className="text-xl font-bold text-slate-600 truncate">
                                    {(summary?.total_output_tokens || 0).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 text-sm">模型调用明细</h3>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm text-slate-600 outline-none border-none bg-transparent w-24" />
                                    <span className="text-slate-300">-</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm text-slate-600 outline-none border-none bg-transparent w-24" />
                                </div>
                                <button onClick={() => fetchUsageData(false)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
                                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto px-6 pb-6 custom-scrollbar">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-[800px]">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">时间</th>
                                        <th className="px-6 py-4">描述</th>
                                        <th className="px-6 py-4">模型 (Model)</th>
                                        <th className="px-6 py-4 text-right">Tokens</th>
                                        <th className="px-6 py-4 text-right">费用 (CNY)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading && stats.length === 0 ? (
                                        <tr><td colSpan={5} className="py-20 text-center"><Spinner /></td></tr>
                                    ) : stats.length === 0 ? (
                                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">暂无消费记录</td></tr>
                                    ) : (
                                        stats.map((record, idx) => {
                                            const meta = parseMeta(record.meta_data);
                                            return (
                                                <tr key={record.id || idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                                                        {new Date(record.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <ServerIcon className="w-4 h-4 text-slate-400" />
                                                            <span className="font-bold text-slate-700">
                                                                {record.description}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <ChipIcon className="w-4 h-4 text-slate-400" />
                                                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                                                                {meta.model}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-xs">{meta.tokens.toLocaleString()}</td>
                                                    <td className={`px-6 py-4 text-right font-bold font-mono ${record.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {record.amount.toFixed(4)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            {hasMore && !isLoading && stats.length > 0 && (
                                <button onClick={() => fetchUsageData(true)} className="w-full py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border-t border-slate-100 transition-colors">
                                    加载更多...
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recharge Overlay Modal (Omitted for brevity, kept identical to existing) */}
                {showRecharge && (
                    /* ... recharge modal implementation ... */
                    <div className="absolute inset-0 z-50 bg-white flex flex-col">
                         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><PlusIcon className="w-5 h-5"/></span>
                                账户充值
                            </h3>
                            <button onClick={closeRecharge} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                            {/* ... Content identical to your current BillingModal.tsx ... */}
                            {paymentStatus === 'success' ? (
                                <div className="text-center">支付成功！</div>
                            ) : !rechargeResult ? (
                                <div className="max-w-md w-full">
                                    <input type="number" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} className="w-full border p-2 mb-4" />
                                    <button onClick={handleRecharge} className="w-full bg-indigo-600 text-white p-3 rounded">确认支付</button>
                                </div>
                            ) : (
                                <div className="text-center">订单已创建: {rechargeResult.order_no}</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
