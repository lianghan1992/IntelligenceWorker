import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { KnowledgeBaseItem, KnowledgeBaseDetail, KnowledgeBaseMeta, SourceArticleWithRecords } from '../../types';
import { getKnowledgeBase, getKnowledgeBaseDetail, getKnowledgeBaseMeta, getKnowledgeBaseSources } from '../../api/competitiveness';
import { 
    RefreshIcon, ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, UsersIcon, LightBulbIcon, 
    TrendingUpIcon, EyeIcon, ClockIcon, SearchIcon, CheckIcon
} from '../icons';

// --- Helper Functions & Constants ---
const getReliabilityInfo = (score: number) => {
    if (score >= 80) return { text: '官方证实', color: 'green', Icon: CheckCircleIcon };
    if (score >= 60) return { text: '可信度高', color: 'blue', Icon: DocumentTextIcon };
    if (score >= 40) return { text: '疑似传闻', color: 'amber', Icon: DocumentTextIcon };
    return { text: '有待核实', color: 'gray', Icon: DocumentTextIcon };
};

const techDimensionIcons: { [key: string]: React.FC<any> } = {
    '智能驾驶': BrainIcon, '智能座舱': UsersIcon, '智能网联': EyeIcon,
    '智能底盘': TrendingUpIcon, '智能动力': LightBulbIcon, '智能车身': CheckCircleIcon,
    '三电系统': LightBulbIcon,
};


// --- Sub-Component: DetailPanel ---
interface DetailPanelProps {
    kbId: number | null;
    onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ kbId, onClose }) => {
    const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
    const [sources, setSources] = useState<SourceArticleWithRecords[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const contentRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (kbId === null) {
            setDetail(null);
            setSources([]);
            return;
        }
        let isCancelled = false;
        const fetchDetail = async () => {
            setIsLoading(true);
            setError('');
            if (contentRef.current) contentRef.current.scrollTop = 0;

            try {
                const [detailData, sourcesData] = await Promise.all([
                    getKnowledgeBaseDetail(kbId),
                    getKnowledgeBaseSources(kbId, { with_records: true, min_reliability: 0 })
                ]);
                if (isCancelled) return;
                setDetail(detailData);
                setSources(sourcesData || []);
            } catch (err: any) {
                 if (!isCancelled) setError(err.message || '加载详情失败');
            } finally {
                 if (!isCancelled) setIsLoading(false);
            }
        };
        fetchDetail();
        
        return () => { isCancelled = true; };
    }, [kbId]);

    const sortedTechDetails = useMemo(() => {
        if (!detail) return [];
        return [...detail.consolidated_tech_details].sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
    }, [detail]);
    
    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm relative">
            {kbId === null ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
                    <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h3 className="font-bold text-xl text-slate-800">洞察始于探索</h3>
                    <p className="text-sm mt-2 max-w-xs mx-auto">从左侧选择一个技术情报点，在此处查看其详细演进历史和信源证据。</p>
                </div>
            ) : (
                <>
                    <header className="p-5 border-b border-gray-200 flex justify-between items-start flex-shrink-0">
                        {detail ? (
                            <div>
                                <p className="text-sm text-gray-500 font-medium">{detail.tech_dimension} &gt; {detail.sub_tech_dimension}</p>
                                <h2 className="text-2xl font-bold text-gray-900 mt-1">{detail.car_brand}</h2>
                            </div>
                        ) : <div className="h-[58px]"></div>}
                        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon className="w-5 h-5" /></button>
                    </header>
                     <main ref={contentRef} className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                        {isLoading && <div className="text-center text-gray-500 pt-10">正在加载详情...</div>}
                        {error && <div className="text-center text-red-500 p-6">{error}</div>}
                        {detail && (
                            <>
                                <h3 className="font-semibold text-gray-800 text-lg mb-4">技术演进时间线</h3>
                                <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                                    {sortedTechDetails.map((item, index) => {
                                        const reliabilityInfo = getReliabilityInfo(item.reliability);
                                        return (
                                            <div key={index} className="relative">
                                                <div className={`absolute -left-[35px] top-1 w-5 h-5 bg-white border-4 border-${reliabilityInfo.color}-500 rounded-full`}></div>
                                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-center text-sm mb-2">
                                                        <p className="font-bold text-blue-700">{item.name}</p>
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}>
                                                            <reliabilityInfo.Icon className="w-3 h-3" />
                                                            {reliabilityInfo.text}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                                        <ClockIcon className="w-3.5 h-3.5" />
                                                        <span>情报日期: {new Date(item.publish_date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <h3 className="font-semibold text-gray-800 text-lg mt-8 mb-4">信源证据链</h3>
                                <div className="space-y-4">
                                    {sources.length > 0 ? sources.map(source => (
                                        <div key={source.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                            <a href={source.original_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline block truncate">{source.title}</a>
                                            <p className="text-xs text-slate-500 mt-1">{new Date(source.publish_date).toLocaleDateString()}</p>
                                            <div className="mt-3 space-y-2 border-t pt-3">
                                                {source.stage1_records.map(record => {
                                                     const reliabilityInfo = getReliabilityInfo(record.reliability);
                                                    return(
                                                    <div key={record.id} className="p-3 bg-slate-50 rounded-lg border">
                                                        <div className="flex justify-between items-center text-sm mb-1.5">
                                                             <p className="font-semibold text-gray-800">{record.tech_name}</p>
                                                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}>
                                                                <reliabilityInfo.Icon className="w-3 h-3" />
                                                                {reliabilityInfo.text}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">{record.tech_description}</p>
                                                    </div>
                                                )})}
                                            </div>
                                        </div>
                                    )) : <p className="text-sm text-center text-gray-500 py-6">未找到相关的信源证据</p>}
                                </div>
                            </>
                        )}
                    </main>
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
                car_brand: filters.car_brand,
                tech_dimension: filters.tech_dimension,
                min_reliability: filters.min_reliability,
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
        setSelectedKbId(null); // Clear selection on filter change
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
    const toggleDimExpansion = (dim: string) => setExpandedDims(p => (p.has(dim) ? new Set([...p].filter(x => x !== dim)) : new Set([...p, dim])));

    return (
        <div className="h-full flex gap-6 p-6 bg-slate-50 text-gray-800">
            {/* Left Panel */}
            <div className="w-2/5 flex-shrink-0 flex flex-col h-full min-w-0">
                <header className="pb-4 space-y-4 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-800">竞争力看板</h1>
                        <button onClick={() => fetchData()} className="p-2 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {/* Filters */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                             <MultiSelectDropdown
                                label="汽车品牌"
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
                        </div>
                        <div className="relative">
                           <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索技术点..." className="w-full text-sm bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
                    {isLoading ? <div className="text-center py-20 text-gray-500">加载中...</div>
                    : error ? <div className="text-center py-20 text-red-500 bg-red-50 rounded-lg">{error}</div>
                    : Object.keys(groupedData).length === 0 ? <div className="text-center py-20 text-gray-500 bg-white rounded-lg border">没有找到符合条件的情报</div>
                    : Object.entries(groupedData).map(([dim, items]) => {
                        const Icon = techDimensionIcons[dim] || BrainIcon;
                        return (
                        <div key={dim} className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
                            <button onClick={() => toggleDimExpansion(dim)} className="w-full flex justify-between items-center p-4 hover:bg-gray-50/70 transition-colors">
                                <h2 className="font-bold text-base text-gray-900 flex items-center gap-3">
                                    <Icon className="w-5 h-5 text-gray-500" />
                                    {dim} ({items.length})
                                </h2>
                                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedDims.has(dim) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedDims.has(dim) && (
                                <div className="border-t border-gray-200/80 p-2 space-y-1">
                                    {items.map(item => {
                                        const reliabilityInfo = getReliabilityInfo(item.current_reliability_score);
                                        const isActive = selectedKbId === item.id;
                                        return (
                                            <div key={item.id} onClick={() => setSelectedKbId(item.id)} className={`group cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${isActive ? 'bg-blue-50 border-blue-500 shadow-md' : 'border-transparent hover:bg-slate-50'}`}>
                                                <div className="flex justify-between items-start">
                                                    <p className={`flex-1 font-semibold text-gray-800 text-sm truncate group-hover:text-blue-600 ${isActive && 'text-blue-700'}`}>{item.consolidated_tech_preview.name}</p>
                                                    <span className={`ml-2 flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}><reliabilityInfo.Icon className="w-3 h-3"/>{reliabilityInfo.text}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
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
            <main className="w-3/5 flex-shrink-0 h-full min-w-0">
                <DetailPanel kbId={selectedKbId} onClose={() => setSelectedKbId(null)} />
            </main>
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
        <div className="relative text-sm" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center bg-white border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <span className="text-gray-700 truncate">{label}: {selected.length ? selected.join(', ') : '全部'}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <div key={option} onClick={() => handleSelect(option)} className="flex items-center p-2 hover:bg-gray-100 cursor-pointer">
                            <input type="checkbox" checked={selected.includes(option)} readOnly className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-gray-700">{option}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
