
import React, { useState, useEffect, useCallback } from 'react';
import { AdminTransaction, PaymentOrder, UserListItem, RefundOrder } from '../../../types';
import { getAdminTransactions, getAdminOrders, getUserById, getInitialBalanceConfig, updateInitialBalanceConfig, getAdminRefunds, reviewRefund } from '../../../api/user';
import { RefreshIcon, SearchIcon, CreditCardIcon, ServerIcon, ChipIcon, CheckCircleIcon, ShieldExclamationIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, UserIcon, ClockIcon, GearIcon, CheckIcon } from '../../icons';
import { AGENT_NAMES } from '../../../agentConfig';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

const formatCurrency = (val: number) => {
    return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'paid': 
        case 'success':
            return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-fit"><CheckCircleIcon className="w-3 h-3"/> {status === 'paid' ? '已支付' : '成功'}</span>;
        case 'pending': 
        case 'processing':
            return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold w-fit flex items-center gap-1">{status === 'processing' && <RefreshIcon className="w-3 h-3 animate-spin"/>} {status === 'pending' ? '待处理' : '处理中'}</span>;
        case 'failed': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-fit"><ShieldExclamationIcon className="w-3 h-3"/> 失败</span>;
        case 'cancelled': return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-bold w-fit">已取消</span>;
        case 'refunded': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold w-fit">已退款</span>;
        case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold w-fit">已拒绝</span>;
        default: return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs w-fit">{status}</span>;
    }
};

const getTransactionTypeLabel = (type: string) => {
    switch (type) {
        case 'recharge': return '账户充值';
        case 'ai_consumption': return '模型消耗';
        case 'pdf_download': return 'PDF下载';
        case 'subscription': return '订阅';
        case 'gift': return '系统赠送';
        case 'refund': return '退款';
        default: return type;
    }
};

// Parse meta_data JSON string
const parseMeta = (metaStr: string | null) => {
    try {
        if (!metaStr) return null;
        const meta = JSON.parse(metaStr);
        
        let displayModel = meta.model || '-';
        if (meta.channel === 'openrouter' && displayModel.endsWith(':free')) {
            displayModel = displayModel.replace(':free', '');
        }

        return {
            model: displayModel,
            channel: meta.channel,
            input_tokens: meta.input_tokens || 0,
            output_tokens: meta.output_tokens || 0,
            app_id: meta.app_id || '',
            full: meta
        };
    } catch (e) {
        return null;
    }
};

// --- ReviewModal ---
const ReviewModal: React.FC<{ isOpen: boolean; onClose: () => void; refund: RefundOrder | null; onSuccess: () => void; }> = ({ isOpen, onClose, refund, onSuccess }) => {
    const [action, setAction] = useState<'approve' | 'reject'>('approve');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !refund) return null;

    const handleSubmit = async () => {
        if (action === 'reject' && !reason.trim()) {
            alert('拒绝时必须填写原因');
            return;
        }
        setIsSubmitting(true);
        try {
            await reviewRefund(refund.refund_no, { action, reason: reason || undefined });
            onSuccess();
            onClose();
        } catch (e: any) {
            alert('操作失败: ' + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-slate-800">退款审核</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                         <div className="flex justify-between mb-1">
                             <span className="text-slate-500">申请人:</span>
                             <span className="font-bold text-slate-800">{refund.username}</span>
                         </div>
                         <div className="flex justify-between mb-1">
                             <span className="text-slate-500">金额:</span>
                             <span className="font-bold text-indigo-600">¥{refund.amount.toFixed(2)}</span>
                         </div>
                         <div className="text-xs text-slate-400 mt-2 border-t border-slate-200 pt-2">
                             申请原因: {refund.reason}
                         </div>
                    </div>
                    
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setAction('approve')} 
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${action === 'approve' ? 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            批准退款
                         </button>
                         <button 
                            onClick={() => setAction('reject')} 
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${action === 'reject' ? 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            拒绝退款
                         </button>
                    </div>

                    {action === 'reject' && (
                        <textarea 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            placeholder="请输入拒绝原因..."
                            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                        />
                    )}
                    
                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting}
                            className={`px-6 py-2 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {isSubmitting ? <Spinner /> : (action === 'approve' ? '确认批准' : '确认拒绝')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SystemConfigModal ---
const SystemConfigModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [balance, setBalance] = useState('0.00');
    const [desc, setDesc] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getInitialBalanceConfig().then(res => {
                setBalance(res.value || '0.00');
                setDesc(res.description || '');
            }).finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateInitialBalanceConfig({ value: balance, description: desc });
            alert('配置更新成功');
            onClose();
        } catch (e: any) {
            alert('更新失败: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <GearIcon className="w-5 h-5 text-indigo-600"/> 全局财务配置
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-4">
                    {isLoading ? (
                        <div className="py-8 text-center"><Spinner /></div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">新用户初始赠送金额 (CNY)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={balance} 
                                    onChange={e => setBalance(e.target.value)} 
                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">说明备注</label>
                                <input 
                                    type="text" 
                                    value={desc} 
                                    onChange={e => setDesc(e.target.value)} 
                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="例如：2024新年注册福利"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    onClick={handleSave} 
                                    disabled={isSaving} 
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
                                >
                                    {isSaving ? <Spinner /> : <CheckIcon className="w-4 h-4"/>} 保存配置
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- User Detail Modal ---
const UserDetailModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
    const [user, setUser] = useState<UserListItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            try {
                const data = await getUserById(userId);
                setUser(data);
            } catch (e: any) {
                setError(e.message || "无法获取用户信息");
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [userId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-indigo-600"/> 用户详情
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6">
                    {isLoading ? (
                        <div className="py-10 text-center"><Spinner /></div>
                    ) : error ? (
                        <div className="py-10 text-center text-red-500">{error}</div>
                    ) : user ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-white shadow-lg">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-slate-900">{user.username}</div>
                                    <div className="text-sm text-slate-500">{user.email}</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">ID</div>
                                    <div className="text-xs font-mono text-slate-700 break-all">{user.id}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">订阅计划</div>
                                    <div className="font-bold text-indigo-600">{user.plan_name}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">账号状态</div>
                                    <div className={`text-sm font-bold ${user.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                                        {user.status}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">注册时间</div>
                                    <div className="text-xs text-slate-700">{new Date(user.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between text-xs text-slate-500">
                                <span>情报源订阅: <b>{user.source_subscription_count}</b></span>
                                <span>关注点: <b>{user.poi_count}</b></span>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export const FinanceManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'orders' | 'refunds'>('transactions');
    const [isLoading, setIsLoading] = useState(false);
    
    // Lists Data
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [orders, setOrders] = useState<PaymentOrder[]>([]);
    const [refunds, setRefunds] = useState<RefundOrder[]>([]);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    // Filters
    const [userId, setUserId] = useState(''); 
    const [status, setStatus] = useState(''); 

    // Modals
    const [viewingUserId, setViewingUserId] = useState<string | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [reviewRefundItem, setReviewRefundItem] = useState<RefundOrder | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'transactions') {
                const res = await getAdminTransactions({
                    user_id: userId || undefined,
                    page,
                    limit
                });
                setTransactions(res.items);
                setTotal(res.total);
            } else if (activeTab === 'orders') {
                const res = await getAdminOrders({
                    user_id: userId || undefined,
                    status: status || undefined,
                    page,
                    limit
                });
                setOrders(res.items);
                setTotal(res.total);
            } else if (activeTab === 'refunds') {
                const res = await getAdminRefunds({
                    status: status || undefined,
                    page,
                    limit
                });
                setRefunds(res.items);
                setTotal(res.total);
            }
        } catch (e) {
            console.error("Failed to fetch finance data", e);
            setTransactions([]);
            setOrders([]);
            setRefunds([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, page, userId, status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = () => {
        setPage(1);
        fetchData();
    };

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <div className="h-full flex flex-col bg-slate-50/50 relative overflow-hidden">
            {/* Header & Tabs */}
            <div className="p-6 bg-white border-b border-slate-200 shadow-sm z-10 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <CreditCardIcon className="w-6 h-6 text-indigo-600" /> 财务管理中心
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">查看全平台交易记录、订单状态与退款审核</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                             onClick={() => setIsConfigModalOpen(true)}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 hover:text-slate-800 transition-colors"
                        >
                            <GearIcon className="w-4 h-4" /> 全局配置
                        </button>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => { setActiveTab('transactions'); setPage(1); }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                交易流水
                            </button>
                            <button 
                                onClick={() => { setActiveTab('orders'); setPage(1); }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                支付订单
                            </button>
                            <button 
                                onClick={() => { setActiveTab('refunds'); setPage(1); }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'refunds' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                退款审批
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center gap-3">
                {activeTab !== 'refunds' && (
                    <div className="relative min-w-[240px]">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="输入 User ID 筛选..." 
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                )}

                {activeTab === 'orders' && (
                    <select 
                        value={status} 
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                        className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg p-2 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                        <option value="">所有订单状态</option>
                        <option value="paid">已支付</option>
                        <option value="pending">待支付</option>
                        <option value="failed">失败</option>
                        <option value="cancelled">已取消</option>
                    </select>
                )}
                
                {activeTab === 'refunds' && (
                    <select 
                        value={status} 
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                        className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg p-2 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                        <option value="">所有退款状态</option>
                        <option value="pending">待审核 (Pending)</option>
                        <option value="processing">退款中 (Processing)</option>
                        <option value="success">成功 (Success)</option>
                        <option value="failed">失败 (Failed)</option>
                        <option value="rejected">已拒绝 (Rejected)</option>
                    </select>
                )}

                <button onClick={handleSearch} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors text-sm font-bold flex items-center gap-2 ml-auto">
                    {isLoading ? <Spinner /> : <RefreshIcon className="w-4 h-4" />} 刷新数据
                </button>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto px-6 py-4 custom-scrollbar">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    {activeTab === 'transactions' && (
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">时间 / ID</th>
                                    <th className="px-6 py-4">用户</th>
                                    <th className="px-6 py-4">类型 / 描述</th>
                                    <th className="px-6 py-4">详情 (Meta)</th>
                                    <th className="px-6 py-4 text-right">变动金额</th>
                                    <th className="px-6 py-4 text-right">余额快照</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 && !isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-slate-400 italic">暂无交易记录</td></tr>
                                ) : (
                                    transactions.map(tx => {
                                        const meta = parseMeta(tx.meta_data);
                                        const isIncome = tx.amount > 0;
                                        const typeLabel = getTransactionTypeLabel(tx.transaction_type);
                                        const appName = meta?.app_id ? (AGENT_NAMES[meta.app_id as keyof typeof AGENT_NAMES] || meta.app_id) : '';

                                        return (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 align-top">
                                                    <div className="text-xs font-bold text-slate-700">{new Date(tx.created_at).toLocaleString()}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.id.slice(0, 8)}...</div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <button 
                                                        onClick={() => setViewingUserId(tx.user_id)}
                                                        className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer flex items-center gap-1 w-fit"
                                                        title="点击查看用户详情"
                                                    >
                                                        <UserIcon className="w-3 h-3"/>
                                                        {tx.user_id.slice(0, 8)}...
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase mb-1 inline-block ${
                                                        isIncome ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                                                    }`}>
                                                        {typeLabel}
                                                    </span>
                                                    <div className="text-xs text-slate-600 line-clamp-2 max-w-xs">{tx.description}</div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    {meta ? (
                                                        <div className="space-y-1">
                                                            {appName && (
                                                                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit border border-indigo-100">
                                                                    {appName}
                                                                </div>
                                                            )}
                                                            {meta.model !== '-' && (
                                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                                    <ChipIcon className="w-3.5 h-3.5 text-slate-400"/>
                                                                    <span className="font-mono">{meta.model}</span>
                                                                </div>
                                                            )}
                                                            {(meta.input_tokens > 0 || meta.output_tokens > 0) && (
                                                                <div className="flex gap-2 text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded w-fit border border-slate-100">
                                                                    <span title="Input Tokens">In: {meta.input_tokens}</span>
                                                                    <span className="text-slate-300">|</span>
                                                                    <span title="Output Tokens">Out: {meta.output_tokens}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-black text-sm align-top ${isIncome ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-xs text-slate-500 align-top">
                                                    {formatCurrency(tx.balance_after)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                    
                    {activeTab === 'orders' && (
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">订单号 / 时间</th>
                                    <th className="px-6 py-4">用户</th>
                                    <th className="px-6 py-4">支付网关</th>
                                    <th className="px-6 py-4 text-right">金额</th>
                                    <th className="px-6 py-4 text-center">状态</th>
                                    <th className="px-6 py-4">外部单号</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.length === 0 && !isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-slate-400 italic">暂无订单记录</td></tr>
                                ) : (
                                    orders.map(order => (
                                        <tr key={order.order_no} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-mono text-xs font-bold text-slate-700">{order.order_no}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <button 
                                                    onClick={() => setViewingUserId(order.user_id)}
                                                    className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer flex items-center gap-1 w-fit"
                                                >
                                                    <UserIcon className="w-3 h-3"/>
                                                    {order.user_id.slice(0, 8)}...
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase bg-white border border-slate-200 px-2 py-1 rounded w-fit">
                                                    <ServerIcon className="w-3.5 h-3.5 text-slate-400"/>
                                                    {order.gateway}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-slate-800 align-top">
                                                {formatCurrency(order.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center align-top">
                                                {getStatusBadge(order.status)}
                                                {order.paid_at && <div className="text-[9px] text-green-600 mt-1 flex items-center justify-center gap-1"><ClockIcon className="w-3 h-3"/> {new Date(order.paid_at).toLocaleTimeString()}</div>}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-[10px] font-mono text-slate-400 max-w-[150px] truncate bg-slate-50 px-1.5 py-0.5 rounded" title={order.external_order_no}>
                                                    {order.external_order_no || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                    
                    {activeTab === 'refunds' && (
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">退款单号 / 时间</th>
                                    <th className="px-6 py-4">原订单 / 用户</th>
                                    <th className="px-6 py-4 text-right">金额</th>
                                    <th className="px-6 py-4 text-center">状态</th>
                                    <th className="px-6 py-4">退款原因</th>
                                    <th className="px-6 py-4 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {refunds.length === 0 && !isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-slate-400 italic">暂无退款申请</td></tr>
                                ) : (
                                    refunds.map(refund => (
                                        <tr key={refund.refund_no} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-mono text-xs font-bold text-slate-700">{refund.refund_no}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(refund.created_at).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-mono text-xs text-slate-500">{refund.original_order_no}</div>
                                                <button 
                                                    onClick={() => refund.user_id && setViewingUserId(refund.user_id)}
                                                    className="text-xs font-bold text-indigo-600 hover:underline mt-1"
                                                >
                                                    {refund.username || 'Unknown User'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-slate-800 align-top">
                                                {formatCurrency(refund.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center align-top">
                                                {getStatusBadge(refund.status)}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-xs text-slate-600 max-w-xs break-words">{refund.reason}</div>
                                            </td>
                                            <td className="px-6 py-4 align-top text-center">
                                                {refund.status === 'pending' ? (
                                                    <button 
                                                        onClick={() => setReviewRefundItem(refund)}
                                                        className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                                    >
                                                        审核
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">已完结</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-sm text-gray-500 z-10">
                <span>共 {total} 条记录</span>
                <div className="flex gap-2">
                    <button 
                        disabled={page <= 1} 
                        onClick={() => setPage(p => p - 1)} 
                        className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1 text-xs"
                    >
                        <ChevronLeftIcon className="w-3 h-3"/> 上一页
                    </button>
                    <span className="px-3 py-1 font-bold text-indigo-600 bg-indigo-50 rounded text-xs">{page}</span>
                    <button 
                        disabled={page >= totalPages} 
                        onClick={() => setPage(p => p + 1)} 
                        className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1 text-xs"
                    >
                        下一页 <ChevronRightIcon className="w-3 h-3"/>
                    </button>
                </div>
            </div>

            {viewingUserId && <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}
            
            <SystemConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />

            {reviewRefundItem && (
                <ReviewModal 
                    isOpen={!!reviewRefundItem} 
                    refund={reviewRefundItem} 
                    onClose={() => setReviewRefundItem(null)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
};