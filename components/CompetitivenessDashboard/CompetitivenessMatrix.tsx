
import React, { useState, useMemo } from 'react';
import { TechItem, CompetitivenessDimension } from '../../types';
import { 
    CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    AnnotationIcon, QuestionMarkCircleIcon, ChevronRightIcon,
    SparklesIcon, ViewGridIcon, LightningBoltIcon, ChipIcon, 
    GlobeIcon, CubeIcon, TruckIcon, FireIcon
} from '../icons';

// Add missing icons locally if needed or map existing ones
const CpuChipIcon = ChipIcon || ViewGridIcon;

interface CompetitivenessMatrixProps {
    items: TechItem[];
    brands: string[];
    dimensions: CompetitivenessDimension[];
    onItemClick: (item: TechItem) => void;
    isLoading: boolean;
}

// --- Visual Helpers ---

const getReliabilityConfig = (score: number) => {
    switch (score) {
        case 4: return { label: '已证实', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircleIcon };
        case 3: return { label: '高可信', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: ShieldCheckIcon };
        case 2: return { label: '传闻', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: AnnotationIcon };
        case 1: return { label: '辟谣', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldExclamationIcon };
        default: return { label: '未知', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', icon: QuestionMarkCircleIcon };
    }
};

const getDimensionIcon = (dimName: string) => {
    if (dimName.includes('驾驶')) return GlobeIcon; // Mapping closest metaphor
    if (dimName.includes('座舱')) return CpuChipIcon;
    if (dimName.includes('动力') || dimName.includes('电池')) return LightningBoltIcon || FireIcon;
    if (dimName.includes('底盘')) return CubeIcon;
    if (dimName.includes('车身')) return TruckIcon;
    return ViewGridIcon;
};

export const CompetitivenessMatrix: React.FC<CompetitivenessMatrixProps> = ({ 
    items, 
    brands: allBrands, 
    dimensions, 
    onItemClick,
    isLoading
}) => {
    // View State
    const [activeDimension, setActiveDimension] = useState<string>('all'); // 'all' or dimension ID
    const [pinnedBrands, setPinnedBrands] = useState<Set<string>>(new Set());
    const [hoveredTechName, setHoveredTechName] = useState<string | null>(null);

    // Data Processing
    const { matrixMap, brandScores } = useMemo(() => {
        const map = new Map<string, Map<string, Map<string, TechItem>>>();
        const scores = new Map<string, number>();

        items.forEach(item => {
            // Structure: Brand -> Dimension -> SubDimension -> Item
            if (!map.has(item.vehicle_brand)) map.set(item.vehicle_brand, new Map());
            const brandMap = map.get(item.vehicle_brand)!;
            
            // Map by Dimension Name (since ID might not be available on item directly in some API versions, assuming item.tech_dimension is name)
            // But we have dimensions prop. Let's find ID by Name
            const dimObj = dimensions.find(d => d.name === item.tech_dimension);
            const dimId = dimObj ? dimObj.id : item.tech_dimension;

            if (!brandMap.has(dimId)) brandMap.set(dimId, new Map());
            const dimMap = brandMap.get(dimId)!;
            
            // Only keep the latest/highest reliability item per sub-dimension
            const existing = dimMap.get(item.secondary_tech_dimension);
            if (!existing || item.reliability > existing.reliability || (item.reliability === existing.reliability && new Date(item.updated_at) > new Date(existing.updated_at))) {
                dimMap.set(item.secondary_tech_dimension, item);
            }

            // Simple scoring: Reliability * 10
            scores.set(item.vehicle_brand, (scores.get(item.vehicle_brand) || 0) + (item.reliability * 10));
        });
        return { matrixMap: map, brandScores: scores };
    }, [items, dimensions]);

    // Sorting Brands: Pinned first, then by Score desc
    const sortedBrands = useMemo(() => {
        return [...allBrands].sort((a, b) => {
            const aPinned = pinnedBrands.has(a);
            const bPinned = pinnedBrands.has(b);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return (brandScores.get(b) || 0) - (brandScores.get(a) || 0);
        });
    }, [allBrands, pinnedBrands, brandScores]);

    const togglePin = (brand: string) => {
        const newSet = new Set(pinnedBrands);
        if (newSet.has(brand)) newSet.delete(brand); else newSet.add(brand);
        setPinnedBrands(newSet);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-white">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-400 text-sm font-medium tracking-wide">正在构建竞争力全景...</p>
            </div>
        );
    }

    const activeDimObj = dimensions.find(d => d.id === activeDimension);
    const displayDimensions = activeDimension === 'all' ? dimensions : (activeDimObj ? [activeDimObj] : []);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* 1. Dimension Tabs (Sticky Top) */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 sticky top-0 z-30 shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex space-x-1 py-3 min-w-max">
                    <button
                        onClick={() => setActiveDimension('all')}
                        className={`
                            px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                            ${activeDimension === 'all' 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                        `}
                    >
                        <ViewGridIcon className="w-4 h-4" />
                        全景概览
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-2 self-center"></div>
                    {dimensions.map(dim => {
                        const Icon = getDimensionIcon(dim.name);
                        const isActive = activeDimension === dim.id;
                        return (
                            <button
                                key={dim.id}
                                onClick={() => setActiveDimension(dim.id)}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border
                                    ${isActive 
                                        ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-50' 
                                        : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-200'}
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                {dim.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Main Content (Scrollable) */}
            <div className="flex-1 overflow-x-auto custom-scrollbar p-6">
                <div className="flex gap-6 min-w-max pb-10">
                    
                    {/* Brand Columns */}
                    {sortedBrands.map(brand => {
                        const score = brandScores.get(brand) || 0;
                        const isPinned = pinnedBrands.has(brand);

                        return (
                            <div 
                                key={brand} 
                                className={`
                                    flex-shrink-0 w-[340px] flex flex-col bg-white rounded-2xl border transition-all duration-500
                                    ${isPinned 
                                        ? 'border-indigo-300 shadow-xl shadow-indigo-100/50 z-10 scale-[1.01] order-first' 
                                        : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300'}
                                `}
                            >
                                {/* Brand Header */}
                                <div className={`p-5 rounded-t-2xl border-b ${isPinned ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100'} sticky top-0 z-20 backdrop-blur-md`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{brand}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                                                    竞争力指数: {score}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => togglePin(brand)}
                                            className={`p-2 rounded-full transition-colors ${isPinned ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                                            title={isPinned ? "取消置顶" : "置顶对比"}
                                        >
                                            <svg className="w-4 h-4 transform rotate-45" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v4.586l2.293 2.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414-1.414l8-8V3a1 1 0 011-1z" /></svg>
                                        </button>
                                    </div>
                                    {/* Progress bar visual for score */}
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${Math.min(100, score / 5)}%` }}></div>
                                    </div>
                                </div>

                                {/* Tech Specs Body */}
                                <div className="flex-1 p-2 space-y-2 bg-slate-50/30">
                                    {displayDimensions.map(dim => {
                                        const subDims = dim.sub_dimensions || [];
                                        const brandDimMap = matrixMap.get(brand)?.get(dim.id); // Try ID first
                                        
                                        // If empty dimension for this brand, maybe skip in 'all' view? 
                                        // Better to show empty state for comparison.
                                        
                                        return (
                                            <div key={dim.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-3">
                                                {/* Dimension Header (only in 'all' view) */}
                                                {activeDimension === 'all' && (
                                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dim.name}</span>
                                                    </div>
                                                )}

                                                <div className="divide-y divide-slate-50">
                                                    {subDims.map(sub => {
                                                        const item = brandDimMap?.get(sub);
                                                        const conf = item ? getReliabilityConfig(item.reliability) : null;
                                                        const Icon = conf ? conf.icon : null;
                                                        
                                                        // "Peer Highlight" Logic
                                                        const isMatch = hoveredTechName && item?.name === hoveredTechName;
                                                        const isDimmed = hoveredTechName && item?.name !== hoveredTechName;

                                                        return (
                                                            <div 
                                                                key={sub} 
                                                                className={`
                                                                    p-4 transition-all duration-300 relative group
                                                                    ${isMatch ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-200 z-10 scale-[1.02] shadow-sm' : ''}
                                                                    ${isDimmed ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
                                                                    ${!item ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50 cursor-pointer'}
                                                                `}
                                                                onClick={() => item && onItemClick(item)}
                                                                onMouseEnter={() => item && setHoveredTechName(item.name)}
                                                                onMouseLeave={() => setHoveredTechName(null)}
                                                            >
                                                                <div className="flex justify-between items-baseline mb-1">
                                                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{sub}</span>
                                                                    {item && conf && Icon && (
                                                                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${conf.bg} ${conf.color} border ${conf.border}`}>
                                                                            <Icon className="w-2.5 h-2.5" />
                                                                            {conf.label}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {item ? (
                                                                    <>
                                                                        <div className="font-bold text-slate-800 text-sm leading-snug mb-1 group-hover:text-indigo-700 transition-colors">
                                                                            {item.name}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                                            {item.description}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="text-xs text-slate-300 italic py-2 text-center">
                                                                        暂无数据
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
