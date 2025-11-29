
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
import { getArticleById } from '../../api/intelligence';
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
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${changeInfo.bg}`}>
                                                {changeInfo.text}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 uppercase tracking-wide border border-transparent ${rel.badge}`}>
                                                <rel.Icon className="w-3 h-3" /> {rel.text}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium font-mono">{new Date(record.event_time).toLocaleDateString()}</span>
                                    </div>
                                    <p className={`text-sm leading-relaxed transition-colors ${isSelected ? 'text-slate-800 font-medium' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                        {record.description_snapshot}
                                    </p>
                                    <div className="mt-3 pt-2 border-t border-slate-50 flex items-center text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRightIcon className="w-3 h-3 mr-1" /> 查看原始文章
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>
    );
};

// --- Main Component ---
export const CompetitivenessDashboard: React.FC = () => {
    const [items, setItems] = useState<TechItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [allBrands, setAllBrands] = useState<string[]>([]);
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [dimensions, setDimensions] = useState<CompetitivenessDimension[]>([]);

    // Detail Modal State
    const [selectedItem, setSelectedItem] = useState<TechItem | null>(null);
    const [selectedHistory, setSelectedHistory] = useState<TechItemHistory | null>(null);
    const [selectedSourceArticle, setSelectedSourceArticle] = useState<InfoItem | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [b, d] = await Promise.all([getBrands(), getDimensions()]);
                setAllBrands(b);
                setDimensions(d);
                
                // 设置默认选中品牌
                const defaults = ['小米汽车', '蔚来汽车', '理想汽车', '小鹏汽车'];
                // Filter to ensure only existing brands are selected (optional validation)
                const initialSelection = defaults.filter(db => b.includes(db) || b.some(apiB => apiB.includes(db.replace('汽车', ''))));
                // Fallback: If minimal matching, just use defaults assuming fuzzy match or use first 4
                if (initialSelection.length === 0 && b.length > 0) {
                     setSelectedBrands(b.slice(0, 4));
                } else {
                     // Using specific strings from the prompt, assuming API returns matching names or we add them.
                     // The API might return "小米" instead of "小米汽车". 
                     // Let's assume user wants these regardless, or we match closely.
                     // For now, just set what the user requested, the matrix handles filtering.
                     setSelectedBrands(defaults);
                }

                const techItems = await getTechItems({ limit: 1000 }); 
                setItems(techItems);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleItemClick = async (item: TechItem) => {
        try {
            const detail = await getTechItemDetail(item.id);
            setSelectedItem(detail);
            
            let initialHistory: TechItemHistory | null = null;
            if (detail.history && detail.history.length > 0) {
                const sorted = [...detail.history].sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
                initialHistory = sorted[0];
            }
            handleHistoryClick(initialHistory); 
            setIsDetailModalOpen(true);
        } catch (e) {
            console.error("Failed to load details");
        }
    };

    const handleHistoryClick = async (history: TechItemHistory | null) => {
        setSelectedHistory(history);
        if (history?.article_id) {
            try {
                const articleInfo = await getArticleById(history.article_id);
                setSelectedSourceArticle(articleInfo);
            } catch (e) {
                setSelectedSourceArticle(null);
            }
        } else {
            setSelectedSourceArticle(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Minimal Header with Filter */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 flex justify-between items-center flex-shrink-0 shadow-sm z-30">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Brand Filter */}
                    <div className="w-full md:w-auto">
                        <BrandMultiSelect 
                            allBrands={allBrands}
                            selectedBrands={selectedBrands}
                            onChange={setSelectedBrands}
                        />
                    </div>
                    
                    {/* Selected Tags Display */}
                    <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar max-w-2xl">
                        {selectedBrands.map(b => (
                            <span key={b} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200 whitespace-nowrap">
                                {b}
                                <button onClick={() => setSelectedBrands(selectedBrands.filter(sb => sb !== b))} className="hover:text-red-500">
                                    <CloseIcon className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
                
                <div className="text-xs text-slate-400 hidden md:block whitespace-nowrap">
                    共 {items.length} 条技术情报
                </div>
            </header>

            <main className="flex-1 overflow-hidden relative">
                <CompetitivenessMatrix 
                    items={items}
                    brands={selectedBrands} // Pass only selected brands
                    dimensions={dimensions}
                    onItemClick={handleItemClick}
                    isLoading={isLoading}
                />
            </main>

            {/* Detail Modal (Same as before) */}
            {isDetailModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in-0">
                    <div className="bg-white rounded-2xl w-full max-w-[95vw] h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50 flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                情报档案：{selectedItem.name}
                            </h3>
                            <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col md:flex-row min-h-0">
                            <div className="w-full md:w-[450px] border-r border-slate-200 bg-white flex-shrink-0 flex flex-col min-h-0">
                                <DossierPanel 
                                    item={selectedItem}
                                    selectedHistoryId={selectedHistory?.id || null}
                                    onSelectHistory={handleHistoryClick}
                                />
                            </div>
                            <div className="flex-1 bg-gray-50 flex flex-col min-h-0 hidden md:flex">
                                {selectedSourceArticle ? (
                                    <EvidenceTrail selectedArticle={selectedSourceArticle} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                                            <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <p className="font-bold text-slate-500">请选择左侧历史记录以查看原文</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
