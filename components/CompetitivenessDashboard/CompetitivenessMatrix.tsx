
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
        default: return <QuestionMarkCircleIcon className="w-4 h-4 text-gray-300" />;
    }
};

const getReliabilityBg = (score: number) => {
    switch (score) {
        case 4: return 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 text-green-900';
        case 3: return 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-900';
        case 2: return 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 text-amber-900';
        case 1: return 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300 text-red-900';
        default: return 'bg-gray-50/50 border-gray-100 hover:bg-gray-100 hover:border-gray-200 text-gray-400';
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

    // Flatten dimension structure for rendering columns (Matrix X-axis)
    // We group headers by Primary Dimension
    const cols = useMemo(() => {
        const columns: { primary: string, secondary: string, key: string }[] = [];
        dimensions.forEach(dim => {
            if (dim.sub_dimensions && dim.sub_dimensions.length > 0) {
                dim.sub_dimensions.forEach(sub => {
                    columns.push({ primary: dim.name, secondary: sub, key: `${dim.name}::${sub}` });
                });
            } else {
                columns.push({ primary: dim.name, secondary: '通用', key: `${dim.name}::通用` });
            }
        });
        return columns;
    }, [dimensions]);

    // Calculate colspans for primary headers
    const primaryHeaders = useMemo(() => {
        const headers: { name: string, colspan: number }[] = [];
        let currentPrimary = '';
        let count = 0;

        cols.forEach((col, index) => {
            if (col.primary !== currentPrimary) {
                if (currentPrimary) {
                    headers.push({ name: currentPrimary, colspan: count });
                }
                currentPrimary = col.primary;
                count = 1;
            } else {
                count++;
            }
            
            if (index === cols.length - 1) {
                headers.push({ name: currentPrimary, colspan: count });
            }
        });
        return headers;
    }, [cols]);

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
            <table className="border-collapse text-sm min-w-max">
                <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                    {/* Primary Dimension Header Row */}
                    <tr>
                        <th className="p-3 border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-40 w-32 min-w-[120px]">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">品牌 \ 维度</span>
                        </th>
                        {primaryHeaders.map((header, idx) => (
                            <th 
                                key={idx} 
                                colSpan={header.colspan} 
                                className="p-3 border-b border-r border-slate-200 text-center font-extrabold text-slate-700 bg-slate-100/50"
                            >
                                {header.name}
                            </th>
                        ))}
                    </tr>
                    {/* Secondary Dimension Header Row */}
                    <tr>
                        <th className="p-3 border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-40 top-[45px]">
                            {/* Empty corner cell */}
                        </th>
                        {cols.map((col) => (
                            <th 
                                key={col.key} 
                                className="p-3 border-b border-r border-slate-200 text-center text-xs font-bold text-slate-500 bg-white min-w-[160px] max-w-[200px]"
                            >
                                {col.secondary}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {brands.map((brand) => (
                        <tr key={brand} className="hover:bg-slate-50/30 transition-colors">
                            {/* Sticky Brand Column */}
                            <td className="p-4 border-r border-b border-slate-200 bg-white font-bold text-slate-800 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                {brand}
                            </td>
                            
                            {/* Data Cells */}
                            {cols.map((col) => {
                                const itemsInCell = matrixData.get(col.key)?.get(brand) || [];
                                // Use the most reliable item or the latest one for the cell summary
                                const displayItem = itemsInCell.length > 0 
                                    ? itemsInCell.sort((a, b) => b.reliability - a.reliability || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
                                    : null;

                                return (
                                    <td key={`${brand}-${col.key}`} className="p-2 border-r border-b border-slate-100 align-top h-24">
                                        {displayItem ? (
                                            <div 
                                                onClick={() => onItemClick(displayItem)}
                                                className={`
                                                    h-full w-full p-2.5 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between group
                                                    ${getReliabilityBg(displayItem.reliability)}
                                                `}
                                            >
                                                <div className="text-xs font-bold line-clamp-2 leading-snug mb-1 group-hover:text-indigo-900 transition-colors">
                                                    {displayItem.name}
                                                </div>
                                                <div className="flex justify-between items-end mt-auto">
                                                    <span className="text-[10px] opacity-60 font-mono">
                                                        {new Date(displayItem.updated_at).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
                                                    </span>
                                                    <div title={`可信度: ${displayItem.reliability}`}>
                                                        {getReliabilityIcon(displayItem.reliability)}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center opacity-10">
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                            </div>
                                        )}
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