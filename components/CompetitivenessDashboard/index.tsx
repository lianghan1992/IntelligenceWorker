import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KnowledgeBaseItem, KnowledgeBaseDetail, SearchResult } from '../../types';
import { getKnowledgeBase, getKnowledgeBaseDetail } from '../../api/competitiveness';
import { searchArticlesFiltered } from '../../api/intelligence';
import { 
    RefreshIcon, ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, UsersIcon, LightBulbIcon, TrendingUpIcon, EyeIcon, ClockIcon, ArrowRightIcon
} from '../icons';

// --- Helper Functions & Constants ---
const getReliabilityInfo = (score: number) => {
    const roundedScore = Math.floor(score); // Use floor to be conservative
    if (roundedScore >= 4) return { text: '官方证实', color: 'green', Icon: CheckCircleIcon };
    if (roundedScore === 3) return { text: '可信度高', color: 'blue', Icon: CheckCircleIcon };
    if (roundedScore === 2) return { text: '疑似传言', color: 'amber', Icon: DocumentTextIcon };
    if (roundedScore <= 1) return { text: '已经辟谣', color: 'red', Icon: CloseIcon };
    return { text: '未知', color: 'gray', Icon: DocumentTextIcon };
};

const techDimensionIcons: { [key: string]: React.FC<any> } = {
    '智能驾驶': BrainIcon, '智能座舱': UsersIcon, '智能网联': EyeIcon,
    '智能底盘': TrendingUpIcon, '智能动力': LightBulbIcon, '智能车身': CheckCircleIcon,
    '轻量化': BrainIcon, '极致能耗': LightBulbIcon, 'AI技术': BrainIcon,
    // FIX: Removed duplicate key '智能动力' to resolve object literal error.
    '智能安全': CheckCircleIcon, '智能车灯': EyeIcon,
};


// --- Sub-Component: DetailPanel ---
const DetailPanel: React.FC<{ kbId: number | null; onClose: () => void; }> = ({ kbId, onClose }) => {
    const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
    const [articles, setArticles] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const contentRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (kbId === null) {
            setDetail(null);
            setArticles([]);
            return;
        }
        const fetchDetail = async () => {
            setIsLoading(true);
            setError('');
            if (contentRef.current) contentRef.current.scrollTop = 0;

            try {
                const data = await getKnowledgeBaseDetail(kbId);
                setDetail(data);
                if (data.source_article_ids && data.source_article_ids.length > 0) {
                    const articlesResponse = await searchArticlesFiltered({ 
                        article_ids: data.source_article_ids,
                        query_text: '*', // Add query_text to prevent 422 error
                        limit: data.source_article_ids.length // Limit to the number of IDs
                    });
                    setArticles(articlesResponse.items || []);
                } else {
                    setArticles([]);
                }
            } catch (err: any) {
                setError(err.message || '加载详情失败');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
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
                                <h3 className="font-semibold text-gray-800 text-lg mt-8 mb-4">信源文章列表</h3>
                                <div className="bg-white p-2 rounded-xl border border-gray-200 text-sm text-gray-700 space-y-1">
                                    {articles.length > 0 ? articles.map(article => (
                                        <a href={article.original_url} target="_blank" rel="noopener noreferrer" key={article.id} className="block p-3 hover:bg-slate-100 rounded-lg transition-colors">
                                            <p className="font-semibold text-blue-600 truncate">{article.title}</p>
                                            <p className="text-xs text-slate-500 mt-1">{article.source_name} - {new Date(article.publish_date || article.created_at).toLocaleDateString()}</p>
                                        </a>
                                    )) : <p className="text-sm text-center text-gray-500 py-6">无关联信源文章</p>}
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
    const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0 });
    const [selectedKbId, setSelectedKbId] = useState<number | null>(null);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError('');
        try {
            const response = await getKnowledgeBase({
                page: pagination.page,
                limit: pagination.limit,
                sort_by: 'last_updated_at',
                order: 'desc',
            });
            setKbItems(response.items || []);
            setPagination(prev => ({ ...prev, total: response.total }));
        } catch (err: any) {
            setError(err.message || '加载知识库失败');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [pagination.page, pagination.limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const groupedData = useMemo(() => {
        return kbItems.reduce((acc, item) => {
            const { car_brand, tech_dimension } = item;
            if (!acc[car_brand]) acc[car_brand] = {};
            if (!acc[car_brand][tech_dimension]) acc[car_brand][tech_dimension] = [];
            acc[car_brand][tech_dimension].push(item);
            return acc;
        }, {} as Record<string, Record<string, KnowledgeBaseItem[]>>);
    }, [kbItems]);
    
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (Object.keys(groupedData).length > 0 && expandedBrands.size === 0) {
            setExpandedBrands(new Set(Object.keys(groupedData)));
        }
    }, [groupedData, expandedBrands.size]);

    const toggleBrandExpansion = (brand: string) => {
        setExpandedBrands(prev => {
            const newSet = new Set(prev);
            if (newSet.has(brand)) newSet.delete(brand); else newSet.add(brand);
            return newSet;
        });
    };
    
    return (
        <div className="h-full flex gap-6 p-6 bg-slate-50 text-gray-800">
            {/* Left Panel */}
            <div className="w-2/5 flex-shrink-0 flex flex-col h-full min-w-0">
                <header className="pb-4 flex justify-between items-center flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-800">竞争力看板</h1>
                    <button onClick={() => fetchData()} className="p-2 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
                    {isLoading ? <div className="text-center py-20 text-gray-500">加载中...</div>
                    : error ? <div className="text-center py-20 text-red-500 bg-red-50 rounded-lg">{error}</div>
                    : Object.keys(groupedData).length === 0 ? <div className="text-center py-20 text-gray-500 bg-white rounded-lg border">无数据</div>
                    : Object.entries(groupedData).map(([brand, dims]) => (
                        <div key={brand} className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
                            <button onClick={() => toggleBrandExpansion(brand)} className="w-full flex justify-between items-center p-4 hover:bg-gray-50/70 transition-colors">
                                <h2 className="font-bold text-lg text-gray-900 flex items-center gap-3">
                                    <img src={`https://via.placeholder.com/24x24/eee/222?text=${brand.charAt(0)}`} alt={brand} className="rounded-full"/>
                                    {brand}
                                </h2>
                                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedBrands.has(brand) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedBrands.has(brand) && (
                                <div className="border-t border-gray-200/80 p-4 space-y-4">
                                    {Object.entries(dims).map(([dim, items]) => {
                                        const Icon = techDimensionIcons[dim] || BrainIcon;
                                        return (
                                            <div key={dim} className="flex items-start">
                                                <div className="w-36 flex-shrink-0 flex items-center gap-2 pt-3.5">
                                                    <Icon className="w-5 h-5 text-gray-500" />
                                                    <h3 className="font-semibold text-gray-600 text-sm">{dim}</h3>
                                                </div>
                                                <div className="flex-grow grid grid-cols-2 gap-2">
                                                    {items.map(item => {
                                                        const reliabilityInfo = getReliabilityInfo(item.current_reliability_score);
                                                        const isActive = selectedKbId === item.id;
                                                        return (
                                                            <div key={item.id} onClick={() => setSelectedKbId(item.id)} className={`group cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${isActive ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-slate-50 border-slate-200/80 hover:shadow-sm hover:border-blue-300'}`}>
                                                                <p className="font-medium text-slate-500 text-xs">{item.sub_tech_dimension}</p>
                                                                <p className={`font-semibold text-gray-800 text-sm truncate mt-0.5 group-hover:text-blue-600 ${isActive && 'text-blue-700'}`}>{item.consolidated_tech_preview.name}</p>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <span className="text-gray-400 flex items-center gap-1 text-xs"><DocumentTextIcon className="w-3 h-3"/>{item.source_article_count}</span>
                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 bg-${reliabilityInfo.color}-100 text-${reliabilityInfo.color}-800`}><reliabilityInfo.Icon className="w-3 h-3"/>{reliabilityInfo.text}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {/* Right Panel */}
            <main className="w-3/5 flex-shrink-0 h-full min-w-0">
                <DetailPanel kbId={selectedKbId} onClose={() => setSelectedKbId(null)} />
            </main>
        </div>
    );
};