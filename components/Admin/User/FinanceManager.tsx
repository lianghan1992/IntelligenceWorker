
import React, { useState, useEffect, useCallback } from 'react';
import { BillItem, BillStats, UserBillSummary } from '../../../types';
import { getAdminBills, getAdminBillStats, getAdminUserBillSummary } from '../../../api/user';
import { ChartIcon, RefreshIcon, SearchIcon, CalendarIcon, UsersIcon, CheckCircleIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

const formatCurrency = (val: number) => {
    return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'paid': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">已支付</span>;
        case 'pending': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">待支付</span>;
        case 'failed': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">失败</span>;
        case 'cancelled': return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-bold">已取消</span>;
        case 'refunded': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">已退款</span>;
        default: return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">{status}</span>;
    }
};

const getTypeLabel = (type: string) => {
    switch (type) {
        case 'recharge': return '充值';
        case 'consumption': return '消费';
        case 'subscription': return '订阅';
        case 'refund': return '退款';
        default: return type;
    }
};

export const FinanceManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'transactions' | 'users'>('transactions');
    const [isLoading, setIsLoading] = useState(false);
    
    // Stats
    const [stats, setStats] = useState<BillStats | null>(null);

    // Lists
    const [bills, setBills] = useState<BillItem[]>([]);
    const [userSummaries, setUserSummaries] = useState<UserBillSummary[]>([]);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    // Filters
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [keyword, setKeyword] = useState('');
    const [billType, setBillType] = useState('');
    const [status, setStatus] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                start_at: dateStart ? new Date(dateStart).toISOString() : undefined,
                end_at: dateEnd ? new Date(dateEnd).toISOString() : undefined,
            };

            // Fetch Stats once per filter change (independent of pagination)
            const statsData = await getAdminBillStats(params);
            setStats(statsData);

            // Fetch List based on tab
            if (activeTab === 'transactions') {
                const res = await getAdminBills({
                    ...params,
                    keyword: keyword || undefined,
                    bill_type: billType || undefined,
                    status: status || undefined,
                    page,
                    limit
                });
                setBills(res.items);
                setTotal(res.total);
            } else {
                const res = await getAdminUserBillSummary({
                    ...params,
                    page,
                    limit
                });
                setUserSummaries(res.items);
                setTotal(res.total);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, page, dateStart, dateEnd, keyword, billType, status]);

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
            {/* Header / Stats Overview */}
            <div className="p-6 bg-white border-b border-slate-200 shadow-sm z-10 flex-shrink-0">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <ChartIcon className="w-6 h-6 text-indigo-600" /> 财务数据看板
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">实时监控平台充值与消费流水</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => { setActiveTab('transactions'); setPage(1); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            交易流水
                        </button>
                        <button 
                            onClick={() => { setActiveTab('users'); setPage(1); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            用户账单
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">总流水金额</div>
                            <div className="text-2xl font-black text-indigo-700">{formatCurrency(stats.total_amount)}</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">充值总额</div>
                            <div className="text-2xl font-black text-green-700">
                                {formatCurrency(stats.by_type.find(t => t.key === 'recharge')?.amount || 0)}
                            </div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">消费总额</div>
                            <div className="text-2xl font-black text-orange-700">
                                {formatCurrency(stats.by_type.find(t => t.key === 'consumption')?.amount || 0)}
                            </div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">总交易笔数</div>
                            <div className="text-2xl font-black text-slate-700">{stats.total_count}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-xs outline-none w-24 text-slate-600" />
                    <span className="text-slate-300">-</span>
                    <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-xs outline-none w-24 text-slate-600" />
                </div>

                {activeTab === 'transactions' && (
                    <>
                        <select 
                            value={billType} 
                            onChange={e => setBillType(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg p-2 outline-none"
                        >
                            <option value="">所有类型</option>
                            <option value="recharge">充值</option>
                            <option value="consumption">消费</option>
                            <option value="subscription">订阅</option>
                        </select>
                        <select 
                            value={status} 
                            onChange={e => setStatus(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg p-2 outline-none"
                        >
                            <option value="">所有状态</option>
                            <option value="paid">已支付</option>
                            <option value="pending">待支付</option>
                            <option value="failed">失败</option>
                        </select>
                         <div className="relative flex-1 min-w-[200px]">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="搜索订单号、描述..." 
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </>
                )}

                <button onClick={handleSearch} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                    {isLoading ? <Spinner /> : <RefreshIcon className="w-4 h-4" />}
                </button>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto px-6 py-4 custom-scrollbar">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {activeTab === 'transactions' ? (
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b font-bold">
                                <tr>
                                    <th className="px-6 py-4">订单号/时间</th>
                                    <th className="px-6 py-4">用户</th>
                                    <th className="px-6 py-4">类型</th>
                                    <th className="px-6 py-4">渠道/网关</th>
                                    <th className="px-6 py-4">描述</th>
                                    <th className="px-6 py-4 text-right">金额</th>
                                    <th className="px-6 py-4 text-center">状态</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {bills.map(bill => (
                                    <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs font-bold text-slate-700">{bill.order_no}</div>
                                            <div className="text-xs text-slate-400 mt-1">{new Date(bill.created_at).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-700">{bill.username || 'Unknown'}</div>
                                            <div className="text-[10px] text-slate-400">{bill.user_id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-0.5 rounded border ${
                                                bill.bill_type === 'recharge' ? 'bg-green-50 text-green-700 border-green-100' :
                                                bill.bill_type === 'consumption' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                                {getTypeLabel(bill.bill_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {bill.channel} / {bill.gateway}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={bill.description}>
                                            {bill.description}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${
                                            bill.bill_type === 'recharge' ? 'text-green-600' : 'text-orange-600'
                                        }`}>
                                            {bill.bill_type === 'recharge' ? '+' : '-'}{formatCurrency(bill.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(bill.status)}
                                        </td>
                                    </tr>
                                ))}
                                {bills.length === 0 && !isLoading && (
                                    <tr><td colSpan={7} className="text-center py-20 text-slate-400 italic">暂无交易记录</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b font-bold">
                                <tr>
                                    <th className="px-6 py-4">用户</th>
                                    <th className="px-6 py-4 text-center">交易笔数</th>
                                    <th className="px-6 py-4 text-right">充值总额</th>
                                    <th className="px-6 py-4 text-right">消费总额</th>
                                    <th className="px-6 py-4 text-right">订阅总额</th>
                                    <th className="px-6 py-4 text-right">净额 (Total)</th>
                                    <th className="px-6 py-4 text-right">最近交易</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {userSummaries.map(summary => (
                                    <tr key={summary.user_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                    {(summary.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700 text-xs">{summary.username}</div>
                                                    <div className="text-[10px] text-slate-400">{summary.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-700">{summary.bills_count}</td>
                                        <td className="px-6 py-4 text-right font-mono text-green-600">{formatCurrency(summary.recharge_amount)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-orange-600">{formatCurrency(summary.consumption_amount)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-purple-600">{formatCurrency(summary.subscription_amount)}</td>
                                        <td className="px-6 py-4 text-right font-mono font-black text-slate-800">{formatCurrency(summary.total_amount)}</td>
                                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">
                                            {summary.last_bill_at ? new Date(summary.last_bill_at).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {userSummaries.length === 0 && !isLoading && (
                                    <tr><td colSpan={7} className="text-center py-20 text-slate-400 italic">暂无用户数据</td></tr>
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
                        className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center"
                    >
                        <ChevronLeftIcon className="w-4 h-4"/> 上一页
                    </button>
                    <span className="px-2 py-1 font-bold text-indigo-600 bg-indigo-50 rounded">{page}</span>
                    <button 
                        disabled={page >= totalPages} 
                        onClick={() => setPage(p => p + 1)} 
                        className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center"
                    >
                        下一页 <ChevronRightIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
