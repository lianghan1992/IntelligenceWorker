import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUsageStats, getUsageSummary } from '../../api/stratify';
import { getMyQuotaUsage, getWalletBalance, rechargeWallet, checkPaymentStatus } from '../../api/user';
import { UsageStat, UsageSummary, User, QuotaItem, WalletBalance, RechargeResponse } from '../../types';
import { CloseIcon, ChartIcon, CalendarIcon, RefreshIcon, ServerIcon, ChipIcon, CheckCircleIcon, ShieldExclamationIcon, PlusIcon, SparklesIcon } from '../icons';
import { AGENT_NAMES } from '../../agentConfig';

interface BillingModalProps {
    user: User;
    onClose: () => void;
}

const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>;

export const BillingModal: React.FC<BillingModalProps> = ({ user, onClose }) => {
    const [stats, setStats] = useState<UsageStat[]>([]);
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
    const [rechargeAmount, setRechargeAmount] = useState<string>('49'); // Default to Pro plan price
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
                user_id: user.id, // Enforce current user
                start_date: startDate ? new Date(startDate).toISOString() : undefined,
                end_date: endDate ? new Date(endDate).toISOString() : undefined,
            };

            // Fetch Summary (Only on initial load or filter change)
            if (!isLoadMore) {
                const summaryData = await getUsageSummary(params);
                setSummary(summaryData);
            }

            // Fetch List
            const listData = await getUsageStats({
                ...params,
                skip: (currentPage - 1) * limit,
                limit: limit
            });
            
            const sortedData = (listData || []).sort((a, b) => new Date(b.session_time).getTime() - new Date(a.session_time).getTime());

            if (isLoadMore) {
                setStats(prev => [...prev, ...sortedData]);
                setPage(currentPage);
            } else {
                setStats(sortedData);
                setPage(1);
            }
            
            if (sortedData.length < limit) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (e) {
            console.error("Failed to fetch billing data", e);
        } finally {
            setIsLoading(false);
        }
    }, [user, startDate, endDate, page]);

    useEffect(() => {
        fetchUsageData();
        fetchWalletAndQuota();
    }, [startDate, endDate]); 

    // Polling logic for payment status
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

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    // Helper to get readable agent name
    const getAgentName = (id: string) => {
        // @ts-ignore
        return AGENT_NAMES[id] || id;
    };

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
            // Defaulting to 'manual' as the single interface backend handler
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
                            <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">账户余额</div>
                            <div className="text-4xl font-black tracking-tight flex items-baseline gap-1">
                                <span className="text-2xl">¥</span>
                                {wallet ? wallet.balance.toFixed(2) : '--'}
                                <button onClick={fetchWalletAndQuota} className="ml-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
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
                    {/* Filters & Summary */}
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
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={e => setStartDate(e.target.value)} 
                                        className="text-sm text-slate-600 outline-none border-none bg-transparent w-24" 
                                    />
                                    <span className="text-slate-300">-</span>
                                    <input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={e => setEndDate(e.target.value)} 
                                        className="text-sm text-slate-600 outline-none border-none bg-transparent w-24" 
                                    />
                                </div>
                                <button 
                                    onClick={() => fetchUsageData(false)} 
                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm"
                                    title="刷新"
                                >
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
                                        <th className="px-6 py-4">功能模块 (Agent)</th>
                                        <th className="px-6 py-4">模型 (Model)</th>
                                        <th className="px-6 py-4 text-right">Input</th>
                                        <th className="px-6 py-4 text-right">Output</th>
                                        <th className="px-6 py-4 text-right">费用 (CNY)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading && stats.length === 0 ? (
                                        <tr><td colSpan={6} className="py-20 text-center"><Spinner /></td></tr>
                                    ) : stats.length === 0 ? (
                                        <tr><td colSpan={6} className="py-20 text-center text-slate-400 italic">暂无消费记录</td></tr>
                                    ) : (
                                        stats.map((stat, idx) => (
                                            <tr key={`${stat.session_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                                                    {new Date(stat.session_time).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <ServerIcon className="w-4 h-4 text-slate-400" />
                                                        <span className="font-bold text-slate-700" title={stat.agent_id}>
                                                            {getAgentName(stat.agent_id)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <ChipIcon className="w-4 h-4 text-slate-400" />
                                                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                                                            {stat.model}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-xs">{stat.total_input_tokens.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-mono text-xs">{stat.total_output_tokens.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-bold text-indigo-600 font-mono">
                                                    ¥{stat.total_cost.toFixed(4)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            
                            {/* Load More Trigger */}
                            {hasMore && !isLoading && stats.length > 0 && (
                                <button 
                                    onClick={() => fetchUsageData(true)}
                                    className="w-full py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border-t border-slate-100 transition-colors"
                                >
                                    加载更多...
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recharge Overlay Modal */}
                {showRecharge && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in zoom-in-95">
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
                            {paymentStatus === 'success' ? (
                                <div className="w-full max-w-md text-center space-y-6 animate-in fade-in zoom-in">
                                     <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircleIcon className="w-12 h-12 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800">支付成功！</h3>
                                    <p className="text-slate-500">充值金额已到账，您可以继续使用服务。</p>
                                    <button 
                                        onClick={closeRecharge}
                                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        返回
                                    </button>
                                </div>
                            ) : !rechargeResult ? (
                                <div className="w-full max-w-md space-y-8">
                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={() => setRechargeAmount('49')}
                                            className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 group ${
                                                rechargeAmount === '49' 
                                                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-500/20' 
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl transition-colors ${rechargeAmount === '49' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-white'}`}>
                                                        <SparklesIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold text-lg ${rechargeAmount === '49' ? 'text-indigo-900' : 'text-slate-700'}`}>订阅专业版</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">解锁无限关注点与高级功能</div>
                                                    </div>
                                                </div>
                                                <div className={`text-2xl font-black font-mono tracking-tight ${rechargeAmount === '49' ? 'text-indigo-700' : 'text-slate-400'}`}>¥49.00</div>
                                            </div>
                                        </button>

                                        <div className={`relative p-5 rounded-2xl border-2 transition-all duration-200 ${
                                            rechargeAmount !== '49' 
                                                ? 'border-indigo-600 bg-white shadow-md ring-1 ring-indigo-500/20' 
                                                : 'border-slate-200 bg-slate-50/50'
                                        }`}>
                                            <label className="text-sm font-bold text-slate-700 block mb-3">其他金额充值</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">¥</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    min="0.01"
                                                    value={rechargeAmount}
                                                    onChange={e => setRechargeAmount(e.target.value)}
                                                    onFocus={() => { if (rechargeAmount === '49') setRechargeAmount(''); }}
                                                    className="w-full py-3 pl-10 pr-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-mono font-bold text-lg text-slate-800 placeholder-slate-300"
                                                    placeholder="输入充值金额"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleRecharge}
                                        disabled={isSubmittingRecharge}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                    >
                                        {isSubmittingRecharge ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <>
                                                <span>确认支付</span>
                                                <span className="font-mono">¥{parseFloat(rechargeAmount || '0').toFixed(2)}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full max-w-md text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                        <div className="animate-pulse text-blue-600 font-bold text-sm">扫码支付</div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800">订单已创建</h3>
                                    
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                                        <p className="text-sm text-slate-500">订单号: <span className="font-mono font-bold text-slate-700 select-all">{rechargeResult.order_no}</span></p>
                                        {rechargeResult.qr_code_url ? (
                                            <div className="flex flex-col items-center gap-4">
                                                 <div className="w-48 h-48 bg-white p-2 rounded-lg shadow-inner border flex items-center justify-center">
                                                     <img 
                                                         src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(rechargeResult.qr_code_url)}`} 
                                                         alt="Payment QR" 
                                                         className="w-full h-full object-contain"
                                                     />
                                                 </div>
                                                 <div className="flex items-center gap-2 text-xs text-slate-500">
                                                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                     正在检测支付状态...
                                                 </div>
                                            </div>
                                        ) : rechargeResult.pay_url ? (
                                            <a 
                                                href={rechargeResult.pay_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="block w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                                            >
                                                前往支付页面
                                            </a>
                                        ) : (
                                            <p className="text-green-600 font-bold">{rechargeResult.message}</p>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={closeRecharge}
                                        className="text-slate-500 hover:text-slate-800 font-bold text-sm underline decoration-slate-300 underline-offset-4"
                                    >
                                        稍后支付
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};