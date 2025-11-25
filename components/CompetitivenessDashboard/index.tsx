
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
    KnowledgeBaseItem, 
    KnowledgeBaseTraceability, 
    KnowledgeBaseMeta, 
    SourceArticleWithRecords,
    DashboardOverview, 
    DashboardTrendItem,
    DashboardDistributionItem, 
    DashboardQuality,
    InfoItem
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
    ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, UsersIcon, LightBulbIcon, 
    TrendingUpIcon, EyeIcon, ClockIcon, SearchIcon, ShieldExclamationIcon, ShieldCheckIcon, AnnotationIcon, QuestionMarkCircleIcon,
    ChartIcon, ViewGridIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon
} from '../icons';
import { EvidenceTrail } from '../StrategicCockpit/EvidenceTrail';

// --- Helper Functions & Constants ---
const getReliabilityInfo = (score: number) => {
    switch (score) {
        case 4: return { text: '官方证实', color: 'green', Icon: CheckCircleIcon, bg: 'bg-green-50', textCol: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800' };
        case 3: return { text: '可信度高', color: 'blue', Icon: ShieldCheckIcon, bg: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' };
        case 2: return { text: '疑似传闻', color: 'amber', Icon: AnnotationIcon, bg: 'bg-amber-50', textCol: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' };
        case 1: return { text: '已经辟谣', color: 'red', Icon: ShieldExclamationIcon, bg: 'bg-red-50', textCol: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800' };
        default: return { text: '未知', color: 'gray', Icon: QuestionMarkCircleIcon, bg: 'bg-gray-50', textCol: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-800' };
    }
};

// --- Compact Charts Components for Market Pulse ---

const MiniTrendChart: React.FC<{ data: DashboardTrendItem[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-24 flex items-center justify-center text-gray-300 text-xs">暂无数据</div>;
    const height = 80;
    const width = 300; 
    const padding = 5;
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - (d.count / maxVal) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-24 relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="miniTrendGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon fill="url(#miniTrendGradient)" points={`${padding},${height-padding} ${points} ${width-padding},${height-padding}`} />
                <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
};

const CompactBarChart: React.FC<{ data: DashboardDistributionItem[], colorClass: string, maxItems?: number }> = ({ data, colorClass, maxItems = 5 }) => {
    if (!data || data.length === 0) return <div className="h-24 flex items-center justify-center text-gray-300 text-xs">暂无数据</div>;
    const displayData = data.slice(0, maxItems);
    const maxVal = Math.max(...displayData.map(d => d.count), 1);

    return (
        <div className="space-y-2">
            {displayData.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 truncate text-slate-500 text-right" title={d.name}>{d.name}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${(d.count / maxVal) * 100}%` }}></div>
                    </div>
                    <span className="w-6 text-right font-mono text-slate-400">{d.count}</span>
                </div>
            ))}
        </div>
    );
};

// --- Market Pulse Component (Replaces DashboardView) ---
const MarketPulse: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [trends, setTrends] = useState<DashboardTrendItem[]>([]);
    const [brandDist, setBrandDist] = useState<DashboardDistributionItem[]>([]);
    const [techDist, setTechDist] = useState<DashboardDistributionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [ov, tr, bd, td] = await Promise.all([
                    getDashboardOverview(),
                    getDashboardTrends({ entity: 'kb', days: 14, granularity: 'day' }),
                    getDashboardDistributionBrand({ top_n: 5 }),
                    getDashboardDistributionTechDimension({ top_n: 5 }),
                ]);
                setOverview(ov);
                setTrends(tr.series);
                setBrandDist(bd.items);
                setTechDist(td.items);
            } catch (e) {
                console.error("Failed to load pulse data", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="bg-slate-50 border-b border-slate-200 p-4 md:px-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ChartIcon className="w-4 h-4 text-indigo-500" />
                    市场雷达 (Market Pulse)
                </h3>
                <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    收起 <ChevronDownIcon className="w-3 h-3 rotate-180" />
                </button>
            </div>

            {isLoading ? (
                <div className="flex gap-4 overflow-hidden">
                    <div className="w-1/4 h-24 bg-slate-200 rounded-xl animate-pulse"></div>
                    <div className="w-1/4 h-24 bg-slate-200 rounded-xl animate-pulse"></div>
                    <div className="w-1/4 h-24 bg-slate-200 rounded-xl animate-pulse"></div>
                    <div className="w-1/4 h-24 bg-slate-200 rounded-xl animate-pulse"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Metric 1: Total Intelligence */}
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <span className="text-xs text-slate-400">情报总量</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-slate-800">{overview?.kb_total.toLocaleString()}</span>
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 rounded">+12</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400">
                            <span>可信度 Avg</span>
                            <span className="font-bold text-slate-600">{overview?.kb_reliability_avg.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Metric 2: Trend */}
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-xs text-slate-400">入库趋势 (14天)</span>
                        </div>
                        <MiniTrendChart data={trends} />
                    </div>

                    {/* Metric 3: Top Brands */}
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-xs text-slate-400 mb-2 block">热门品牌</span>
                        <CompactBarChart data={brandDist} colorClass="bg-indigo-500" />
                    </div>

                    {/* Metric 4: Top Tech */}
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-xs text-slate-400 mb-2 block">技术热点</span>
                        <CompactBarChart data={techDist} colorClass="bg-cyan-500" />
                    </div>
                </div>
            )}
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
    }, [kbId, techName]);

    const timelineItems = useMemo(() => {
        if (!traceData?.stage1_records) return [];
        return [...traceData.stage1_records].sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
    }, [traceData]);
    
    if (isLoading) return <div className="p-6"><div className="h-64 w-full bg-slate-100 rounded-xl animate-pulse"></div></div>
    if (error) return <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg m-4">{error}</div>
    if (!traceData) return <div className="p-6 text-center text-slate-500">无数据。</div>;

    const aggregatedTech = traceData.aggregated_tech[0];
    // FIX: Use source_articles.length for accuracy
    const sourceCount = traceData.source_articles?.length ?? aggregatedTech?.source_article_ids?.length ?? 0;

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <header>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                     <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-600">{traceData.car_brand}</span>
                     <ChevronRightIcon className="w-3 h-3" />
                     <span>{traceData.tech_dimension}</span>
                     <ChevronRightIcon className="w-3 h-3" />
                     <span className="text-slate-600">{traceData.sub_tech_dimension}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{techName}</h2>
            </header>
            
            {aggregatedTech && (
                <div className="bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <BrainIcon className="w-24 h-24 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-indigo-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                        <SparklesIcon className="w-4 h-4 text-indigo-500" /> 
                        AI 聚合结论
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed text-justify relative z-10">{aggregatedTech.description}</p>
                    <div className="mt-6 flex items-center gap-4 text-xs text-slate-400 relative z-10 border-t border-indigo-100 pt-4">
                        <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-3.5 h-3.5"/> 
                            聚合自 {sourceCount} 篇文章
                        </span>
                        <span>•</span>
                        <span>更新于: {aggregatedTech.publish_date ? new Date(aggregatedTech.publish_date).toLocaleDateString() : '近期'}</span>
                    </div>
                </div>
            )}
            
            <div>
                 <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-slate-400" />
                    证据演进时间轴
                 </h3>
                 <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                    {timelineItems.map((record) => {
                        const isSelected = selectedArticleId === record.article_id;
                        const rel = getReliabilityInfo(record.reliability);
                        return (
                            <div key={record.id} className="relative pl-8">
                                <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all duration-300 ${isSelected ? 'bg-blue-600 scale-125 ring-4 ring-blue-100' : 'bg-slate-300'}`}></div>
                                <div 
                                    onClick={() => onSelectArticle(record.article_id)}
                                    className={`group cursor-pointer p-5 rounded-2xl border transition-all duration-300 ${
                                        isSelected 
                                            ? 'bg-white border-blue-500 shadow-lg shadow-blue-500/10 translate-x-2' 
                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1.5 uppercase tracking-wide ${rel.badge}`}>
                                            <rel.Icon className="w-3 h-3" /> {rel.text}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium font-mono">{new Date(record.publish_date).toLocaleDateString()}</span>
                                    </div>
                                    <p className={`text-sm leading-relaxed transition-colors ${isSelected ? 'text-slate-800 font-medium' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                        {record.tech_description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>
    );
};

// --- Intelligence Matrix (Main Workspace) ---

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
    
    // UI State
    const [showMarketPulse, setShowMarketPulse] = useState(false);
    
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
    
    // Fetch Trace Data at parent level to share article content
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

    const selectedArticleInfoItem = useMemo((): InfoItem | null => {
        if (!traceData || !selectedArticleId) return null;
        const article = traceData.source_articles.find(a => a.id === selectedArticleId);
        if (!article) return null;
        
        // Map SourceArticleWithRecords to InfoItem for EvidenceTrail
        return {
            id: article.id,
            title: article.title,
            content: article.content || '',
            original_url: article.original_url,
            source_name: '行业情报', // Default since source_name is not in trace data
            point_name: '技术追踪',
            point_id: '',
            publish_date: article.publish_date,
            created_at: article.publish_date
        };
    }, [traceData, selectedArticleId]);


    return (
        <div className="flex flex-col h-full border-t border-slate-200 bg-slate-50/50">
            {/* Filter Bar */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3 shadow-sm z-10">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-bold mr-2">
                    <FunnelIcon className="w-4 h-4" />
                    <span>筛选</span>
                </div>
                
                <select 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 min-w-[120px] transition-shadow hover:shadow-sm"
                    value={filters.car_brand}
                    onChange={e => {
                        setFilters({...filters, car_brand: e.target.value});
                        setPage(1);
                    }}
                >
                    <option value="">所有品牌</option>
                    {meta?.car_brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                <select 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 min-w-[120px] transition-shadow hover:shadow-sm"
                    value={filters.tech_dimension}
                    onChange={e => {
                        setFilters({...filters, tech_dimension: e.target.value, sub_tech_dimension: ''});
                        setPage(1);
                    }}
                >
                    <option value="">所有技术领域</option>
                    {meta?.tech_dimensions && Object.keys(meta.tech_dimensions).map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <select 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50 disabled:bg-slate-100 min-w-[120px] transition-shadow hover:shadow-sm"
                    value={filters.sub_tech_dimension}
                    onChange={e => {
                        setFilters({...filters, sub_tech_dimension: e.target.value});
                        setPage(1);
                    }}
                    disabled={!filters.tech_dimension}
                >
                    <option value="">所有子领域</option>
                    {subDimensions.map((sd: string) => <option key={sd} value={sd}>{sd}</option>)}
                </select>

                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                    {[0, 4, 3, 2].map(score => (
                        <button
                            key={score}
                            onClick={() => {
                                setFilters({...filters, min_reliability: score});
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs rounded-md font-bold transition-all ${
                                filters.min_reliability === score 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {score === 0 ? '全部' : getReliabilityInfo(score).text + '+'}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => setShowMarketPulse(!showMarketPulse)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all ml-2 ${
                        showMarketPulse ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <ChartIcon className="w-4 h-4" />
                    {showMarketPulse ? '隐藏雷达' : '市场雷达'}
                </button>

                <div className="relative ml-auto group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-64 pl-10 p-2.5 transition-all shadow-sm focus:bg-white focus:shadow-md" 
                        placeholder="搜索技术点名称..." 
                        value={filters.search}
                        onChange={e => {
                            setFilters({...filters, search: e.target.value});
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: List + Pulse */}
                <div className={`flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white transition-all duration-500 ease-in-out ${selectedItem ? 'max-w-[450px] hidden lg:flex' : ''}`}>
                    
                    {/* Pulse Drawer */}
                    {showMarketPulse && (
                        <div className="flex-shrink-0">
                            <MarketPulse onClose={() => setShowMarketPulse(false)} />
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {loadingList ? (
                             <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                                 <span className="text-sm text-slate-500">正在检索情报库...</span>
                             </div>
                        ) : items.length === 0 ? (
                            <div className="text-center text-slate-400 py-20">
                                <ViewGridIcon className="w-12 h-12 mx-auto mb-2 opacity-20"/>
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
                                        className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                                            isSelected 
                                                ? 'border-indigo-500 bg-indigo-50/30 shadow-md ring-1 ring-indigo-500/20' 
                                                : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>}
                                        
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${relConf.badge} border-transparent`}>
                                                    <relConf.Icon className="w-3 h-3 mr-1" />
                                                    {relConf.text}
                                                </span>
                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{item.car_brand}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(tech.publish_date).toLocaleDateString()}</span>
                                        </div>
                                        
                                        <h3 className={`text-base font-bold mb-2 line-clamp-1 transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-700'}`}>
                                            {tech.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{tech.description}</p>
                                        
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-1">
                                                <span>{item.tech_dimension}</span>
                                                <ChevronRightIcon className="w-2.5 h-2.5"/>
                                                <span className="font-semibold text-slate-600">{item.sub_tech_dimension}</span>
                                            </div>
                                            <span className="flex items-center gap-1 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-sm text-slate-500">
                                                <DocumentTextIcon className="w-3 h-3"/> {item.source_article_count} 来源
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div className="p-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 bg-white">
                        <span className="font-medium">共 {total} 条</span>
                        <div className="flex gap-2">
                            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-2 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 flex items-center shadow-sm"><ChevronLeftIcon className="w-3 h-3"/></button>
                            <span className="px-2 py-1 font-mono">{page}</span>
                            <button disabled={items.length < 20} onClick={()=>setPage(p=>p+1)} className="px-2 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 flex items-center shadow-sm"><ChevronRightIcon className="w-3 h-3"/></button>
                        </div>
                    </div>
                </div>

                {/* Right: Details (Split View) */}
                {selectedItem ? (
                    <div className="flex-[3] flex flex-col min-w-0 bg-slate-50 overflow-hidden relative animate-in slide-in-from-right-8 duration-500">
                        {/* Mobile Close Button */}
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="lg:hidden absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg z-50 text-slate-500 hover:text-slate-800 border border-slate-100"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>

                        <div className="flex-1 flex flex-col md:flex-row h-full">
                            {/* Middle: Timeline */}
                            <div className="flex-1 flex flex-col border-r border-slate-200 bg-white min-w-[320px] md:max-w-[400px]">
                                <DossierPanel 
                                    kbId={selectedItem.id} 
                                    techName={selectedItem.consolidated_tech_preview.name} 
                                    onSelectArticle={setSelectedArticleId}
                                    selectedArticleId={selectedArticleId}
                                />
                            </div>
                            
                            {/* Right: Article Viewer */}
                            <div className="flex-[1.5] bg-white flex flex-col h-full overflow-hidden">
                                {selectedArticleInfoItem ? (
                                    <EvidenceTrail selectedArticle={selectedArticleInfoItem} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8 bg-slate-50/50">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                                            <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <p className="font-bold text-slate-500">暂无信源预览</p>
                                        <p className="text-sm mt-2 max-w-xs mx-auto">点击左侧时间轴中的卡片以查看原始文章详情。</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-[3] hidden lg:flex flex-col items-center justify-center bg-slate-50/50 text-slate-400 border-l border-slate-200/50">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                            <ViewGridIcon className="w-16 h-16 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600">选择一项情报以查看详情</h3>
                        <p className="text-sm mt-3 text-slate-500 max-w-sm text-center">
                            我们将为您展示该技术点的 <span className="text-indigo-500 font-semibold">全生命周期演进时间轴</span> 以及 <span className="text-indigo-500 font-semibold">原始证据链</span>。
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---
export const CompetitivenessDashboard: React.FC = () => {
    return (
        <div className="h-full flex flex-col bg-slate-100">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-sm z-20">
                <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-md shadow-indigo-200">
                        <ChartIcon className="w-5 h-5 text-white" />
                    </div>
                    竞争力看板 
                    <span className="text-[10px] font-bold text-indigo-600 ml-2 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wide">
                        COMPETITIVENESS INSIGHTS
                    </span>
                </h1>
            </header>

            <main className="flex-1 overflow-hidden relative">
                <IntelligenceMatrix />
            </main>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
            `}</style>
        </div>
    );
};
