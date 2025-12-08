
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderArticle, SpiderSource, SpiderPoint } from '../../../types';
import { getSpiderArticles, getSpiderPoints, getSpiderSources, reviewSpiderArticle } from '../../../api/intelligence';
import { 
    RefreshIcon, ExternalLinkIcon, CheckCircleIcon, QuestionMarkCircleIcon, 
    ChevronLeftIcon, ChevronRightIcon, FunnelIcon, CalendarIcon, 
    ServerIcon, DatabaseIcon, SparklesIcon 
} from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const StatCard: React.FC<{ title: string; value: number; color: string; icon: React.ReactNode; isLoading: boolean }> = ({ title, value, color, icon, isLoading }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between min-w-[200px]">
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <div className={`text-2xl font-extrabold ${color}`}>
                {isLoading ? <div className="h-8 w-16 bg-slate-100 rounded animate-pulse"></div> : value.toLocaleString()}
            </div>
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '50').replace('700', '50')} ${color}`}>
            {icon}
        </div>
    </div>
);

export const ArticleList: React.FC = () => {
    // Data State
    const [articles, setArticles] = useState<SpiderArticle[]>([]);
    const [sources, setSources] = useState<SpiderSource[]>([]);
    const [points, setPoints] = useState<SpiderPoint[]>([]);
    const [filteredPoints, setFilteredPoints] = useState<SpiderPoint[]>([]);
    
    // Stats State
    const [stats, setStats] = useState({ total: 0, reviewed: 0, unreviewed: 0 });
    const [isStatsLoading, setIsStatsLoading] = useState(true);

    // Filter State
    const [filterSource, setFilterSource] = useState('');
    const [filterPoint, setFilterPoint] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'reviewed' | 'unreviewed'>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    // Pagination & Loading
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const limit = 20;

    // Action State
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [srcs, pts] = await Promise.all([getSpiderSources(), getSpiderPoints()]);
                setSources(srcs);
                setPoints(pts);
                setFilteredPoints(pts);
            } catch (e) { console.error("Failed to load metadata", e); }
        };
        loadMeta();
    }, []);

    // Filter Logic: Points depend on Source
    useEffect(() => {
        if (filterSource) {
            setFilteredPoints(points.filter(p => p.source_id === filterSource || p.source_name === sources.find(s => s.id === filterSource)?.name));
        } else {
            setFilteredPoints(points);
        }
    }, [filterSource, points, sources]);

    // Fetch Stats (Aggregation based on current non-status filters)
    const fetchStats = useCallback(async () => {
        setIsStatsLoading(true);
        const params = {
            source_id: filterSource || undefined,
            point_id: filterPoint || undefined,
            start_time: dateRange.start || undefined,
            end_time: dateRange.end || undefined,
            limit: 1
        };

        try {
            const [all, reviewed, unreviewed] = await Promise.all([
                getSpiderArticles({ ...params }),
                getSpiderArticles({ ...params, is_reviewed: true }),
                getSpiderArticles({ ...params, is_reviewed: false })
            ]);
            setStats({
                total: all.total,
                reviewed: reviewed.total,
                unreviewed: unreviewed.total
            });
        } catch (e) {
            console.error("Failed to fetch stats", e);
        } finally {
            setIsStatsLoading(false);
        }
    }, [filterSource, filterPoint, dateRange]);

    // Fetch Articles List
    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderArticles({ 
                source_id: filterSource || undefined,
                point_id: filterPoint || undefined,
                start_time: dateRange.start || undefined,
                end_time: dateRange.end || undefined,
                is_reviewed: filterStatus === 'all' ? undefined : (filterStatus === 'reviewed'),
                page,
                limit
            });
            
            setArticles(res.items);
            setTotalItems(res.total);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, [filterSource, filterPoint, dateRange, filterStatus, page]);

    // Trigger fetches on filter change
    useEffect(() => {
        fetchStats();
        // Reset page when filters change (except page itself)
        setPage(1);
    }, [fetchStats]);

    // Trigger fetch on page change or when dependent filters change (via useEffect dependencies)
    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const handleReview = async (e: React.MouseEvent, article: SpiderArticle) => {
        e.stopPropagation();
        if (article.is_reviewed) return;
        
        setProcessingId(article.id);
        try {
            await reviewSpiderArticle(article.id, true);
            // Optimistic update
            setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_reviewed: true } : a));
            // Update stats locally
            setStats(prev => ({ ...prev, reviewed: prev.reviewed + 1, unreviewed: prev.unreviewed - 1 }));
        } catch (e) {
            alert('审核失败');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReset = () => {
        setFilterSource('');
        setFilterPoint('');
        setFilterStatus('all');
        setDateRange({ start: '', end: '' });
        setPage(1);
    };

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return (
        <div className="flex flex-col h-full space-y-6 overflow-hidden">
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
                <StatCard 
                    title="符合条件总数" 
                    value={stats.total} 
                    color="text-indigo-600" 
                    icon={<DatabaseIcon className="w-5 h-5"/>} 
                    isLoading={isStatsLoading}
                />
                <StatCard 
                    title="待审核" 
                    value={stats.unreviewed} 
                    color="text-amber-600" 
                    icon={<QuestionMarkCircleIcon className="w-5 h-5"/>} 
                    isLoading={isStatsLoading}
                />
                <StatCard 
                    title="已入库 (向量化)" 
                    value={stats.reviewed} 
                    color="text-emerald-600" 
                    icon={<CheckCircleIcon className="w-5 h-5"/>} 
                    isLoading={isStatsLoading}
                />
            </div>

            {/* Filter & List Container */}
            <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Filter Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 text-slate-600 text-sm font-bold bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                            <FunnelIcon className="w-4 h-4 text-slate-400" />
                            筛选
                        </div>
                        
                        <select 
                            value={filterSource} 
                            onChange={e => { setFilterSource(e.target.value); setFilterPoint(''); }}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[120px]"
                        >
                            <option value="">所有情报源</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>

                        <select 
                            value={filterPoint} 
                            onChange={e => setFilterPoint(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-w-[120px]"
                        >
                            <option value="">所有采集点</option>
                            {filteredPoints.map(p => <option key={p.id} value={p.id}>{p.point_name}</option>)}
                        </select>

                        <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>

                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="all">全部状态</option>
                            <option value="unreviewed">待审核</option>
                            <option value="reviewed">已入库</option>
                        </select>

                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="outline-none text-gray-600 bg-transparent w-28 text-xs" />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="outline-none text-gray-600 bg-transparent w-28 text-xs" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleReset} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">
                            重置
                        </button>
                        <button onClick={() => fetchArticles()} className="p-2 bg-white border rounded-lg text-gray-500 hover:text-indigo-600 shadow-sm transition-all hover:shadow">
                            <RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-slate-50/30 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-4 py-3 md:px-6 md:py-3 w-1/2">标题 / 内容摘要</th>
                                <th className="px-4 py-3 md:px-6 md:py-3 hidden md:table-cell w-40">来源信息</th>
                                <th className="px-4 py-3 md:px-6 md:py-3 hidden md:table-cell w-40">发布时间</th>
                                <th className="px-4 py-3 md:px-6 md:py-3 w-32 text-center">状态 / 操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {articles.length === 0 && !isLoading ? (
                                <tr><td colSpan={4} className="text-center py-20 text-gray-400 italic">暂无相关数据</td></tr>
                            ) : (
                                articles.map(article => (
                                    <tr key={article.id} className="bg-white hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-4 py-4 md:px-6 md:py-4 align-top">
                                            <div className="font-bold text-gray-800 line-clamp-1 mb-1 text-base">{article.title}</div>
                                            <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2 opacity-80">{article.content?.slice(0, 150)}...</div>
                                            <div className="flex items-center gap-3">
                                                <a href={article.original_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                                                    <ExternalLinkIcon className="w-3 h-3"/> 查看原文
                                                </a>
                                                <div className="md:hidden text-xs text-gray-400">{article.publish_time?.split(' ')[0]}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 md:px-6 md:py-4 hidden md:table-cell align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-bold w-fit">
                                                    <ServerIcon className="w-3 h-3" />
                                                    {sources.find(s => s.id === (points.find(p => p.id === article.point_id)?.source_id))?.name || 'Unknown'}
                                                </span>
                                                <span className="text-xs text-gray-400 pl-1">
                                                    {points.find(p => p.id === article.point_id)?.point_name || article.point_id.slice(0,8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 md:px-6 md:py-4 hidden md:table-cell align-top">
                                            <div className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit">
                                                {article.publish_time || 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-gray-300 mt-1">采集于 {new Date(article.collected_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-4 py-4 md:px-6 md:py-4 text-center align-middle">
                                            {article.is_reviewed ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                        <CheckCircleIcon className="w-3.5 h-3.5"/> 已入库
                                                    </span>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={(e) => handleReview(e, article)}
                                                    disabled={processingId === article.id}
                                                    className="w-full md:w-auto px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                >
                                                    {processingId === article.id ? <Spinner /> : <SparklesIcon className="w-3.5 h-3.5"/>}
                                                    审核入库
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center text-sm">
                        <span className="text-gray-500">共 {totalItems} 条记录</span>
                        <div className="flex items-center gap-2">
                            <button 
                                disabled={page <= 1} 
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 bg-gray-50 rounded text-gray-700 font-medium">
                                {page} / {totalPages}
                            </span>
                            <button 
                                disabled={page >= totalPages} 
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
