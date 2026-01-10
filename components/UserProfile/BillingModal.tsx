
import React, { useState, useEffect, useCallback } from 'react';
import { getUsageStats, getUsageSummary } from '../../api/stratify';
import { UsageStat, UsageSummary, User } from '../../types';
import { CloseIcon, ChartIcon, CalendarIcon, RefreshIcon, ServerIcon, ChipIcon } from '../icons';
import { AGENT_NAMES } from '../../agentConfig';

interface BillingModalProps {
    user: User;
    onClose: () => void;
}

const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>;

export const BillingModal: React.FC<BillingModalProps> = ({ user, onClose }) => {
    const [stats, setStats] = useState<UsageStat[]>([]);
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const limit = 20;
    const [hasMore, setHasMore] = useState(true);

    const fetchData = useCallback(async (isLoadMore = false) => {
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
        fetchData();
    }, [startDate, endDate]); // Trigger on filter change

    // Helper to get readable agent name
    const getAgentName = (id: string) => {
        // @ts-ignore
        return AGENT_NAMES[id] || id;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <ChartIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">账单管理</h2>
                            <p className="text-xs text-slate-500">查看您的模型调用消耗与费用明细</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs / Sub-nav (Visual only for now as requested) */}
                <div className="px-6 border-b border-slate-200 bg-white">
                    <div className="flex gap-6">
                        <button className="py-3 border-b-2 border-indigo-600 text-indigo-600 font-bold text-sm">模型消耗</button>
                        {/* Placeholder for future tabs */}
                        <button className="py-3 border-b-2 border-transparent text-slate-500 font-medium text-sm hover:text-slate-700 cursor-not-allowed opacity-50">充值记录</button>
                        <button className="py-3 border-b-2 border-transparent text-slate-500 font-medium text-sm hover:text-slate-700 cursor-not-allowed opacity-50">发票管理</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                    {/* Filters & Summary */}
                    <div className="p-6 pb-2 space-y-6">
                        
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">总计消费</span>
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
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)} 
                                    className="text-sm text-slate-600 outline-none border-none bg-transparent" 
                                />
                                <span className="text-slate-300">-</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)} 
                                    className="text-sm text-slate-600 outline-none border-none bg-transparent" 
                                />
                            </div>
                            <button 
                                onClick={() => fetchData(false)} 
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm"
                                title="刷新"
                            >
                                <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
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
                                    onClick={() => fetchData(true)}
                                    className="w-full py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border-t border-slate-100 transition-colors"
                                >
                                    加载更多...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
