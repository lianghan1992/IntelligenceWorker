
import React, { useState, useEffect, useCallback } from 'react';
import { getUsageStats, getUsageSummary } from '../../../api/stratify';
import { UsageStat, UsageSummary } from '../../../types';
import { RefreshIcon, ChartIcon, ServerIcon, UserIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

export const UsageStatsManager: React.FC = () => {
    const [stats, setStats] = useState<UsageStat[]>([]);
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filters
    const [userId, setUserId] = useState('');
    const [agentId, setAgentId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const limit = 20;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                user_id: userId || undefined,
                agent_id: agentId || undefined,
                start_date: startDate ? new Date(startDate).toISOString() : undefined,
                end_date: endDate ? new Date(endDate).toISOString() : undefined,
            };

            // Fetch Summary
            const summaryData = await getUsageSummary(params);
            setSummary(summaryData);

            // Fetch List with Pagination
            const listData = await getUsageStats({
                ...params,
                skip: (page - 1) * limit,
                limit: limit
            });
            // Safe sort
            const sorted = (listData || []).sort((a, b) => {
                const tA = a.session_time ? new Date(a.session_time).getTime() : 0;
                const tB = b.session_time ? new Date(b.session_time).getTime() : 0;
                return tB - tA;
            });
            setStats(sorted);
        } catch (e) {
            console.error("Failed to fetch usage data", e);
            setStats([]); // Clear on error to avoid mapping undefined
        } finally {
            setIsLoading(false);
        }
    }, [userId, agentId, startDate, endDate, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = () => {
        setPage(1); // Reset to first page on new search
        fetchData();
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <ChartIcon className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-700">用量与计费统计</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <input 
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                            placeholder="用户 ID (可选)"
                            className="text-xs outline-none w-24 text-slate-600"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <ServerIcon className="w-3.5 h-3.5 text-slate-400" />
                        <input 
                            value={agentId}
                            onChange={e => setAgentId(e.target.value)}
                            placeholder="Agent ID (可选)"
                            className="text-xs outline-none w-24 text-slate-600"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        <input 
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="text-xs outline-none w-24 text-slate-600 bg-transparent"
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="text-xs outline-none w-24 text-slate-600 bg-transparent"
                        />
                    </div>
                    <button 
                        onClick={handleSearch}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                        title="刷新数据"
                    >
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Summary Cards (Server Side Aggregated) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white border-b border-slate-100">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">总结算费用 (倍率后)</div>
                    <div className="text-xl font-black text-indigo-700">¥{(summary?.total_cost || 0).toFixed(4)}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">总原始费用 (倍率前)</div>
                    <div className="text-xl font-black text-orange-700">¥{(summary?.total_original_cost || 0).toFixed(4)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Input Tokens</div>
                    <div className="text-xl font-black text-slate-700">{(summary?.total_input_tokens || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Output Tokens</div>
                    <div className="text-xl font-black text-slate-700">{(summary?.total_output_tokens || 0).toLocaleString()}</div>
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/80 border-b font-black tracking-widest sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">时间</th>
                            <th className="px-4 py-3 whitespace-nowrap">用户</th>
                            <th className="px-4 py-3 whitespace-nowrap">任务会话 (Session) / Agent</th>
                            <th className="px-4 py-3 whitespace-nowrap">模型</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">Input Tokens</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">Output Tokens</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">原始费用</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">结算费用</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading && stats.length === 0 ? (
                            <tr><td colSpan={8} className="py-20 text-center"><Spinner /></td></tr>
                        ) : stats.length === 0 ? (
                            <tr><td colSpan={8} className="py-20 text-center text-slate-400 italic">暂无统计数据</td></tr>
                        ) : (
                            stats.map((stat, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                                        {stat.session_time ? new Date(stat.session_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="px-4 py-3 max-w-[150px]" title={`ID: ${stat.user_id}`}>
                                        <div className="font-bold text-slate-700 text-xs truncate">
                                            {stat.username || <span className="text-slate-400 font-normal">Unknown</span>}
                                        </div>
                                        <div className="font-mono text-[10px] text-slate-400 truncate">{stat.email || (stat.user_id ? stat.user_id.slice(0, 8) : '-')}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700" title={`Session ID: ${stat.session_id}`}>{stat.agent_id}</span>
                                            <span className="text-[10px] font-mono text-slate-400">{stat.session_id ? stat.session_id.slice(0, 8) : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{stat.model || '-'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">{(stat.total_input_tokens || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">{(stat.total_output_tokens || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">¥{(stat.original_cost || 0).toFixed(4)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-600">¥{(stat.total_cost || 0).toFixed(4)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center text-xs text-slate-500">
                <span>
                    当前页: {page} (每页 {limit} 条)
                </span>
                <div className="flex gap-2">
                    <button 
                        disabled={page <= 1} 
                        onClick={() => setPage(p => p - 1)} 
                        className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        <ChevronLeftIcon className="w-4 h-4"/>
                    </button>
                    <button 
                        disabled={stats.length < limit} 
                        onClick={() => setPage(p => p + 1)} 
                        className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        <ChevronRightIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
