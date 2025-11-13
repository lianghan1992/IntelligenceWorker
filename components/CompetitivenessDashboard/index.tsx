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
    '三电系统': LightBulbIcon,
};

// --- Skeleton Components ---
const DetailPanelSkeleton: React.FC = () => (
    <div className="animate-pulse h-full">
        <header className="p-5 border-b border-gray-200">
            <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            <div className="h-7 w-1/2 bg-gray-200 rounded mt-2"></div>
        </header>
        <main className="p-6 space-y-8">
            <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
            <div className="space-y-4">
                <div className="h-24 w-full bg-gray-200 rounded-xl"></div>
                <div className="h-24 w-full bg-gray-200 rounded-xl"></div>
            </div>
            <div className="h-6 w-1/3 bg-gray-200 rounded mt-6"></div>
            <div className="h-32 w-full bg-gray-200 rounded-xl"></div>
        </main>
    </div>
);

// --- Sub-Component: DetailPanel ---
const TimelineItem: React.FC<{ item: TechDetailHistoryItem; isLast: boolean; onTrace: (techName: string) => void; isTracing: boolean; isActive: boolean; }> = ({ item, isLast, onTrace, isTracing, isActive }) => {
    const reliabilityInfo = getReliabilityInfo(item.reliability);
    return (
        <div className="relative pl-8 group">
            <div className={`absolute -left-[7px] top-1 w-4 h-4 bg-white border-2 rounded-full z-10 transition-all ${isActive ? `border-${reliabilityInfo.color}-500 ring-4 ring-${reliabilityInfo.color}-200` : `border-slate-300 group-hover:border-${reliabilityInfo.color}-400`}`}></div>
            {!isLast && <div className={`absolute -left-px top-2 h-full w-0.5 bg-slate-200`}></div>}
            <div className={`p-4 rounded-xl border shadow-sm transition-all duration-300 ${isActive ? `bg-white border-blue-400 shadow-lg` : `bg-white border-gray-200/80 hover:shadow-md hover:border-gray-300`}`}>
                <div className="flex justify-between items-center text-sm mb-2">
                    <p className="font-bold text-blue-700">{item.name}</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}>
                        <reliabilityInfo.Icon className="w-3 h-3" />
                        {reliabilityInfo.text}
                    </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                <div className="mt-4 flex justify-between items-center">
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>情报日期: {new Date(item.publish_date).toLocaleDateString()}</span>
                    </div>
                    <button
                        onClick={() => onTrace(item.name)}
                        disabled={isTracing && isActive}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md hover:bg-blue-100 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isTracing && isActive ? '溯源中...' : '溯源证据'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SourceArticle: React.FC<{ record: ExtractedTechnologyRecord, article: {id: string; title: string; original_url: string; publish_date: string} }> = ({ record, article }) => {
    const reliabilityInfo = getReliabilityInfo(record.reliability);
    return (
         <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200/80">
            <div className="flex justify-between items-center text-sm mb-1.5">
                <p className="font-semibold text-gray-800">{record.tech_name}</p>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}>
                    <reliabilityInfo.Icon className="w-3 h-3" />
                    {reliabilityInfo.text}
                </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{record.tech_description}</p>
             <div className="mt-3 text-xs text-slate-500 border-t border-slate-200 pt-2">
                出自: <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{article.title}</a>
            </div>
        </div>
    )
}


interface DetailPanelProps {
    kbId: number | null;
    onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ kbId, onClose }) => {
    const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const contentRef = React.useRef<HTMLDivElement>(null);
    
    const [traceabilityData, setTraceabilityData] = useState<KnowledgeBaseTraceability | null>(null);
    const [isTracing, setIsTracing] = useState(false);
    const [tracingError, setTracingError] = useState('');
    const [tracingForTech, setTracingForTech] = useState<string | null>(null);
    
    const handleTrace = useCallback(async (techName: string) => {
        if (!kbId) return;
        if (tracingForTech === techName && traceabilityData) return;

        setIsTracing(true);
        setTracingError('');
        setTraceabilityData(null);
        setTracingForTech(techName);

        try {
            const traceData = await getKnowledgeBaseTraceability(kbId, techName);
            setTraceabilityData(traceData);
        } catch (err: any) {
            setTracingError(err.message || '溯源失败');
        } finally {
            setIsTracing(false);
        }
    }, [kbId, tracingForTech, traceabilityData]);

    useEffect(() => {
        if (kbId === null) {
            setDetail(null);
            setTraceabilityData(null);
            setTracingForTech(null);
            return;
        }
        let isCancelled = false;
        const fetchDetailAndTrace = async () => {
            setIsLoading(true);
            setError('');
            setTraceabilityData(null);
            setTracingForTech(null);
            if (contentRef.current) contentRef.current.scrollTop = 0;

            try {
                const detailData = await getKnowledgeBaseDetail(kbId);
                if (isCancelled) return;
                setDetail(detailData);

                const sorted = [...detailData.consolidated_tech_details].sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
                if (sorted.length > 0) {
                    await handleTrace(sorted[0].name);
                }

            } catch (err: any) {
                 if (!isCancelled) setError(err.message || '加载详情失败');
            } finally {
                 if (!isCancelled) setIsLoading(false);
            }
        };
        fetchDetailAndTrace();
        
        return () => { isCancelled = true; };
    }, [kbId, handleTrace]);


    const sortedTechDetails = useMemo(() => {
        if (!detail) return [];
        return [...detail.consolidated_tech_details].sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
    }, [detail]);

    const traceabilityMap = useMemo(() => {
        if (!traceabilityData) return { articles: {}, records: [] };
        const articles = traceabilityData.source_articles.reduce((acc, article) => {
            acc[article.id] = article;
            return acc;
        }, {} as Record<string, typeof traceabilityData.source_articles[0]>);
        
        const records = traceabilityData.stage1_records;
        return { articles, records };
    }, [traceabilityData]);
    
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
                    <header className="p-5 border-b border-gray-200 flex justify-between items-start flex-shrink-0">
                        {detail && (
                             <div>
                                <p className="text-sm text-gray-500 font-medium">{detail.tech_dimension} &gt; {detail.sub_tech_dimension}</p>
                                <h2 className="text-2xl font-bold text-gray-900 mt-1">{detail.car_brand}</h2>
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon className="w-5 h-5" /></button>
                    </header>
                    <div ref={contentRef} className="flex-1 overflow-y-auto bg-slate-50/50">
                        {isLoading ? <DetailPanelSkeleton /> : error ? <div className="text-center text-red-500 p-6">{error}</div> : detail && (
                             <div className="p-6">
                                <h3 className="font-semibold text-gray-800 text-lg mb-4">技术演进时间线</h3>
                                <div className="space-y-6">
                                    {sortedTechDetails.map((item, index) => (
                                        <TimelineItem 
                                            key={index} 
                                            item={item} 
                                            isLast={index === sortedTechDetails.length - 1} 
                                            onTrace={handleTrace}
                                            isTracing={isTracing}
                                            isActive={tracingForTech === item.name}
                                        />
                                    ))}
                                </div>
                                
                                {tracingForTech && (
                                    <div className="mt-10 animate-in fade-in-0 duration-500">
                                        <h3 className="font-semibold text-gray-800 text-lg mb-4">信源证据链: “{tracingForTech}”</h3>
                                        {isTracing ? <DetailPanelSkeleton /> :
                                        tracingError ? <div className="text-center text-red-500 p-6 bg-red-50 rounded-lg">{tracingError}</div> :
                                        traceabilityMap.records.length > 0 ? (
                                            <div className="space-y-4">
                                               {traceabilityMap.records.map(record => {
                                                   const article = traceabilityMap.articles[record.article_id];
                                                   if (!article) return null;
                                                   return <SourceArticle key={record.id} record={record} article={article} />
                                               })}
                                            </div>
                                        ) : <p className="text-sm text-center text-gray-500 py-6 bg-gray-100 rounded-lg">未找到相关的信源证据</p>}
                                    </div>
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
    
    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [filters, setFilters] = useState<{
        car_brand: string[];
        tech_dimension: string[];
        min_reliability: number;
        search: string;
    }>({ car_brand: ['比亚迪'], tech_dimension: [], min_reliability: 0, search: '' });

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

    const fetchData = useCallback(async (showLoading = true) => {
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
    }, [filters]);

    useEffect(() => {
        fetchData();
        setSelectedKbId(null);
    }, [fetchData]);

    const groupedData = useMemo(() => {
        return kbItems.reduce((acc, item) => {
            const { tech_dimension } = item;
            if (!acc[tech_dimension]) acc[tech_dimension] = [];
            acc[tech_dimension].push(item);
            return acc;
        }, {} as Record<string, KnowledgeBaseItem[]>);
    }, [kbItems]);
    
    const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
    useEffect(() => setExpandedDims(new Set(Object.keys(groupedData))), [groupedData]);
    const toggleDimExpansion = (dim: string) => setExpandedDims(p => {
        const newSet = new Set(p);
        if (newSet.has(dim)) {
            newSet.delete(dim);
        } else {
            newSet.add(dim);
        }
        return newSet;
    });

    return (
        <div className="h-full bg-slate-100 text-gray-800 p-6 flex flex-col">
            <header className="pb-4 space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">竞争力看板</h1>
                    <button onClick={() => fetchData()} className="p-2 bg-white border border-slate-200/80 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {/* Filters */}
                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200/80 flex items-center gap-3">
                    <MultiSelectDropdown
                        label="品牌"
                        options={meta?.car_brands || []}
                        selected={filters.car_brand}
                        onChange={v => setFilters(f => ({...f, car_brand: v}))}
                    />
                    <MultiSelectDropdown
                        label="技术领域"
                        options={meta ? Object.keys(meta.tech_dimensions) : []}
                        selected={filters.tech_dimension}
                        onChange={v => setFilters(f => ({...f, tech_dimension: v}))}
                    />
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索技术点..." className="w-full text-sm bg-slate-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                </div>
            </header>
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Left Panel */}
                <div className="col-span-5 lg:col-span-4 flex flex-col h-full min-w-0">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
                        {isLoading ? <div className="text-center py-20 text-gray-500">加载中...</div>
                        : error ? <div className="text-center py-20 text-red-500 bg-red-50 rounded-lg p-4">{error}</div>
                        : Object.keys(groupedData).length === 0 ? <div className="text-center py-20 text-gray-500 bg-white rounded-lg border">没有符合条件的情报</div>
                        : Object.entries(groupedData).map(([dim, items]) => {
                            const Icon = techDimensionIcons[dim] || BrainIcon;
                            return (
                            <div key={dim} className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
                                <button onClick={() => toggleDimExpansion(dim)} className="w-full flex justify-between items-center p-4 bg-slate-50/50 hover:bg-slate-100/70 transition-colors">
                                    <h2 className="font-bold text-base text-gray-900 flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-gray-500" />
                                        {dim} ({items.length})
                                    </h2>
                                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedDims.has(dim) ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedDims.has(dim) && (
                                    <div className="border-t border-gray-100 p-2 space-y-1">
                                        {items.map(item => {
                                            const reliabilityInfo = getReliabilityInfo(item.current_reliability_score);
                                            const isActive = selectedKbId === item.id;
                                            return (
                                                <div key={item.id} onClick={() => setSelectedKbId(item.id)} className={`group cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${isActive ? 'bg-blue-50 border-blue-500 shadow-inner' : 'border-transparent hover:bg-slate-50/70'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <p className={`flex-1 font-bold text-gray-800 text-sm truncate group-hover:text-blue-600 ${isActive && 'text-blue-700'}`}>{item.consolidated_tech_preview.name}</p>
                                                        <span className={`ml-2 flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}><reliabilityInfo.Icon className="w-3 h-3"/>{reliabilityInfo.text}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        <span className="text-gray-500 text-xs">{item.sub_tech_dimension}</span>
                                                        <span className="text-gray-400 flex items-center gap-1 text-xs"><DocumentTextIcon className="w-3 h-3"/>{item.source_article_count}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
                {/* Right Panel */}
                <main className="col-span-7 lg:col-span-8 h-full min-w-0">
                    <DetailPanel kbId={selectedKbId} onClose={() => setSelectedKbId(null)} />
                </main>
            </div>
        </div>
    );
};

// --- MultiSelectDropdown Component ---
const MultiSelectDropdown: React.FC<{label: string, options: string[], selected: string[], onChange: (selected: string[]) => void}> = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const handleSelect = (option: string) => {
        const newSelected = selected.includes(option) ? selected.filter(s => s !== option) : [...selected, option];
        onChange(newSelected);
    }
    
    return (
        <div className="relative text-sm w-56" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center bg-slate-50 border border-gray-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <span className="text-gray-700 truncate">
                    {label}: {selected.length > 0 ? `${selected.length}个已选` : '全部'}
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
                     <div className="p-2">
                        <button className="text-xs text-blue-600 hover:underline font-semibold" onClick={() => onChange([])}>清空选择</button>
                     </div>
                    {options.map(option => (
                        <label key={option} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input type="checkbox" checked={selected.includes(option)} onChange={() => handleSelect(option)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-gray-700">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}
