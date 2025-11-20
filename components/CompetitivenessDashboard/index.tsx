
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
    KnowledgeBaseItem, 
    KnowledgeBaseTraceability, 
    KnowledgeBaseMeta, 
    SourceArticleWithRecords,
    DashboardOverview, 
    DashboardTrendItem,
    DashboardDistributionItem, 
    DashboardQuality 
} from '../../types';
import { 
    getKnowledgeBase, 
    getKnowledgeBaseTraceability, 
    getKnowledgeBaseMeta,
    getDashboardOverview, 
    getDashboardTrends,
    getDashboardDistributionBrand, 
    getDashboardDistributionTechDimension, 
    getDashboardQuality
} from '../../api/competitiveness';
import { LazyLoadModule } from '../Dashboard/LazyLoadModule';
import { 
    RefreshIcon, ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, UsersIcon, LightBulbIcon, 
    TrendingUpIcon, EyeIcon, ClockIcon, SearchIcon, ShieldExclamationIcon, ShieldCheckIcon, AnnotationIcon, QuestionMarkCircleIcon,
    ChartIcon, ViewGridIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon
} from '../icons';

// --- Helper Functions & Constants ---
const getReliabilityInfo = (score: number) => {
    switch (score) {
        case 4: return { text: '官方证实', color: 'green', Icon: CheckCircleIcon, bg: 'bg-green-50', textCol: 'text-green-700', border: 'border-green-200' };
        case 3: return { text: '可信度高', color: 'blue', Icon: ShieldCheckIcon, bg: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200' };
        case 2: return { text: '疑似传闻', color: 'amber', Icon: AnnotationIcon, bg: 'bg-amber-50', textCol: 'text-amber-700', border: 'border-amber-200' };
        case 1: return { text: '已经辟谣', color: 'red', Icon: ShieldExclamationIcon, bg: 'bg-red-50', textCol: 'text-red-700', border: 'border-red-200' };
        default: return { text: '未知', color: 'gray', Icon: QuestionMarkCircleIcon, bg: 'bg-gray-50', textCol: 'text-gray-700', border: 'border-gray-200' };
    }
};

const techDimensionIcons: { [key: string]: React.FC<any> } = {
    '智能驾驶': BrainIcon, '智能座舱': UsersIcon, '智能网联': EyeIcon,
    '智能底盘': TrendingUpIcon, '智能动力': LightBulbIcon, '智能车身': CheckCircleIcon,
    '三电系统': LightBulbIcon, 'AI技术': BrainIcon
};

// --- Charts Components ---

const TrendChart: React.FC<{ data: DashboardTrendItem[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed">暂无趋势数据</div>;

    const height = 200;
    const width = 600; 
    const padding = 20;
    
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - (d.count / maxVal) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-48 relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 0.5, 1].map(t => (
                    <line key={t} x1={padding} y1={height - padding - t * (height - 2*padding)} x2={width - padding} y2={height - padding - t * (height - 2*padding)} stroke="#f3f4f6" strokeWidth="1" />
                ))}
                {/* Area */}
                <polygon fill="url(#gradient)" points={`${padding},${height-padding} ${points} ${width-padding},${height-padding}`} opacity="0.15" />
                <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Line */}
                <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
                {/* Dots */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - padding - (d.count / maxVal) * (height - 2 * padding);
                    return <circle key={i} cx={x} cy={y} r="3" className="fill-white stroke-blue-500 stroke-2 hover:r-4 transition-all" />;
                })}
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-gray-400 px-2 font-mono">
                <span>{data[0].date}</span>
                <span>{data[data.length - 1].date}</span>
            </div>
        </div>
    );
};

const SimpleBarChart: React.FC<{ data: DashboardDistributionItem[], colorClass: string }> = ({ data, colorClass }) => {
    if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400 text-sm">暂无数据</div>;
    const maxVal = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="space-y-3">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-24 truncate text-gray-600 text-right font-medium" title={d.name}>{d.name}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${(d.count / maxVal) * 100}%` }}></div>
                    </div>
                    <span className="w-8 text-right font-mono text-gray-500 text-xs">{d.count}</span>
                </div>
            ))}
        </div>
    );
};


// --- Dashboard View ---
const DashboardView: React.FC = () => {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [trends, setTrends] = useState<DashboardTrendItem[]>([]);
    const [brandDist, setBrandDist] = useState<DashboardDistributionItem[]>([]);
    const [techDist, setTechDist] = useState<DashboardDistributionItem[]>([]);
    const [quality, setQuality] = useState<DashboardQuality | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [ov, tr, bd, td, qual] = await Promise.all([
                    getDashboardOverview(),
                    getDashboardTrends({ entity: 'kb', days: 30, granularity: 'day' }),
                    getDashboardDistributionBrand({ top_n: 5 }),
                    getDashboardDistributionTechDimension({ top_n: 5 }),
                    getDashboardQuality({ low_threshold: 2, top_n: 5 })
                ]);
                setOverview(ov);
                setTrends(tr.series);
                setBrandDist(bd.items);
                setTechDist(td.items);
                setQuality(qual);
            } catch (e) {
                console.error("Failed to load dashboard", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) return (
        <div className="p-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>)}
            </div>
            <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
    );

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">知识库情报总数</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{overview?.kb_total.toLocaleString()}</span>
                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">条目</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">初筛情报片段</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{overview?.stage1_total.toLocaleString()}</span>
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">片段</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">已分析文章</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{overview?.processed_article_count.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">篇</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">情报平均置信度</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-indigo-600">{overview?.kb_reliability_avg.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">/ 4.0</span>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUpIcon className="w-5 h-5 text-blue-500" />
                        情报入库趋势 (近30天)
                    </h3>
                    <TrendChart data={trends} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                        情报质量漏斗
                    </h3>
                    <div className="flex-1 flex flex-col justify-center gap-5">
                         {quality?.reliability_distribution.sort((a,b) => b.reliability - a.reliability).map(q => {
                            const conf = getReliabilityInfo(q.reliability);
                            return (
                                <div key={q.reliability} className="relative">
                                    <div className="flex justify-between text-sm mb-1.5 font-medium text-gray-700">
                                        <span className="flex items-center gap-1.5"><conf.Icon className={`w-4 h-4 ${conf.textCol}`} /> {conf.text}</span>
                                        <span className="text-gray-500 font-mono text-xs">{q.count} ({q.percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${conf.textCol.replace('text-', 'bg-')}`} style={{ width: `${q.percentage}%` }}></div>
                                    </div>
                                </div>
                            )
                         })}
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">品牌热度 Top 5</h3>
                    <SimpleBarChart data={brandDist} colorClass="bg-indigo-500" />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">技术热点 Top 5</h3>
                    <SimpleBarChart data={techDist} colorClass="bg-cyan-500" />
                </div>
            </div>
        </div>
    );
};

// --- Traceability/Dossier Panel ---

const DossierPanel: React.FC<{ 
    kbId: number; 
    techName: string; 
    onSelectArticle: (articleId: string) => void;
    selectedArticleId: string | null;
}> = ({ kbId, techName, onSelectArticle, selectedArticleId }) => {
    const [traceData, setTraceData] = useState<KnowledgeBaseTraceability | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
        let isCancelled = false;
        const fetchTraceability = async () => {
            setIsLoading(true);
            setError('');
            setTraceData(null);

            try {
                const data = await getKnowledgeBaseTraceability(kbId, techName);
                if (!isCancelled) {
                    setTraceData(data);
                    // Auto-select the first article if none selected
                    if (!selectedArticleId && data?.stage1_records?.[0]?.article_id) {
                        onSelectArticle(data.stage1_records[0].article_id);
                    }
                }
            } catch (err: any) {
                if (!isCancelled) setError(err.message || '加载溯源数据失败');
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        fetchTraceability();
        return () => { isCancelled = true; };
    }, [kbId, techName]); // removed onSelectArticle dependency to prevent loop

    const timelineItems = useMemo(() => {
        if (!traceData?.stage1_records) return [];
        return [...traceData.stage1_records].sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
    }, [traceData]);
    
    if (isLoading) return <div className="p-6"><div className="h-64 w-full bg-gray-100 rounded-xl animate-pulse"></div></div>
    if (error) return <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg m-4">{error}</div>
    if (!traceData) return <div className="p-6 text-center text-gray-500">无数据。</div>;

    const aggregatedTech = traceData.aggregated_tech[0];

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <header>
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                     <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">{traceData.car_brand}</span>
                     <ChevronRightIcon className="w-3 h-3" />
                     <span>{traceData.tech_dimension}</span>
                     <ChevronRightIcon className="w-3 h-3" />
                     <span className="font-semibold text-gray-700">{traceData.sub_tech_dimension}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">{techName}</h2>
            </header>
            
            {aggregatedTech && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5 shadow-sm">
                    <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BrainIcon className="w-4 h-4" /> 
                        AI 聚合结论
                    </h3>
                    <p className="text-sm text-blue-900/80 leading-relaxed text-justify">{aggregatedTech.description}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-blue-800/60">
                        <span>聚合自 {aggregatedTech.source_article_ids.length} 篇文章</span>
                        <span>•</span>
                        <span>{aggregatedTech.publish_date ? new Date(aggregatedTech.publish_date).toLocaleDateString() : '近期'}</span>
                    </div>
                </div>
            )}
            
            <div>
                 <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                    证据演进时间轴
                 </h3>
                 <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-2">
                    {timelineItems.map((record) => {
                        const isSelected = selectedArticleId === record.article_id;
                        const rel = getReliabilityInfo(record.reliability);
                        return (
                            <div key={record.id} className="relative pl-6">
                                <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-white transition-colors ${isSelected ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-gray-300'}`}></div>
                                <div 
                                    onClick={() => onSelectArticle(record.article_id)}
                                    className={`group cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                                        isSelected 
                                            ? 'bg-white border-blue-500 shadow-md translate-x-1' 
                                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${rel.bg} ${rel.textCol} ${rel.border}`}>
                                            <rel.Icon className="w-3 h-3" /> {rel.text}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">{new Date(record.publish_date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900">{record.tech_description}</p>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>
    );
};

const SourcePanel: React.FC<{ article: SourceArticleWithRecords | null }> = ({ article }) => {
    if (!article) return (
         <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 bg-slate-50/50">
            <DocumentTextIcon className="w-16 h-16 text-slate-200 mb-4" />
            <p className="font-semibold text-slate-400">暂无信源</p>
            <p className="text-sm text-slate-400 mt-1">点击左侧时间轴中的卡片以查看原始文章。</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white">
            <header className="p-5 border-b border-gray-100 flex-shrink-0 bg-slate-50/30">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2" title={article.title}>{article.title}</h3>
                    <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-2 bg-white border rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="跳转原文">
                        <ChevronRightIcon className="w-4 h-4" />
                    </a>
                </div>
                <div className="text-xs text-gray-500 mt-3 flex items-center gap-4">
                    <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {new Date(article.publish_date).toLocaleString('zh-CN')}</span>
                    {article.stage1_records && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">包含 {article.stage1_records.length} 个相关片段</span>}
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none prose-p:text-slate-700 prose-headings:text-slate-900 prose-a:text-blue-600">
                {article.content ? (
                    article.content.split('\n').map((p, i) => <p key={i} className="mb-3 leading-relaxed">{p}</p>)
                ) : (
                    <p className="text-gray-400 italic">文章内容不可用。</p>
                )}
            </div>
        </div>
    );
};


// --- Intelligence Matrix (Browser) ---

const IntelligenceMatrix: React.FC = () => {
    // State
    const [filters, setFilters] = useState({
        car_brand: '',
        tech_dimension: '',
        sub_tech_dimension: '',
        min_reliability: 0,
        search: ''
    });
    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingList, setLoadingList] = useState(false);
    
    // Selection State
    const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
    const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
    const [traceData, setTraceData] = useState<KnowledgeBaseTraceability | null>(null);

    // Derived data
    const subDimensions = useMemo(() => {
        if (!meta || !filters.tech_dimension) return [];
        // @ts-ignore
        return meta.tech_dimensions[filters.tech_dimension] || [];
    }, [meta, filters.tech_dimension]);

    // Load Meta
    useEffect(() => {
        getKnowledgeBaseMeta().then(setMeta).catch(console.error);
    }, []);

    // Load List
    useEffect(() => {
        const fetchList = async () => {
            setLoadingList(true);
            try {
                const res = await getKnowledgeBase({
                    page,
                    limit: 20,
                    car_brand: filters.car_brand ? [filters.car_brand] : undefined,
                    tech_dimension: filters.tech_dimension || undefined,
                    sub_tech_dimension: filters.sub_tech_dimension || undefined,
                    min_reliability: filters.min_reliability > 0 ? filters.min_reliability : undefined,
                    search: filters.search || undefined
                });
                setItems(res.items);
                setTotal(res.total);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingList(false);
            }
        };
        const timer = setTimeout(fetchList, 300);
        return () => clearTimeout(timer);
    }, [filters, page]);
    
    // Fetch Trace Data separately to get the full article list if needed for the SourcePanel
    // However, in this design, DossierPanel fetches its own trace data.
    // We need to hoist the trace data fetching OR let DossierPanel handle it and pass the article up.
    // Let's simplify: The DossierPanel is responsible for fetching trace data based on selectedItem.
    // But we need the 'selectedArticle' object for the SourcePanel.
    // We can add a callback to DossierPanel to set the article object, but DossierPanel only has IDs.
    // FIX: We will fetch trace data at this level when item is selected, to share between panels.

    useEffect(() => {
        if (!selectedItem) {
            setTraceData(null);
            setSelectedArticleId(null);
            return;
        }
        const fetchTrace = async () => {
            try {
                const data = await getKnowledgeBaseTraceability(
                    selectedItem.id, 
                    selectedItem.consolidated_tech_preview.name
                );
                setTraceData(data);
                // Auto select first article
                if (data.stage1_records.length > 0) {
                    setSelectedArticleId(data.stage1_records[0].article_id);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchTrace();
    }, [selectedItem]);

    const selectedArticle = useMemo((): SourceArticleWithRecords | null => {
        if (!traceData || !selectedArticleId) return null;
        const article = traceData.source_articles.find(a => a.id === selectedArticleId);
        if (!article) return null;
        // Hydrate article with records for display context
        const records = traceData.stage1_records.filter(r => r.article_id === selectedArticleId);
        return { ...article, stage1_records: records };
    }, [traceData, selectedArticleId]);


    return (
        <div className="flex flex-col h-full border-t border-gray-200 bg-gray-50/50">
            {/* Filter Bar */}
            <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap items-center gap-3 shadow-sm z-10">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mr-2">
                    <FunnelIcon className="w-4 h-4" />
                    <span>筛选:</span>
                </div>
                
                <select 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 min-w-[120px]"
                    value={filters.car_brand}
                    onChange={e => setFilters({...filters, car_brand: e.target.value, page: 1})}
                >
                    <option value="">所有品牌</option>
                    {meta?.car_brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                <select 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 min-w-[120px]"
                    value={filters.tech_dimension}
                    onChange={e => setFilters({...filters, tech_dimension: e.target.value, sub_tech_dimension: '', page: 1})}
                >
                    <option value="">所有技术领域</option>
                    {meta?.tech_dimensions && Object.keys(meta.tech_dimensions).map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <select 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 disabled:opacity-50 min-w-[120px]"
                    value={filters.sub_tech_dimension}
                    onChange={e => setFilters({...filters, sub_tech_dimension: e.target.value, page: 1})}
                    disabled={!filters.tech_dimension}
                >
                    <option value="">所有子领域</option>
                    {subDimensions.map((sd: string) => <option key={sd} value={sd}>{sd}</option>)}
                </select>

                <div className="flex bg-gray-100 rounded-lg p-1">
                    {[0, 4, 3, 2].map(score => (
                        <button
                            key={score}
                            onClick={() => setFilters({...filters, min_reliability: score, page: 1})}
                            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                                filters.min_reliability === score 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {score === 0 ? '全部' : getReliabilityInfo(score).text + '+'}
                        </button>
                    ))}
                </div>

                <div className="relative ml-auto">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input 
                        type="text" 
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-64 pl-10 p-2" 
                        placeholder="搜索技术点名称..." 
                        value={filters.search}
                        onChange={e => setFilters({...filters, search: e.target.value, page: 1})}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: List */}
                <div className={`flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-white transition-all duration-300 ${selectedItem ? 'max-w-md hidden md:flex' : ''}`}>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {loadingList ? (
                             <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                 <span className="text-sm text-gray-500">正在检索情报库...</span>
                             </div>
                        ) : items.length === 0 ? (
                            <div className="text-center text-gray-500 py-20">
                                <p>暂无符合条件的情报</p>
                            </div>
                        ) : (
                            items.map(item => {
                                const tech = item.consolidated_tech_preview;
                                const relConf = getReliabilityInfo(tech.reliability);
                                const isSelected = selectedItem?.id === item.id;

                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`group p-4 rounded-xl border cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                                                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relConf.bg} ${relConf.textCol} border ${relConf.border}`}>
                                                    <relConf.Icon className="w-3 h-3 mr-1" />
                                                    {relConf.text}
                                                </span>
                                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{item.car_brand}</span>
                                            </div>
                                            <span className="text-xs text-gray-400">{new Date(tech.publish_date).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{tech.name}</h3>
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{tech.description}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                                            <span>{item.tech_dimension} &gt; {item.sub_tech_dimension}</span>
                                            <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><DocumentTextIcon className="w-3 h-3"/> {item.source_article_count} 来源</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div className="p-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-gray-50">
                        <span>共 {total} 条</span>
                        <div className="flex gap-2">
                            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-2 py-1 border rounded hover:bg-white disabled:opacity-50 flex items-center"><ChevronLeftIcon className="w-3 h-3"/></button>
                            <span className="px-2">{page}</span>
                            <button disabled={items.length < 20} onClick={()=>setPage(p=>p+1)} className="px-2 py-1 border rounded hover:bg-white disabled:opacity-50 flex items-center"><ChevronRightIcon className="w-3 h-3"/></button>
                        </div>
                    </div>
                </div>

                {/* Right: Details */}
                {selectedItem ? (
                    <div className="flex-[2] flex flex-col min-w-0 bg-gray-50 overflow-hidden relative animate-in slide-in-from-right-4 duration-300">
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="md:hidden absolute top-2 right-2 p-2 bg-white rounded-full shadow-md z-20 text-gray-500"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>

                        <div className="flex-1 flex flex-col md:flex-row h-full">
                            <div className="flex-1 flex flex-col border-r border-gray-200 bg-white min-w-[380px]">
                                <DossierPanel 
                                    kbId={selectedItem.id} 
                                    techName={selectedItem.consolidated_tech_preview.name} 
                                    onSelectArticle={setSelectedArticleId}
                                    selectedArticleId={selectedArticleId}
                                />
                            </div>
                            <div className="flex-1 bg-white flex flex-col h-full">
                                <SourcePanel article={selectedArticle} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-[2] hidden md:flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <ViewGridIcon className="w-12 h-12 text-gray-300" />
                        </div>
                        <p className="text-lg font-medium">请从左侧选择一项情报</p>
                        <p className="text-sm mt-2">查看技术演进时间轴与原始证据链</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---
export const CompetitivenessDashboard: React.FC = () => {
    const [view, setView] = useState<'overview' | 'matrix'>('overview');

    return (
        <div className="h-full flex flex-col bg-slate-100">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center flex-shrink-0 shadow-sm z-20">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ChartIcon className="w-6 h-6 text-blue-600" />
                    竞争力看板 <span className="text-xs font-normal text-blue-600 ml-2 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">全景·透视</span>
                </h1>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('overview')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        战略态势
                    </button>
                    <button 
                        onClick={() => setView('matrix')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'matrix' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        情报矩阵
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden">
                {view === 'overview' ? (
                    <div className="h-full overflow-y-auto bg-slate-50">
                        <div className="max-w-7xl mx-auto w-full py-6">
                            <LazyLoadModule placeholder={<div className="h-96 bg-gray-200 animate-pulse rounded-xl m-6"></div>}>
                                <DashboardView />
                            </LazyLoadModule>
                        </div>
                    </div>
                ) : (
                    <IntelligenceMatrix />
                )}
            </main>
        </div>
    );
};
