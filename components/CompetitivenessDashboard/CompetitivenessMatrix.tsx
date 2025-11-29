
import React, { useState, useMemo } from 'react';
import { TechItem, CompetitivenessDimension } from '../../types';
import { 
    CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    AnnotationIcon, QuestionMarkCircleIcon, ChevronRightIcon,
    ArrowsPointingOutIcon, ArrowsPointingInIcon
} from '../icons';

interface CompetitivenessMatrixProps {
    items: TechItem[];
    brands: string[];
    dimensions: CompetitivenessDimension[];
    onItemClick: (item: TechItem) => void;
    isLoading: boolean;
}

// Helper: Get Reliability Color for Summary Dots
const getReliabilityColorClass = (score: number) => {
    switch (score) {
        case 4: return 'bg-green-500';
        case 3: return 'bg-blue-500';
        case 2: return 'bg-amber-500';
        case 1: return 'bg-red-500';
        default: return 'bg-gray-300';
    }
};

const getReliabilityIcon = (score: number) => {
    switch (score) {
        case 4: return <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />;
        case 3: return <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-600" />;
        case 2: return <AnnotationIcon className="w-3.5 h-3.5 text-amber-600" />;
        case 1: return <ShieldExclamationIcon className="w-3.5 h-3.5 text-red-600" />;
        default: return <QuestionMarkCircleIcon className="w-3.5 h-3.5 text-gray-300" />;
    }
};

const getReliabilityBg = (score: number) => {
    switch (score) {
        case 4: return 'bg-green-50/80 border-green-200 hover:bg-green-100 hover:shadow-md hover:-translate-y-0.5';
        case 3: return 'bg-blue-50/80 border-blue-200 hover:bg-blue-100 hover:shadow-md hover:-translate-y-0.5';
        case 2: return 'bg-amber-50/80 border-amber-200 hover:bg-amber-100 hover:shadow-md hover:-translate-y-0.5';
        case 1: return 'bg-red-50/80 border-red-200 hover:bg-red-100 hover:shadow-md hover:-translate-y-0.5';
        default: return 'bg-gray-50/50 border-gray-100 hover:bg-gray-100';
    }
};

export const CompetitivenessMatrix: React.FC<CompetitivenessMatrixProps> = ({ 
    items, 
    brands, 
    dimensions, 
    onItemClick,
    isLoading
}) => {
    // State to track which Primary Dimension is expanded. 
    // Default to the first one or null to show summary of all.
    const [expandedDimId, setExpandedDimId] = useState<string | null>(dimensions.length > 0 ? dimensions[0].id : null);

    // Lookup Map: Map<DimensionKey, Map<Brand, TechItem[]>>
    const matrixData = useMemo(() => {
        const map = new Map<string, Map<string, TechItem[]>>();
        items.forEach(item => {
            // Key by Primary Dimension ID
            const dimKey = item.tech_dimension; // We use name matching or ID if available. API items usually use Name.
            // Let's assume we match by Name for safer linkage with Dimensions prop
            
            if (!map.has(dimKey)) map.set(dimKey, new Map());
            const brandMap = map.get(dimKey)!;
            
            if (!brandMap.has(item.vehicle_brand)) brandMap.set(item.vehicle_brand, []);
            brandMap.get(item.vehicle_brand)!.push(item);
        });
        return map;
    }, [items]);

    const handleToggleDimension = (dimId: string) => {
        setExpandedDimId(prev => prev === dimId ? null : dimId);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
                <p>正在构建全景矩阵...</p>
            </div>
        );
    }

    if (brands.length === 0 || dimensions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>暂无足够的元数据来显示矩阵。</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto custom-scrollbar bg-white rounded-xl border border-slate-200 shadow-sm relative h-full">
            <table className="border-collapse w-full">
                <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                    <tr>
                        {/* Corner Cell */}
                        <th className="p-4 border-b border-r border-slate-200 bg-white sticky left-0 z-40 w-40 min-w-[160px] text-left align-bottom shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Rows</span>
                                <span className="text-sm font-extrabold text-slate-800">车企品牌</span>
                            </div>
                        </th>

                        {/* Dimension Headers */}
                        {dimensions.map(dim => {
                            const isExpanded = expandedDimId === dim.id;
                            return isExpanded ? (
                                // EXPANDED: Render Sub-Dimension Headers
                                <React.Fragment key={dim.id}>
                                    {dim.sub_dimensions && dim.sub_dimensions.length > 0 ? (
                                        dim.sub_dimensions.map(sub => (
                                            <th key={`${dim.id}-${sub}`} className="p-3 border-b border-r border-slate-200 bg-indigo-50/30 text-center min-w-[180px] transition-all duration-300">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span 
                                                        className="text-[10px] text-indigo-400 font-bold uppercase cursor-pointer hover:text-indigo-600 flex items-center gap-1"
                                                        onClick={() => handleToggleDimension(dim.id)}
                                                    >
                                                        {dim.name} <ArrowsPointingInIcon className="w-3 h-3" />
                                                    </span>
                                                    <span className="text-sm font-bold text-indigo-900">{sub}</span>
                                                </div>
                                            </th>
                                        ))
                                    ) : (
                                        <th className="p-3 border-b border-r border-slate-200 bg-indigo-50/30 text-center min-w-[180px]">
                                            <div 
                                                className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80"
                                                onClick={() => handleToggleDimension(dim.id)}
                                            >
                                                <span className="text-sm font-bold text-indigo-900">{dim.name}</span>
                                                <ArrowsPointingInIcon className="w-4 h-4 text-indigo-500" />
                                            </div>
                                        </th>
                                    )}
                                </React.Fragment>
                            ) : (
                                // COLLAPSED: Vertical Header
                                <th 
                                    key={dim.id} 
                                    onClick={() => handleToggleDimension(dim.id)}
                                    className="p-2 border-b border-r border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors w-14 min-w-[56px] max-w-[56px] align-bottom pb-4 group"
                                >
                                    <div className="flex flex-col items-center gap-3 h-full justify-end">
                                        <div className="writing-vertical-rl text-sm font-bold text-slate-500 group-hover:text-indigo-600 tracking-widest rotate-180 transform">
                                            {dim.name}
                                        </div>
                                        <ArrowsPointingOutIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                                    </div>
                                    <style>{`.writing-vertical-rl { writing-mode: vertical-rl; }`}</style>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                
                <tbody className="divide-y divide-slate-100">
                    {brands.map((brand) => (
                        <tr key={brand} className="hover:bg-slate-50/30 transition-colors group">
                            {/* Brand Row Header */}
                            <td className="p-4 border-r border-b border-slate-200 bg-white sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <div className="font-bold text-slate-800 text-sm">{brand}</div>
                            </td>

                            {/* Cells */}
                            {dimensions.map(dim => {
                                const isExpanded = expandedDimId === dim.id;
                                // Get all items for this Brand + Primary Dimension
                                const brandItems = matrixData.get(dim.name)?.get(brand) || [];

                                if (isExpanded) {
                                    // EXPANDED: Show Cells for each Sub-Dimension
                                    if (dim.sub_dimensions && dim.sub_dimensions.length > 0) {
                                        return dim.sub_dimensions.map(sub => {
                                            // Find specific item for this sub-dimension
                                            // Sort by reliability (desc) then date (desc) to show best candidate
                                            const item = brandItems
                                                .filter(i => i.secondary_tech_dimension === sub)
                                                .sort((a, b) => b.reliability - a.reliability || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

                                            return (
                                                <td key={`${dim.id}-${sub}`} className="p-2 border-r border-b border-slate-100 align-top h-28 w-[200px]">
                                                    {item ? (
                                                        <div 
                                                            onClick={() => onItemClick(item)}
                                                            className={`
                                                                h-full w-full p-3 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden group/card
                                                                ${getReliabilityBg(item.reliability)}
                                                            `}
                                                        >
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div className="text-[13px] font-bold line-clamp-2 leading-snug text-slate-800 group-hover/card:text-indigo-900">
                                                                    {item.name}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/5">
                                                                <div className="flex items-center gap-1.5 opacity-70 group-hover/card:opacity-100">
                                                                    {getReliabilityIcon(item.reliability)}
                                                                    <span className="text-[10px] font-medium">
                                                                        {item.reliability === 4 ? '官方' : item.reliability === 3 ? '高信' : '传闻'}
                                                                    </span>
                                                                </div>
                                                                <ChevronRightIcon className="w-3 h-3 text-slate-400 group-hover/card:text-indigo-500 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full rounded-xl bg-slate-50 border border-slate-100 border-dashed flex items-center justify-center opacity-50">
                                                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        });
                                    } else {
                                        // Handle case with no sub-dimensions (show items directly)
                                        return (
                                            <td className="p-2 border-r border-b text-center text-slate-400 italic">
                                                无子维度
                                            </td>
                                        );
                                    }
                                } else {
                                    // COLLAPSED: Show Heatmap / Density Summary
                                    // Count items by reliability
                                    const highRelCount = brandItems.filter(i => i.reliability >= 3).length;
                                    const medRelCount = brandItems.filter(i => i.reliability === 2).length;
                                    const lowRelCount = brandItems.filter(i => i.reliability === 1).length;
                                    const total = brandItems.length;

                                    return (
                                        <td 
                                            key={dim.id} 
                                            onClick={() => handleToggleDimension(dim.id)}
                                            className="p-1 border-r border-b border-slate-200 align-middle text-center cursor-pointer hover:bg-indigo-50 transition-colors"
                                        >
                                            <div className="flex flex-col items-center gap-1.5 py-4">
                                                {total === 0 ? (
                                                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {/* Heatmap Dots visualization */}
                                                        {highRelCount > 0 && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm ring-2 ring-white" title={`${highRelCount} 项已证实`} />
                                                        )}
                                                        {medRelCount > 0 && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm ring-2 ring-white" title={`${medRelCount} 项传闻`} />
                                                        )}
                                                        {lowRelCount > 0 && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm ring-2 ring-white" title={`${lowRelCount} 项辟谣`} />
                                                        )}
                                                        
                                                        {/* Number Badge if many items */}
                                                        {total > 3 && (
                                                            <span className="text-[9px] font-bold text-slate-400 mt-1">+{total}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                }
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
