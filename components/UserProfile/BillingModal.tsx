
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMyQuotaUsage, getWalletBalance, rechargeWallet, checkPaymentStatus, getWalletTransactions, getUserUsageStats, getUserRefunds, applyRefund } from '../../api/user';
import { User, QuotaItem, WalletBalance, RechargeResponse, WalletTransaction, RefundOrder } from '../../types';
import { CloseIcon, ChartIcon, CalendarIcon, RefreshIcon, ServerIcon, ChipIcon, CheckCircleIcon, PlusIcon, SparklesIcon, ArrowRightIcon, DocumentTextIcon, ClockIcon, CheckIcon, ShieldExclamationIcon, CreditCardIcon } from '../icons';
import { AGENT_NAMES } from '../../agentConfig';

interface BillingModalProps {
    user: User;
    onClose: () => void;
}

const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>;

// 解析 meta_data 的辅助函数
const parseMeta = (metaStr: string | null) => {
    try {
        if (!metaStr) return { model: '-', tokens: '-', app_id: '' };
        const meta = JSON.parse(metaStr);
        // Calculate total tokens if input/output available, else just tokens
        const total = (meta.input_tokens || 0) + (meta.output_tokens || 0);
        
        let displayModel = meta.model || '-';
        // 规则优化：如果 channel 是 openrouter 且模型后缀是 :free，则不显示 :free
        if (meta.channel === 'openrouter' && displayModel.endsWith(':free')) {
            displayModel = displayModel.replace(':free', '');
        }

        return {
            model: displayModel,
            tokens: total || meta.tokens || '-',
            app_id: meta.app_id || ''
        };
    } catch (e) {
        return { model: '-', tokens: '-', app_id: '' };
    }
};

const getTransactionTypeLabel = (type: string) => {
    switch (type) {
        case 'ai_consumption': return '模型调用';
        case 'pdf_download': return 'PDF下载';
        case 'recharge': return '账户充值';
        case 'gift': return '系统赠送';
        case 'refund': return '退款';
        default: return type;
    }
};

const getRefundStatusBadge = (status: string) => {
    switch (status) {
        case 'success': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-fit"><CheckCircleIcon className="w-3 h-3"/> 成功</span>;
        case 'pending': 
        case 'processing':
            return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-fit">{status === 'processing' && <RefreshIcon className="w-3 h-3 animate-spin"/>} 处理中</span>;
        case 'failed': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-fit"><ShieldExclamationIcon className="w-3 h-3"/> 失败</span>;
        case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold w-fit">已拒绝</span>;
        default: return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs w-fit">{status}</span>;
    }
};

// --- ApplyRefundModal ---
const ApplyRefundModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; }> = ({ isOpen, onClose, onSuccess }) => {
    const [orderNo, setOrderNo] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderNo || !amount || !reason) {
            setError('请填写所有必填项');
            return;
        }
        
        setIsSubmitting(true);
        setError('');
        try {
            await applyRefund({ order_no: orderNo, amount: parseFloat(amount), reason });
            alert('申请已提交，请等待管理员审核。');
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || '申请提交失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-slate-800">申请退款</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                        请输入您需要退款的原支付订单号（可在支付凭证中查看）。系统将冻结对应金额直至审核完成。
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">订单号 <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={orderNo} 
                            onChange={e => setOrderNo(e.target.value)} 
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="例如: ORD2024..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">退款金额 (CNY) <span className="text-red-500">*</span></label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">退款原因 <span className="text-red-500">*</span></label>
                        <textarea 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                            placeholder="请说明退款原因..."
                        />
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex justify-end pt-2">
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                        >
                            {isSubmitting ? <Spinner /> : '提交申请'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const BillingModal: React.FC<BillingModalProps> = ({ user, onClose }) => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'refunds'>('transactions');

    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [refunds, setRefunds] = useState<RefundOrder[]>([]);
    const [stats, setStats] = useState<any>(null); // New Stats structure
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

    // Refund Modal State
    const [isApplyRefundOpen, setIsApplyRefundOpen] = useState(false);

    const fetchWalletAndQuota = async () => {
        setIsRefreshingWallet(true);
        try {
            // Parallel fetch wallet, quota, and new usage stats
            const [w, q, s] = await Promise.all([
                getWalletBalance(), 
                getMyQuotaUsage(),
                getUserUsageStats() // New API call
            ]);
            setWallet(w);
            setQuotas(q);
            setStats(s);
        } catch (e) {
            console.error("Failed to fetch wallet info", e);
        } finally {
            setIsRefreshingWallet(false);
        }
    };

    const fetchListData = useCallback(async (isLoadMore = false) => {
        if (!user || !user.id) return;
        
        const currentPage = isLoadMore ? page + 1 : 1;
        if (!isLoadMore) setIsLoading(true);
        
        try {
            if (activeTab === 'transactions') {
                const params = {
                    page: currentPage,
                    limit: limit,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined
                };

                const response = await getWalletTransactions(params);
                const listData = response.items || [];
                
                if (isLoadMore) {
                    setTransactions(prev => [...prev, ...listData]);
                    setPage(currentPage);
                } else {
                    setTransactions(listData);
                    setPage(1);
                }
                setHasMore(currentPage < response.totalPages);
            } else if (activeTab === 'refunds') {
                const response = await getUserRefunds({ page: currentPage, limit });
                const listData = response.items || [];
                 if (isLoadMore) {
                    setRefunds(prev => [...prev, ...listData]);
                    setPage(currentPage);
                } else {
                    setRefunds(listData);
                    setPage(1);
                }
                setHasMore(currentPage < response.totalPages);
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        } finally {
            setIsLoading(false);
        }
    }, [user, startDate, endDate, page, activeTab]);

    useEffect(() => {
        fetchListData();
        fetchWalletAndQuota();
    }, [startDate, endDate, activeTab]); 

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
            return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
        }
    }, [rechargeResult, paymentStatus]);

    const handleRecharge = async () => {
        const amount = parseFloat(rechargeAmount);
        if (isNaN(amount) || amount <= 0) return;
        setIsSubmittingRecharge(true);
        try {
            const res = await rechargeWallet(amount, 'manual');
            setRechargeResult(res);
            setPaymentStatus('pending');
        } catch (e: any) {
            alert('充值请求失败: ' + e.message);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative">
                
                {/* Header - Minimalist */}
                <div className="px-8 py-6 flex justify-between items-center shrink-0 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                            <ChartIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">账单与权益</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Billing & Token Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all hover:rotate-90">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    
                    {/* Left Panel: Wallet & Quick Actions (Sticky-like) */}
                    <div className="w-full md:w-80 flex-shrink-0 bg-slate-50 border-r border-slate-200 p-8 flex flex-col gap-8">
                        
                        {/* Elegant Wallet Card */}
                        <div className="relative group perspective-1000">
                            <div className="relative w-full h-48 bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-800 rounded-xl p-6 shadow-xl overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] active:scale-95">
                                {/* Decorative elements */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                                
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-indigo-300/60 uppercase tracking-widest">Available Balance</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <RefreshIcon 
                                                    onClick={(e) => { e.stopPropagation(); fetchWalletAndQuota(); }} 
                                                    className={`w-3.5 h-3.5 text-indigo-300/80 cursor-pointer hover:text-white transition-all ${isRefreshingWallet ? 'animate-spin' : ''}`} 
                                                />
                                                <span className="text-xs font-bold text-white/50 font-mono">CNY</span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
                                            <SparklesIcon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="text-4xl font-black text-white tracking-tighter flex items-baseline gap-1">
                                            <span className="text-2xl font-light opacity-60">¥</span>
                                            {wallet ? Number(wallet.balance).toFixed(2) : '--'}
                                        </div>
                                        {wallet && wallet.plan_name && (
                                            <div className="inline-block mt-2 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] text-white/80 font-bold uppercase tracking-wider">
                                                {wallet.plan_name} Plan
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="text-[10px] font-mono text-white/40 tracking-wider truncate mt-auto">
                                        Seres AI Intelligent Wallet Service
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Recharge Entry */}
                        <button 
                            onClick={() => setShowRecharge(true)}
                            className="w-full py-4 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-3 text-slate-700 font-black text-sm shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all hover:shadow-lg active:scale-95 group"
                        >
                            <PlusIcon className="w-5 h-5 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                            <span>立即充值余额</span>
                        </button>

                        {/* Quota Highlights - Only show if quotas exist */}
                        {quotas.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">权益额度进度</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {quotas.slice(0, 3).map(quota => (
                                        <div key={quota.resource_key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-600 truncate mr-2">{quota.resource_key}</span>
                                                <span className="text-xs font-mono font-bold text-indigo-600">
                                                    {quota.usage_count}/{quota.limit_value === -1 ? '∞' : quota.limit_value}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ease-out ${quota.usage_count >= quota.limit_value && quota.limit_value !== -1 ? 'bg-red-400' : 'bg-indigo-500'}`}
                                                    style={{ width: quota.limit_value === -1 ? '100%' : `${Math.min(100, (quota.usage_count / quota.limit_value) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Transaction History */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        
                        {/* Data Overview Cards */}
                        <div className="p-8 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: '总计消费', value: stats?.total_consumption || 0, prefix: '¥', color: 'text-indigo-600', isCurrency: true },
                                { label: 'Total Tokens', value: stats?.total_consumption_tokens || 0, color: 'text-slate-700' },
                                { label: 'Input Tokens', value: stats?.total_input_tokens || 0, color: 'text-slate-500' },
                                { label: 'Output Tokens', value: stats?.total_output_tokens || 0, color: 'text-slate-500' },
                            ].map((card, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{card.label}</span>
                                    <div className={`text-xl font-black truncate ${card.color}`}>
                                        {card.prefix}{card.isCurrency ? Number(card.value).toFixed(4) : Number(card.value).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* List Header */}
                        <div className="px-8 py-4 flex justify-between items-center flex-wrap gap-4">
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => { setActiveTab('transactions'); setPage(1); }}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'transactions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    交易流水
                                </button>
                                <button 
                                    onClick={() => { setActiveTab('refunds'); setPage(1); }}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'refunds' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    退款记录
                                </button>
                            </div>

                            {activeTab === 'transactions' && (
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-20" />
                                    <span className="text-slate-300">-</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-20" />
                                </div>
                            )}

                            {activeTab === 'refunds' && (
                                <button 
                                    onClick={() => setIsApplyRefundOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                                >
                                    <CreditCardIcon className="w-3.5 h-3.5" /> 申请退款
                                </button>
                            )}
                        </div>

                        {/* Records List - Card Style */}
                        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                            <div className="space-y-4"> 
                                {isLoading && transactions.length === 0 && refunds.length === 0 ? (
                                    <div className="py-20 text-center"><Spinner /></div>
                                ) : (activeTab === 'transactions' && transactions.length === 0) || (activeTab === 'refunds' && refunds.length === 0) ? (
                                    <div className="py-20 text-center flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                            <DocumentTextIcon className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">暂无记录</span>
                                    </div>
                                ) : activeTab === 'transactions' ? (
                                    transactions.map((record, idx) => {
                                        const meta = parseMeta(record.meta_data);
                                        const isRecharge = record.transaction_type === 'recharge' || record.transaction_type === 'gift';
                                        
                                        // 智能解析应用名称：如果有 app_id，尝试从全局配置 AGENT_NAMES 映射中文名，否则显示 app_id。
                                        // 如果没有 app_id，则显示 record.description。
                                        const typeLabel = getTransactionTypeLabel(record.transaction_type);
                                        let displayTitle = `${typeLabel}: ${record.description || '无描述'}`;
                                        
                                        if (meta.app_id) {
                                            const appName = AGENT_NAMES[meta.app_id as keyof typeof AGENT_NAMES] || meta.app_id;
                                            displayTitle = `${typeLabel}: ${appName}`;
                                        }

                                        return (
                                            <div key={record.id || idx} className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 flex items-center justify-between">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 ${isRecharge ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                        {isRecharge ? <PlusIcon className="w-5 h-5" /> : <ServerIcon className="w-5 h-5" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-800 text-sm truncate" title={displayTitle}>{displayTitle}</span>
                                                            {meta.model !== '-' && (
                                                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{meta.model}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                                            <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5 text-slate-400" /> {new Date(record.created_at).toLocaleString()}</span>
                                                            {meta.tokens !== '-' && (
                                                                <span className="flex items-center gap-1"><ChipIcon className="w-3.5 h-3.5 text-slate-400" /> {Number(meta.tokens).toLocaleString()} Tokens</span>
                                                            )}
                                                            <span className="flex items-center gap-1 text-slate-400">
                                                                余额: ¥{record.balance_after.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pl-6">
                                                    <div className={`text-lg font-black font-mono ${isRecharge ? 'text-green-600' : 'text-slate-800'}`}>
                                                        {isRecharge ? '+' : ''}{record.amount.toFixed(4)}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">CNY</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    refunds.map(refund => (
                                        <div key={refund.refund_no} className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-red-300 hover:shadow-sm transition-all flex items-center justify-between">
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-1">
                                                    <ShieldExclamationIcon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 text-sm">退款申请: {refund.refund_no}</span>
                                                        {getRefundStatusBadge(refund.status)}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        原订单: <span className="font-mono">{refund.original_order_no}</span>
                                                        <span className="mx-2">|</span>
                                                        原因: {refund.reason}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <ClockIcon className="w-3.5 h-3.5" /> 申请时间: {new Date(refund.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 pl-6">
                                                 <div className="text-lg font-black font-mono text-slate-800">
                                                    ¥{refund.amount.toFixed(2)}
                                                </div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">CNY</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                                
                                {hasMore && !isLoading && ((activeTab === 'transactions' && transactions.length > 0) || (activeTab === 'refunds' && refunds.length > 0)) && (
                                    <button onClick={() => fetchListData(true)} className="w-full py-4 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                        Load More History ↓
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RECHARGE OVERLAY --- */}
                {showRecharge && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100 bg-white">
                            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><PlusIcon className="w-6 h-6"/></div>
                                余额充值中心
                            </h3>
                            <button onClick={closeRecharge} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-12 flex justify-center custom-scrollbar">
                            {paymentStatus === 'success' ? (
                                <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500 pt-12">
                                     <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-100 animate-bounce">
                                        <CheckCircleIcon className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-800">支付成功</h3>
                                        <p className="text-slate-500 font-medium">资金已成功汇入您的智能钱包</p>
                                    </div>
                                    <button 
                                        onClick={closeRecharge}
                                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-600 transition-all transform active:scale-95"
                                    >
                                        返回工作台
                                    </button>
                                </div>
                            ) : !rechargeResult ? (
                                <div className="w-full max-w-lg space-y-10">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">选择充值包 / Choose Package</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: '基础体验', amount: '10', desc: '短期调试首选' },
                                                { label: '专业订阅', amount: '49', desc: '月度高频使用', featured: true },
                                                { label: '团队进阶', amount: '99', desc: '多人协作支持' },
                                                { label: '企业旗舰', amount: '299', desc: '大批量生成推荐' },
                                            ].map((pkg) => (
                                                <button
                                                    key={pkg.amount}
                                                    onClick={() => setRechargeAmount(pkg.amount)}
                                                    className={`relative p-5 rounded-xl border-2 text-left transition-all duration-300 group ${
                                                        rechargeAmount === pkg.amount 
                                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100 ring-4 ring-indigo-500/5' 
                                                            : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'
                                                    }`}
                                                >
                                                    {pkg.featured && (
                                                        <div className="absolute -top-3 -right-2 bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase shadow-lg tracking-widest">Most Popular</div>
                                                    )}
                                                    <div className="text-xs font-bold text-slate-400 mb-1">{pkg.label}</div>
                                                    <div className="text-2xl font-black text-slate-800 flex items-baseline gap-0.5">
                                                        <span className="text-sm font-medium">¥</span>{pkg.amount}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-2 font-medium">{pkg.desc}</div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className={`mt-4 relative p-6 rounded-xl border-2 transition-all duration-300 ${
                                            !['10','49','99','299'].includes(rechargeAmount) 
                                                ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100' 
                                                : 'border-slate-100 bg-slate-50/30 opacity-60'
                                        }`}>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">或者输入自定义金额 (CNY)</label>
                                            <div className="relative">
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-light">¥</span>
                                                <input 
                                                    type="number" 
                                                    step="1"
                                                    value={rechargeAmount}
                                                    onChange={e => setRechargeAmount(e.target.value)}
                                                    className="w-full py-2 pl-6 bg-transparent text-3xl font-black text-slate-800 outline-none placeholder:text-slate-200"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleRecharge}
                                        disabled={isSubmittingRecharge || !rechargeAmount}
                                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl shadow-2xl shadow-indigo-200 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isSubmittingRecharge ? <div className="animate-spin rounded-full h-6 w-6 border-4 border-white/20 border-t-white"></div> : <><CheckIcon className="w-6 h-6" /> 确认支付 ¥{rechargeAmount}</>}
                                    </button>
                                    
                                    <div className="text-center p-4 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 text-[10px] font-bold leading-relaxed">
                                        支付即视为同意《Seres AI 软件服务协议》及《隐私政策》。系统将根据实际使用的 Token 数量扣费，余额永久有效且可随时在工单中申请退款。
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full max-w-md text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500 pt-6">
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-800">订单已就绪</h3>
                                        <p className="text-slate-500 font-medium">请使用移动设备扫描下方二维码完成支付</p>
                                    </div>
                                    
                                    <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 flex flex-col items-center gap-6 relative group">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        {rechargeResult.qr_code_url ? (
                                            <div className="flex flex-col items-center gap-6 relative z-10">
                                                 <div className="w-64 h-64 bg-white p-4 rounded-3xl shadow-inner border border-slate-100 flex items-center justify-center overflow-hidden">
                                                     <img 
                                                         src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(rechargeResult.qr_code_url)}`} 
                                                         alt="Payment QR" 
                                                         className="w-full h-full object-contain"
                                                     />
                                                 </div>
                                                 <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
                                                     <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                                                     <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Awaiting Verification</span>
                                                 </div>
                                            </div>
                                        ) : rechargeResult.pay_url ? (
                                            <a 
                                                href={rechargeResult.pay_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                前往支付终端 <ArrowRightIcon className="w-5 h-5" />
                                            </a>
                                        ) : (
                                            <p className="text-green-600 font-black">{rechargeResult.message}</p>
                                        )}
                                        <div className="text-[10px] text-slate-400 font-mono">Order: {rechargeResult.order_no}</div>
                                    </div>
                                    
                                    <button 
                                        onClick={closeRecharge}
                                        className="text-slate-400 hover:text-slate-800 font-black text-xs uppercase tracking-widest border-b border-transparent hover:border-slate-800 transition-all pb-1"
                                    >
                                        Cancel Transaction
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ApplyRefundModal 
                isOpen={isApplyRefundOpen}
                onClose={() => setIsApplyRefundOpen(false)}
                onSuccess={() => { fetchListData(); }}
            />
        </div>
    );
};