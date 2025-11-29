
import React, { useState, useMemo } from 'react';
import { TechItem, CompetitivenessDimension } from '../../types';
import { 
    CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    AnnotationIcon, QuestionMarkCircleIcon, ChevronRightIcon,
    ArrowsPointingOutIcon, ArrowsPointingInIcon, SparklesIcon, ViewGridIcon
} from '../icons';

interface CompetitivenessMatrixProps {
    items: TechItem[];
    brands: string[];
    dimensions: CompetitivenessDimension[];
    onItemClick: (item: TechItem) => void;
    isLoading: boolean;
}

// --- Visual Helpers ---

const getReliabilityStyles = (score: number) => {
    switch (score) {
        case 4: return { 
            color: 'text-emerald-400', 
            border: 'border-emerald-500/50', 
            bg: 'bg-emerald-500/10', 
            glow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]',
            icon: CheckCircleIcon 
        };
        case 3: return { 
            color: 'text-cyan-400', 
            border: 'border-cyan-500/50', 
            bg: 'bg-cyan-500/10', 
            glow: 'shadow-[0_0_10px_rgba(6,182,212,0.3)]',
            icon: ShieldCheckIcon 
        };
        case 2: return { 
            color: 'text-amber-400', 
            border: 'border-amber-500/50', 
            bg: 'bg-amber-500/10', 
            glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
            icon: AnnotationIcon 
        };
        case 1: return { 
            color: 'text-red-500', 
            border: 'border-red-500/50', 
            bg: 'bg-red-500/10', 
            glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
            icon: ShieldExclamationIcon 
        };
        default: return { 
            color: 'text-slate-400', 
            border: 'border-slate-700', 
            bg: 'bg-slate-800/50', 
            glow: '',
            icon: QuestionMarkCircleIcon 
        };
    }
};

export const CompetitivenessMatrix: React.FC<CompetitivenessMatrixProps> = ({ 
    items, 
    brands, 
    dimensions, 
    onItemClick,
    isLoading
}) => {
    // State for dimension expansion
    const [expandedDimId, setExpandedDimId] = useState<string | null>(dimensions.length > 0 ? dimensions[0].id : null);
    
    // State for "Laser Crosshair" - tracking hovered coordinates
    const [hoveredCell, setHoveredCell] = useState<{ row: string | null, col: string | null }>({ row: null, col: null });

    // Data Processing
    const matrixData = useMemo(() => {
        const map = new Map<string, Map<string, TechItem[]>>();
        items.forEach(item => {
            const dimKey = item.tech_dimension; // Assuming exact match with Dimension Name
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
            <div className="flex flex-col items-center justify-center h-full bg-[#020617] text-cyan-500 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4 z-10 shadow-[0_0_20px_cyan]"></div>
                <p className="font-mono tracking-widest text-xs animate-pulse z-10">INITIALIZING NEURAL MATRIX...</p>
            </div>
        );
    }

    if (brands.length === 0 || dimensions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#020617] text-slate-500">
                <p className="font-mono">NO DATA STREAM DETECTED</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto custom-scrollbar bg-[#020617] relative h-full selection:bg-cyan-500/30 selection:text-cyan-100">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 pointer-events-none z-0" 
                 style={{ 
                     backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px)', 
                     backgroundSize: '40px 40px',
                     opacity: 0.3
                 }}>
            </div>

            <table className="border-collapse w-full relative z-10">
                <thead className="sticky top-0 z-30">
                    <tr>
                        {/* Corner HUD */}
                        <th className="p-0 sticky left-0 z-40 bg-[#020617] border-b border-r border-slate-800 w-40 min-w-[160px] shadow-[4px_4px_20px_rgba(0,0,0,0.5)]">
                            <div className="w-full h-full p-4 flex flex-col justify-end items-start border-r-2 border-cyan-500/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1">
                                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                                </div>
                                <span className="font-mono text-[9px] text-cyan-700 uppercase tracking-widest mb-1">TARGET</span>
                                <span className="text-sm font-black text-white tracking-wider flex items-center gap-2">
                                    <ViewGridIcon className="w-4 h-4 text-cyan-500" /> OEM
                                </span>
                                {/* Diagonal Decor */}
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30"></div>
                            </div>
                        </th>

                        {/* Dimension Headers */}
                        {dimensions.map(dim => {
                            const isExpanded = expandedDimId === dim.id;
                            const isDimHovered = hoveredCell.col && hoveredCell.col.startsWith(dim.id);

                            return isExpanded ? (
                                <React.Fragment key={dim.id}>
                                    {dim.sub_dimensions && dim.sub_dimensions.length > 0 ? (
                                        dim.sub_dimensions.map(sub => {
                                            const colKey = `${dim.id}-${sub}`;
                                            const isColHovered = hoveredCell.col === colKey;
                                            return (
                                                <th key={colKey} className={`relative p-0 border-b border-r border-slate-800 bg-[#020617]/95 backdrop-blur text-center min-w-[200px] transition-colors duration-300 group`}>
                                                    <div className={`
                                                        w-full h-full p-3 flex flex-col items-center justify-center gap-1 border-t-2 transition-all
                                                        ${isColHovered ? 'bg-cyan-950/30 border-cyan-500' : 'border-transparent'}
                                                    `}>
                                                        <div 
                                                            className="flex items-center gap-1 cursor-pointer hover:opacity-100 opacity-60 transition-opacity mb-1"
                                                            onClick={() => handleToggleDimension(dim.id)}
                                                        >
                                                            <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">{dim.name}</span>
                                                            <ArrowsPointingInIcon className="w-3 h-3 text-cyan-400" />
                                                        </div>
                                                        <span className={`text-xs font-bold transition-colors ${isColHovered ? 'text-white' : 'text-slate-400'}`}>
                                                            {sub}
                                                        </span>
                                                        {isColHovered && (
                                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-cyan-500/50 blur-[2px]"></div>
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })
                                    ) : (
                                        <th className="p-3 border-b border-r border-slate-800 bg-[#0f172a] text-center min-w-[200px]">
                                            <div 
                                                className="flex items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-white"
                                                onClick={() => handleToggleDimension(dim.id)}
                                            >
                                                <span className="text-sm font-bold">{dim.name}</span>
                                                <ArrowsPointingInIcon className="w-4 h-4" />
                                            </div>
                                        </th>
                                    )}
                                </React.Fragment>
                            ) : (
                                // COLLAPSED HEADER
                                <th 
                                    key={dim.id} 
                                    onClick={() => handleToggleDimension(dim.id)}
                                    className={`
                                        p-0 border-b border-r border-slate-800 cursor-pointer transition-all w-14 min-w-[56px] max-w-[56px] align-bottom group relative overflow-hidden
                                        ${isDimHovered ? 'bg-indigo-950/50' : 'bg-[#0f172a] hover:bg-slate-800'}
                                    `}
                                >
                                    {isDimHovered && <div className="absolute inset-0 border-x border-indigo-500/30 shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]"></div>}
                                    <div className="w-full h-full py-4 flex flex-col items-center justify-end gap-4">
                                        <div className="writing-vertical-rl text-xs font-bold font-mono tracking-widest rotate-180 transform text-slate-500 group-hover:text-indigo-400 transition-colors">
                                            {dim.name}
                                        </div>
                                        <div className="w-full flex justify-center pb-2">
                                            <ArrowsPointingOutIcon className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
                                        </div>
                                        <div className="w-full h-1 bg-indigo-500/50 group-hover:bg-indigo-400 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.8)] transition-all"></div>
                                    </div>
                                    <style>{`.writing-vertical-rl { writing-mode: vertical-rl; }`}</style>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                
                <tbody className="divide-y divide-slate-800/50">
                    {brands.map((brand) => {
                        const isRowHovered = hoveredCell.row === brand;
                        
                        return (
                            <tr key={brand} className="group/row">
                                {/* Brand Row Header */}
                                <td className={`
                                    p-4 border-r border-b border-slate-800 sticky left-0 z-20 transition-colors duration-200 relative
                                    ${isRowHovered ? 'bg-slate-800 text-white' : 'bg-[#020617] text-slate-400'}
                                `}>
                                    {isRowHovered && <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyan-500 shadow-[0_0_10px_cyan]"></div>}
                                    <div className="font-bold text-sm tracking-wide font-mono">{brand}</div>
                                </td>

                                {/* Cells */}
                                {dimensions.map(dim => {
                                    const isExpanded = expandedDimId === dim.id;
                                    const brandItems = matrixData.get(dim.name)?.get(brand) || [];

                                    if (isExpanded) {
                                        if (dim.sub_dimensions && dim.sub_dimensions.length > 0) {
                                            return dim.sub_dimensions.map(sub => {
                                                const colKey = `${dim.id}-${sub}`;
                                                // Find best item
                                                const item = brandItems
                                                    .filter(i => i.secondary_tech_dimension === sub)
                                                    .sort((a, b) => b.reliability - a.reliability || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
                                                
                                                const styles = item ? getReliabilityStyles(item.reliability) : null;
                                                const isCellHovered = isRowHovered && hoveredCell.col === colKey;

                                                return (
                                                    <td 
                                                        key={colKey} 
                                                        className={`
                                                            p-2 border-r border-b border-slate-800 align-top h-32 w-[200px] transition-colors relative
                                                            ${isCellHovered ? 'bg-white/5' : ''}
                                                            ${isRowHovered || hoveredCell.col === colKey ? 'bg-white/[0.02]' : ''}
                                                        `}
                                                        onMouseEnter={() => setHoveredCell({ row: brand, col: colKey })}
                                                        onMouseLeave={() => setHoveredCell({ row: null, col: null })}
                                                    >
                                                        {/* Laser Crosshair Guidelines (Optional subtle lines) */}
                                                        
                                                        {item && styles ? (
                                                            <div 
                                                                onClick={() => onItemClick(item)}
                                                                className={`
                                                                    h-full w-full p-3 rounded-lg border backdrop-blur-sm cursor-pointer flex flex-col justify-between relative overflow-hidden group/card transition-all duration-300
                                                                    ${styles.border} ${styles.bg} hover:bg-opacity-20 hover:scale-[1.02] hover:z-10
                                                                `}
                                                            >
                                                                {/* Tech Node Effect */}
                                                                <div className="flex justify-between items-start gap-2 relative z-10">
                                                                    <div className={`text-xs font-bold line-clamp-3 leading-snug text-slate-200 group-hover/card:text-white [text-shadow:0_1px_2px_black]`}>
                                                                        {item.name}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 relative z-10">
                                                                    <div className={`flex items-center gap-1.5 opacity-80 group-hover/card:opacity-100 ${styles.color}`}>
                                                                        <styles.icon className={`w-3.5 h-3.5 ${item.reliability >= 3 ? 'animate-pulse' : ''}`} />
                                                                        <span className="text-[9px] font-mono uppercase tracking-wider font-bold">
                                                                            R-LVL:{item.reliability}
                                                                        </span>
                                                                    </div>
                                                                    <ChevronRightIcon className="w-3 h-3 text-slate-500 group-hover/card:text-white opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                                                </div>

                                                                {/* Ambient Glow */}
                                                                <div className={`absolute -bottom-4 -right-4 w-12 h-12 bg-current opacity-20 blur-xl rounded-full ${styles.color}`}></div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full w-full rounded-lg border border-slate-800 border-dashed flex items-center justify-center opacity-30 group-hover/row:opacity-50 transition-opacity">
                                                                <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            });
                                        } else {
                                            return <td className="p-2 border-r border-b border-slate-800 bg-[#020617]"></td>;
                                        }
                                    } else {
                                        // COLLAPSED: Energy Bar / Density View
                                        const highRelCount = brandItems.filter(i => i.reliability >= 3).length;
                                        const medRelCount = brandItems.filter(i => i.reliability === 2).length;
                                        const lowRelCount = brandItems.filter(i => i.reliability === 1).length;
                                        const total = brandItems.length;
                                        const isColHovered = hoveredCell.col && hoveredCell.col.startsWith(dim.id);

                                        return (
                                            <td 
                                                key={dim.id} 
                                                onClick={() => handleToggleDimension(dim.id)}
                                                className={`
                                                    p-1 border-r border-b border-slate-800 align-middle text-center cursor-pointer transition-colors relative
                                                    ${isRowHovered || isColHovered ? 'bg-indigo-900/20' : ''}
                                                `}
                                                onMouseEnter={() => setHoveredCell({ row: brand, col: `${dim.id}-summary` })}
                                                onMouseLeave={() => setHoveredCell({ row: null, col: null })}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-1 py-2 h-full w-full">
                                                    {total === 0 ? (
                                                        <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                                                    ) : (
                                                        <div className="flex flex-col gap-[2px] w-1.5 h-16 justify-end bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
                                                            {/* Energy Bar Segments */}
                                                            {lowRelCount > 0 && <div style={{ height: `${(lowRelCount/total)*100}%` }} className="w-full bg-red-500 shadow-[0_0_5px_red]"></div>}
                                                            {medRelCount > 0 && <div style={{ height: `${(medRelCount/total)*100}%` }} className="w-full bg-amber-500 shadow-[0_0_5px_orange]"></div>}
                                                            {highRelCount > 0 && <div style={{ height: `${(highRelCount/total)*100}%` }} className="w-full bg-cyan-400 shadow-[0_0_8px_cyan]"></div>}
                                                        </div>
                                                    )}
                                                    {total > 0 && (
                                                        <span className={`text-[9px] font-mono font-bold ${isColHovered ? 'text-white' : 'text-slate-600'}`}>{total}</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    }
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
