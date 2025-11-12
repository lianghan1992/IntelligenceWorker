import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { KnowledgeBaseItem, KnowledgeBaseMeta, KnowledgeBaseDetail } from '../../types';
import { getKnowledgeBase, getKnowledgeBaseMeta, getKnowledgeBaseDetail, exportKnowledgeBase } from '../../api';
import { RefreshIcon, ChevronDownIcon, CloseIcon, SearchIcon, DownloadIcon, ChevronUpDownIcon, ClockIcon, DocumentTextIcon, CheckIcon, QuestionMarkCircleIcon, CheckCircleIcon } from '../icons';

// --- Custom Hooks ---
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};


// --- Helper Functions & Constants ---
const getReliabilityInfo = (score: number) => {
    switch (Math.round(score)) {
        case 4:
            return { text: '官方证实', color: 'green', Icon: CheckCircleIcon };
        case 3:
            return { text: '可信度高', color: 'blue', Icon: CheckIcon };
        case 2:
            return { text: '疑似传言', color: 'amber', Icon: QuestionMarkCircleIcon };
        case 1:
            return { text: '已经辟谣', color: 'red', Icon: CloseIcon };
        default:
            return { text: '未知', color: 'gray', Icon: QuestionMarkCircleIcon };
    }
};


// --- Sub-Components ---

const MultiSelectDropdown: React.FC<{
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder: string;
}> = ({ options, selected, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useClickOutside(dropdownRef, () => setIsOpen(false));

    const handleToggle = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-left flex justify-between items-center"
            >
                <span className="truncate">{selected.length > 0 ? `${placeholder} (${selected.length})` : placeholder}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <label key={option} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                onChange={() => handleToggle(option)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm text-gray-700">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const FilterPanel: React.FC<{
    meta: KnowledgeBaseMeta | null;
    filters: any;
    setFilters: React.Dispatch<React.SetStateAction<any>>;
    onExport: () => void;
    isExporting: boolean;
}> = ({ meta, filters, setFilters, onExport, isExporting }) => {

    const handleFilterChange = (key: string, value: any) => {
        const newFilters = { ...filters, [key]: value };
        // Reset sub-dimension if main dimension changes
        if (key === 'tech_dimension') {
            newFilters.sub_tech_dimension = '';
        }
        setFilters(newFilters);
    };

    const resetFilters = () => {
        setFilters({
            car_brand: [],
            tech_dimension: '',
            sub_tech_dimension: '',
            min_reliability: 1,
            search: '',
        });
    };
    
    const reliabilityInfo = getReliabilityInfo(filters.min_reliability);

    return (
        <header className="space-y-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-sm mb-6 sticky top-0 z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">汽车品牌</label>
                    <MultiSelectDropdown
                        options={meta?.car_brands || []}
                        selected={filters.car_brand}
                        onChange={value => handleFilterChange('car_brand', value)}
                        placeholder="选择品牌"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">技术领域</label>
                    <select value={filters.tech_dimension} onChange={e => handleFilterChange('tech_dimension', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">全部</option>
                        {meta && Object.keys(meta.tech_dimensions).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">子领域</label>
                    <select value={filters.sub_tech_dimension} onChange={e => handleFilterChange('sub_tech_dimension', e.target.value)} disabled={!filters.tech_dimension} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 disabled:bg-gray-100">
                        <option value="">全部</option>
                        {filters.tech_dimension && meta?.tech_dimensions[filters.tech_dimension]?.map(sd => <option key={sd} value={sd}>{sd}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                 <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} placeholder="在技术详情中搜索..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4" />
                </div>
                 <div className="flex items-center gap-4">
                    <div className="flex-grow">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">可靠度 &ge;</label>
                            <input type="range" min="1" max="4" value={filters.min_reliability} onChange={e => handleFilterChange('min_reliability', Number(e.target.value))} className="w-full cursor-pointer" />
                            <span className={`font-semibold text-sm w-24 text-center text-${reliabilityInfo.color}-600`}>{reliabilityInfo.text}</span>
                        </div>
                        <div className="w-full flex mt-1 h-1.5 rounded-full overflow-hidden">
                            <div className="w-1/4 bg-red-300"></div>
                            <div className="w-1/4 bg-amber-300"></div>
                            <div className="w-1/4 bg-blue-300"></div>
                            <div className="w-1/4 bg-green-300"></div>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                         <button onClick={resetFilters} className="px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                            重置
                        </button>
                        <button onClick={onExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-green-700 transition disabled:bg-green-300">
                            <DownloadIcon className="w-4 h-4" />
                            <span>{isExporting ? '导出中...' : '导出'}</span>
                        </button>
                    </div>
                 </div>
            </div>
        </header>
    );
};


const DetailPanel: React.FC<{ kbId: number | null; onClose: () => void; }> = ({ kbId, onClose }) => {
    const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (kbId === null) return;
        const fetchDetail = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await getKnowledgeBaseDetail(kbId);
                setDetail(data);
            } catch (err: any) {
                setError(err.message || '加载详情失败');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [kbId]);
    
    const badgeColors: { [key: string]: string } = {
        green: 'bg-green-100 text-green-800',
        blue: 'bg-blue-100 text-blue-800',
        amber: 'bg-amber-100 text-amber-800',
        red: 'bg-red-100 text-red-800',
        gray: 'bg-gray-100 text-gray-800'
    };
    
    return (
        <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${kbId !== null ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`} onClick={onClose}>
            <div 
                className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${kbId !== null ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={e => e.stopPropagation()}
            >
                {isLoading && <div className="flex items-center justify-center h-full text-gray-500">正在加载详情...</div>}
                {error && <div className="flex items-center justify-center h-full text-red-500 p-6">{error}</div>}
                {detail && (
                    <div className="flex flex-col h-full">
                        <header className="p-5 border-b flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{detail.car_brand}</h2>
                                <p className="text-sm text-gray-500 mt-1">{detail.tech_dimension} &gt; {detail.sub_tech_dimension}</p>
                            </div>
                            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><CloseIcon className="w-5 h-5" /></button>
                        </header>
                        <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800 mb-4">技术演进时间线</h3>
                            <div className="space-y-4">
                                {detail.consolidated_tech_details.map((item, index) => {
                                    const reliabilityInfo = getReliabilityInfo(item.reliability);
                                    return (
                                        <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <p className="font-semibold text-blue-700">{item.name}</p>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${badgeColors[reliabilityInfo.color]}`}>
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
                                    );
                                })}
                            </div>
                            <h3 className="font-semibold text-gray-800 mt-6 mb-4">信源文章ID列表</h3>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto">
                                {detail.source_article_ids.map(id => <p key={id} className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{id}</p>)}
                            </div>
                        </main>
                    </div>
                )}
            </div>
        </div>
    );
};

const SortableHeader: React.FC<{ column: string; label: string; sortConfig: { sort_by: string; order: 'asc' | 'desc' }; onSort: (column: string) => void; }> = ({ column, label, sortConfig, onSort }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer select-none" onClick={() => onSort(column)}>
        <div className="flex items-center gap-1.5">
            {label}
            {sortConfig.sort_by === column 
                ? <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.order === 'asc' ? 'rotate-180' : ''}`} />
                : <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />
            }
        </div>
    </th>
);

// --- Main Component ---
export const CompetitivenessDashboard: React.FC = () => {
    const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [filters, setFilters] = useState({
        car_brand: [] as string[],
        tech_dimension: '',
        sub_tech_dimension: '',
        min_reliability: 1,
        search: '',
    });
    const debouncedSearch = useDebounce(filters.search, 500);
    const debouncedReliability = useDebounce(filters.min_reliability, 500);

    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
    const [sort, setSort] = useState<{ sort_by: string; order: 'asc' | 'desc' }>({ sort_by: 'last_updated_at', order: 'desc' });
    
    const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    
    const isInitialMount = useRef(true);

    const queryParams = useMemo(() => {
        const params: any = {
            page: pagination.page,
            limit: pagination.limit,
            sort_by: sort.sort_by,
            order: sort.order,
        };
        if (filters.car_brand.length > 0) params.car_brand = filters.car_brand;
        if (filters.tech_dimension) params.tech_dimension = filters.tech_dimension;
        if (filters.sub_tech_dimension) params.sub_tech_dimension = filters.sub_tech_dimension;
        if (debouncedReliability > 1) params.min_reliability = debouncedReliability;
        if (debouncedSearch) params.search = debouncedSearch;
        return params;
    }, [pagination.page, pagination.limit, sort, filters.car_brand, filters.tech_dimension, filters.sub_tech_dimension, debouncedReliability, debouncedSearch]);

    const fetchData = useCallback(async (isInitial = false) => {
        if (!isInitial) setIsLoading(true);
        setError('');
        try {
            const response = await getKnowledgeBase(queryParams);
            setKbItems(response.items || []);
            setPagination(prev => ({ ...prev, total: response.total }));
        } catch (err: any) {
            setError(err.message || '加载知识库失败');
        } finally {
            setIsLoading(false);
        }
    }, [queryParams]);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                await getKnowledgeBaseMeta().then(setMeta);
                await fetchData(true);
            } catch (err: any) {
                setError(err.message || '初始化加载失败');
            } finally {
                 setIsLoading(false);
            }
        };
        loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        setPagination(p => ({...p, page: 1}));
    }, [debouncedSearch, filters.car_brand, filters.tech_dimension, filters.sub_tech_dimension, debouncedReliability, sort]);

    useEffect(() => {
        if (!isInitialMount.current) {
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryParams]);

    const groupedData = useMemo(() => {
        return kbItems.reduce((acc, item) => {
            const { tech_dimension, sub_tech_dimension } = item;
            if (!acc[tech_dimension]) {
                acc[tech_dimension] = {};
            }
            if (!acc[tech_dimension][sub_tech_dimension]) {
                acc[tech_dimension][sub_tech_dimension] = [];
            }
            acc[tech_dimension][sub_tech_dimension].push(item);
            return acc;
        }, {} as Record<string, Record<string, KnowledgeBaseItem[]>>);
    }, [kbItems]);


    const handleSort = (column: string) => {
        setSort(prev => ({
            sort_by: column,
            order: prev.sort_by === column && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        setError('');
        try {
            await exportKnowledgeBase({ ...queryParams, page: undefined, limit: undefined });
        } catch(err: any) {
            setError(err.message || '导出失败');
        } finally {
            setIsExporting(false);
        }
    }

    const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
    
    const badgeColors: { [key: string]: string } = {
        green: 'bg-green-100 text-green-800',
        blue: 'bg-blue-100 text-blue-800',
        amber: 'bg-amber-100 text-amber-800',
        red: 'bg-red-100 text-red-800',
        gray: 'bg-gray-100 text-gray-800',
    };

    return (
        <>
            <div className="p-4 sm:p-6 bg-gray-50/70 h-full overflow-y-auto flex flex-col">
                <FilterPanel 
                    meta={meta}
                    filters={filters}
                    setFilters={setFilters}
                    onExport={handleExport}
                    isExporting={isExporting}
                />
                
                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

                <main className="flex-1 bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50/80 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-4 py-3 w-40">技术领域</th>
                                    <th scope="col" className="px-4 py-3 w-40">子领域</th>
                                    <th scope="col" className="px-4 py-3 w-48">涉及品牌</th>
                                    <th scope="col" className="px-4 py-3">技术点详情</th>
                                    <th scope="col" className="px-4 py-3 w-28 text-center">信源总数</th>
                                    <SortableHeader column="last_updated_at" label="最后更新" sortConfig={sort} onSort={handleSort} />
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">加载中...</td></tr>
                                ) : Object.keys(groupedData).length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">未找到匹配的情报。</td></tr>
                                ) : (
                                    Object.entries(groupedData).flatMap(([primaryDim, secondaryDims]) => {
                                        const primaryDimRowCount = Object.keys(secondaryDims).length;
                                        let isFirstRowOfPrimary = true;

                                        return Object.entries(secondaryDims).map(([secondaryDim, items]) => {
                                            const uniqueBrands = [...new Set(items.map(item => item.car_brand))];
                                            const totalSources = items.reduce((sum, item) => sum + item.source_article_count, 0);
                                            const lastUpdated = new Date(Math.max(...items.map(item => new Date(item.last_updated_at).getTime())));
                                            
                                            const rowContent = (
                                                <tr key={`${primaryDim}-${secondaryDim}`} className="border-t border-gray-200">
                                                    {isFirstRowOfPrimary && (
                                                        <td rowSpan={primaryDimRowCount} className="px-4 py-4 font-bold text-gray-800 align-top bg-gray-50/70 border-r border-gray-200">
                                                            {primaryDim}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-4 font-semibold text-gray-700 align-top border-r border-gray-200">{secondaryDim}</td>
                                                    <td className="px-4 py-4 align-top border-r border-gray-200">
                                                        <div className="flex flex-wrap gap-1">
                                                            {uniqueBrands.map(brand => (
                                                                <span key={brand} className="px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">{brand}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top border-r border-gray-200">
                                                        <div className="space-y-2">
                                                            {items.map(item => {
                                                                const reliabilityInfo = getReliabilityInfo(item.current_reliability_score);
                                                                return (
                                                                    <div key={item.id} onClick={() => setSelectedKbId(item.id)} className="p-2 rounded-lg hover:bg-blue-50/50 cursor-pointer border border-transparent hover:border-blue-200 transition-all">
                                                                        <div className="flex justify-between items-start">
                                                                            <p className="font-semibold text-gray-800 pr-2">{item.consolidated_tech_preview.name}</p>
                                                                            <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${badgeColors[reliabilityInfo.color]}`}>
                                                                                <reliabilityInfo.Icon className="w-3 h-3" />
                                                                                {reliabilityInfo.text}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 mt-1">{item.consolidated_tech_preview.description}</p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center align-top font-medium text-gray-800 border-r border-gray-200">{totalSources}</td>
                                                    <td className="px-4 py-4 align-top">{lastUpdated.toLocaleDateString()}</td>
                                                </tr>
                                            );
                                            isFirstRowOfPrimary = false;
                                            return rowContent;
                                        });
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                     {pagination.total > 0 && !isLoading && (
                        <div className="flex-shrink-0 p-3 border-t flex justify-between items-center text-sm">
                            <span className="text-gray-600">共 {pagination.total} 条</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                                <span>第 {pagination.page} / {totalPages} 页</span>
                                <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page >= totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            <DetailPanel kbId={selectedKbId} onClose={() => setSelectedKbId(null)} />
        </>
    );
};