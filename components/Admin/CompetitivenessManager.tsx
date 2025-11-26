
import React, { useState, useEffect, useCallback } from 'react';
import { 
    KnowledgeBaseItem, KnowledgeBaseMeta, 
    DashboardOverview, DashboardTrendItem, DashboardDistributionItem, DashboardQuality 
} from '../../types';
import { 
    getKnowledgeBase, getKnowledgeBaseMeta, exportKnowledgeBase,
    getDashboardOverview, getDashboardTrends, getDashboardDistributionBrand, getDashboardQuality,
    triggerArticleAnalysis, triggerBatchAnalysis
} from '../../api/competitiveness';
import { 
    ChartIcon, ViewGridIcon, SparklesIcon, RefreshIcon, DownloadIcon, 
    SearchIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon, 
    CheckCircleIcon, ShieldCheckIcon, AnnotationIcon, ShieldExclamationIcon, QuestionMarkCircleIcon
} from '../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getReliabilityBadge = (score: number) => {
    const map: any = {
        4: { text: '官方证实', bg: 'bg-green-100', textCol: 'text-green-800' },
        3: { text: '高可信', bg: 'bg-blue-100', textCol: 'text-blue-800' },
        2: { text: '疑似', bg: 'bg-amber-100', textCol: 'text-amber-800' },
        1: { text: '辟谣', bg: 'bg-red-100', textCol: 'text-red-800' },
    };
    const conf = map[score] || { text: '未知', bg: 'bg-gray-100', textCol: 'text-gray-800' };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${conf.bg} ${conf.textCol}`}>{conf.text}</span>;
};

// --- Sub-View: Dashboard Overview ---
const OverviewPanel: React.FC = () => {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [quality, setQuality] = useState<DashboardQuality | null>(null);
    const [trends, setTrends] = useState<DashboardTrendItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [ov, qual, tr] = await Promise.all([
                    getDashboardOverview(),
                    getDashboardQuality({ top_n: 5 }),
                    getDashboardTrends({ entity: 'kb', days: 7, granularity: 'day' })
                ]);
                setOverview(ov);
                setQuality(qual);
                setTrends(tr.series);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

    return (
        <div className="space-y-6 p-4">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">知识库总量</p>
                    <p className="text-3xl font-bold text-gray-800">{overview?.kb_total}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">初筛记录总数</p>
                    <p className="text-3xl font-bold text-blue-600">{overview?.stage1_total}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">平均可靠性</p>
                    <p className="text-3xl font-bold text-green-600">{overview?.kb_reliability_avg.toFixed(1)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">已处理文章</p>
                    <p className="text-3xl font-bold text-purple-600">{overview?.processed_article_count}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quality Distribution */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">数据质量分布</h3>
                    <div className="space-y-3">
                        {quality?.reliability_distribution.map(item => (
                            <div key={item.reliability} className="flex items-center gap-3">
                                <span className="w-8 text-sm font-medium text-gray-600">{item.reliability}分</span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${item.reliability >= 3 ? 'bg-green-500' : item.reliability === 2 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                        style={{ width: `${item.percentage}%` }}
                                    ></div>
                                </div>
                                <span className="w-12 text-xs text-gray-400 text-right">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Quality Alerts */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">低置信度监控 (Top 5)</h3>
                    <div className="space-y-3">
                        {quality?.low_reliability_top.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div>
                                    <span className="font-bold text-gray-700 mr-2">{item.name}</span>
                                    <span className="text-xs text-gray-500">{item.car_brand} / {item.tech_dimension}</span>
                                </div>
                                {getReliabilityBadge(item.reliability)}
                            </div>
                        ))}
                        {(!quality?.low_reliability_top || quality.low_reliability_top.length === 0) && (
                            <div className="text-center text-gray-400 py-4">暂无低置信度数据</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Knowledge Base Governance ---
const KnowledgeBaseTable: React.FC = () => {
    const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({ car_brand: '', search: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [listRes, metaRes] = await Promise.all([
                getKnowledgeBase({ 
                    page, 
                    limit: 15, 
                    car_brand: filters.car_brand ? [filters.car_brand] : undefined,
                    search: filters.search || undefined 
                }),
                !meta ? getKnowledgeBaseMeta() : Promise.resolve(null)
            ]);
            setItems(listRes.items);
            setTotal(listRes.total);
            if (metaRes) setMeta(metaRes);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, filters, meta]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExport = async () => {
        const confirm = window.confirm("确定要导出当前筛选条件的知识库数据吗？");
        if (!confirm) return;
        try {
            await exportKnowledgeBase({ 
                car_brand: filters.car_brand ? [filters.car_brand] : undefined,
                search: filters.search || undefined 
            });
        } catch (e) {
            alert("导出失败");
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="p-4 bg-white border-b flex flex-wrap items-center gap-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="搜索技术点..." 
                        value={filters.search}
                        onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                    />
                </div>
                <select 
                    value={filters.car_brand} 
                    onChange={e => setFilters(p => ({ ...p, car_brand: e.target.value }))}
                    className="py-2 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">所有品牌</option>
                    {meta?.car_brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button onClick={() => setPage(1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600" title="应用筛选">
                    <RefreshIcon className="w-4 h-4" />
                </button>
                <div className="flex-1"></div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">
                    <DownloadIcon className="w-4 h-4" /> 导出 CSV
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-gray-50">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">品牌</th>
                            <th className="px-6 py-3">维度</th>
                            <th className="px-6 py-3">子维度</th>
                            <th className="px-6 py-3">技术名称</th>
                            <th className="px-6 py-3">可靠性</th>
                            <th className="px-6 py-3">来源数</th>
                            <th className="px-6 py-3">更新时间</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={8} className="py-20 text-center"><Spinner /></td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={8} className="py-20 text-center text-gray-400">无数据</td></tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs">{item.id}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{item.car_brand}</td>
                                    <td className="px-6 py-4">{item.tech_dimension}</td>
                                    <td className="px-6 py-4">{item.sub_tech_dimension}</td>
                                    <td className="px-6 py-4 font-medium text-indigo-900">{item.consolidated_tech_preview.name}</td>
                                    <td className="px-6 py-4">{getReliabilityBadge(item.consolidated_tech_preview.reliability)}</td>
                                    <td className="px-6 py-4">{item.source_article_count}</td>
                                    <td className="px-6 py-4">{new Date(item.last_updated_at).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-3 bg-white border-t flex justify-between items-center text-sm text-gray-500">
                <span>共 {total} 条</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">上一页</button>
                    <span className="px-2 py-1">{page}</span>
                    <button disabled={items.length < 15} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">下一页</button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Trigger Analysis Tasks ---
const AnalysisTasks: React.FC = () => {
    const [articleIdInput, setArticleIdInput] = useState('');
    const [batchInput, setBatchInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSingle = async () => {
        if (!articleIdInput.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await triggerArticleAnalysis(articleIdInput.trim());
            setResult(res);
        } catch (e: any) {
            setResult({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleBatch = async () => {
        if (!batchInput.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const ids = batchInput.split('\n').map(s => s.trim()).filter(Boolean);
            const res = await triggerBatchAnalysis(ids);
            setResult(res);
        } catch (e: any) {
            setResult({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-2">触发分析任务</h3>
                <p className="text-gray-500 text-sm">手动触发后台对指定文章进行竞争力抽取（Stage 1）与聚合（Stage 2）。通常用于数据补录或重试。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Single */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-purple-500" />
                        单篇触发
                    </h4>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="输入 Article UUID" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            value={articleIdInput}
                            onChange={e => setArticleIdInput(e.target.value)}
                        />
                        <button 
                            onClick={handleSingle} 
                            disabled={loading || !articleIdInput}
                            className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading ? '请求中...' : '开始分析'}
                        </button>
                    </div>
                </div>

                {/* Batch */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <ViewGridIcon className="w-5 h-5 text-blue-500" />
                        批量触发
                    </h4>
                    <div className="space-y-3">
                        <textarea 
                            placeholder="每行一个 Article UUID..." 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                            value={batchInput}
                            onChange={e => setBatchInput(e.target.value)}
                        />
                        <button 
                            onClick={handleBatch} 
                            disabled={loading || !batchInput}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '请求中...' : '批量分析'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Result Output */}
            {result && (
                <div className="mt-8 p-4 bg-gray-900 rounded-xl overflow-auto max-h-64 border border-gray-700 shadow-inner">
                    <pre className="text-xs text-green-400 font-mono">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

// --- Main Layout ---
export const CompetitivenessManager: React.FC = () => {
    const [tab, setTab] = useState<'overview' | 'kb' | 'tasks'>('overview');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            <div className="bg-white border-b px-6 pt-6 pb-0 flex-shrink-0">
                <h1 className="text-2xl font-extrabold text-slate-800 mb-6">竞争力中台管理</h1>
                <div className="flex gap-6">
                    {[
                        { id: 'overview', label: '全景概览', icon: ChartIcon },
                        { id: 'kb', label: '知识库治理', icon: ViewGridIcon },
                        { id: 'tasks', label: '分析任务', icon: SparklesIcon },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id as any)}
                            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                                tab === item.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {tab === 'overview' && <OverviewPanel />}
                {tab === 'kb' && <KnowledgeBaseTable />}
                {tab === 'tasks' && <AnalysisTasks />}
            </div>
        </div>
    );
};
