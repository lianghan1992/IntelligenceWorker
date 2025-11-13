import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { KnowledgeBaseItem, KnowledgeBaseDetail, KnowledgeBaseMeta, TechDetailHistoryItem, KnowledgeBaseTraceability, ExtractedTechnologyRecord } from '../../types';
import { getKnowledgeBase, getKnowledgeBaseDetail, getKnowledgeBaseMeta, getKnowledgeBaseTraceability } from '../../api/competitiveness';
import { 
    RefreshIcon, ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, UsersIcon, LightBulbIcon, 
    TrendingUpIcon, EyeIcon, ClockIcon, SearchIcon, ShieldExclamationIcon, ShieldCheckIcon, AnnotationIcon, QuestionMarkCircleIcon
} from '../icons';

// --- Helper Functions & Constants ---
const getReliabilityInfo = (score: number) => {
    switch (score) {
        case 4:
            return { text: '官方证实', color: 'green', Icon: CheckCircleIcon };
        case 3:
            return { text: '可信度高', color: 'blue', Icon: ShieldCheckIcon };
        case 2:
            return { text: '疑似传闻', color: 'amber', Icon: AnnotationIcon };
        case 1:
            return { text: '已经辟谣', color: 'red', Icon: ShieldExclamationIcon };
        default:
            return { text: '未知', color: 'gray', Icon: QuestionMarkCircleIcon };
    }
};


const techDimensionIcons: { [key: string]: React.FC<any> } = {
    '智能驾驶': BrainIcon, '智能座舱': UsersIcon, '智能网联': EyeIcon,
    '智能底盘': TrendingUpIcon, '智能动力': LightBulbIcon, '智能车身': CheckCircleIcon,
    '三电系统': LightBulbIcon, 'AI技术': BrainIcon
};

// --- Skeleton Components ---
const DetailPanelSkeleton: React.FC = () => (
    <div className="animate-pulse h-full">
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

// --- Sub-Component: DetailPanel ---
const TimelineItem: React.FC<{ record: ExtractedTechnologyRecord; article: any; isLast: boolean; }> = ({ record, article, isLast }) => {
    const reliabilityInfo = getReliabilityInfo(record.reliability);
    return (
        <div className="relative pl-10 group">
            <div className="absolute left-0 top-1.5 w-4 h-4 bg-white border-2 border-slate-300 rounded-full z-10 ring-4 ring-slate-50"></div>
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
            if (contentRef.current) contentRef.current.scrollTop = 0;

            try {
                const data = await getKnowledgeBaseTraceability(kbId, selectedTechName);
                if (!isCancelled) {
                    setTraceData(data);
                }
            } catch (err: any) {
                if (!isCancelled) {
                    setError(err.message || '加载溯源数据失败');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchTraceability();
        
        return () => { isCancelled = true; };
    }, [kbId, selectedTechName]);


    const { timelineItems, articleMap } = useMemo(() => {
        if (!traceData) return { timelineItems: [], articleMap: new Map() };

        const sortedItems = [...(traceData.stage1_records || [])].sort((a, b) => 
            new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime()
        );
        
        const articles = new Map((traceData.source_articles || []).map(a => [a.id, a]));

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
                            <div className="w-full">
                                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2 mt-2 animate-pulse"></div>
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
                                        {timelineItems.map((record, index) => {
                                            const article = articleMap.get(record.article_id);
                                            if (!article) return null;
                                            return (
                                                <TimelineItem 
                                                    key={record.id} 
                                                    record={record}
                                                    article={article}
                                                    isLast={index === timelineItems.length - 1} 
                                                />
                                            )
                                        })}
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
    const [detailsCache, setDetailsCache] = useState<Record<number, KnowledgeBaseDetail>>({});
    const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedInfo, setSelectedInfo] = useState<{ kbId: number; techName: string } | null>(null);

    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [filters, setFilters] = useState<{
        car_brand: string[];
        tech_dimension: string[];
        min_reliability: number;
        search: string;
    }>({ car_brand: [], tech_dimension: [], min_reliability: 0, search: '' });

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setFilters(f => ({ ...f, search: searchTerm }));
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        getKnowledgeBaseMeta().then(setMeta).catch(e => console.error("Failed to fetch meta", e));
    }, []);

    const hasActiveFilters = useMemo(() => {
        return filters.car_brand.length > 0 || filters.tech_dimension.length > 0 || filters.search.trim() !== '';
    }, [filters]);

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
                limit: 500,
                car_brand: filters.car_brand.length > 0 ? filters.car_brand : undefined,
                tech_dimension: filters.tech_dimension.length > 0 ? filters.tech_dimension : undefined,
                min_reliability: filters.min_reliability > 0 ? filters.min_reliability : undefined,
                search: filters.search || undefined,
                sort_by: 'last_updated_at',
                order: 'desc',
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
        setDetailsCache({});
    }, [fetchData]);

    const fetchDetailForItem = useCallback(async (kbId: number) => {
        if (detailsCache[kbId] || loadingDetails.has(kbId)) return;
        setLoadingDetails(prev => new Set(prev).add(kbId));
        try {
            const detailData = await getKnowledgeBaseDetail(kbId);
            setDetailsCache(prev => ({ ...prev, [kbId]: detailData }));
        } catch (err) {
            console.error(`Failed to load details for item ${kbId}`, err);
        } finally {
            setLoadingDetails(prev => {
                const newSet = new Set(prev);
                newSet.delete(kbId);
                return newSet;
            });
        }
    }, [detailsCache, loadingDetails]);
    
    const groupedData = useMemo(() => {
        return kbItems.reduce((acc, item) => {
            const { tech_dimension } = item;
            if (!acc[tech_dimension]) {
                acc[tech_dimension] = [];
            }
            acc[tech_dimension].push(item);
            return acc;
        }, {} as Record<string, KnowledgeBaseItem[]>);
    }, [kbItems]);
    
    const [expandedPrimaryDims, setExpandedPrimaryDims] = useState<Set<string>>(new Set());
    const [expandedSubDims, setExpandedSubDims] = useState<Set<number>>(new Set());
    
    useEffect(() => setExpandedPrimaryDims(new Set(Object.keys(groupedData))), [groupedData]);
    
    const togglePrimaryDimExpansion = (dim: string) => setExpandedPrimaryDims(p => {
        const newSet = new Set(p);
        if (newSet.has(dim)) newSet.delete(dim); else newSet.add(dim);
        return newSet;
    });
    
    const toggleSubDimExpansion = useCallback((kbId: number) => {
        setExpandedSubDims(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kbId)) {
                newSet.delete(kbId);
            } else {
                newSet.add(kbId);
                if (!detailsCache[kbId]) {
                    fetchDetailForItem(kbId);
                }
            }
            return newSet;
        });
    }, [detailsCache, fetchDetailForItem]);

    const renderLeftPanelContent = () => {
        if (isLoading) return <div className="text-center p-10 text-gray-500">加载中...</div>;
        if (error) return <div className="p-4 text-red-500">{error}</div>;
        if (!hasActiveFilters) return <div className="text-center p-10 text-gray-500">请选择品牌或技术领域开始探索。</div>;
        if (Object.keys(groupedData).length === 0) return <div className="text-center p-10 text-gray-500">没有符合条件的情报</div>;
        
        return (
            <div className="space-y-2">
            {Object.entries(groupedData).map(([dim, items]) => {
                const Icon = techDimensionIcons[dim] || BrainIcon;
                const isPrimaryExpanded = expandedPrimaryDims.has(dim);
                return (
                    <div key={dim}>
                        <button onClick={() => togglePrimaryDimExpansion(dim)} className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-gray-100">
                            <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 text-gray-500" />
                                <span className="font-semibold text-gray-800">{dim} ({items.length})</span>
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isPrimaryExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isPrimaryExpanded && <div className="pl-4 pt-1 pb-2 border-l-2 ml-5 space-y-1">
                            {items.map(item => {
                                const isSubExpanded = expandedSubDims.has(item.id);
                                const detail = detailsCache[item.id];
                                const techPoints = detail?.consolidated_tech_details;

                                return <div key={item.id}>
                                    <button onClick={() => toggleSubDimExpansion(item.id)} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-100 text-left">
                                        <span className="font-medium text-sm text-gray-700">{item.sub_tech_dimension}</span>
                                        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isSubExpanded && <div className="pl-4 py-1 space-y-1">
                                        {loadingDetails.has(item.id) ? (
                                            <div className="text-xs text-center p-4 text-gray-500">加载中...</div>
                                        ) : (
                                            techPoints && techPoints.map(techPoint => {
                                                const reliabilityInfo = getReliabilityInfo(techPoint.reliability);
                                                const isActive = selectedInfo?.kbId === item.id && selectedInfo?.techName === techPoint.name;
                                                return (
                                                    <div key={techPoint.name + item.id} onClick={() => setSelectedInfo({ kbId: item.id, techName: techPoint.name })} className={`p-2.5 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <p className={`text-sm font-medium ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>{techPoint.name}</p>
                                                            <span className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-200/70 rounded-full whitespace-nowrap">来源: {(techPoint.source_article_ids || []).length}篇</span>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1.5">
                                                            <span className={`text-xs font-medium flex items-center gap-1 text-${reliabilityInfo.color}-800`}><reliabilityInfo.Icon className="w-3 h-3" />{reliabilityInfo.text}</span>
                                                            <span className="text-xs text-gray-400">{techPoint.publish_date ? new Date(techPoint.publish_date).toLocaleDateString() : '无日期'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        {!loadingDetails.has(item.id) && (!techPoints || techPoints.length === 0) && (
                                            <div className="text-xs text-center p-4 text-gray-500">无数据或加载失败</div>
                                        )}
                                    </div>}
                                </div>
                            })}
                        </div>}
                    </div>
                )
            })}
            </div>
        );
    };

    return (
        <div className="h-full grid grid-cols-[480px_1fr] gap-6 p-6 bg-slate-100/50">
            {/* Left Panel */}
            <aside className="w-full flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <header className="p-4 border-b border-gray-200 flex-shrink-0">
                     <h1 className="text-2xl font-bold text-gray-800 mb-4 px-2">竞争力看板</h1>
                     <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Brand Filter */}
                            <select onChange={e => setFilters(f => ({...f, car_brand: e.target.value ? [e.target.value] : []}))} className="w-full bg-gray-100 border-transparent rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">全部品牌</option>
                                {meta?.car_brands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            {/* Tech Dimension Filter */}
                            <select onChange={e => setFilters(f => ({...f, tech_dimension: e.target.value ? [e.target.value] : []}))} className="w-full bg-gray-100 border-transparent rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">全部技术领域</option>
                                {meta && Object.keys(meta.tech_dimensions).map(d => <option key={d} value={d}>{d}</option>)}
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
            {/* Right Panel */}
            <main className="flex-1 h-full min-w-0">
                <DetailPanel 
                    kbId={selectedInfo?.kbId || null}
                    selectedTechName={selectedInfo?.techName || null}
                    onClose={() => setSelectedInfo(null)}
                />
            </main>
        </div>
    );
};