
import React, { useEffect, useRef, useState } from 'react';
import { 
    FeedIcon, DiveIcon, SparklesIcon, ArrowRightIcon, 
    CheckIcon, VideoCameraIcon, DocumentTextIcon, LogoIcon, 
    TrendingUpIcon, RssIcon, BrainIcon, GlobeIcon,
    PhotoIcon, ChartIcon, DownloadIcon
} from '../icons';

interface HomePageProps {
    onEnter: () => void;
}

// --- 1. 全局背景：动态光斑 ---
const BackgroundBlobs: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        {/* Noise Texture */}
        <div className="absolute inset-0 z-0 opacity-[0.04] mix-blend-overlay" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>
        
        {/* Animated Blobs */}
        <div className="absolute top-[-10%] left-[10%] w-[45rem] h-[45rem] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[10%] w-[40rem] h-[40rem] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[30%] w-[50rem] h-[50rem] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
        
        <style>{`
            @keyframes blob {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob {
                animation: blob 10s infinite;
            }
            .animation-delay-2000 {
                animation-delay: 2s;
            }
            .animation-delay-4000 {
                animation-delay: 4s;
            }
        `}</style>
    </div>
);

// --- 2. Hero区域特效：五彩粒子汇聚流 ---
const HeroParticleConvergence: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <svg className="w-full h-full opacity-80" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* 路径定义：从屏幕边缘汇聚到中心上方标题位置 (约 50% x, 35% y) */}
                <path id="hero-p1" d="M 0,100 Q 300,200 50%,35%" fill="none" />
                <path id="hero-p2" d="M 0,600 Q 300,400 50%,35%" fill="none" />
                <path id="hero-p3" d="M 100%,100 Q calc(100% - 300px),200 50%,35%" fill="none" />
                <path id="hero-p4" d="M 100%,600 Q calc(100% - 300px),400 50%,35%" fill="none" />
                <path id="hero-p5" d="M 50%,0 Q 50%,200 50%,35%" fill="none" />

                {/* 粒子群 */}
                <g filter="url(#glow-strong)">
                    {/* Red Stream */}
                    <circle r="4" fill="#ef4444">
                        <animateMotion dur="3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p1"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="r" values="2;5;0" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3" fill="#f87171" opacity="0.6">
                        <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p1"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
                    </circle>

                    {/* Blue Stream */}
                    <circle r="4" fill="#3b82f6">
                        <animateMotion dur="4s" begin="0.5s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p3"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
                    </circle>

                    {/* Purple Stream */}
                    <circle r="5" fill="#a855f7">
                        <animateMotion dur="5s" begin="0s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p2"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="5s" repeatCount="indefinite" />
                    </circle>

                    {/* Green Stream */}
                    <circle r="4" fill="#10b981">
                        <animateMotion dur="3.5s" begin="1s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p4"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="3.5s" repeatCount="indefinite" />
                    </circle>
                    
                    {/* Yellow/Orange Stream */}
                    <circle r="4" fill="#f59e0b">
                        <animateMotion dur="4.5s" begin="2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p5"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="4.5s" repeatCount="indefinite" />
                    </circle>
                </g>
            </svg>
        </div>
    );
};

// --- 3. 视觉核心组件：AI 智能情报工厂 ---
const DataProcessingVisual: React.FC = () => {
    // Raw Data Items
    const rawData = [
        { icon: VideoCameraIcon, text: "发布会.mp4", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
        { icon: DocumentTextIcon, text: "技术白皮书.pdf", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        { icon: GlobeIcon, text: "财报会议", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        { icon: RssIcon, text: "论坛舆情.json", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
        { icon: ChartIcon, text: "销量数据.xlsx", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
        { icon: PhotoIcon, text: "新车谍照.jpg", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    ];
    // Duplicate for infinite scroll illusion
    const rawDataStream = [...rawData, ...rawData, ...rawData];

    // Deliverables
    const insights = [
        { type: "PPT", title: "智能座舱趋势.ppt", desc: "20页图表分析", color: "bg-orange-100 text-orange-700" },
        { type: "PDF", title: "竞品深度对标.pdf", desc: "深度参数对比", color: "bg-red-100 text-red-700" },
        { type: "DOC", title: "本周舆情综述.docx", desc: "关键事件汇总", color: "bg-blue-100 text-blue-700" },
        { type: "XLS", title: "渗透率预测.csv", desc: "原始数据表", color: "bg-green-100 text-green-700" },
    ];
    const insightsStream = [...insights, ...insights, ...insights];

    return (
        <div className="relative w-full max-w-6xl mx-auto mt-12 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row h-[650px] md:h-[520px] ring-1 ring-white/80 z-20 group">
            
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] opacity-50 pointer-events-none"></div>

            {/* 
                ========================================
                SVG DATA FLOW LAYER (Absolute Overlay) 
                ========================================
                This layer sits on top of the background but below the content text.
                It draws lines FROM the Left Column TO the Center Core, and TO the Right Column.
            */}
            <div className="absolute inset-0 z-10 pointer-events-none w-full h-full">
                <svg className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
                            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
                        </linearGradient>
                        <linearGradient id="flow-gradient-vertical" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
                            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
                        </linearGradient>
                        <filter id="glow-line">
                            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* --- DESKTOP CONNECTIONS (Horizontal) --- */}
                    {/* viewBox logic: 0..1200 width, 0..520 height. Center is 600, 260. Left Edge ~350. Right Edge ~850. */}
                    <g className="hidden md:block" opacity="0.6">
                        {/* Left -> Center Paths (Multiple entry points) */}
                        {[80, 160, 240, 320, 400].map((y, i) => (
                            <path 
                                key={`in-${i}`}
                                d={`M 330,${y} C 450,${y} 450,260 600,260`} 
                                fill="none" 
                                stroke="url(#flow-gradient)" 
                                strokeWidth="1.5"
                                strokeDasharray="6 6"
                                filter="url(#glow-line)"
                            >
                                <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                            </path>
                        ))}

                        {/* Center -> Right Paths (Multiple exit points) */}
                        {[80, 160, 240, 320, 400].map((y, i) => (
                            <path 
                                key={`out-${i}`}
                                d={`M 600,260 C 750,260 750,${y} 870,${y}`} 
                                fill="none" 
                                stroke="url(#flow-gradient)" 
                                strokeWidth="1.5"
                                strokeDasharray="6 6"
                                filter="url(#glow-line)"
                            >
                                <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                            </path>
                        ))}
                        
                        {/* Particles flowing */}
                        <circle r="3" fill="#3b82f6">
                            <animateMotion dur="2s" repeatCount="indefinite" path="M 330,160 C 450,160 450,260 600,260" />
                        </circle>
                        <circle r="3" fill="#22d3ee">
                            <animateMotion dur="2.5s" begin="0.5s" repeatCount="indefinite" path="M 330,320 C 450,320 450,260 600,260" />
                        </circle>
                        <circle r="3" fill="#10b981">
                            <animateMotion dur="2s" repeatCount="indefinite" path="M 600,260 C 750,260 750,160 870,160" />
                        </circle>
                        <circle r="3" fill="#a855f7">
                            <animateMotion dur="2.5s" begin="0.5s" repeatCount="indefinite" path="M 600,260 C 750,260 750,320 870,320" />
                        </circle>
                    </g>

                    {/* --- MOBILE CONNECTIONS (Vertical) --- */}
                    {/* Mobile Height is ~650px. Input Top ~120. Center ~325. Output Bottom ~530. */}
                    <g className="md:hidden" opacity="0.6">
                        {/* Top -> Center */}
                        {[20, 50, 80].map((offset, i) => (
                            <path 
                                key={`m-in-${i}`}
                                d={`M ${100 + offset * 2},130 C ${100 + offset * 2},200 50%,250 50%,325`}
                                fill="none"
                                stroke="url(#flow-gradient-vertical)"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                            >
                                <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1s" repeatCount="indefinite" />
                            </path>
                        ))}

                        {/* Center -> Bottom */}
                        {[20, 50, 80].map((offset, i) => (
                            <path 
                                key={`m-out-${i}`}
                                d={`M 50%,325 C 50%,400 ${100 + offset * 2},450 ${100 + offset * 2},530`}
                                fill="none"
                                stroke="url(#flow-gradient-vertical)"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                            >
                                <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
                            </path>
                        ))}
                    </g>
                </svg>
            </div>

            {/* --- Left/Top: Raw Data Stream --- */}
            <div className="w-full md:w-[28%] h-32 md:h-full bg-slate-50/50 border-b md:border-b-0 md:border-r border-gray-200/50 relative z-20 flex flex-col">
                <div className="absolute top-0 left-0 p-3 bg-white/80 backdrop-blur-sm z-30 shadow-sm border-b border-gray-100 w-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RAW DATA STREAM</h3>
                </div>
                
                {/* Desktop Vertical Scroll */}
                <div className="hidden md:block flex-1 relative overflow-hidden mask-gradient-vertical">
                    <div className="absolute inset-x-0 animate-scroll-up space-y-3 p-4 pt-16 w-full">
                        {rawDataStream.map((item, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 bg-white rounded-xl border ${item.border} shadow-sm transform transition-all hover:scale-102 hover:shadow-md`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg} ${item.color}`}>
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 truncate">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile Horizontal Scroll */}
                <div className="md:hidden flex-1 relative overflow-hidden flex items-center mask-gradient-horizontal pt-8">
                    <div className="flex animate-scroll-left gap-3 px-4">
                        {rawDataStream.map((item, i) => (
                            <div key={`mob-${i}`} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm min-w-[140px]">
                                <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${item.bg} ${item.color}`}>
                                    <item.icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 truncate">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- Center: AI Neural Core --- */}
            <div className="flex-1 relative flex items-center justify-center bg-transparent z-20">
                <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
                    {/* Pulsing Rings */}
                    <div className="absolute inset-0 border border-blue-100/50 rounded-full animate-ping-slow"></div>
                    <div className="absolute inset-4 border border-blue-200 rounded-full animate-spin-slow-reverse"></div>
                    <div className="absolute inset-8 border-2 border-dashed border-blue-300 rounded-full animate-spin-medium"></div>
                    <div className="absolute inset-0 bg-blue-500/10 rounded-full filter blur-2xl animate-pulse"></div>
                    
                    {/* Central Chip */}
                    <div className="relative z-30 w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center border border-blue-50 transform rotate-45">
                        <span className="transform -rotate-45 text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600 font-black text-2xl md:text-3xl font-mono">AI</span>
                    </div>
                    
                    {/* Floating Orbiting Dots */}
                    <div className="absolute inset-0 animate-spin-slow pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                    </div>
                </div>
                <div className="absolute bottom-8 md:bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-blue-200 text-blue-700 text-[10px] font-bold shadow-sm">
                        <SparklesIcon className="w-3 h-3 animate-spin-slow text-blue-500" />
                        NEURAL ENGINE ACTIVE
                    </div>
                </div>
            </div>

            {/* --- Right/Bottom: Structured Insights --- */}
            <div className="w-full md:w-[28%] h-48 md:h-full bg-slate-50/50 border-t md:border-t-0 md:border-l border-gray-200/50 relative z-20 flex flex-col">
                <div className="absolute top-0 left-0 p-3 bg-white/80 backdrop-blur-sm z-30 shadow-sm border-b border-gray-100 w-full flex items-center justify-end gap-2">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">INSIGHTS</h3>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>

                {/* Vertical Scroll (Both Mobile/Desktop - Mobile height is larger here) */}
                <div className="flex-1 relative overflow-hidden mask-gradient-vertical">
                    <div className="absolute inset-x-0 animate-scroll-up space-y-3 p-4 pt-16 w-full">
                        {insightsStream.map((item, i) => (
                            <div 
                                key={i}
                                className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 group cursor-pointer"
                            >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0 ${item.color}`}>
                                    {item.type}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate leading-tight mb-1 group-hover:text-blue-600">{item.title}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                                </div>
                                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                                    <DownloadIcon className="w-4 h-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .mask-gradient-vertical {
                    mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
                }
                .mask-gradient-horizontal {
                    mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
                }
                @keyframes scroll-up {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                @keyframes scroll-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scroll-up {
                    animation: scroll-up 30s linear infinite;
                }
                .animate-scroll-left {
                    animation: scroll-left 25s linear infinite;
                }
                .animate-spin-slow { animation: spin 10s linear infinite; }
                .animate-spin-medium { animation: spin 4s linear infinite; }
                .animate-spin-slow-reverse { animation: spin 15s linear infinite reverse; }
                .animate-ping-slow { animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                /* SVG specific styling */
                svg { overflow: visible; }
            `}</style>
        </div>
    );
};

// --- 辅助组件：滚动显现 ---
const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={ref} 
            className={`transition-all duration-1000 ease-out transform ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// --- 辅助组件：Bento Grid Card ---
const BentoCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    className?: string;
    delay?: number;
}> = ({ title, desc, icon, className = "", delay = 0 }) => (
    <div 
        className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 transition-all duration-500 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 ${className}`}
        style={{ transitionDelay: `${delay}ms` }}
    >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:bg-blue-100/50"></div>
        <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-blue-600 shadow-sm ring-1 ring-slate-900/5 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    {icon}
                </div>
                <h3 className="mb-3 text-lg sm:text-xl font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500 group-hover:text-slate-600">{desc}</p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                了解更多 <ArrowRightIcon className="ml-1 w-4 h-4" />
            </div>
        </div>
    </div>
);

// --- 主页面组件 ---
export const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
            
            {/* --- 全局背景 --- */}
            <BackgroundBlobs />
            
            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-visible z-10">
                
                {/* 粒子汇聚特效层 (绝对定位) */}
                <HeroParticleConvergence />

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    
                    {/* Tagline */}
                    <ScrollReveal>
                        <div className="mx-auto mb-8 inline-flex items-center rounded-full border border-blue-100 bg-white/80 backdrop-blur-sm px-4 py-1.5 shadow-sm ring-1 ring-blue-50">
                            <span className="flex h-2 w-2 mr-2 relative">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-blue-700 tracking-wide uppercase">AUTOMOTIVE INTELLIGENCE AUTOMATION</span>
                        </div>
                    </ScrollReveal>

                    {/* Main Headline */}
                    <ScrollReveal delay={100}>
                        <h1 className="mx-auto max-w-5xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.1] drop-shadow-sm">
                            全域情报自动精炼，
                            <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                                AI 实时交付决策研报
                            </span>
                        </h1>
                    </ScrollReveal>

                    {/* Subhead */}
                    <ScrollReveal delay={200}>
                        <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg text-slate-600 leading-relaxed px-4 font-medium">
                            <strong className="text-slate-900 font-bold">专为汽车行业打造。</strong> 覆盖 
                            <span className="inline-block mx-1 text-blue-700 font-bold bg-white/50 px-1.5 rounded border border-blue-100 shadow-sm text-sm">前沿技术趋势</span>、
                            <span className="inline-block mx-1 text-blue-700 font-bold bg-white/50 px-1.5 rounded border border-blue-100 shadow-sm text-sm">竞品动态追踪</span> 与 
                            <span className="inline-block mx-1 text-blue-700 font-bold bg-white/50 px-1.5 rounded border border-blue-100 shadow-sm text-sm">市场舆情监控</span>。
                            <br className="hidden sm:inline"/>
                            告别繁琐的人工搜集，AI 为您完成从 <strong>全网感知、数据清洗到结构化报告</strong> 的最后一公里。
                        </p>
                    </ScrollReveal>

                    {/* Visual Core */}
                    <ScrollReveal delay={300}>
                        <DataProcessingVisual />
                    </ScrollReveal>

                    {/* CTA Buttons */}
                    <ScrollReveal delay={400}>
                        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row px-4">
                            <button
                                onClick={onEnter}
                                className="w-full sm:w-auto group relative inline-flex h-12 sm:h-14 items-center justify-center overflow-hidden rounded-full bg-slate-900 px-8 sm:px-10 font-medium text-white shadow-xl shadow-slate-900/20 transition-all duration-300 hover:bg-blue-600 hover:scale-105 hover:shadow-blue-600/30 focus:outline-none"
                            >
                                <span className="mr-2 text-base sm:text-lg">进入工作台</span>
                                <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>
                            <button className="w-full sm:w-auto inline-flex h-12 sm:h-14 items-center justify-center rounded-full border border-slate-200 bg-white/80 backdrop-blur px-8 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 focus:outline-none">
                                <VideoCameraIcon className="mr-2 h-5 w-5 text-slate-500" />
                                观看演示
                            </button>
                        </div>
                        <p className="mt-4 text-xs sm:text-sm text-slate-400">无需信用卡 · 免费试用核心功能</p>
                    </ScrollReveal>
                </div>
            </section>

            {/* --- Features Section (Bento Grid) --- */}
            <section className="relative py-20 sm:py-24 border-t border-slate-200/60 bg-white/50 backdrop-blur-lg">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">不只是搜索，是全流程的智能代劳</h2>
                        <p className="mt-4 text-base sm:text-lg text-slate-600">我们将分析师的思维模型代码化，为您提供 24/7 的情报服务</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 auto-rows-fr">
                        
                        {/* Feature 1: Large Vertical */}
                        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
                            <BentoCard 
                                title="全自动事件解读" 
                                desc="发布会直播刚结束，深度报告已生成。AI 自动分段录制、抽帧分析、提取关键参数。您无需守在屏幕前，我们帮您看，帮您记，帮您总结。"
                                icon={<VideoCameraIcon className="w-6 h-6" />}
                                className="h-full bg-white"
                                delay={100}
                            />
                        </div>

                        {/* Feature 2: Wide Horizontal */}
                        <div className="sm:col-span-2 lg:col-span-2 lg:row-span-1">
                            <BentoCard 
                                title="深度洞察专题" 
                                desc="针对特定技术路线（如固态电池、NOA）的持续追踪。像维基百科一样自我更新的活文档，自动关联全网最新证据链，助您看清技术演进方向。"
                                icon={<DiveIcon className="w-6 h-6" />}
                                className="h-full bg-gradient-to-br from-white to-blue-50/30"
                                delay={200}
                            />
                        </div>

                        {/* Feature 3: Standard */}
                        <div className="sm:col-span-1 lg:row-span-1">
                            <BentoCard 
                                title="AI 报告生成" 
                                desc="一句话生成结构化研报。支持上传私有文档进行增强分析，快速输出 PPT 大纲。"
                                icon={<SparklesIcon className="w-6 h-6" />}
                                className="h-full bg-white"
                                delay={300}
                            />
                        </div>

                        {/* Feature 4: Standard */}
                        <div className="sm:col-span-1 lg:row-span-1">
                            <BentoCard 
                                title="实时情报雷达" 
                                desc="全天候监控竞对动态、政策法规与舆情风向。自动去重、摘要，早报推送到手。"
                                icon={<FeedIcon className="w-6 h-6" />}
                                className="h-full bg-white"
                                delay={400}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Value Proposition Section --- */}
            <section className="py-20 sm:py-24 bg-slate-50/80 border-t border-slate-200 relative">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">为专业决策者设计</h2>
                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                        <BrainIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">战略规划专家</h3>
                                        <p className="mt-1 text-slate-600 text-sm sm:text-base">缩短 90% 的信息收集时间，将精力聚焦于推演与判断，而非数据搬运。</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                        <TrendingUpIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">市场/公关总监</h3>
                                        <p className="mt-1 text-slate-600 text-sm sm:text-base">比竞争对手提前 48 小时捕获关键商机与风险信号，从被动应对转为主动出击。</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                        <ChartIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">证券行业分析师</h3>
                                        <p className="mt-1 text-slate-600 text-sm sm:text-base">自动过滤 99% 的市场噪音，建立基于事实的完整证据链，直达核心逻辑。</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Side Visual */}
                        <div className="relative mt-8 lg:mt-0">
                            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-10 blur-2xl"></div>
                            <div className="relative bg-white/80 backdrop-blur border border-white/50 rounded-2xl p-6 sm:p-8 shadow-xl ring-1 ring-black/5">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">AI</div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">智能情报助手</div>
                                            <div className="text-xs text-slate-500">刚刚 • AI 生成完毕</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                        <CheckIcon className="w-3 h-3" /> 已验证
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex gap-4 mt-4">
                                        <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-red-600">PDF</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">小米SU7 vs Model 3 深度对标.pdf</div>
                                            <div className="text-xs text-slate-500 mt-1">12.5 MB • 包含 35 页详细分析</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 text-center border-t border-slate-200 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4 text-slate-400">
                    <LogoIcon className="w-6 h-6 text-slate-400"/>
                    <span className="font-bold text-lg text-slate-500">情报平台</span>
                </div>
                <p className="text-sm text-slate-400">
                    &copy; 2024 Automotive Intelligence Platform. All rights reserved.
                </p>
            </footer>
        </div>
    );
};
