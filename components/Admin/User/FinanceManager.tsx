
import React, { useState, useEffect, useCallback } from 'react';
import { AdminTransaction, PaymentOrder } from '../../../types';
import { getAdminTransactions, getAdminOrders } from '../../../api/user';
import { RefreshIcon, SearchIcon, CreditCardIcon, ServerIcon, ClockIcon, ChipIcon, CheckCircleIcon, ShieldExclamationIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import { AGENT_NAMES } from '../../../agentConfig';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

const formatCurrency = (val: number) => {
    return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'paid': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><CheckCircleIcon className="w-3 h-3"/> 已支付</span>;
        case 'pending': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">待支付</span>;
        case 'failed': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><ShieldExclamationIcon className="w-3 h-3"/> 失败</span>;
        case 'cancelled': return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-bold">已取消</span>;
        case 'refunded': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">已退款</span>;
        default: return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">{status}</span>;
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

const parseMeta = (metaStr: string | null) => {
    try {
        if (!metaStr) return { model: '-', tokens: '-', app_id: '' };
        const meta = JSON.parse(metaStr);
        const total = (meta.input_tokens || 0) + (meta.output_tokens || 0);
        let displayModel = meta.model || '-';
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

export const FinanceManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'orders'>('transactions');
    const [isLoading, setIsLoading] = useState(false);
    
    // Lists Data
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [orders, setOrders] = useState<PaymentOrder[]>([]);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    // Filters
    const [userId, setUserId] = useState(''); 
    const [status, setStatus] = useState(''); 

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
            }
        } catch (e) {
            console.error("Failed to fetch finance data", e);
            setTransactions([]);
            setOrders([]);
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
                        <p className="text-xs text-slate-500 mt-1">查看全平台交易记录与订单状态</p>
                    </div>
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
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center gap-3">
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
                                    <th className="px-6 py-4">用户 ID</th>
                                    <th className="px-6 py-4">类型</th>
                                    <th className="px-6 py-4">描述 / 来源</th>
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
                                        const appName = meta.app_id ? (AGENT_NAMES[meta.app_id as keyof typeof AGENT_NAMES] || meta.app_id) : '';

                                        return (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="text-xs font-bold text-slate-700">{new Date(tx.created_at).toLocaleString()}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.id.slice(0, 8)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{tx.user_id.slice(0, 8)}...</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                                                        isIncome ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                                                    }`}>
                                                        {typeLabel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="text-xs text-slate-800 font-medium truncate" title={tx.description}>{tx.description}</div>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {appName && <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 rounded">{appName}</span>}
                                                        {meta.model !== '-' && <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 rounded flex items-center gap-1"><ChipIcon className="w-3 h-3"/> {meta.model}</span>}
                                                        {meta.tokens !== '-' && <span className="text-[10px] text-slate-400">{meta.tokens} toks</span>}
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${isIncome ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">
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
                                    <th className="px-6 py-4">用户 ID</th>
                                    <th className="px-6 py-4">渠道</th>
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
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs font-bold text-slate-700">{order.order_no}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{order.user_id ? order.user_id.slice(0, 8) + '...' : '-'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase">
                                                    <ServerIcon className="w-3.5 h-3.5 text-slate-400"/>
                                                    {order.gateway}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-slate-800">
                                                {formatCurrency(order.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(order.status)}
                                                {order.paid_at && <div className="text-[9px] text-green-600 mt-1">{new Date(order.paid_at).toLocaleTimeString()}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[10px] font-mono text-slate-400 max-w-[120px] truncate" title={order.external_order_no}>
                                                    {order.external_order_no || '-'}
                                                </div>
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
        </div>
    );
};
