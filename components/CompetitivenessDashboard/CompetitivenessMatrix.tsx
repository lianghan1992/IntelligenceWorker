
import React, { useState, useMemo } from 'react';
import { TechItem, CompetitivenessDimension } from '../../types';
import { 
    CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    AnnotationIcon, QuestionMarkCircleIcon,
    LightningBoltIcon, ChipIcon, GlobeIcon, CubeIcon, TruckIcon, FireIcon,
    ViewGridIcon
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
        case 4: return { label: '已证实', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircleIcon, bar: 'bg-emerald-500' };
        case 3: return { label: '高可信', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: ShieldCheckIcon, bar: 'bg-blue-500' };
        case 2: return { label: '传闻', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AnnotationIcon, bar: 'bg-amber-500' };
        case 1: return { label: '辟谣', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldExclamationIcon, bar: 'bg-red-500' };
        default: return { label: '未知', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: QuestionMarkCircleIcon, bar: 'bg-slate-300' };
    }
};

const getDimensionIcon = (dimName: string) => {
    if (dimName.includes('驾驶')) return GlobeIcon;
    if (dimName.includes('座舱')) return CpuChipIcon;
    if (dimName.includes('动力') || dimName.includes('电池')) return LightningBoltIcon;
    if (dimName.includes('底盘')) return CubeIcon;
    if (dimName.includes('车身')) return TruckIcon;
    return ViewGridIcon;
};

// Colors for Primary Dimension Headers
const getDimensionColor = (index: number) => {
    const colors = [
        'bg-indigo-50 border-indigo-100 text-indigo-700',
        'bg-blue-50 border-blue-100 text-blue-700',
        'bg-purple-50 border-purple-100 text-purple-700',
        'bg-emerald-50 border-emerald-100 text-emerald-700',
        'bg-orange-50 border-orange-100 text-orange-700',
        'bg-pink-50 border-pink-100 text-pink-700',
    ];
    return colors[index % colors.length];
};

export const CompetitivenessMatrix: React.FC<CompetitivenessMatrixProps> = ({ 
    items, 
    brands, 
    dimensions, 
    onItemClick,
    isLoading
}) => {
    // View State
    const [hoveredTechName, setHoveredTechName] = useState<string | null>(null);

    // Data Processing
    const { matrixMap, brandScores, activeSubDims, brandDimCounts } = useMemo(() => {
        const map = new Map<string, Map<string, Map<string, TechItem>>>();
        const scores = new Map<string, number>();
        const activeSubSet = new Set<string>(); // Stores `${dimId}::${subName}` that has data
        const counts = new Map<string, Map<string, number>>(); // Brand -> DimID -> Count

        items.forEach(item => {
            // Fuzzy match brand name if exact match fails
            let matchedBrand = brands.find(b => item.vehicle_brand.includes(b) || b.includes(item.vehicle_brand));
            if (!matchedBrand && brands.some(b => item.vehicle_brand.includes(b.replace('汽车', '')))) {
                 matchedBrand = brands.find(b => item.vehicle_brand.includes(b.replace('汽车', '')));
            }

            // Only process if the brand is in the requested list
            if (!matchedBrand) return; 

            if (!map.has(matchedBrand)) map.set(matchedBrand, new Map());
            const brandMap = map.get(matchedBrand)!;
            
            const dimObj = dimensions.find(d => d.name === item.tech_dimension);
            const dimId = dimObj ? dimObj.id : item.tech_dimension;

            if (!brandMap.has(dimId)) brandMap.set(dimId, new Map());
            const dimMap = brandMap.get(dimId)!;
            
            // De-duplication logic: latest & highest reliability
            const existing = dimMap.get(item.secondary_tech_dimension);
            if (!existing || item.reliability > existing.reliability || (item.reliability === existing.reliability && new Date(item.updated_at) > new Date(existing.updated_at))) {
                dimMap.set(item.secondary_tech_dimension, item);
                
                // Only count unique items (post-deduplication logic implies we count distinct sub-dims effectively, 
                // but simpler is to count items processed. Here we count "active items" for display)
                if (!counts.has(matchedBrand)) counts.set(matchedBrand, new Map());
                const bCounts = counts.get(matchedBrand)!;
                // We increment only if we are replacing or adding new. 
                // However, a simple increment in loop counts ALL records (history included if not careful).
                // But getTechItems usually returns Golden Records (1 per sub-dim per car). 
                // So simple increment is fine.
            }

            scores.set(matchedBrand, (scores.get(matchedBrand) || 0) + (item.reliability * 10));
            
            // Mark sub-dimension as active globally (if at least one selected brand has it)
            activeSubSet.add(`${dimId}::${item.secondary_tech_dimension}`);
        });

        // Recalculate counts based on the final map to be accurate after dedup
        map.forEach((brandDimMap, brand) => {
            if (!counts.has(brand)) counts.set(brand, new Map());
            const bCounts = counts.get(brand)!;
            brandDimMap.forEach((subMap, dimId) => {
                bCounts.set(dimId, subMap.size);
            });
        });

        return { matrixMap: map, brandScores: scores, activeSubDims: activeSubSet, brandDimCounts: counts };
    }, [items, dimensions, brands]);

    // Filter Dimensions for Display
    const visibleDimensions = useMemo(() => {
        return dimensions.map(dim => {
            // Filter sub-dimensions: Keep only if it exists in activeSubDims
            const activeSubs = (dim.sub_dimensions || []).filter(sub => activeSubDims.has(`${dim.id}::${sub}`));
            return {
                ...dim,
                sub_dimensions: activeSubs
            };
        }).filter(dim => dim.sub_dimensions.length > 0); // Hide primary dimension if no active sub-dimensions
    }, [dimensions, activeSubDims]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-white">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-400 text-sm font-medium tracking-wide">正在构建竞争力全景...</p>
            </div>
        );
    }

    if (brands.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ViewGridIcon className="w-12 h-12 mb-2 opacity-20" />
                <p>请在上方选择至少一个车企进行对比</p>
            </div>
        );
    }

    if (visibleDimensions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ViewGridIcon className="w-12 h-12 mb-2 opacity-20" />
                <p>当前选中的车企暂无相关技术情报数据</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            <div className="flex-1 overflow-x-auto custom-scrollbar p-6">
                <div className="flex gap-6 min-w-max pb-10">
                    
                    {/* Iterate Columns by Selected Brands */}
                    {brands.map(brand => {
                        const score = brandScores.get(brand) || 0;
                        const brandData = matrixMap.get(brand);
                        const brandCounts = brandDimCounts.get(brand);

                        return (
                            <div 
                                key={brand} 
                                className="flex-shrink-0 w-[360px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300"
                            >
                                {/* Brand Header */}
                                <div className="p-5 border-b border-slate-100 bg-white sticky top-0 z-20 backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{brand}</h3>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 font-bold text-xs text-slate-500">
                                            {brand.substring(0, 1)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${Math.min(100, score / 2)}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">竞争力: {score}</span>
                                    </div>
                                </div>

                                {/* Tech Specs Body - Vertical Stack */}
                                <div className="flex-1 p-3 space-y-4 bg-slate-50/50">
                                    {visibleDimensions.map((dim, dimIndex) => {
                                        const subDims = dim.sub_dimensions || [];
                                        const brandDimMap = brandData?.get(dim.id);
                                        const dimIconColor = getDimensionColor(dimIndex);
                                        const DimIcon = getDimensionIcon(dim.name);
                                        const itemCount = brandCounts?.get(dim.id) || 0;

                                        return (
                                            <div key={dim.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                                                {/* Level 1: Primary Dimension Header */}
                                                <div className={`px-4 py-2.5 flex items-center justify-between border-b ${dimIconColor}`}>
                                                    <div className="flex items-center gap-2">
                                                        <DimIcon className="w-4 h-4 opacity-80" />
                                                        <span className="text-sm font-bold tracking-wide">{dim.name}</span>
                                                    </div>
                                                    {itemCount > 0 && (
                                                        <span className="text-[10px] bg-white/30 backdrop-blur-sm px-1.5 py-0.5 rounded font-bold">
                                                            {itemCount}
                                                        </span>
                                                    )}
                                                </div>

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
                                                                    ${isMatch ? 'bg-indigo-50 z-10 scale-[1.02] shadow-md ring-1 ring-indigo-100' : ''}
                                                                    ${isDimmed ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
                                                                    ${!item ? 'bg-slate-50/30' : 'bg-white hover:bg-slate-50 cursor-pointer'}
                                                                `}
                                                                onClick={() => item && onItemClick(item)}
                                                                onMouseEnter={() => item && setHoveredTechName(item.name)}
                                                                onMouseLeave={() => setHoveredTechName(null)}
                                                            >
                                                                {/* Level 2: Secondary Dimension Label */}
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                                                        {sub}
                                                                    </span>
                                                                    {item && conf && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className={`text-[9px] text-slate-400 font-mono`}>
                                                                                {new Date(item.updated_at).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
                                                                            </span>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${conf.bar}`}></span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {item ? (
                                                                    <>
                                                                        <div className="font-bold text-slate-800 text-sm leading-snug mb-1.5 group-hover:text-indigo-700 transition-colors">
                                                                            {item.name}
                                                                        </div>
                                                                        
                                                                        {/* Reliability Badge inline if crucial, or just keep color bar */}
                                                                        {conf && (
                                                                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${conf.bg} ${conf.color} ${conf.border} mb-1.5`}>
                                                                                {Icon && <Icon className="w-3 h-3" />}
                                                                                {conf.label}
                                                                            </div>
                                                                        )}

                                                                        <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                                            {item.description}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="text-xs text-slate-300 italic py-2 flex items-center gap-2">
                                                                        <div className="w-4 h-px bg-slate-200"></div>
                                                                        暂无情报
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
