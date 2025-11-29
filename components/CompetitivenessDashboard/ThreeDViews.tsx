
import React, { useState, useEffect } from 'react';
import { TechItem } from '../../types';
import { 
    LightningBoltIcon, ChipIcon, CubeIcon, TruckIcon, 
    ShieldCheckIcon, EyeIcon, ServerIcon, CheckCircleIcon 
} from '../icons';

// --- Shared Types & Helpers ---
interface ViewProps {
    items: TechItem[];
    brands: string[];
    onItemClick: (item: TechItem) => void;
}

// --- MODULE 1: Cyber Data Terrain (赛博数据地形) ---
export const CyberTerrainView: React.FC<ViewProps> = ({ items, brands, onItemClick }) => {
    // Group data for the grid
    const matrix = brands.map(brand => {
        const brandItems = items.filter(i => i.vehicle_brand === brand);
        const score = brandItems.reduce((acc, cur) => acc + cur.reliability, 0);
        return { brand, score, items: brandItems };
    });

    return (
        <div className="w-full h-full bg-[#050b14] overflow-hidden relative perspective-[1200px] flex items-center justify-center">
            {/* Background Grid Floor */}
            <div className="absolute inset-[-50%] bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] transform rotate-x-[60deg] scale-150 animate-grid-flow pointer-events-none opacity-30"></div>
            
            <div className="relative z-10 transform rotate-x-[45deg] rotate-z-[-20deg] transition-transform duration-700 ease-out hover:rotate-x-[40deg] hover:rotate-z-[-15deg] style={{transformStyle: 'preserve-3d'}}">
                <div className="grid grid-cols-4 gap-8">
                    {matrix.map((data, idx) => {
                        // Calculate height based on score (max 200px)
                        const height = Math.min(200, Math.max(40, data.score * 5));
                        const colorClass = idx % 2 === 0 ? 'cyan' : 'purple';
                        const glowColor = idx % 2 === 0 ? 'rgba(6,182,212,0.5)' : 'rgba(168,85,247,0.5)';
                        
                        return (
                            <div key={data.brand} className="relative group cursor-pointer" onClick={() => data.items[0] && onItemClick(data.items[0])}>
                                {/* Base */}
                                <div className={`w-24 h-24 bg-opacity-20 border-2 rounded-lg backdrop-blur-sm transform transition-all duration-300 group-hover:translate-z-10 group-hover:shadow-[0_0_50px_${glowColor}]
                                    ${colorClass === 'cyan' ? 'bg-cyan-900 border-cyan-500' : 'bg-purple-900 border-purple-500'}
                                `}>
                                    {/* The Pillar (Height represents data density) */}
                                    <div 
                                        className={`absolute bottom-0 left-0 right-0 mx-auto w-16 transition-all duration-1000 ease-out flex items-end justify-center pb-2
                                            ${colorClass === 'cyan' ? 'bg-gradient-to-t from-cyan-600/80 to-cyan-300/80' : 'bg-gradient-to-t from-purple-600/80 to-purple-300/80'}
                                        `}
                                        style={{ 
                                            height: `${height}px`, 
                                            transform: 'translateZ(20px) rotateX(-10deg)',
                                            boxShadow: `0 0 20px ${glowColor}`
                                        }}
                                    >
                                        <span className="text-white font-bold text-lg drop-shadow-md">{data.score}</span>
                                    </div>
                                    
                                    {/* Label Floating */}
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <span className={`text-sm font-bold tracking-widest uppercase ${colorClass === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`}>
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
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Cyber</span> Terrain
                </h3>
                <p className="text-cyan-500/60 text-xs font-mono mt-1">DATA DENSITY VISUALIZATION // MODE: ISOMETRIC</p>
            </div>
        </div>
    );
};

// --- MODULE 2: Holographic Digital Twin (全息解构双生) ---
export const HolographicTwinView: React.FC<ViewProps> = ({ onItemClick }) => {
    const [activePart, setActivePart] = useState<string | null>(null);

    const parts = [
        { id: 'lidar', x: 50, y: 15, label: 'LIDAR ARRAY', icon: EyeIcon, desc: 'AT128 / 1200x Res' },
        { id: 'chip', x: 50, y: 45, label: 'COMPUTE CORE', icon: ChipIcon, desc: 'Dual Orin-X / 508 TOPS' },
        { id: 'battery', x: 50, y: 75, label: 'POWER CELL', icon: LightningBoltIcon, desc: 'CTB / 800V Platform' },
        { id: 'chassis', x: 20, y: 80, label: 'REAR CASTING', icon: CubeIcon, desc: '9100t Die-Cast' },
    ];

    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative flex items-center justify-center">
            {/* Blueprint Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(#1e293b_1px,transparent_1px),linear-gradient(90deg,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>
            
            {/* Main Hologram Container */}
            <div className="relative w-[600px] h-[400px] animate-float-slow">
                
                {/* 1. The Car Wireframe (Simplified Top View SVG) */}
                <svg viewBox="0 0 200 400" className="w-full h-full drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                    <path 
                        d="M50,80 C50,20 150,20 150,80 L150,320 C150,380 50,380 50,320 Z" 
                        fill="none" 
                        stroke="#38bdf8" 
                        strokeWidth="2" 
                        strokeOpacity="0.6"
                        vectorEffect="non-scaling-stroke"
                    />
                    <path d="M50,120 L150,120" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3" />
                    <path d="M50,280 L150,280" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3" />
                    <rect x="80" y="150" width="40" height="60" rx="5" stroke="#38bdf8" strokeWidth="1" fill="rgba(56,189,248,0.1)" />
                    {/* Scanline */}
                    <line x1="0" y1="0" x2="200" y2="0" stroke="#0ea5e9" strokeWidth="2" className="animate-scan-vertical">
                    </line>
                </svg>

                {/* 2. Interactive Hotspots */}
                {parts.map(part => (
                    <div 
                        key={part.id}
                        className="absolute"
                        style={{ left: `${part.x}%`, top: `${part.y}%` }}
                        onMouseEnter={() => setActivePart(part.id)}
                        onMouseLeave={() => setActivePart(null)}
                    >
                        {/* Pulse Dot */}
                        <div className="relative -ml-3 -mt-3 w-6 h-6 cursor-pointer group">
                            <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                            <div className="relative w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_15px_#06b6d4] flex items-center justify-center group-hover:scale-125 transition-transform">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                        </div>

                        {/* Floating HUD Panel */}
                        <div className={`
                            absolute left-10 top-0 w-64 bg-slate-900/90 border border-cyan-500/50 backdrop-blur-xl p-4 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 origin-left z-20
                            ${activePart === part.id ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4 pointer-events-none'}
                        `}>
                            {/* Decorative Corner Lines */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400"></div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                                    <part.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-cyan-100 font-bold text-sm tracking-wider">{part.label}</h4>
                                    <p className="text-cyan-400/80 text-xs font-mono mt-1">{part.desc}</p>
                                    <div className="mt-2 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-500 w-[70%] animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Connecting Line */}
                        <div className={`absolute top-3 left-3 h-[1px] bg-cyan-500 transition-all duration-300 origin-left ${activePart === part.id ? 'w-8 opacity-100' : 'w-0 opacity-0'}`}></div>
                    </div>
                ))}
            </div>

            <div className="absolute top-6 left-6 pointer-events-none">
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Digital</span> Twin
                </h3>
                <p className="text-blue-300/60 text-xs font-mono mt-1">SYSTEM ARCHITECTURE // MODE: X-RAY</p>
            </div>
        </div>
    );
};

// --- MODULE 3: Supply Galaxy (星系引力图) ---
export const SupplyGalaxyView: React.FC<ViewProps> = ({ brands }) => {
    // Simulate a selected "Star" brand
    const [centerBrand] = useState(brands[0] || 'Unknown');

    return (
        <div className="w-full h-full bg-black overflow-hidden relative flex items-center justify-center">
            {/* Deep Space Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-black"></div>
            
            {/* Solar System Container */}
            <div className="relative w-[600px] h-[600px] flex items-center justify-center">
                
                {/* Center Star (Brand) */}
                <div className="absolute z-20 w-32 h-32 bg-gradient-to-br from-amber-300 to-orange-600 rounded-full shadow-[0_0_100px_rgba(245,158,11,0.6)] flex items-center justify-center animate-pulse-slow">
                    <div className="text-white font-bold text-xl tracking-widest drop-shadow-lg">{centerBrand}</div>
                </div>

                {/* Orbit 1: Core Tech */}
                <div className="absolute w-[300px] h-[300px] border border-white/10 rounded-full animate-spin-slow">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_20px_#2563eb] flex items-center justify-center hover:scale-125 transition-transform cursor-pointer">
                        <ChipIcon className="w-6 h-6 text-white" />
                        <div className="absolute -bottom-6 text-[10px] text-blue-300 whitespace-nowrap">NVIDIA Orin</div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 bg-green-600 rounded-full border-2 border-white shadow-[0_0_20px_#16a34a] flex items-center justify-center hover:scale-125 transition-transform cursor-pointer">
                        <LightningBoltIcon className="w-5 h-5 text-white" />
                        <div className="absolute -bottom-6 text-[10px] text-green-300 whitespace-nowrap">CATL Qilin</div>
                    </div>
                </div>

                {/* Orbit 2: Sensors & Peripherals */}
                <div className="absolute w-[500px] h-[500px] border border-white/5 rounded-full animate-spin-reverse-slower">
                    <div className="absolute top-1/4 left-0 w-8 h-8 bg-purple-600 rounded-full border border-white/50 flex items-center justify-center hover:scale-125 transition-transform cursor-pointer">
                        <EyeIcon className="w-4 h-4 text-white" />
                        <div className="absolute -bottom-5 text-[10px] text-purple-300 whitespace-nowrap">Hesai LiDAR</div>
                    </div>
                    <div className="absolute bottom-1/4 right-0 w-8 h-8 bg-pink-600 rounded-full border border-white/50 flex items-center justify-center hover:scale-125 transition-transform cursor-pointer">
                        <ServerIcon className="w-4 h-4 text-white" />
                        <div className="absolute -bottom-5 text-[10px] text-pink-300 whitespace-nowrap">Qualcomm 8295</div>
                    </div>
                </div>

                {/* Connection Lines (Simulated Gravity) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                    <line x1="50%" y1="50%" x2="50%" y2="0" stroke="url(#line-grad)" strokeWidth="2" />
                    <line x1="50%" y1="50%" x2="85%" y2="85%" stroke="url(#line-grad)" strokeWidth="1" />
                    <defs>
                        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <div className="absolute top-6 left-6 pointer-events-none">
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Supply</span> Galaxy
                </h3>
                <p className="text-amber-500/60 text-xs font-mono mt-1">SUPPLY CHAIN RELATIONSHIPS // MODE: ORBITAL</p>
            </div>
        </div>
    );
};
