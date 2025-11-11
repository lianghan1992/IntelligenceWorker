import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { KnowledgeBaseItem, KnowledgeBaseMeta, KnowledgeBaseDetail } from '../../types';
import { getKnowledgeBase, getKnowledgeBaseMeta, getKnowledgeBaseDetail, exportKnowledgeBase } from '../../api';
import { BrainIcon, ChevronDownIcon, CloseIcon, SearchIcon, DownloadIcon, ChevronUpDownIcon, ClockIcon, DocumentTextIcon, CheckIcon } from '../icons';

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

// --- Sub-Components ---
const DetailPanel: React.FC<{ kbId: number | null; onClose: () => void; }> = ({ kbId, onClose }) => {
    const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!kbId) return;
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
    
    return (
        <div className={`fixed inset-0 z-40 transition-all duration-300 ${kbId ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`} onClick={onClose}>
            <div 
                className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${kbId ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={e => e.stopPropagation()}
            >
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
                                {detail.consolidated_tech_details.map((item, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <p className="font-semibold text-blue-700">{item.name}</p>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <CheckIcon className="w-4 h-4 text-green-500" />
                                                <span className="font-medium">可靠度: {item.reliability}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                            <ClockIcon className="w-3.5 h-3.5" />
                                            <span>情报日期: {new Date(item.publish_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <h3 className="font-semibold text-gray-800 mt-6 mb-4">信源文章ID列表</h3>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-700 space-y-2">
                                {detail.source_article_ids.map(id => <p key={id} className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{id}</p>)}
                            </div>
                        </main>
                    </div>
                )}
                {isLoading && <div className="flex items-center justify-center h-full text-gray-500">正在加载详情...</div>}
                {error && <div className="flex items-center justify-center h-full text-red-500 p-6">{error}</div>}
            </div>
        </div>
    );
};

const SortableHeader: React.FC<{ column: string; label: string; sortConfig: { sort_by: string; order: 'asc' | 'desc' }; onSort: (column: string) => void; }> = ({ column, label, sortConfig, onSort }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort(column)}>
        <div className="flex items-center gap-1.5">
            {label}
            {sortConfig.sort_by === column 
                ? <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.order === 'asc' ? 'rotate-180' : ''}`} />
                : <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />
            }
        </div>
    </th>
);

export const CompetitivenessDashboard: React.FC = () => {
    const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
    const [meta, setMeta] = useState<KnowledgeBaseMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [filters, setFilters] = useState({
        car_brand: [] as string[],
        tech_dimension: '',
        sub_tech_dimension: '',
        min_reliability: 0,
        search: '',
    });
    const debouncedSearch = useDebounce(filters.search, 500);

    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
    const [sort, setSort] = useState<{ sort_by: string; order: 'asc' | 'desc' }>({ sort_by: 'last_updated_at', order: 'desc' });
    
    const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const queryParams = useMemo(() => {
        return {
            page: pagination.page,
            limit: pagination.limit,
            sort_by: sort.sort_by,
            order: sort.order,
            car_brand: filters.car_brand,
            tech_dimension: filters.tech_dimension || undefined,
            sub_tech_dimension: filters.sub_tech_dimension || undefined,
            min_reliability: filters.min_reliability > 0 ? filters.min_reliability : undefined,
            search: debouncedSearch || undefined,
        };
    }, [pagination, sort, filters, debouncedSearch]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
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
        getKnowledgeBaseMeta().then(setMeta).catch(() => setError('加载筛选元数据失败'));
    }, []);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        setPagination(p => ({...p, page: 1}));
    }, [filters, debouncedSearch, sort]);

    const handleSort = (column: string) => {
        setSort(prev => ({
            sort_by: column,
            order: prev.sort_by === column && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportKnowledgeBase({ ...queryParams, page: undefined, limit: undefined });
        } catch(err: any) {
            setError(err.message || '导出失败');
        } finally {
            setIsExporting(false);
        }
    }

    const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

    return (
        <>
            <div className="p-6 bg-gray-50/70 h-full overflow-y-auto flex flex-col">
                <header className="space-y-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-sm mb-6 sticky top-0 z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Car Brand Multi-Select */}
                        <div className="lg:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-1">汽车品牌</label>
                             <select multiple value={filters.car_brand} onChange={e => setFilters(f => ({...f, car_brand: Array.from(e.target.selectedOptions, o => o.value)}))} className="w-full h-24 bg-white border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {meta?.car_brands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        {/* Tech Dimension Selects */}
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">技术领域</label>
                             <select value={filters.tech_dimension} onChange={e => setFilters(f => ({...f, tech_dimension: e.target.value, sub_tech_dimension: ''}))} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3">
                                 <option value="">全部</option>
                                 {meta && Object.keys(meta.tech_dimensions).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">子领域</label>
                            <select value={filters.sub_tech_dimension} onChange={e => setFilters(f => ({...f, sub_tech_dimension: e.target.value}))} disabled={!filters.tech_dimension} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 disabled:bg-gray-100">
                                <option value="">全部</option>
                                {filters.tech_dimension && meta?.tech_dimensions[filters.tech_dimension]?.map(sd => <option key={sd} value={sd}>{sd}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="flex items-center gap-4 flex-wrap">
                        {/* Search Input */}
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} placeholder="在技术详情中搜索..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4" />
                        </div>
                        {/* Reliability Slider */}
                        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">可靠度 &ge;</label>
                            <input type="range" min="0" max="100" value={filters.min_reliability} onChange={e => setFilters(f => ({...f, min_reliability: Number(e.target.value)}))} className="w-32" />
                            <span className="font-semibold text-sm text-blue-600 w-8 text-center">{filters.min_reliability}</span>
                        </div>
                        <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-green-700 transition disabled:bg-green-300">
                            <DownloadIcon className="w-4 h-4"/>
                            <span>{isExporting ? '导出中...' : '导出 CSV'}</span>
                        </button>
                    </div>
                </header>
                
                <main className="flex-1 bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50/80 sticky top-0">
                                <tr>
                                    <SortableHeader column="car_brand" label="汽车品牌" sortConfig={sort} onSort={handleSort} />
                                    <th scope="col" className="px-6 py-3">技术领域</th>
                                    <th scope="col" className="px-6 py-3">关键技术点</th>
                                    <SortableHeader column="current_reliability_score" label="可靠度" sortConfig={sort} onSort={handleSort} />
                                    <th scope="col" className="px-6 py-3">信源数量</th>
                                    <SortableHeader column="last_updated_at" label="最后更新" sortConfig={sort} onSort={handleSort} />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-10">加载中...</td></tr>
                                ) : error ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-red-500">{error}</td></tr>
                                ) : kbItems.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10">未找到匹配的情报。</td></tr>
                                ) : kbItems.map(item => (
                                    <tr key={item.id} onClick={() => setSelectedKbId(item.id)} className="hover:bg-gray-50 cursor-pointer">
                                        <td className="px-6 py-4 font-semibold text-gray-900">{item.car_brand}</td>
                                        <td className="px-6 py-4">{item.tech_dimension} &gt; {item.sub_tech_dimension}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-800">{item.consolidated_tech_preview.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-xs">{item.consolidated_tech_preview.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-gray-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${item.current_reliability_score}%` }}></div></div>
                                                <span className="font-semibold text-blue-700">{item.current_reliability_score}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">{item.source_article_count}</td>
                                        <td className="px-6 py-4">{new Date(item.last_updated_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
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