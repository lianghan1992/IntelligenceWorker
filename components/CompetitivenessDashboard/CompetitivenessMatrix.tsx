
import React, { useMemo } from 'react';
import { TechItem, CompetitivenessDimension } from '../../types';
import { 
    CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    AnnotationIcon, QuestionMarkCircleIcon 
} from '../icons';

interface CompetitivenessMatrixProps {
    items: TechItem[];
    brands: string[];
    dimensions: CompetitivenessDimension[];
    onItemClick: (item: TechItem) => void;
    isLoading: boolean;
}

// Reuse helper for consistency
const getReliabilityIcon = (score: number) => {
    switch (score) {
        case 4: return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
        case 3: return <ShieldCheckIcon className="w-4 h-4 text-blue-600" />;
        case 2: return <AnnotationIcon className="w-4 h-4 text-amber-600" />;
        case 1: return <ShieldExclamationIcon className="w-4 h-4 text-red-600" />;
        default: return <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400" />;
    }
};

const getReliabilityBg = (score: number) => {
    switch (score) {
        case 4: return 'bg-green-50 border-green-100 hover:bg-green-100';
        case 3: return 'bg-blue-50 border-blue-100 hover:bg-blue-100';
        case 2: return 'bg-amber-50 border-amber-100 hover:bg-amber-100';
        case 1: return 'bg-red-50 border-red-100 hover:bg-red-100';
        default: return 'bg-gray-50 border-gray-100 hover:bg-gray-100';
    }
};

export const CompetitivenessMatrix: React.FC<CompetitivenessMatrixProps> = ({ 
    items, 
    brands, 
    dimensions, 
    onItemClick,
    isLoading
}) => {

    // Process data into a lookup map: Map<DimensionKey, Map<Brand, TechItem[]>>
    // DimensionKey = "PrimaryDim::SecondaryDim"
    const matrixData = useMemo(() => {
        const map = new Map<string, Map<string, TechItem[]>>();
        
        items.forEach(item => {
            const dimKey = `${item.tech_dimension}::${item.secondary_tech_dimension}`;
            if (!map.has(dimKey)) {
                map.set(dimKey, new Map());
            }
            const brandMap = map.get(dimKey)!;
            
            if (!brandMap.has(item.vehicle_brand)) {
                brandMap.set(item.vehicle_brand, []);
            }
            brandMap.get(item.vehicle_brand)!.push(item);
        });
        return map;
    }, [items]);

    // Flatten dimension structure for rendering rows
    const tableRows = useMemo(() => {
        const rows: { primary: string, secondary: string, key: string }[] = [];
        dimensions.forEach(dim => {
            if (dim.sub_dimensions && dim.sub_dimensions.length > 0) {
                dim.sub_dimensions.forEach(sub => {
                    rows.push({ primary: dim.name, secondary: sub, key: `${dim.name}::${sub}` });
                });
            } else {
                // Handle cases with no sub-dimensions if necessary, though data model suggests secondary is common
                // For now assuming secondary exists or using a placeholder
                rows.push({ primary: dim.name, secondary: '通用', key: `${dim.name}::通用` });
            }
        });
        return rows;
    }, [dimensions]);

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
        <div className="flex-1 overflow-auto custom-scrollbar bg-white rounded-xl border border-slate-200 shadow-sm relative">
            <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th className="p-4 border-b border-r border-slate-200 text-left font-bold text-slate-700 min-w-[200px] sticky left-0 bg-slate-50 z-30">
                            技术维度
                        </th>
                        {brands.map(brand => (
                            <th key={brand} className="p-4 border-b border-slate-200 text-left font-bold text-slate-700 min-w-[220px]">
                                {brand}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {tableRows.map((row) => (
                        <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                            {/* Sticky Row Header */}
                            <td className="p-4 border-r border-slate-200 bg-white sticky left-0 z-10">
                                <div className="font-bold text-slate-800">{row.primary}</div>
                                <div className="text-xs text-slate-500 mt-1 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2"></span>
                                    {row.secondary}
                                </div>
                            </td>
                            
                            {/* Brand Columns */}
                            {brands.map(brand => {
                                const itemsInCell = matrixData.get(row.key)?.get(brand) || [];
                                return (
                                    <td key={`${row.key}-${brand}`} className="p-2 border-r border-slate-100 align-top">
                                        <div className="flex flex-col gap-2">
                                            {itemsInCell.length > 0 ? (
                                                itemsInCell.map(item => (
                                                    <div 
                                                        key={item.id}
                                                        onClick={() => onItemClick(item)}
                                                        className={`
                                                            p-2.5 rounded-lg border cursor-pointer transition-all duration-200
                                                            ${getReliabilityBg(item.reliability)}
                                                        `}
                                                    >
                                                        <div className="font-bold text-slate-800 text-xs mb-1 line-clamp-2" title={item.name}>
                                                            {item.name}
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] text-slate-500 line-clamp-1 flex-1 mr-2 opacity-80" title={item.description}>
                                                                {item.description}
                                                            </span>
                                                            <div title={`可信度: ${item.reliability}`}>
                                                                {getReliabilityIcon(item.reliability)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full min-h-[40px] flex items-center justify-center opacity-30">
                                                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
