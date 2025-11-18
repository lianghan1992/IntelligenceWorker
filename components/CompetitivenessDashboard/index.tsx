import React, { useState, useMemo, useEffect, ReactNode, useCallback, useRef } from 'react';
import { KnowledgeBaseItem, KnowledgeBaseTraceability, ExtractedTechnologyRecord, KnowledgeBaseMeta, SourceArticleWithRecords } from '../../types';
import { 
    getKnowledgeBase, getKnowledgeBaseTraceability, getKnowledgeBaseMeta,
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
const DashboardSectionSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
    </div>
);

const ListSkeleton: React.FC = () => (
    <div className="animate-pulse p-2 space-y-2">
        {Array(3).fill(0).map((_, i) => (
            <div key={i}>
                <div className="h-8 w-1/2 bg-gray-200 rounded mb-2"></div>
                <div className="pl-4 border-l-2 ml-5 space-y-1">
                    <div className="h-16 w-full bg-gray-100 rounded-lg"></div>
                    <div className="h-16 w-full bg-gray-100 rounded-lg"></div>
                </div>
            </div>
        ))}
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
    const validData = Array.isArray(data) ? data : [];
    const maxCount = Math.max(...validData.map(item => item.count), 0);
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200/80">
            <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {validData.length > 0 ? validData.map(item => (
                    <div key={item.name} className="text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-gray-600">{item.name}</span>
                            <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                )) : <p className="text-center text-sm text-gray-400 py-8">暂无数据</p>}
            </div>
        </div>
    );
};

const DashboardView: React.FC = () => {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [brandDist, setBrandDist] = useState<DashboardDistributionItem[]>([]);
    const [techDist, setTechDist] = useState<DashboardDistributionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [overviewData, brandData, techData] = await Promise.all([
                    getDashboardOverview(),
                    getDashboardDistributionBrand({ top_n: 5 }),
                    getDashboardDistributionTechDimension({ top_n: 5 }),
                ]);
                setOverview(overviewData);
                setBrandDist(brandData?.items || []);
                setTechDist(techData?.items || []);
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
        <div className="p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">战略作战室概览</h2>
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
             <div className="mt-8 text-center text-gray-500">
                <p>👆 请在左侧选择一个品牌或技术领域开始您的深度分析。</p>
            </div>
        </div>
    );
};


// --- Dossier & Source Panels ---
const DossierPanel: React.FC<{ kbId: number; techName: string; onSelectArticle: (articleId: string) => void }> = ({ kbId, techName, onSelectArticle }) => {
    const [traceData, setTraceData] = useState<KnowledgeBaseTraceability | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        let isCancelled = false;
        const fetchTraceability = async () => {
            setIsLoading(true);
            setError('');
            setTraceData(null);
            contentRef.current?.scrollTo(0, 0);

            try {
                const data = await getKnowledgeBaseTraceability(kbId, techName);
                if (!isCancelled) {
                    setTraceData(data);
                    // Auto-select the first article from the first timeline item
                    if (data?.stage1_records?.[0]?.article_id) {
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
    }, [kbId, techName, onSelectArticle]);

    const timelineItems = useMemo(() => {
        if (!traceData?.stage1_records) return [];
        return [...traceData.stage1_records].sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
    }, [traceData]);
    
    if (isLoading) return <div className="p-6"><div className="h-full w-full bg-gray-100 rounded-xl animate-pulse"></div></div>
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>
    if (!traceData) return <div className="p-6 text-center text-gray-500">请选择一项技术以查看详情。</div>;

    const aggregatedTech = traceData.aggregated_tech[0];

    return (
        <div ref={contentRef} className="h-full overflow-y-auto p-6 space-y-6">
            <header>
                <p className="text-sm text-gray-500 font-semibold">{traceData.tech_dimension} &gt; {traceData.sub_tech_dimension}</p>
                <h2 className="text-3xl font-bold text-gray-900 mt-1">{traceData.car_brand} - {techName}</h2>
            </header>
            
            {aggregatedTech && (
                <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-bold text-gray-800 text-lg mb-2">最新聚合结论</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{aggregatedTech.description}</p>
                </div>
            )}
            
            <div>
                 <h3 className="font-bold text-gray-800 text-xl mb-4">技术演进时间线</h3>
                 <div className="space-y-4">
                    {timelineItems.map((record) => (
                        <div key={record.id} onClick={() => onSelectArticle(record.article_id)} className="p-3 bg-white rounded-lg border border-gray-200/80 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold text-gray-800">{record.tech_description}</p>
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{new Date(record.publish_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

const SourcePanel: React.FC<{ article: SourceArticleWithRecords | null }> = ({ article }) => {
    if (!article) return (
         <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
            <DocumentTextIcon className="w-12 h-12 text-slate-300 mb-4" />
            <p className="font-semibold">暂无信源</p>
            <p className="text-sm">点击时间线中的记录以加载原始文章。</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="font-bold text-gray-800 text-base line-clamp-2" title={article.title}>{article.title}</h3>
                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                    <span>{new Date(article.publish_date).toLocaleString('zh-CN')}</span>
                    <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">查看原文 &rarr;</a>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none prose-p:text-gray-700">
                {article.content?.split('\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
        </div>
    );
};


// --- Main Component ---
export const CompetitivenessDashboard: React.FC = () => {
    const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [selectedKbItem, setSelectedKbItem] = useState<KnowledgeBaseItem | null>(null);
    const [traceData, setTraceData] = useState<KnowledgeBaseTraceability | null>(null);
    const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [filters, setFilters] = useState<{ car_brand: string; tech_dimension: string; search: string; }>({ car_brand: '', tech_dimension: '', search: '' });

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDimensions, setExpandedDimensions] = useState(new Set<string>());

    const toggleDimension = (dim: string) => {
        setExpandedDimensions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dim)) {
                newSet.delete(dim);
            } else {
                newSet.add(dim);
            }
            return newSet;
        });
    };

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
                tech_dimension: filters.tech_dimension || undefined,
                search: filters.search.trim() || undefined,
            });
            setKbItems(response.items || []);
        } catch (err: any) {
            setError(err.message || '获取知识库数据失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [filters, hasActiveFilters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderLeftPanelContent = () => {
        if (isLoading) return <ListSkeleton />;
        if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
        if (!hasActiveFilters) {
            return (
                <div className="p-6 text-center text-gray-500">
                    <p>👆 请选择一个品牌开始分析。</p>
                </div>
            );
        }
        if (kbItems.length === 0) {
             return (
                <div className="p-6 text-center text-gray-500">
                    <p>未找到符合条件的情报。</p>
                </div>
            );
        }

        const groupedByDimension = kbItems.reduce((acc, item) => {
            const dim = item.tech_dimension;
            if (!acc[dim]) acc[dim] = [];
            acc[dim].push(item);
            return acc;
        }, {} as Record<string, KnowledgeBaseItem[]>);
        
        return (
            <div className="space-y-2">
            {Object.entries(groupedByDimension).map(([dimension, items]) => {
                const Icon = techDimensionIcons[dimension] || BrainIcon;
                const isExpanded = expandedDimensions.has(dimension);
                return (
                    <div key={dimension}>
                        <button onClick={() => toggleDimension(dimension)} className="w-full flex justify-between items-center p-3 font-semibold text-gray-800 hover:bg-gray-100/70 rounded-lg">
                            <span className="flex items-center gap-2"><Icon className="w-5 h-5 text-gray-500" /> {dimension}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && <div className="pl-4 border-l-2 ml-5 space-y-1">
                            {items.map(item => {
                                const techPoint = item.consolidated_tech_preview;
                                const reliabilityInfo = getReliabilityInfo(techPoint.reliability);
                                const isActive = selectedKbItem?.id === item.id && selectedKbItem?.consolidated_tech_preview.name === techPoint.name;
                                return (
                                    <div 
                                        key={`${item.id}-${techPoint.name}`}
                                        onClick={() => setSelectedKbItem(item)}
                                        className={`p-2.5 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={`text-sm font-medium ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>【{item.sub_tech_dimension}】 {techPoint.name}</p>
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

    const selectedArticle = useMemo((): SourceArticleWithRecords | null => {
        if (!selectedArticleId || !traceData) return null;

        // FIX: The object from `traceData.source_articles` is missing the `stage1_records` property.
        // We need to find the base article and then find all associated stage1 records
        // to construct a valid `SourceArticleWithRecords` object.
        const articleInfo = traceData.source_articles.find(a => a.id === selectedArticleId);
        if (!articleInfo) {
            return null;
        }

        const relatedRecords = traceData.stage1_records.filter(record => record.article_id === selectedArticleId);

        return {
            ...articleInfo,
            stage1_records: relatedRecords,
        };
    }, [selectedArticleId, traceData]);


    return (
        <div className="h-full flex flex-col p-6 bg-slate-100/50">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
                {/* Left Panel */}
                <aside className="w-full flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm md:col-span-4 lg:col-span-3">
                    <header className="p-4 border-b border-gray-200 flex-shrink-0">
                         <h1 className="text-xl font-bold text-gray-800 mb-4 px-2">情报雷达</h1>
                         <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <select onChange={e => setFilters(f => ({...f, car_brand: e.target.value, tech_dimension: ''}))} value={filters.car_brand} className="w-full bg-gray-100 border-transparent rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">选择品牌</option>
                                    {meta?.car_brands && Array.isArray(meta.car_brands) && meta.car_brands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <select onChange={e => setFilters(f => ({...f, tech_dimension: e.target.value}))} value={filters.tech_dimension} disabled={!filters.car_brand} className="w-full bg-gray-100 border-transparent rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50">
                                    <option value="">全技术领域</option>
                                    {meta?.tech_dimensions && typeof meta.tech_dimensions === 'object' && Object.keys(meta.tech_dimensions).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="在结果中搜索..." disabled={!hasActiveFilters} className="w-full bg-gray-100 border-transparent rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"/>
                            </div>
                         </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-2">
                        {renderLeftPanelContent()}
                    </div>
                </aside>
                
                {/* Middle and Right Panels */}
                <main className="flex-1 h-full min-w-0 md:col-span-8 lg:col-span-9 grid grid-cols-1 lg:grid-cols-9 gap-6">
                    <div className="h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-5">
                        {!hasActiveFilters ? <DashboardView />
                         : !selectedKbItem ? (
                             <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
                                <EyeIcon className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="font-bold text-xl text-slate-800">请选择情报点</h3>
                                <p className="text-sm mt-2">从左侧列表选择一项开始深度分析。</p>
                            </div>
                         ) : (
                            <DossierPanel 
                                key={selectedKbItem.id + selectedKbItem.consolidated_tech_preview.name} 
                                kbId={selectedKbItem.id} 
                                techName={selectedKbItem.consolidated_tech_preview.name} 
                                onSelectArticle={setSelectedArticleId}
                            />
                         )
                        }
                    </div>
                    <div className="h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm hidden lg:block lg:col-span-4">
                        {hasActiveFilters && selectedKbItem && <SourcePanel article={selectedArticle} />}
                    </div>
                </main>
            </div>
        </div>
    );
};