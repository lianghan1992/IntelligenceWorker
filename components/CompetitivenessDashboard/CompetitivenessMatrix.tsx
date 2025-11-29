
import React, { useState, useMemo } from 'react';
import { TechItem, CompetitivenessDimension } from '../../types';
import { 
    CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    AnnotationIcon, QuestionMarkCircleIcon, ChevronRightIcon,
    ChevronDownIcon, EyeIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon
} from '../icons';

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
        case 4: return { label: '已证实', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircleIcon, dot: 'bg-emerald-500' };
        case 3: return { label: '高可信', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: ShieldCheckIcon, dot: 'bg-blue-500' };
        case 2: return { label: '传闻', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AnnotationIcon, dot: 'bg-amber-500' };
        case 1: return { label: '辟谣', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldExclamationIcon, dot: 'bg-red-500' };
        default: return { label: '未知', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: QuestionMarkCircleIcon, dot: 'bg-slate-300' };
    }
};

export const CompetitivenessMatrix: React.FC<CompetitivenessMatrixProps> = ({ 
    items, 
    brands, 
    dimensions, 
    onItemClick,
    isLoading
}) => {
    // Default expand the first dimension
    const [expandedDimIds, setExpandedDimIds] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (dimensions.length > 0) initial.add(dimensions[0].id);
        return initial;
    });

    const toggleDim = (id: string) => {
        setExpandedDimIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Data Structure: Map<BrandName, Map<DimensionId, Map<SubDimensionName, TechItem>>>
    const matrixData = useMemo(() => {
        const map = new Map<string, Map<string, Map<string, TechItem>>>();
        items.forEach(item => {
            if (!map.has(item.vehicle_brand)) map.set(item.vehicle_brand, new Map());
            const brandMap = map.get(item.vehicle_brand)!;
            
            // Resolve Dimension ID
            const dimObj = dimensions.find(d => d.name === item.tech_dimension);
            const dimId = dimObj ? dimObj.id : 'unknown';

            if (!brandMap.has(dimId)) brandMap.set(dimId, new Map());
            const dimMap = brandMap.get(dimId)!;

            // Strategy: Keep latest/highest reliability
            const existing = dimMap.get(item.secondary_tech_dimension);
            if (!existing || item.reliability > existing.reliability || (item.reliability === existing.reliability && new Date(item.updated_at) > new Date(existing.updated_at))) {
                dimMap.set(item.secondary_tech_dimension, item);
            }
        });
        return map;
    }, [items, dimensions]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-400 text-sm">正在加载全景数据...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* The Table Container - Horizontal Scroll handled here */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <table className="border-collapse w-full min-w-max">
                    
                    {/* --- Sticky Headers --- */}
                    <thead className="sticky top-0 z-30 bg-white shadow-sm">
                        {/* Row 1: Primary Dimensions */}
                        <tr>
                            {/* Sticky Top-Left Corner */}
                            <th className="sticky left-0 z-40 top-0 bg-slate-50 border-b border-r border-slate-200 w-[180px] min-w-[180px] p-4 text-left">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Brand</span>
                                    <span className="text-lg font-extrabold text-slate-800">车企品牌</span>
                                </div>
                            </th>
                            
                            {/* Dimension Group Headers */}
                            {dimensions.map(dim => {
                                const isExpanded = expandedDimIds.has(dim.id);
                                const colSpan = isExpanded ? (dim.sub_dimensions.length || 1) : 1;
                                
                                return (
                                    <th 
                                        key={dim.id} 
                                        colSpan={colSpan}
                                        className={`
                                            p-0 border-b border-r border-slate-200 transition-all duration-300
                                            ${isExpanded ? 'bg-indigo-50/30' : 'bg-slate-50 hover:bg-slate-100 cursor-pointer'}
                                        `}
                                        onClick={() => !isExpanded && toggleDim(dim.id)}
                                    >
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm ${isExpanded ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                    {dim.name}
                                                </span>
                                                {!isExpanded && (
                                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-full">
                                                        {dim.sub_dimensions.length}
                                                    </span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleDim(dim.id); }}
                                                className={`p-1 rounded-full hover:bg-black/5 transition-colors ${isExpanded ? 'text-indigo-500' : 'text-slate-400'}`}
                                            >
                                                {isExpanded ? <ArrowsPointingInIcon className="w-4 h-4"/> : <ArrowsPointingOutIcon className="w-4 h-4"/>}
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>

                        {/* Row 2: Secondary Dimensions (Sub-headers) */}
                        <tr className="bg-slate-50/50">
                            {/* Sticky Left Placeholder for Row 2 */}
                            <th className="sticky left-0 z-40 top-[57px] bg-slate-50 border-b border-r border-slate-200"></th>

                            {dimensions.map(dim => {
                                const isExpanded = expandedDimIds.has(dim.id);
                                
                                if (!isExpanded) {
                                    // Collapsed State: Show "Summary" or empty
                                    return (
                                        <th key={`${dim.id}-collapsed`} className="border-b border-r border-slate-200 px-2 py-2 text-center w-[120px] bg-slate-50/30">
                                            <span className="text-[10px] text-slate-400 font-medium">概览</span>
                                        </th>
                                    );
                                }

                                // Expanded State: Show all sub-dimensions
                                if (dim.sub_dimensions.length === 0) {
                                    return (
                                        <th key={`${dim.id}-empty`} className="border-b border-r border-slate-200 px-4 py-2 text-left min-w-[200px] bg-indigo-50/10">
                                            <span className="text-xs text-slate-400 italic">无子维度</span>
                                        </th>
                                    );
                                }

                                return dim.sub_dimensions.map(sub => (
                                    <th key={`${dim.id}-${sub}`} className="border-b border-r border-slate-200 px-4 py-2 text-left min-w-[220px] bg-indigo-50/10">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-200"></span>
                                            <span className="text-xs font-bold text-slate-600">{sub}</span>
                                        </div>
                                    </th>
                                ));
                            })}
                        </tr>
                    </thead>

                    {/* --- Table Body --- */}
                    <tbody>
                        {brands.map(brand => (
                            <tr key={brand} className="group hover:bg-indigo-50/20 transition-colors">
                                {/* Sticky Brand Name Column */}
                                <td className="sticky left-0 z-20 bg-white border-b border-r border-slate-200 p-4 group-hover:bg-indigo-50/20 group-hover:border-r-indigo-100 transition-colors">
                                    <div className="font-bold text-slate-800">{brand}</div>
                                </td>

                                {dimensions.map(dim => {
                                    const isExpanded = expandedDimIds.has(dim.id);
                                    const brandDimData = matrixData.get(brand)?.get(dim.id);

                                    // Collapsed View: Show Density/Summary
                                    if (!isExpanded) {
                                        const count = brandDimData?.size || 0;
                                        const hasHighReliability = Array.from(brandDimData?.values() || []).some(i => i.reliability >= 3);
                                        
                                        return (
                                            <td key={`${brand}-${dim.id}`} className="border-b border-r border-slate-200 p-2 text-center cursor-pointer hover:bg-slate-50" onClick={() => toggleDim(dim.id)}>
                                                {count > 0 ? (
                                                    <div className="flex justify-center">
                                                        <span className={`
                                                            inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-bold
                                                            ${hasHighReliability ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}
                                                        `}>
                                                            {count}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200">-</span>
                                                )}
                                            </td>
                                        );
                                    }

                                    // Expanded View
                                    if (dim.sub_dimensions.length === 0) {
                                        return <td key={`${brand}-${dim.id}-empty`} className="border-b border-r border-slate-200 bg-slate-50/20"></td>;
                                    }

                                    return dim.sub_dimensions.map(sub => {
                                        const item = brandDimData?.get(sub);
                                        
                                        if (!item) {
                                            return (
                                                <td key={`${brand}-${dim.id}-${sub}`} className="border-b border-r border-slate-200 p-4 text-center">
                                                    <span className="text-slate-200 text-sm">-</span>
                                                </td>
                                            );
                                        }

                                        const conf = getReliabilityConfig(item.reliability);

                                        return (
                                            <td 
                                                key={`${brand}-${dim.id}-${sub}`} 
                                                className="border-b border-r border-slate-200 p-3 align-top cursor-pointer hover:bg-white hover:shadow-md transition-all relative"
                                                onClick={() => onItemClick(item)}
                                            >
                                                <div className="flex flex-col h-full justify-between gap-2">
                                                    <div>
                                                        <div className="font-semibold text-sm text-slate-800 leading-snug mb-1">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                                            {item.description}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${conf.bg} ${conf.color} ${conf.border}`}>
                                                            {conf.icon && <conf.icon className="w-2.5 h-2.5" />}
                                                            {conf.label}
                                                        </span>
                                                        {item.reliability >= 3 && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm animate-pulse"></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    });
                                });
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    );
};
