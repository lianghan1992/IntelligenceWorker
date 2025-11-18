import React, { useState, useMemo, useEffect, ReactNode, useCallback } from 'react';
import { KnowledgeBaseItem, KnowledgeBaseDetail, KnowledgeBaseMeta, KnowledgeBaseTraceability, ExtractedTechnologyRecord } from '../../types';
import { 
    getKnowledgeBase, getKnowledgeBaseDetail, getKnowledgeBaseMeta, getKnowledgeBaseTraceability,
    getDashboardOverview, getDashboardDistributionBrand, getDashboardDistributionTechDimension, getDashboardQuality,
    DashboardOverview, DashboardDistributionItem, DashboardQuality
} from '../../api/competitiveness';
import { LazyLoadModule } from '../Dashboard/LazyLoadModule';
import { 
    RefreshIcon, ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, UsersIcon, LightBulbIcon, 
    TrendingUpIcon, EyeIcon, ClockIcon, SearchIcon, ShieldExclamationIcon, ShieldCheckIcon, AnnotationIcon, QuestionMarkCircleIcon
} from '../icons';

// --- Helper Functions & Constants ---
const getReliabilityInfo = (score: number) => {
    switch (score) {
        case 4: return { text: '官方证实', color: 'green', Icon: CheckCircleIcon };
        case 3: return { text: '可信度高', color: 'blue', Icon: ShieldCheckIcon };
        case 2: return { text: '疑似传闻', color: 'amber', Icon: AnnotationIcon };
        case 1: return { text: '已经辟谣', color: 'red', Icon: ShieldExclamationIcon };
        default: return { text: '未知', color: 'gray', Icon: QuestionMarkCircleIcon };
    }
};

const techDimensionIcons: { [key: string]: React.FC<any> } = {
    '智能驾驶': BrainIcon, '智能座舱': UsersIcon, '智能网联': EyeIcon,
    '智能底盘': TrendingUpIcon, '智能动力': LightBulbIcon, '智能车身': CheckCircleIcon,
    '三电系统': LightBulbIcon, 'AI技术': BrainIcon
};


// --- Skeleton Components ---
const DetailPanelSkeleton: React.FC = () => (
    <div className="animate-pulse h-full flex flex-col">
        <header className="p-6 border-b border-gray-200">
            <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            <div className="h-8 w-1/2 bg-gray-200 rounded mt-2"></div>
        </header>
        <main className="p-6 space-y-8">
            <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
            <div className="space-y-6">
                <div className="h-28 w-full bg-gray-100 rounded-xl"></div>
                <div className="h-28 w-full bg-gray-100 rounded-xl"></div>
            </div>
        </main>
    </div>
);

const DashboardSectionSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
    </div>
);


// --- Dashboard Sub-Components ---
const KpiCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200/80">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
);

const BarChartCard: React.FC<{ title: string; data: DashboardDistributionItem[] }> = ({ title, data }) => {
    // FIX: Ensure data is an array before calling map to prevent runtime errors.
    const validData = Array.isArray(data) ? data : [];
    const maxCount = Math.max(...validData.map(item => item.count), 0);
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200/80">
            <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {validData.map(item => (
                    <div key={item.name} className="text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-gray-600">{item.name}</span>
                            <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Main Dashboard Section Component ---
const DashboardSection: React.FC = () => {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [brandDist, setBrandDist] = useState<DashboardDistributionItem[]>([]);
    const [techDist, setTechDist] = useState<DashboardDistributionItem[]>([]);
    const [quality, setQuality] = useState<DashboardQuality | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [overviewData, brandData, techData, qualityData] = await Promise.all([
                    getDashboardOverview(),
                    getDashboardDistributionBrand({ top_n: 5 }),
                    getDashboardDistributionTechDimension({ top_n: 5 }),
                    getDashboardQuality({ top_n: 5 })
                ]);
                setOverview(overviewData);
                // FIX: Add fallback empty array to prevent crash if API response is missing 'items'
                setBrandDist(brandData?.items || []);
                setTechDist(techData?.items || []);
                // FIX: Add a check to ensure qualityData is valid before setting state
                if (qualityData && qualityData.reliability_distribution) {
                    setQuality(qualityData);
                }
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <DashboardSectionSkeleton />;

    return (
        <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <KpiCard title="知识库情报总数" value={overview?.kb_total.toLocaleString() ?? 'N/A'} description="已聚合的技术情报点" />
                <KpiCard title="初筛情报总数" value={overview?.stage1_total.toLocaleString() ?? 'N/A'} description="从文章中提取的原始情报" />
                <KpiCard title="已处理文章数" value={overview?.processed_article_count.toLocaleString() ?? 'N/A'} description="进入分析流程的文章总数" />
                <KpiCard title="平均可靠性" value={overview?.kb_reliability_avg.toFixed(2) ?? 'N/A'} description="1-4分制，越高越可靠" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarChartCard title="品牌情报分布 (Top 5)" data={brandDist} />
                <BarChartCard title="技术领域分布 (Top 5)" data={techDist} />
            </div>
        </div>
    );
};

// --- Traceability Timeline Sub-Components ---
const TimelineItem: React.FC<{ record: ExtractedTechnologyRecord; article: any; isLast: boolean; }> = ({ record, article, isLast }) => {
    const reliabilityInfo = getReliabilityInfo(record.reliability);
    return (
        <div className="relative pl-10 group">
            <div className={`absolute left-0 top-1.5 w-4 h-4 bg-white border-2 border-slate-300 rounded-full z-10 ring-4 ring-slate-50`}></div>
            {!isLast && <div className="absolute left-[7px] top-2 h-full w-0.5 bg-slate-200"></div>}

            <div className="border border-gray-200/80 rounded-xl p-4 bg-white hover:shadow-lg transition-shadow duration-300">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 flex-1 pr-4">{record.tech_name}</h4>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1.5 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}>
                        <reliabilityInfo.Icon className="w-3.5 h-3.5" />
                        {reliabilityInfo.text}
                    </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{record.tech_description}</p>
                <div className="mt-4 pt-3 border-t border-gray-200/80 flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>情报日期: {new Date(record.publish_date).toLocaleDateString()}</span>
                    </div>
                    {article && (
                         <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline max-w-[240px] truncate" title={article.title}>
                            来源: {article.title}
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

interface DetailPanelProps {
    kbId: number | null;
    selectedTechName: string | null;
    onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ kbId, selectedTechName, onClose }) => {
    const [traceData, setTraceData] = useState<KnowledgeBaseTraceability | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const contentRef = React.useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (!kbId || !selectedTechName) {
            setTraceData(null);
            return;
        }

        let isCancelled = false;
        const fetchTraceability = async () => {
            setIsLoading(true);
            setError('');
            setTraceData(null);
            contentRef.current?.scrollTo(0, 0);

            try {
                const data = await getKnowledgeBaseTraceability(kbId, selectedTechName);
                if (!isCancelled) setTraceData(data);
            } catch (err: any) {
                if (!isCancelled) setError(err.message || '加载溯源数据失败');
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        fetchTraceability();
        return () => { isCancelled = true; };
    }, [kbId, selectedTechName]);

    const { timelineItems, articleMap } = useMemo(() => {
        if (!traceData) return { timelineItems: [], articleMap: new Map() };
        // FIX: Add safeguards to ensure traceData properties are arrays before using array methods.
        const stage1Records = Array.isArray(traceData.stage1_records) ? traceData.stage1_records : [];
        const sourceArticles = Array.isArray(traceData.source_articles) ? traceData.source_articles : [];
        const sortedItems = [...stage1Records].sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
        const articles = new Map(sourceArticles.map(a => [a.id, a]));
        return { timelineItems: sortedItems, articleMap: articles };
    }, [traceData]);
    
    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm relative">
            {kbId === null ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
                    <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h3 className="font-bold text-xl text-slate-800">洞察始于探索</h3>
                    <p className="text-sm mt-2 max-w-xs mx-auto">从左侧选择一个技术情报点，在此处查看其详细演进历史和信源证据。</p>
                </div>
            ) : (
                <>
                    <header className="p-6 border-b border-gray-200 flex justify-between items-start flex-shrink-0">
                        {isLoading ? (
                            <div className="w-full animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2 mt-2"></div>
                            </div>
                        ) : traceData && (
                             <div>
                                <p className="text-sm text-gray-500 font-semibold">{traceData.tech_dimension} &gt; {traceData.sub_tech_dimension}</p>
                                <h2 className="text-3xl font-bold text-gray-900 mt-1">{traceData.car_brand}</h2>
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon className="w-6 h-6" /></button>
                    </header>
                    <div ref={contentRef} className="flex-1 overflow-y-auto bg-slate-50">
                        {isLoading ? <DetailPanelSkeleton /> : error ? <div className="text-center text-red-500 p-6">{error}</div> : traceData && (
                             <div className="p-6">
                                <h3 className="font-bold text-gray-800 text-xl mb-6">技术演进时间线: “{selectedTechName}”</h3>
                                {timelineItems.length > 0 ? (
                                    <div className="space-y-6">
                                        {timelineItems.map((record, index) => (
                                            <TimelineItem 
                                                key={record.id} 
                                                record={record}
                                                article={articleMap.get(record.article_id)}
                                                isLast={index === timelineItems.length - 1} 
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-gray-500 py-8 bg-white border rounded-lg">未找到相关的演进记录。</p>
                                )}
                            </div>
                        )}
                    </div>
                </>
             )}
        </div>
    );
};

// --- Main Component ---
export const CompetitivenessDashboard: React.FC = () => {
    const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedInfo, setSelectedInfo] = useState<{ kbId: number; techName: string } | null>(null);

    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [filters, setFilters] = useState<{ car_brand: string; tech_dimension: string; search: string; }>({ car_brand: '', tech_dimension: '', search: '' });

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => { setFilters(f => ({ ...f, search: searchTerm })); }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        getKnowledgeBaseMeta().then(setMeta).catch(e => console.error("Failed to fetch meta", e));
    }, []);

    const hasActiveFilters = useMemo(() => filters.car_brand || filters.tech_dimension || filters.search.trim() !== '', [filters]);

    const fetchData = useCallback(async (showLoading = true) => {
        if (!hasActiveFilters) {
            setKbItems([]);
            if (showLoading) setIsLoading(false);
            return;
        }
        if (showLoading) setIsLoading(true);
        setError('');
        try {
            const response = await getKnowledgeBase({
                limit: 200,
                car_brand: filters.car_brand ? [filters.car_brand] : undefined,
                tech_dimension: filters.tech_dimension ? [filters.tech_dimension] : undefined,
                search: filters.search || undefined,
                sort_by: 'last_updated_at', order: 'desc',
            });
            setKbItems(response.items || []);
        } catch (err: any) {
            setError(err.message || '加载知识库失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [filters, hasActiveFilters]);

    useEffect(() => {
        fetchData();
        setSelectedInfo(null);
    }, [fetchData]);

    const groupedData = useMemo(() => kbItems.reduce((acc, item) => {
        const { tech_dimension } = item;
        if (!acc[tech_dimension]) acc[tech_dimension] = [];
        acc[tech_dimension].push(item);
        return acc;
    }, {} as Record<string, KnowledgeBaseItem[]>), [kbItems]);
    
    const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
    useEffect(() => setExpandedDims(new Set(Object.keys(groupedData))), [groupedData]);
    
    const toggleDimExpansion = (dim: string) => setExpandedDims(p => {
        const newSet = new Set(p);
        if (newSet.has(dim)) newSet.delete(dim); else newSet.add(dim);
        return newSet;
    });

    const renderLeftPanelContent = () => {
        if (isLoading) return <div className="text-center p-10 text-gray-500">加载中...</div>;
        if (error) return <div className="p-4 text-red-500">{error}</div>;
        if (!hasActiveFilters) return <div className="text-center p-10 text-gray-500">请选择品牌或技术领域开始探索。</div>;
        if (Object.keys(groupedData).length === 0) return <div className="text-center p-10 text-gray-500">没有符合条件的情报</div>;
        
        return (
            <div className="space-y-2">
            {Object.entries(groupedData).map(([dim, items]) => {
                const Icon = techDimensionIcons[dim] || BrainIcon;
                const isExpanded = expandedDims.has(dim);
                return (
                    <div key={dim}>
                        <button onClick={() => toggleDimExpansion(dim)} className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-gray-100">
                            <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-gray-500" /><span className="font-semibold text-gray-800">{dim} ({items.length})</span></div>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && <div className="pl-4 pt-1 pb-2 border-l-2 ml-5 space-y-1">
                            {items.map(item => {
                                const techPoint = item.consolidated_tech_preview;
                                const reliabilityInfo = getReliabilityInfo(item.current_reliability_score);
                                const isActive = selectedInfo?.kbId === item.id && selectedInfo?.techName === techPoint.name;
                                return (
                                    <div key={item.id} onClick={() => setSelectedInfo({ kbId: item.id, techName: techPoint.name })} className={`p-2.5 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={`text-sm font-medium ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>【{item.car_brand}】{item.sub_tech_dimension}: {techPoint.name}</p>
                                            <span className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-200/70 rounded-full whitespace-nowrap">来源: {item.source_article_count}篇</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1.5">
                                            <span className={`text-xs font-medium flex items-center gap-1 text-${reliabilityInfo.color}-800`}><reliabilityInfo.Icon className="w-3 h-3" />{reliabilityInfo.text}</span>
                                            <span className="text-xs text-gray-400">{techPoint.publish_date ? new Date(techPoint.publish_date).toLocaleDateString() : '无日期'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>}
                    </div>
                )
            })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-6 bg-slate-100/50">
            <LazyLoadModule placeholder={<DashboardSectionSkeleton />}>
                <DashboardSection />
            </LazyLoadModule>
            <div className="flex-1 grid grid-cols-[480px_1fr] gap-6 min-h-0">
                <aside className="w-full flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                    <header className="p-4 border-b border-gray-200 flex-shrink-0">
                         <h1 className="text-2xl font-bold text-gray-800 mb-4 px-2">情报探索</h1>
                         <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <select onChange={e => setFilters(f => ({...f, car_brand: e.target.value}))} value={filters.car_brand} className="w-full bg-gray-100 border-transparent rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">全部品牌</option>
                                    {/* FIX: Add a guard to ensure meta.car_brands is an array before mapping. */}
                                    {meta?.car_brands && Array.isArray(meta.car_brands) && meta.car_brands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <select onChange={e => setFilters(f => ({...f, tech_dimension: e.target.value}))} value={filters.tech_dimension} className="w-full bg-gray-100 border-transparent rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">全部技术领域</option>
                                    {/* FIX: Add a guard to ensure meta.tech_dimensions is an object before getting its keys. */}
                                    {meta?.tech_dimensions && typeof meta.tech_dimensions === 'object' && Object.keys(meta.tech_dimensions).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索技术点..." className="w-full bg-gray-100 border-transparent rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                         </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-2">
                        {renderLeftPanelContent()}
                    </div>
                </aside>
                <main className="flex-1 h-full min-w-0">
                    <DetailPanel 
                        kbId={selectedInfo?.kbId || null}
                        selectedTechName={selectedInfo?.techName || null}
                        onClose={() => setSelectedInfo(null)}
                    />
                </main>
            </div>
        </div>
    );
};