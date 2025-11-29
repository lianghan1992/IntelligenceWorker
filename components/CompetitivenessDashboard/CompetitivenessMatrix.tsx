import React, { useState, useMemo } from 'react';
import { TechItem, CompetitivenessDimension } from '../../types';
import { 
    CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    AnnotationIcon, QuestionMarkCircleIcon,
    LightningBoltIcon, ChipIcon, GlobeIcon, CubeIcon, TruckIcon,
    ViewGridIcon, SparklesIcon
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
    const { matrixMap, brandCounts, maxCount } = useMemo(() => {
        // Map<Brand, Map<DimId, Map<SubName, Item>>>
        const map = new Map<string, Map<string, Map<string, TechItem>>>();
        
        // 1. Build Map & Deduplicate
        items.forEach(item => {
            // Fuzzy match brand name
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
            
            // De-duplication: latest & highest reliability
            const existing = dimMap.get(item.secondary_tech_dimension);
            if (!existing || item.reliability > existing.reliability || (item.reliability === existing.reliability && new Date(item.updated_at) > new Date(existing.updated_at))) {
                dimMap.set(item.secondary_tech_dimension, item);
            }
        });

        // 2. Count Total Discovered Items per Brand
        const counts = new Map<string, number>();
        let max = 1; // Default to 1 to avoid division by zero

        map.forEach((dimMap, brand) => {
            let c = 0;
            dimMap.forEach((subMap) => {
                c += subMap.size;
            });
            counts.set(brand, c);
            if (c > max) max = c;
        });

        return { matrixMap: map, brandCounts: counts, maxCount: max };
    }, [items, dimensions, brands]);

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

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            <style>{`
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes growWidth {
                    from { width: 0; }
                }
                .animate-slide-up {
                    animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .animate-grow {
                    animation: growWidth 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                /* Glossy Shine Effect */
                .hover-shine {
                    position: relative;
                    overflow: hidden;
                }
                .hover-shine::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
                    transform: skewX(-25deg);
                    transition: 0s;
                    pointer-events: none;
                }
                .hover-shine:hover::after {
                    left: 200%;
                    transition: 0.6s ease-in-out;
                }
            `}</style>

            <div className="flex-1 overflow-x-auto custom-scrollbar p-4 md:p-6 scroll-smooth">
                {/* 
                    Mobile Optimization: 
                    - snap-x snap-mandatory: Enables scroll snapping 
                    - h-full: Ensures children can fill height 
                */}
                <div className="flex gap-4 md:gap-6 min-w-max pb-4 h-full snap-x snap-mandatory md:snap-none items-start">
                    
                    {/* Iterate Columns by Selected Brands */}
                    {brands.map((brand, colIndex) => {
                        const count = brandCounts.get(brand) || 0;
                        const brandData = matrixMap.get(brand);

                        return (
                            <div 
                                key={brand} 
                                // Mobile: w-[85vw] creates a carousel effect where next card is visible. Desktop: Fixed width.
                                // Added h-full to force card to take full height of container, enabling inner scroll.
                                className="flex-shrink-0 w-[85vw] sm:w-[320px] md:w-[360px] h-full snap-center flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 animate-slide-up"
                                style={{ animationDelay: `${colIndex * 100}ms` }}
                            >
                                {/* Brand Header */}
                                <div className="p-5 border-b border-slate-100 bg-white sticky top-0 z-20 backdrop-blur-md flex-shrink-0">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{brand}</h3>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 font-bold text-xs text-slate-500">
                                            {brand.substring(0, 1)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-grow" 
                                                style={{ width: `${Math.max(5, (count / maxCount) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex items-baseline gap-1 text-slate-600">
                                            <span className="text-xs">收录新技术</span>
                                            <span className="text-sm font-extrabold text-indigo-600">{count}</span>
                                            <span className="text-[10px] text-slate-400">项</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tech Specs Body - Vertical Stack with Inner Scrolling */}
                                <div className="flex-1 p-3 space-y-4 bg-slate-50/50 overflow-y-auto custom-scrollbar pb-6">
                                    {dimensions.map((dim, dimIndex) => {
                                        const subDims = dim.sub_dimensions || [];
                                        const brandDimMap = brandData?.get(dim.id);
                                        
                                        // 1. Filter sub-dimensions that actually have data for this brand
                                        const activeSubDimsForBrand = subDims.filter(sub => brandDimMap?.has(sub));
                                        
                                        // 2. If no active sub-dimensions, completely hide (fold) this primary dimension block
                                        if (activeSubDimsForBrand.length === 0) return null;

                                        const dimIconColor = getDimensionColor(dimIndex);
                                        const DimIcon = getDimensionIcon(dim.name);
                                        const itemCount = activeSubDimsForBrand.length;

                                        return (
                                            <div key={dim.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] animate-in fade-in zoom-in-95 duration-300 flex-shrink-0">
                                                {/* Level 1: Primary Dimension Header */}
                                                <div className={`px-4 py-2.5 flex items-center justify-between border-b ${dimIconColor}`}>
                                                    <div className="flex items-center gap-2">
                                                        <DimIcon className="w-4 h-4 opacity-80" />
                                                        <span className="text-sm font-bold tracking-wide">{dim.name}</span>
                                                    </div>
                                                    {/* Count Badge */}
                                                    <span className="text-[10px] bg-white/40 backdrop-blur-md px-2 py-0.5 rounded-full font-bold shadow-sm">
                                                        {itemCount}
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-slate-50">
                                                    {activeSubDimsForBrand.map(sub => {
                                                        const item = brandDimMap?.get(sub);
                                                        // Item is guaranteed to exist here due to filter above
                                                        if (!item) return null;

                                                        const conf = getReliabilityConfig(item.reliability);
                                                        const Icon = conf.icon;
                                                        
                                                        // "Peer Highlight" Logic
                                                        const isMatch = hoveredTechName && item.name === hoveredTechName;
                                                        const isDimmed = hoveredTechName && item.name !== hoveredTechName;

                                                        return (
                                                            <div 
                                                                key={sub} 
                                                                className={`
                                                                    p-4 transition-all duration-300 relative group cursor-pointer bg-white hover:bg-slate-50 hover-shine
                                                                    ${isMatch ? 'bg-indigo-50 z-10 scale-[1.02] shadow-md ring-1 ring-indigo-100' : ''}
                                                                    ${isDimmed ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
                                                                `}
                                                                onClick={() => onItemClick(item)}
                                                                onMouseEnter={() => setHoveredTechName(item.name)}
                                                                onMouseLeave={() => setHoveredTechName(null)}
                                                            >
                                                                {/* Level 2: Secondary Dimension Label */}
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                                                        {sub}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`text-[9px] text-slate-400 font-mono`}>
                                                                            {new Date(item.updated_at).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
                                                                        </span>
                                                                        <span className={`w-2 h-2 rounded-full ${conf.bar}`}></span>
                                                                    </div>
                                                                </div>

                                                                <div className="font-bold text-slate-800 text-sm leading-snug mb-1.5 group-hover:text-indigo-700 transition-colors">
                                                                    {item.name}
                                                                </div>
                                                                
                                                                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${conf.bg} ${conf.color} ${conf.border} mb-1.5`}>
                                                                    <Icon className="w-3 h-3" />
                                                                    {conf.label}
                                                                </div>

                                                                <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                                    {item.description}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Fallback if all dimensions are hidden */}
                                    {dimensions.every(dim => {
                                        const brandDimMap = brandData?.get(dim.id);
                                        const subDims = dim.sub_dimensions || [];
                                        return !subDims.some(sub => brandDimMap?.has(sub));
                                    }) && (
                                        <div className="text-center py-10 text-slate-400">
                                            <SparklesIcon className="w-8 h-8 mb-2 mx-auto opacity-20" />
                                            <p className="text-xs">暂无任何技术情报</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
