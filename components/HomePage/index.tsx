
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

// --- 视觉组件：AI 智能情报工厂 (The Intelligence Factory) ---
const DataProcessingVisual: React.FC = () => {
    
    // 1. 左侧：原始数据 (Raw Data)
    const rawData = [
        { icon: VideoCameraIcon, text: "小米SU7发布会.mp4", color: "text-red-600", bg: "bg-red-50" },
        { icon: DocumentTextIcon, text: "固态电池专利.pdf", color: "text-blue-600", bg: "bg-blue-50" },
        { icon: GlobeIcon, text: "特斯拉Q3财报会议", color: "text-emerald-600", bg: "bg-emerald-50" },
        { icon: RssIcon, text: "车主论坛舆情.json", color: "text-orange-600", bg: "bg-orange-50" },
        { icon: ChartIcon, text: "4月销量数据.xlsx", color: "text-green-600", bg: "bg-green-50" },
        { icon: PhotoIcon, text: "极氪001谍照.jpg", color: "text-purple-600", bg: "bg-purple-50" },
    ];
    // 为了无限滚动，复制几份数据
    const rawDataStream = [...rawData, ...rawData, ...rawData, ...rawData];

    // 3. 右侧：成品交付物 (Deliverables)
    const insights = [
        { type: "PPT", title: "智能座舱趋势洞察.ppt", desc: "20页图表分析", color: "bg-orange-100 text-orange-700" },
        { type: "PDF", title: "小米 vs 特斯拉对标.pdf", desc: "深度参数对比", color: "bg-red-100 text-red-700" },
        { type: "DOC", title: "本周舆情综述.docx", desc: "关键事件汇总", color: "bg-blue-100 text-blue-700" },
        { type: "XLS", title: "渗透率预测模型.csv", desc: "原始数据表", color: "bg-green-100 text-green-700" },
        { type: "PDF", title: "华为智驾技术白皮书.pdf", desc: "技术路线拆解", color: "bg-red-100 text-red-700" },
    ];
    const insightsStream = [...insights, ...insights, ...insights, ...insights];

    return (
        <div className="relative w-full max-w-6xl mx-auto mt-16 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-blue-900/10 overflow-hidden flex flex-col md:flex-row h-[500px] md:h-[460px]">
            
            {/* 背景网格 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 pointer-events-none"></div>

            {/* --- 左侧：全源数据接入 (Ingestion) --- */}
            <div className="w-full md:w-[28%] bg-slate-50/50 border-r border-slate-100 relative flex flex-col z-10">
                <div className="p-4 border-b border-slate-100 bg-white/90 backdrop-blur z-20 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </div>
                        RAW DATA STREAM
                    </h3>
                </div>
                
                {/* 垂直无限滚动 */}
                <div className="flex-1 relative overflow-hidden mask-gradient-vertical">
                    <div className="absolute inset-x-0 animate-scroll-up space-y-3 p-4 w-full">
                        {rawDataStream.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm transform transition-all hover:scale-102 hover:shadow-md hover:border-blue-200">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg} ${item.color}`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-semibold text-slate-600 truncate flex-1">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- 中间：Sci-Fi AI Core (The Reactor) --- */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-0 overflow-hidden bg-gradient-to-b from-white via-blue-50/30 to-white">
                
                {/* 光晕背景 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-3xl animate-pulse-slow"></div>

                {/* 复杂的 SVG 动画核心 */}
                <div className="relative w-full h-full max-w-lg">
                    <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            {/* 渐变定义 */}
                            <linearGradient id="beam-grad-left" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
                            </linearGradient>
                            <linearGradient id="beam-grad-right" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                            <filter id="glow-core">
                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        {/* --- 连线路径 (贝塞尔曲线) --- */}
                        {/* 左侧输入路径 */}
                        <path id="path-in-1" d="M 0,60 C 100,60 100,150 200,150" fill="none" stroke="url(#beam-grad-left)" strokeWidth="1" strokeOpacity="0.3" />
                        <path id="path-in-2" d="M 0,150 C 80,150 120,150 200,150" fill="none" stroke="url(#beam-grad-left)" strokeWidth="1" strokeOpacity="0.3" />
                        <path id="path-in-3" d="M 0,240 C 100,240 100,150 200,150" fill="none" stroke="url(#beam-grad-left)" strokeWidth="1" strokeOpacity="0.3" />

                        {/* 右侧输出路径 */}
                        <path id="path-out-1" d="M 200,150 C 300,150 300,60 400,60" fill="none" stroke="url(#beam-grad-right)" strokeWidth="1" strokeOpacity="0.3" />
                        <path id="path-out-2" d="M 200,150 C 320,150 320,150 400,150" fill="none" stroke="url(#beam-grad-right)" strokeWidth="1" strokeOpacity="0.3" />
                        <path id="path-out-3" d="M 200,150 C 300,150 300,240 400,240" fill="none" stroke="url(#beam-grad-right)" strokeWidth="1" strokeOpacity="0.3" />

                        {/* --- 粒子流动画 (Traffic) --- */}
                        {/* 输入粒子 */}
                        <circle r="3" fill="#3b82f6" filter="url(#glow-core)">
                            <animateMotion dur="3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                                <mpath href="#path-in-1"/>
                            </animateMotion>
                            <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
                        </circle>
                        <circle r="2" fill="#60a5fa" filter="url(#glow-core)">
                            <animateMotion dur="2.5s" begin="1s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                                <mpath href="#path-in-2"/>
                            </animateMotion>
                            <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite"/>
                        </circle>
                        <circle r="3" fill="#2563eb" filter="url(#glow-core)">
                            <animateMotion dur="3.5s" begin="0.5s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                                <mpath href="#path-in-3"/>
                            </animateMotion>
                            <animate attributeName="opacity" values="0;1;0" dur="3.5s" repeatCount="indefinite"/>
                        </circle>

                        {/* 输出粒子 */}
                        <circle r="3" fill="#10b981" filter="url(#glow-core)">
                            <animateMotion dur="3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                                <mpath href="#path-out-1"/>
                            </animateMotion>
                            <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
                        </circle>
                        <circle r="2" fill="#34d399" filter="url(#glow-core)">
                            <animateMotion dur="2.5s" begin="0.8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                                <mpath href="#path-out-2"/>
                            </animateMotion>
                            <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite"/>
                        </circle>
                        <circle r="3" fill="#059669" filter="url(#glow-core)">
                            <animateMotion dur="3.2s" begin="0.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                                <mpath href="#path-out-3"/>
                            </animateMotion>
                            <animate attributeName="opacity" values="0;1;0" dur="3.2s" repeatCount="indefinite"/>
                        </circle>

                        {/* --- 中央 AI 核心 (Core) --- */}
                        <g transform="translate(200, 150)">
                            {/* 外圈：慢速反向旋转 */}
                            <circle r="55" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="20 10" className="animate-spin-slow-reverse" opacity="0.6" />
                            
                            {/* 中圈：中速旋转扫描 */}
                            <circle r="42" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="60 100" strokeLinecap="round" className="animate-spin-medium" filter="url(#glow-core)" opacity="0.8" />
                            
                            {/* 内圈：快速脉冲 */}
                            <circle r="30" fill="#eff6ff" stroke="#60a5fa" strokeWidth="1" className="animate-pulse-fast" />
                            
                            {/* 核心文本 */}
                            <text x="0" y="5" textAnchor="middle" fill="#1d4ed8" fontSize="14" fontWeight="800" style={{fontFamily: 'monospace'}}>AI</text>
                        </g>
                    </svg>
                </div>

                {/* 状态标签 */}
                <div className="absolute bottom-8 z-20">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-blue-100 text-blue-700 text-xs font-bold shadow-lg">
                        <SparklesIcon className="w-3.5 h-3.5 animate-spin-slow" />
                        NEURAL PROCESSING
                    </div>
                </div>
            </div>

            {/* --- 右侧：成品交付 (Actionable Insights) --- */}
            <div className="w-full md:w-[28%] bg-slate-50/50 border-l border-slate-100 relative flex flex-col z-10">
                <div className="p-4 border-b border-slate-100 bg-white/90 backdrop-blur z-20 shadow-sm text-right">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-end gap-2">
                        ACTIONABLE INSIGHTS
                        <div className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </div>
                    </h3>
                </div>

                {/* 垂直无限滚动 (同步) */}
                <div className="flex-1 relative overflow-hidden mask-gradient-vertical">
                    <div className="absolute inset-x-0 animate-scroll-up space-y-4 p-4 w-full" style={{ animationDelay: '-2s' }}> {/* Offset to look organic */}
                        {insightsStream.map((item, i) => (
                            <div 
                                key={i}
                                className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-md hover:border-green-200 hover:-translate-y-1 group cursor-pointer"
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0 ${item.color} border border-white`}>
                                    {item.type}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800 truncate leading-tight mb-1 group-hover:text-blue-600">{item.title}</div>
                                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                                </div>
                                <button className="text-slate-300 hover:text-blue-600 transition-colors self-center opacity-0 group-hover:opacity-100">
                                    <DownloadIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .mask-gradient-vertical {
                    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
                }
                @keyframes scroll-up {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                .animate-scroll-up {
                    animation: scroll-up 30s linear infinite;
                }
                /* Custom Animation Speeds */
                .animate-spin-slow { animation: spin 10s linear infinite; }
                .animate-spin-medium { animation: spin 3s linear infinite; }
                .animate-spin-slow-reverse { animation: spin 15s linear infinite reverse; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .animate-pulse-fast { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
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
        className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-500 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 ${className}`}
        style={{ transitionDelay: `${delay}ms` }}
    >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:bg-blue-100/50"></div>
        <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-blue-600 shadow-sm ring-1 ring-slate-900/5 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    {icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500 group-hover:text-slate-600">{desc}</p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                了解更多 <ArrowRightIcon className="ml-1 w-4 h-4" />
            </div>
        </div>
    </div>
);

// --- 图标组件 (Internal Helper for those not in main icons file) ---
const FunnelIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm4-11h-2.53l-2.53 4.23a.93.93 0 0 1-.76.47h-.05a.94.94 0 0 1-.77-.49L6.64 9H4.1l3.7 6h8.32Z"/></svg>
);
const ViewGridIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
);


// --- 主页面组件 ---
export const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
    return (
        <div className="min-h-screen w-full bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            
            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
                
                {/* Background Elements */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-50 to-transparent opacity-60 rounded-[100%] blur-3xl"></div>
                </div>

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    
                    {/* Tagline */}
                    <ScrollReveal>
                        <div className="mx-auto mb-8 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5">
                            <span className="flex h-2 w-2 mr-2 relative">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                            <span className="text-xs font-bold text-blue-700 tracking-wide uppercase">Intelligence as a Service</span>
                        </div>
                    </ScrollReveal>

                    {/* Main Headline */}
                    <ScrollReveal delay={100}>
                        <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl leading-tight">
                            您定义目标，
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mx-2">
                                AI 交付结果
                            </span>
                        </h1>
                    </ScrollReveal>

                    {/* Subhead */}
                    <ScrollReveal delay={200}>
                        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
                            告别繁琐的信息搜集与手动整理。
                            <br className="hidden sm:block" />
                            从海量数据到开箱即用的决策报告，我们为您省去中间的每一步。
                        </p>
                    </ScrollReveal>

                    {/* Visual Core */}
                    <ScrollReveal delay={300}>
                        <DataProcessingVisual />
                    </ScrollReveal>

                    {/* CTA Buttons */}
                    <ScrollReveal delay={400}>
                        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <button
                                onClick={onEnter}
                                className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-slate-900 px-10 font-medium text-white shadow-2xl shadow-slate-900/30 transition-all duration-300 hover:bg-blue-600 hover:scale-105 hover:shadow-blue-500/40 focus:outline-none"
                            >
                                <span className="mr-2 text-lg">进入工作台</span>
                                <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>
                            <button className="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white px-8 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none">
                                <VideoCameraIcon className="mr-2 h-5 w-5 text-slate-500" />
                                观看演示
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-slate-400">无需信用卡 · 免费试用核心功能</p>
                    </ScrollReveal>
                </div>
            </section>

            {/* --- Features Section (Bento Grid) --- */}
            <section className="relative py-24 bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900">不只是搜索，是全流程的智能代劳</h2>
                        <p className="mt-4 text-lg text-slate-600">我们将分析师的思维模型代码化，为您提供 24/7 的情报服务</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-rows-2 h-auto lg:h-[600px]">
                        
                        {/* Feature 1: Large Vertical */}
                        <div className="sm:col-span-1 lg:row-span-2">
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
                                className="h-full bg-gradient-to-br from-white to-blue-50"
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
            <section className="py-24 bg-white border-t border-slate-100">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">为专业决策者设计</h2>
                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                        <BrainIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">战略规划专家</h3>
                                        <p className="mt-1 text-slate-600">缩短 90% 的信息收集时间，将精力聚焦于推演与判断，而非数据搬运。</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                        <TrendingUpIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">市场/公关总监</h3>
                                        <p className="mt-1 text-slate-600">比竞争对手提前 48 小时捕获关键商机与风险信号，从被动应对转为主动出击。</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                        <ChartIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">证券行业分析师</h3>
                                        <p className="mt-1 text-slate-600">自动过滤 99% 的市场噪音，建立基于事实的完整证据链，直达核心逻辑。</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Side Visual */}
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 blur-xl"></div>
                            <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">AI</div>
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
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                    <div className="p-4 bg-white border border-slate-200 rounded-xl flex gap-4 mt-4">
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
            <footer className="bg-slate-50 py-12 text-center border-t border-slate-200">
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
