
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    TechItem,
    TechItemHistory,
    InfoItem,
    CompetitivenessDimension
} from '../../types';
import { 
    getTechItems, 
    getTechItemDetail,
    getBrands,
    getDimensions
} from '../../api/competitiveness';
import { getArticleById } from '../../api';
import { 
    ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, ClockIcon, 
    SparklesIcon, ChartIcon, ChevronRightIcon, QuestionMarkCircleIcon,
    PlusIcon, PencilIcon, AnnotationIcon, ShieldCheckIcon, ShieldExclamationIcon,
    ArrowRightIcon, CheckIcon, FunnelIcon
} from '../icons';
import { EvidenceTrail } from '../StrategicCockpit/EvidenceTrail';
import { CompetitivenessMatrix } from './CompetitivenessMatrix';

// --- Helper Functions ---
const getReliabilityInfo = (score: number) => {
    switch (score) {
        case 4: return { text: '官方证实', color: 'green', Icon: CheckCircleIcon, bg: 'bg-green-50', textCol: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800' };
        case 3: return { text: '可信度高', color: 'blue', Icon: ShieldCheckIcon, bg: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' };
        case 2: return { text: '疑似传闻', color: 'amber', Icon: AnnotationIcon, bg: 'bg-amber-50', textCol: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' };
        case 1: return { text: '已经辟谣', color: 'red', Icon: ShieldExclamationIcon, bg: 'bg-red-50', textCol: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800' };
        default: return { text: '未知', color: 'gray', Icon: QuestionMarkCircleIcon, bg: 'bg-gray-50', textCol: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-800' };
    }
};

const getChangeTypeInfo = (type: string) => {
    switch (type) {
        case 'Create': return { text: '首次披露', bg: 'bg-green-100 text-green-700' };
        case 'Update': return { text: '参数更新', bg: 'bg-blue-100 text-blue-700' };
        case 'Corroborate': return { text: '佐证/确认', bg: 'bg-indigo-100 text-indigo-700' };
        default: return { text: type, bg: 'bg-gray-100 text-gray-700' };
    }
};

// --- Custom Multi-Select Component for Brands ---
const BrandMultiSelect: React.FC<{
    allBrands: string[];
    selectedBrands: string[];
    onChange: (brands: string[]) => void;
}> = ({ allBrands, selectedBrands, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleBrand = (brand: string) => {
        if (selectedBrands.includes(brand)) {
            onChange(selectedBrands.filter(b => b !== brand));
        } else {
            onChange([...selectedBrands, brand]);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full md:w-auto gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-all text-sm font-medium text-slate-700 shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <FunnelIcon className="w-4 h-4 text-indigo-500" />
                    <span className="truncate">对比 ({selectedBrands.length})</span>
                </div>
                <ChevronDownIcon className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1">
                        {allBrands.map(brand => {
                            const isSelected = selectedBrands.includes(brand);
                            return (
                                <div 
                                    key={brand}
                                    onClick={() => toggleBrand(brand)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    <span>{brand}</span>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-indigo-600" />}
                                </div>
                            );
                        })}
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between px-2">
                        <button 
                            onClick={() => onChange([])}
                            className="text-xs text-slate-400 hover:text-slate-600"
                        >
                            清除
                        </button>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-indigo-600 font-bold hover:text-indigo-800"
                        >
                            确定
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Component: DossierPanel (Detail View) ---
const DossierPanel: React.FC<{ 
    item: TechItem; 
    selectedHistoryId: string | null;
    onSelectHistory: (history: TechItemHistory) => void;
}> = ({ item, selectedHistoryId, onSelectHistory }) => {
    
    const sortedHistory = useMemo(() => {
        if (!item.history) return [];
        return [...item.history].sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
    }, [item.history]);

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar bg-white">
            <header>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                     <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-600">{item.vehicle_brand}</span>
                     <ChevronRightIcon className="w-3 h-3" />
                     <span>{item.tech_dimension}</span>
                     <ChevronRightIcon className="w-3 h-3" />
                     <span className="text-slate-600">{item.secondary_tech_dimension}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{item.name}</h2>
            </header>
            
            {/* Golden Record Summary */}
            <div className="bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <BrainIcon className="w-24 h-24 text-indigo-600" />
                </div>
                <h3 className="font-bold text-indigo-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                    <SparklesIcon className="w-4 h-4 text-indigo-500" /> 
                    最新情报汇总 (Golden Record)
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed text-justify relative z-10">{item.description}</p>
                <div className="mt-6 flex items-center gap-4 text-xs text-slate-400 relative z-10 border-t border-indigo-100 pt-4">
                    <span className="flex items-center gap-1">
                        <DocumentTextIcon className="w-3.5 h-3.5"/> 
                        {item.history?.length || 0} 次变更记录
                    </span>
                    <span>•</span>
                    <span>最新更新: {new Date(item.updated_at).toLocaleDateString()}</span>
                </div>
            </div>
            
            {/* Timeline */}
            <div>
                 <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-slate-400" />
                    情报演进时间轴
                 </h3>
                 <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                    {sortedHistory.map((record) => {
                        const isSelected = selectedHistoryId === record.id;
                        const rel = getReliabilityInfo(record.reliability_snapshot);
                        const changeInfo = getChangeTypeInfo(record.change_type);

                        return (
                            <div key={record.id} className="relative pl-8">
                                <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all duration-300 ${isSelected ? 'bg-blue-600 scale-125 ring-4 ring-blue-100' : 'bg-slate-300'}`}></div>
                                <div 
                                    onClick={() => onSelectHistory(record)}
                                    className={`group cursor-pointer p-5 rounded-2xl border transition-all duration-300 ${
                                        isSelected 
                                            ? 'bg-white border-blue-500 shadow-lg shadow-blue-500/10 translate-x-2' 
                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${changeInfo.bg}`}>{changeInfo.text}</span>
                                            <span className="text-xs text-slate-400 font-mono">{new Date(record.event_time).toLocaleDateString()}</span>
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs font-bold ${rel.textCol}`}>
                                            <rel.Icon className="w-3.5 h-3.5" />
                                            {rel.text}
                                        </div>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${isSelected ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-700'}`}>
                                        {record.description_snapshot}
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

export const CompetitivenessDashboard: React.FC = () => {
    const [viewMode, setViewMode] = useState<'matrix' | 'dossier'>('matrix');
    const [selectedItem, setSelectedItem] = useState<TechItem | null>(null);
    const [selectedHistory, setSelectedHistory] = useState<TechItemHistory | null>(null);
    const [articleDetail, setArticleDetail] = useState<InfoItem | null>(null);
    
    // Data States
    const [items, setItems] = useState<TechItem[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [dimensions, setDimensions] = useState<CompetitivenessDimension[]>([]);
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingBrands, setLoadingBrands] = useState<Set<string>>(new Set());

    // Load Metadata and set defaults
    useEffect(() => {
        Promise.all([getBrands(), getDimensions()]).then(([b, d]) => {
            setBrands(b);
            setDimensions(d);
            
            // Calculate default number of brands based on screen width
            const width = window.innerWidth;
            let count = 4;
            if (width >= 1920) count = 6;
            else if (width >= 1536) count = 5; // 2XL
            else if (width >= 1280) count = 4; // XL
            else if (width >= 1024) count = 3; // LG
            else if (width >= 768) count = 2;  // MD
            else count = 2; // SM/Mobile (horizontal scroll)

            // Default select top N brands
            setSelectedBrands(b.slice(0, count));
        });
    }, []);

    // Load Matrix Data (Dynamic/Concurrent Fetch)
    useEffect(() => {
        if (selectedBrands.length === 0) {
            setItems([]);
            setLoadingBrands(new Set());
            setIsLoading(false);
            return;
        }
        
        let active = true;
        setItems([]); // Clear previous data
        setIsLoading(false); // Disable global loading to show grid immediately
        setLoadingBrands(new Set(selectedBrands)); // Mark all as loading

        const fetchBrandData = async (brand: string) => {
            try {
                // Fetch all items for this brand (use limit to ensure comprehensive set)
                // Assuming 150 items covers most cases for dashboard view
                const data = await getTechItems({ vehicle_brand: brand, limit: 150 });
                if (active) {
                    setItems(prev => [...prev, ...data.items]);
                }
            } catch (error) {
                console.error(`Failed to load matrix data for ${brand}`, error);
            } finally {
                if (active) {
                    setLoadingBrands(prev => {
                        const next = new Set(prev);
                        next.delete(brand);
                        return next;
                    });
                }
            }
        };

        // Trigger fetches in parallel
        selectedBrands.forEach(brand => fetchBrandData(brand));

        return () => { active = false; };
    }, [selectedBrands]);

    const handleItemClick = async (item: TechItem) => {
        try {
            // Fetch full detail with history
            const detailedItem = await getTechItemDetail(item.id);
            setSelectedItem(detailedItem);
            
            // Default select latest history
            if (detailedItem.history && detailedItem.history.length > 0) {
                // Sort to find latest
                const latest = [...detailedItem.history].sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())[0];
                handleHistorySelect(latest);
            }
            
            setViewMode('dossier');
        } catch (e) {
            console.error("Failed to load details", e);
        }
    };

    const handleHistorySelect = async (history: TechItemHistory) => {
        setSelectedHistory(history);
        if (history.article_id) {
            try {
                const article = await getArticleById(history.article_id);
                setArticleDetail(article);
            } catch (e) {
                console.error("Failed to load evidence article", e);
                setArticleDetail(null);
            }
        } else {
            setArticleDetail(null);
        }
    };

    const handleBackToMatrix = () => {
        setViewMode('matrix');
        setSelectedItem(null);
        setSelectedHistory(null);
        setArticleDetail(null);
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    {viewMode === 'dossier' && (
                        <button 
                            onClick={handleBackToMatrix}
                            className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowRightIcon className="w-5 h-5 rotate-180" />
                        </button>
                    )}
                    <h1 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <ChartIcon className="w-6 h-6 text-indigo-600" />
                        {viewMode === 'matrix' ? '竞争力全景矩阵' : '技术情报档案'}
                    </h1>
                </div>

                {viewMode === 'matrix' && (
                    <div className="flex items-center gap-4">
                        <BrandMultiSelect 
                            allBrands={brands} 
                            selectedBrands={selectedBrands} 
                            onChange={setSelectedBrands} 
                        />
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'matrix' ? (
                    <CompetitivenessMatrix 
                        items={items}
                        brands={selectedBrands}
                        dimensions={dimensions}
                        onItemClick={handleItemClick}
                        isLoading={isLoading}
                        loadingBrands={loadingBrands}
                    />
                ) : (
                    <div className="h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        {/* Left: Dossier & Timeline */}
                        <div className="flex-1 min-w-0 md:w-1/2 lg:w-5/12 h-1/2 md:h-full overflow-hidden bg-white">
                            {selectedItem && (
                                <DossierPanel 
                                    item={selectedItem} 
                                    selectedHistoryId={selectedHistory?.id || null}
                                    onSelectHistory={handleHistorySelect}
                                />
                            )}
                        </div>

                        {/* Right: Evidence Viewer */}
                        <div className="flex-1 min-w-0 md:w-1/2 lg:w-7/12 h-1/2 md:h-full bg-slate-50 relative overflow-hidden">
                            {articleDetail ? (
                                <EvidenceTrail selectedArticle={articleDetail} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                    <DocumentTextIcon className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-sm font-medium">请在左侧时间轴选择一条记录以查看佐证材料</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
