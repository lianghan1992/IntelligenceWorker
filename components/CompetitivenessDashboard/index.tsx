
import React, { useState, useMemo, useEffect } from 'react';
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
import { 
    ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, ClockIcon, SearchIcon, 
    ShieldExclamationIcon, ShieldCheckIcon, AnnotationIcon, QuestionMarkCircleIcon,
    ChartIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, ViewGridIcon,
    ArrowRightIcon
} from '../icons';
import { EvidenceTrail } from '../StrategicCockpit/EvidenceTrail';

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

// --- Component: DossierPanel (Detail View) ---
const DossierPanel: React.FC<{ 
    item: TechItem; 
    selectedHistoryId: string | null;
    onSelectHistory: (history: TechItemHistory) => void;
}> = ({ item, selectedHistoryId, onSelectHistory }) => {
    
    // Sort history by event time desc
    const sortedHistory = useMemo(() => {
        if (!item.history) return [];
        return [...item.history].sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
    }, [item.history]);

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
                                        <ArrowRightIcon className="w-3 h-3 mr-1" /> 点击查看原始文章
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

// --- Component: IntelligenceMatrix (Main List) ---
const IntelligenceMatrix: React.FC = () => {
    const [items, setItems] = useState<TechItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({ brand: '', dimension: '' });
    
    // Metadata for filters
    const [brands, setBrands] = useState<string[]>([]);
    const [dimensions, setDimensions] = useState<CompetitivenessDimension[]>([]);

    // Detail View State
    const [selectedItem, setSelectedItem] = useState<TechItem | null>(null);
    const [selectedHistory, setSelectedHistory] = useState<TechItemHistory | null>(null);

    useEffect(() => {
        getBrands().then(setBrands);
        getDimensions().then(setDimensions);
    }, []);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const res = await getTechItems({
                vehicle_brand: filters.brand || undefined,
                tech_dimension: filters.dimension || undefined,
                limit: 50
            });
            setItems(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [filters]);

    const handleItemClick = async (item: TechItem) => {
        try {
            // Fetch full detail with history
            const detail = await getTechItemDetail(item.id);
            setSelectedItem(detail);
            
            // Auto select latest history item
            if (detail.history && detail.history.length > 0) {
                // Sort by time desc
                const sorted = [...detail.history].sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
                setSelectedHistory(sorted[0]);
            } else {
                setSelectedHistory(null);
            }
        } catch (e) {
            console.error("Failed to load details");
        }
    };

    // Construct a pseudo InfoItem for EvidenceTrail based on selected history
    const articleForEvidence = useMemo((): InfoItem | null => {
        if (!selectedHistory) return null;
        return {
            id: selectedHistory.article_id,
            title: '技术情报来源文章', // Metadata not available in this API, use placeholder
            content: '', // EvidenceTrail will fetch HTML content
            original_url: '#', // Not available in this API response
            source_name: '原始信源',
            point_name: '技术追踪',
            point_id: '',
            publish_date: selectedHistory.event_time,
            created_at: selectedHistory.event_time
        };
    }, [selectedHistory]);

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Filter Bar */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3 shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-bold mr-2">
                    <FunnelIcon className="w-4 h-4" />
                    <span>筛选</span>
                </div>
                
                <select 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 min-w-[140px]"
                    value={filters.brand}
                    onChange={e => setFilters({...filters, brand: e.target.value})}
                >
                    <option value="">所有品牌</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                <select 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 min-w-[140px]"
                    value={filters.dimension}
                    onChange={e => setFilters({...filters, dimension: e.target.value})}
                >
                    <option value="">所有技术维度</option>
                    {dimensions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
            </div>

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* List View */}
                <div className={`flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white transition-all duration-500 ease-in-out ${selectedItem ? 'hidden lg:flex lg:max-w-[450px]' : ''}`}>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {isLoading ? (
                             <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                                 <span className="text-sm text-slate-500">正在检索情报库...</span>
                             </div>
                        ) : items.length === 0 ? (
                            <div className="text-center text-slate-400 py-20">
                                <ViewGridIcon className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                <p>暂无符合条件的情报</p>
                            </div>
                        ) : (
                            items.map(item => {
                                const relConf = getReliabilityInfo(item.reliability);
                                const isSelected = selectedItem?.id === item.id;

                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => handleItemClick(item)}
                                        className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                                            isSelected 
                                                ? 'border-indigo-500 bg-indigo-50/30 shadow-md ring-1 ring-indigo-500/20' 
                                                : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>}
                                        
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${relConf.badge} border-transparent`}>
                                                    <relConf.Icon className="w-3 h-3 mr-1" />
                                                    {relConf.text}
                                                </span>
                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{item.vehicle_brand} {item.vehicle_model}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(item.updated_at).toLocaleDateString()}</span>
                                        </div>
                                        
                                        <h3 className={`text-base font-bold mb-2 line-clamp-1 transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-700'}`}>
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{item.description}</p>
                                        
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-1">
                                                <span>{item.tech_dimension}</span>
                                                <ChevronRightIcon className="w-2.5 h-2.5"/>
                                                <span className="font-semibold text-slate-600">{item.secondary_tech_dimension}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Detail View */}
                {selectedItem ? (
                    <div className="flex-[3] flex flex-col min-w-0 bg-slate-50 overflow-hidden relative animate-in slide-in-from-right-8 duration-500">
                        {/* Mobile Close Button */}
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="lg:hidden absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg z-50 text-slate-500 hover:text-slate-800 border border-slate-100"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>

                        <div className="flex-1 flex flex-col md:flex-row h-full">
                            {/* Middle: Timeline & Dossier */}
                            <div className="flex-1 flex flex-col border-r border-slate-200 bg-white min-w-[320px] md:max-w-[400px]">
                                <DossierPanel 
                                    item={selectedItem}
                                    selectedHistoryId={selectedHistory?.id || null}
                                    onSelectHistory={setSelectedHistory}
                                />
                            </div>
                            
                            {/* Right: Article Viewer */}
                            <div className="flex-[1.5] bg-white flex flex-col h-full overflow-hidden">
                                {articleForEvidence ? (
                                    <EvidenceTrail selectedArticle={articleForEvidence} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8 bg-slate-50/50">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                                            <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <p className="font-bold text-slate-500">暂无信源预览</p>
                                        <p className="text-sm mt-2 max-w-xs mx-auto">点击左侧时间轴中的卡片以查看原始文章详情。</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-[3] hidden lg:flex flex-col items-center justify-center bg-slate-50/50 text-slate-400 border-l border-slate-200/50">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                            <ViewGridIcon className="w-16 h-16 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600">选择一项情报以查看详情</h3>
                        <p className="text-sm mt-3 text-slate-500 max-w-sm text-center">
                            我们将为您展示该技术点的 <span className="text-indigo-500 font-semibold">全生命周期演进时间轴</span> 以及 <span className="text-indigo-500 font-semibold">原始证据链</span>。
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---
export const CompetitivenessDashboard: React.FC = () => {
    return (
        <div className="h-full flex flex-col bg-slate-100">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-sm z-20">
                <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-md shadow-indigo-200">
                        <ChartIcon className="w-5 h-5 text-white" />
                    </div>
                    竞争力看板 
                    <span className="text-[10px] font-bold text-indigo-600 ml-2 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wide">
                        COMPETITIVENESS INSIGHTS
                    </span>
                </h1>
            </header>

            <main className="flex-1 overflow-hidden relative">
                <IntelligenceMatrix />
            </main>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
            `}</style>
        </div>
    );
};
