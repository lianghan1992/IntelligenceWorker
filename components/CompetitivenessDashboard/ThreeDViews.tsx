
import React, { useState, useMemo } from 'react';
import { TechItem } from '../../types';
import { 
    LightningBoltIcon, ChipIcon, CubeIcon, 
    EyeIcon, ServerIcon, GlobeIcon, ViewGridIcon
} from '../icons';

// --- Shared Types ---
interface ViewProps {
    items: TechItem[];
    brands: string[];
    onItemClick: (item: TechItem) => void;
}

// --- MODULE 1: Cyber Data Terrain (赛博数据地形) ---
export const CyberTerrainView: React.FC<ViewProps> = ({ items, brands, onItemClick }) => {
    // Group data for the grid: Calculate a score for each brand based on tech reliability sum
    const matrix = useMemo(() => {
        return brands.map(brand => {
            const brandItems = items.filter(i => i.vehicle_brand === brand);
            const score = brandItems.reduce((acc, cur) => acc + (cur.reliability || 0), 0);
            // Get top item for click interaction
            const topItem = brandItems.length > 0 ? brandItems[0] : null;
            return { brand, score, topItem };
        }).sort((a, b) => b.score - a.score); // Sort by score for better visual
    }, [brands, items]);

    return (
        <div className="w-full h-full bg-[#050b14] overflow-hidden relative perspective-[1000px] flex items-center justify-center">
            {/* Background Grid Floor with Animation */}
            <div className="absolute inset-[-100%] bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] transform rotate-x-[60deg] scale-150 animate-grid-flow pointer-events-none opacity-20"></div>
            
            <div className="relative z-10 transform rotate-x-[45deg] rotate-z-[-30deg] transition-transform duration-700 ease-out hover:rotate-x-[40deg] hover:rotate-z-[-25deg]" style={{ transformStyle: 'preserve-3d' }}>
                <div className="grid grid-cols-4 gap-12 p-10">
                    {matrix.map((data, idx) => {
                        // Calculate height based on score (min 20px, max 200px)
                        const height = Math.min(250, Math.max(20, data.score * 8));
                        const isCyan = idx % 2 === 0;
                        const glowColor = isCyan ? 'rgba(6,182,212,0.6)' : 'rgba(168,85,247,0.6)';
                        const barColor = isCyan ? 'bg-cyan-500' : 'bg-purple-500';
                        const borderColor = isCyan ? 'border-cyan-400' : 'border-purple-400';
                        
                        return (
                            <div 
                                key={data.brand} 
                                className="relative group cursor-pointer" 
                                onClick={() => data.topItem && onItemClick(data.topItem)}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Base Plate */}
                                <div className={`w-24 h-24 bg-opacity-10 border ${borderColor} bg-slate-900/50 backdrop-blur-sm rounded-lg transform transition-all duration-300 group-hover:scale-110 shadow-[0_0_30px_${glowColor}]`}>
                                    
                                    {/* The 3D Pillar */}
                                    <div 
                                        className={`absolute bottom-0 left-0 right-0 mx-auto w-16 transition-all duration-1000 ease-out flex items-end justify-center pb-2 opacity-90 ${barColor}`}
                                        style={{ 
                                            height: `${height}px`, 
                                            transform: 'translateZ(10px) rotateX(-10deg) translateY(-20px)',
                                            boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px rgba(255,255,255,0.3)`
                                        }}
                                    >
                                        <span className="text-white font-bold text-xl drop-shadow-md transform rotate-x-10">{data.score}</span>
                                    </div>
                                    
                                    {/* Brand Label Floating */}
                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 px-3 py-1 rounded border border-white/10 backdrop-blur-md">
                                        <span className={`text-sm font-bold tracking-widest uppercase ${isCyan ? 'text-cyan-300' : 'text-purple-300'}`}>
                                            {data.brand}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Overlay UI */}
            <div className="absolute top-6 left-6 pointer-events-none">
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Cyber</span> Terrain
                </h3>
                <p className="text-cyan-500/80 text-xs font-mono mt-1 tracking-widest">COMPETITIVENESS SCORE VISUALIZATION</p>
            </div>
            
            <style>{`
                @keyframes grid-flow { from { background-position: 0 0; } to { background-position: 0 40px; } }
                .animate-grid-flow { animation: grid-flow 3s linear infinite; }
            `}</style>
        </div>
    );
};

// --- MODULE 2: Holographic Digital Twin (全息解构双生) ---
export const HolographicTwinView: React.FC<ViewProps> = ({ items, brands, onItemClick }) => {
    const [activePart, setActivePart] = useState<string | null>(null);
    const [selectedBrand, setSelectedBrand] = useState(brands[0] || 'Unknown');

    // Filter items for the selected brand to show real data if possible
    const brandItems = items.filter(i => i.vehicle_brand === selectedBrand);
    
    // Helper to find a tech item for a part
    const getTechForPart = (keywords: string[]) => {
        return brandItems.find(i => keywords.some(k => i.name.toLowerCase().includes(k) || i.secondary_tech_dimension.toLowerCase().includes(k))) 
               || { name: '标准配置', description: '暂无详细参数', reliability: 0 };
    };

    const parts = [
        { id: 'lidar', x: 50, y: 15, label: 'LIDAR SENSOR', icon: EyeIcon, keywords: ['lidar', '激光雷达'] },
        { id: 'chip', x: 50, y: 45, label: 'COMPUTE CORE', icon: ChipIcon, keywords: ['chip', '芯片', 'orin', 'fSD'] },
        { id: 'battery', x: 50, y: 70, label: 'POWER PACK', icon: LightningBoltIcon, keywords: ['battery', '电池', 'ctb', 'ctc'] },
        { id: 'chassis', x: 20, y: 80, label: 'REAR CASTING', icon: CubeIcon, keywords: ['casting', '压铸', '底盘'] },
    ];

    return (
        <div className="w-full h-full bg-[#02040a] overflow-hidden relative flex items-center justify-center">
            {/* Blueprint Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(#1e293b_1px,transparent_1px),linear-gradient(90deg,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
            
            {/* Brand Selector */}
            <div className="absolute top-6 right-6 z-30 flex flex-col gap-2">
                <span className="text-xs text-cyan-500 font-mono tracking-widest text-right">SELECT MODEL TARGET</span>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {brands.map(brand => (
                        <button
                            key={brand}
                            onClick={() => setSelectedBrand(brand)}
                            className={`px-4 py-2 text-right text-sm font-bold border-r-2 transition-all ${
                                selectedBrand === brand 
                                    ? 'border-cyan-500 text-cyan-100 bg-cyan-900/30' 
                                    : 'border-slate-700 text-slate-500 hover:text-cyan-300'
                            }`}
                        >
                            {brand}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Hologram Container */}
            <div className="relative w-[400px] h-[600px] animate-float-slow">
                {/* 1. The Car Wireframe SVG */}
                <svg viewBox="0 0 200 400" className="w-full h-full drop-shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                    <defs>
                        <linearGradient id="holo-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1" />
                            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>
                    <path 
                        d="M50,80 C50,20 150,20 150,80 L150,320 C150,380 50,380 50,320 Z" 
                        fill="url(#holo-grad)" 
                        stroke="#38bdf8" 
                        strokeWidth="2" 
                        strokeOpacity="0.8"
                    />
                    <path d="M50,120 L150,120" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
                    <path d="M50,160 L150,160" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.2" />
                    <path d="M50,280 L150,280" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
                    <rect x="85" y="140" width="30" height="50" rx="4" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    
                    {/* Scanning Laser */}
                    <line x1="0" y1="0" x2="200" y2="0" stroke="#bef264" strokeWidth="2" className="animate-scan-vertical" opacity="0.8" />
                </svg>

                {/* 2. Interactive Hotspots */}
                {parts.map(part => {
                    const techData = getTechForPart(part.keywords);
                    const isActive = activePart === part.id;

                    return (
                        <div 
                            key={part.id}
                            className="absolute"
                            style={{ left: `${part.x}%`, top: `${part.y}%` }}
                            onMouseEnter={() => setActivePart(part.id)}
                            onMouseLeave={() => setActivePart(null)}
                            onClick={() => 'id' in techData && onItemClick(techData as TechItem)}
                        >
                            {/* Pulse Dot */}
                            <div className="relative -ml-3 -mt-3 w-6 h-6 cursor-pointer group z-20">
                                <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-50"></div>
                                <div className={`relative w-6 h-6 rounded-full border-2 border-white shadow-[0_0_15px_#06b6d4] flex items-center justify-center transition-all ${isActive ? 'bg-white scale-125' : 'bg-cyan-600 scale-100'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-600' : 'bg-white'}`}></div>
                                </div>
                            </div>

                            {/* Connecting Line */}
                            <div className={`absolute top-0 left-0 h-[2px] bg-cyan-400 transition-all duration-300 origin-left z-10 ${isActive ? 'w-24 opacity-100' : 'w-0 opacity-0'}`} style={{ transform: 'rotate(-15deg)' }}></div>

                            {/* Floating HUD Panel */}
                            <div className={`
                                absolute left-24 -top-10 w-72 bg-slate-900/90 border border-cyan-500/50 backdrop-blur-xl p-4 rounded-none shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 origin-left z-30 clip-path-polygon
                                ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}
                            `}>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                        <part.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-cyan-100 font-bold text-xs tracking-widest mb-1">{part.label}</h4>
                                        <div className="text-white font-bold text-sm truncate">{techData.name}</div>
                                        <p className="text-cyan-400/60 text-[10px] font-mono mt-1 line-clamp-2">{techData.description}</p>
                                    </div>
                                </div>
                                {/* Reliability Bar */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[9px] text-cyan-600 font-mono">CONFIDENCE</span>
                                    <div className="flex-1 h-1 bg-slate-800">
                                        <div className="h-full bg-cyan-400" style={{ width: `${(techData.reliability || 0) * 25}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="absolute top-6 left-6 pointer-events-none">
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Holo</span> Twin
                </h3>
                <p className="text-blue-300/60 text-xs font-mono mt-1 tracking-widest">X-RAY COMPONENT ANALYSIS</p>
            </div>

            <style>{`
                .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
                @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
                .animate-scan-vertical { animation: scan-vertical 3s linear infinite; }
                @keyframes scan-vertical { 0% { transform: translateY(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(400px); opacity: 0; } }
            `}</style>
        </div>
    );
};

// --- MODULE 3: Supply Galaxy (星系引力图) ---
export const SupplyGalaxyView: React.FC<ViewProps> = ({ brands, items, onItemClick }) => {
    const [centerBrand, setCenterBrand] = useState(brands[0] || 'Unknown');
    
    // Mock logic to extract suppliers from tech descriptions for the selected brand
    // In a real scenario, this would parse a structured supplier field
    const brandTechs = items.filter(i => i.vehicle_brand === centerBrand);
    
    // Simulating nodes based on found tech
    const orbits = [
        { id: 1, radius: 160, speed: 20, items: brandTechs.slice(0, 3) },
        { id: 2, radius: 260, speed: 35, items: brandTechs.slice(3, 8) },
        { id: 3, radius: 360, speed: 50, items: brandTechs.slice(8, 12) },
    ];

    return (
        <div className="w-full h-full bg-black overflow-hidden relative flex items-center justify-center">
            {/* Deep Space Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-black"></div>
            
            {/* Brand Selector (Bottom) */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-30 px-4">
                {brands.map(brand => (
                    <button
                        key={brand}
                        onClick={() => setCenterBrand(brand)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                            centerBrand === brand 
                                ? 'bg-amber-500 text-black border-amber-500' 
                                : 'bg-transparent text-slate-500 border-slate-700 hover:border-amber-500 hover:text-amber-500'
                        }`}
                    >
                        {brand}
                    </button>
                ))}
            </div>

            {/* Solar System Container */}
            <div className="relative flex items-center justify-center">
                
                {/* Center Star (Brand) */}
                <div className="relative z-20 w-32 h-32 bg-gradient-to-br from-amber-300 to-orange-600 rounded-full shadow-[0_0_80px_rgba(245,158,11,0.6)] flex items-center justify-center animate-pulse">
                    <div className="text-white font-black text-xl tracking-widest drop-shadow-lg text-center leading-none">
                        {centerBrand}
                        <div className="text-[10px] font-medium opacity-80 mt-1">OEM CORE</div>
                    </div>
                </div>

                {/* Orbits & Planets */}
                {orbits.map((orbit, orbitIndex) => (
                    <div 
                        key={orbit.id}
                        className="absolute border border-white/10 rounded-full"
                        style={{ 
                            width: orbit.radius * 2, 
                            height: orbit.radius * 2,
                            animation: `spin ${orbit.speed}s linear infinite ${orbitIndex % 2 === 0 ? '' : 'reverse'}`
                        }}
                    >
                        {orbit.items.map((item, idx) => {
                            // Distribute planets evenly on orbit
                            const angle = (idx / orbit.items.length) * 360;
                            const planetSize = 40 + (item.reliability * 5); // Size based on reliability
                            
                            return (
                                <div
                                    key={item.id}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                                    style={{ 
                                        transform: `rotate(${angle}deg) translateY(-50%)`,
                                        transformOrigin: `50% ${orbit.radius}px`
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                >
                                    {/* Counter-rotate content to keep upright */}
                                    <div 
                                        className="relative rounded-full border-2 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center hover:scale-110 transition-transform bg-slate-900"
                                        style={{ 
                                            width: planetSize, 
                                            height: planetSize,
                                            animation: `spin ${orbit.speed}s linear infinite ${orbitIndex % 2 === 0 ? 'reverse' : ''}`,
                                            borderColor: item.reliability >= 3 ? '#22c55e' : '#3b82f6'
                                        }}
                                    >
                                        <ServerIcon className={`w-1/2 h-1/2 ${item.reliability >= 3 ? 'text-green-400' : 'text-blue-400'}`} />
                                        
                                        {/* Tooltip on Hover */}
                                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-md px-2 py-1 rounded border border-white/20 text-white text-[10px] whitespace-nowrap z-50 pointer-events-none">
                                            {item.name}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* Connection Lines (Background Gravity Web) */}
                <svg className="absolute inset-0 w-[800px] h-[800px] pointer-events-none opacity-20 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
                    <defs>
                        <radialGradient id="web-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <circle cx="400" cy="400" r="400" fill="url(#web-grad)" />
                </svg>
            </div>

            <div className="absolute top-6 left-6 pointer-events-none">
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Supply</span> Galaxy
                </h3>
                <p className="text-amber-500/60 text-xs font-mono mt-1 tracking-widest">ECOSYSTEM RELATIONSHIPS</p>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
