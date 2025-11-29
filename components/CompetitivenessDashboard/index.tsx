
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
    ChevronDownIcon, CloseIcon, DocumentTextIcon, CheckCircleIcon, BrainIcon, ClockIcon, SearchIcon, 
    ShieldExclamationIcon, ShieldCheckIcon, AnnotationIcon, QuestionMarkCircleIcon,
    ChartIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, ViewGridIcon,
    ArrowRightIcon, ViewListIcon, TableCellsIcon, EyeIcon, GlobeIcon, CubeIcon
} from '../icons';
import { EvidenceTrail } from '../StrategicCockpit/EvidenceTrail';
import { CompetitivenessMatrix } from './CompetitivenessMatrix';
import { CyberTerrainView, HolographicTwinView, SupplyGalaxyView } from './ThreeDViews';

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
                                            ? 'bg-blue-50/50 border-blue-200 shadow-md ring-1 ring-blue-100' 
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
                                    <p className={`text-sm leading-relaxed transition-colors ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                                        {record.description_snapshot}
                                    </p>
                                    
                                    {/* Explicit Action Button */}
                                    <div className="mt-4 flex justify-end">
                                        <button className={`
                                            flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all
                                            ${isSelected 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}
                                        `}>
                                            <EyeIcon className="w-3.5 h-3.5" />
                                            查看原文
                                        </button>
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
type ViewMode = 'matrix' | 'terrain' | 'twin' | 'galaxy';

export const CompetitivenessDashboard: React.FC = () => {
    const [items, setItems] = useState<TechItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [brands, setBrands] = useState<string[]>([]);
    const [dimensions, setDimensions] = useState<CompetitivenessDimension[]>([]);
    
    const [viewMode, setViewMode] = useState<ViewMode>('matrix');

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
                setBrands(b);
                setDimensions(d);
                const techItems = await getTechItems({ limit: 1000 }); // Get plenty for matrix
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
            
            // Auto select latest history item
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
                // Fallback if API fails
                setSelectedSourceArticle(null);
            }
        } else {
            setSelectedSourceArticle(null);
        }
    };

    const tabs: { id: ViewMode; label: string; icon: React.FC<any> }[] = [
        { id: 'matrix', label: '全景矩阵', icon: TableCellsIcon },
        { id: 'terrain', label: '赛博地形', icon: ViewGridIcon },
        { id: 'twin', label: '全息双生', icon: CubeIcon },
        { id: 'galaxy', label: '星系引力', icon: GlobeIcon },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-md shadow-indigo-200">
                            <ChartIcon className="w-5 h-5 text-white" />
                        </div>
                        竞争力看板 
                    </h1>
                    
                    {/* View Switcher Tabs */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setViewMode(tab.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    viewMode === tab.id 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden relative">
                {viewMode === 'matrix' && (
                    <CompetitivenessMatrix 
                        items={items}
                        brands={brands}
                        dimensions={dimensions}
                        onItemClick={handleItemClick}
                        isLoading={isLoading}
                    />
                )}
                {viewMode === 'terrain' && (
                    <CyberTerrainView items={items} brands={brands} onItemClick={handleItemClick} />
                )}
                {viewMode === 'twin' && (
                    <HolographicTwinView items={items} brands={brands} onItemClick={handleItemClick} />
                )}
                {viewMode === 'galaxy' && (
                    <SupplyGalaxyView items={items} brands={brands} onItemClick={handleItemClick} />
                )}
            </main>

            {/* Detail Modal */}
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
                            {/* Left Panel: Dossier */}
                            <div className="w-full md:w-[450px] border-r border-slate-200 bg-white flex-shrink-0 flex flex-col min-h-0">
                                <DossierPanel 
                                    item={selectedItem}
                                    selectedHistoryId={selectedHistory?.id || null}
                                    onSelectHistory={handleHistoryClick}
                                />
                            </div>
                            
                            {/* Right Panel: Evidence */}
                            <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
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
                @keyframes grid-flow { from { background-position: 0 0; } to { background-position: 0 40px; } }
                .animate-grid-flow { animation: grid-flow 2s linear infinite; }
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spin-reverse-slower { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
                .animate-spin-reverse-slower { animation: spin-reverse-slower 40s linear infinite; }
                .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
                @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(0.95); } }
                .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
                @keyframes scan-vertical { 0% { transform: translateY(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(400px); opacity: 0; } }
                .animate-scan-vertical { animation: scan-vertical 3s linear infinite; }
            `}</style>
        </div>
    );
};
