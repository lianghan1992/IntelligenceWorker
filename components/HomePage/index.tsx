
import React, { useEffect, useRef, useState } from 'react';
import { 
    FeedIcon, DiveIcon, SparklesIcon, ArrowRightIcon, 
    CheckIcon, VideoCameraIcon, DocumentTextIcon, LogoIcon, 
    TrendingUpIcon, RssIcon, BrainIcon, GlobeIcon,
    PhotoIcon, ChartIcon, DownloadIcon, EyeIcon, ShieldCheckIcon, ClockIcon
} from '../icons';
import { ProductDemoModal } from './ProductDemoModal'; // Import the new component

interface HomePageProps {
    onEnter: () => void;
}

// ... (Keep BackgroundBlobs, HeroParticleConvergence, DataProcessingVisual, Mock components, FeatureSection, ScrollReveal unchanged) ...
// To save space in response, I assume the SVG/Mock components are preserved. 
// I will only output the main HomePage component update logic.

// --- 1. 全局背景：动态光斑 (优化版) ---
const BackgroundBlobs: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute inset-0 z-0 opacity-[0.02]" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>
        <div className="absolute top-[-10%] left-[10%] w-[45rem] h-[45rem] bg-indigo-200/30 rounded-full filter blur-[60px] opacity-60 animate-blob will-change-transform"></div>
        <div className="absolute top-[-10%] right-[10%] w-[40rem] h-[40rem] bg-purple-200/30 rounded-full filter blur-[60px] opacity-60 animate-blob animation-delay-2000 will-change-transform"></div>
        <div className="absolute bottom-[-20%] left-[30%] w-[50rem] h-[50rem] bg-blue-200/30 rounded-full filter blur-[60px] opacity-60 animate-blob animation-delay-4000 will-change-transform"></div>
        <style>{`
            @keyframes blob {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob {
                animation: blob 20s infinite;
            }
            .animation-delay-2000 {
                animation-delay: 2s;
            }
            .animation-delay-4000 {
                animation-delay: 4s;
            }
            .will-change-transform {
                will-change: transform;
            }
        `}</style>
    </div>
);

// --- 2. Hero区域特效 ---
const HeroParticleConvergence: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <svg className="w-full h-full opacity-80" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
                <path id="hero-p1" d="M 0,100 Q 360,200 720,300" fill="none" />
                <path id="hero-p2" d="M 0,700 Q 360,500 720,300" fill="none" />
                <path id="hero-p3" d="M 1440,100 Q 1080,200 720,300" fill="none" />
                <path id="hero-p4" d="M 1440,700 Q 1080,500 720,300" fill="none" />
                <path id="hero-p5" d="M 720,-50 Q 720,150 720,300" fill="none" />
                <g>
                    <circle r="4" fill="#ef4444" opacity="0.8"><animateMotion dur="3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1"><mpath href="#hero-p1"/></animateMotion><animate attributeName="opacity" values="0;0.8;0" dur="3s" repeatCount="indefinite" /></circle>
                    <circle r="4" fill="#3b82f6" opacity="0.8"><animateMotion dur="4s" begin="0.5s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1"><mpath href="#hero-p3"/></animateMotion><animate attributeName="opacity" values="0;0.8;0" dur="4s" repeatCount="indefinite" /></circle>
                    <circle r="5" fill="#a855f7" opacity="0.8"><animateMotion dur="5s" begin="0s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1"><mpath href="#hero-p2"/></animateMotion><animate attributeName="opacity" values="0;0.8;0" dur="5s" repeatCount="indefinite" /></circle>
                </g>
            </svg>
        </div>
    );
};

// --- 3. Visual Components ---
const DataProcessingVisual: React.FC = () => {
    const rawDataStream = [
        { icon: VideoCameraIcon, text: "发布会.mp4", color: "text-red-600", bg: "bg-red-50" },
        { icon: DocumentTextIcon, text: "技术白皮书.pdf", color: "text-blue-600", bg: "bg-blue-50" },
        { icon: GlobeIcon, text: "财报会议", color: "text-emerald-600", bg: "bg-emerald-50" },
        { icon: RssIcon, text: "论坛舆情.json", color: "text-orange-600", bg: "bg-orange-50" },
    ];
    const insightsStream = [
        { type: "PPT", title: "智能座舱趋势.ppt", desc: "20页图表分析", color: "bg-orange-100 text-orange-700" },
        { type: "PDF", title: "竞品深度对标.pdf", desc: "深度参数对比", color: "bg-red-100 text-red-700" },
        { type: "DOC", title: "本周舆情综述.docx", desc: "关键事件汇总", color: "bg-blue-100 text-blue-700" },
    ];

    return (
        <div className="relative w-full max-w-7xl mx-auto mt-16 flex flex-col md:flex-row h-[500px] md:h-[450px] z-20 group items-center justify-between gap-4 md:gap-12">
            <div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
                <svg className="w-full h-full overflow-visible">
                     <defs>
                        <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
                            <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d="M 300,225 C 450,225 400,225 640,225" fill="none" stroke="url(#flow-gradient)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
                </svg>
            </div>
            <div className="w-full md:w-[300px] h-40 md:h-full relative z-10">
                <div className="absolute -top-8 left-0 w-full text-center md:text-left"><span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-[0.2em] animate-pulse">Raw Data Stream</span></div>
                <div className="h-full w-full overflow-hidden mask-gradient-vertical">
                    <div className="animate-scroll-up space-y-4 p-2 w-full">
                        {[...rawDataStream, ...rawDataStream, ...rawDataStream].map((item, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl backdrop-blur-md border bg-white/40 border-white/50 shadow-sm transform transition-all hover:scale-105 hover:bg-white/60 ${i % 2 === 0 ? 'md:mr-8' : 'md:ml-4'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white shadow-inner ${item.color}`}><item.icon className="w-4 h-4" /></div>
                                <span className="text-xs font-semibold text-slate-700 truncate">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 relative flex items-center justify-center z-20">
                <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
                    <div className="absolute inset-0 border border-indigo-100/50 rounded-full animate-ping-slow"></div>
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-full filter blur-3xl animate-pulse"></div>
                    <div className="relative z-30 w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.4)] flex items-center justify-center border border-indigo-50 transform rotate-45">
                        <span className="transform -rotate-45 text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 font-black text-2xl md:text-3xl font-mono">AI</span>
                    </div>
                </div>
            </div>
            <div className="w-full md:w-[300px] h-48 md:h-full relative z-10">
                <div className="absolute -top-8 left-0 w-full text-center md:text-right"><span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em] animate-pulse">Actionable Insights</span></div>
                <div className="h-full w-full overflow-hidden mask-gradient-vertical">
                    <div className="animate-scroll-up space-y-4 p-2 w-full">
                        {[...insightsStream, ...insightsStream, ...insightsStream].map((item, i) => (
                            <div key={i} className="w-full bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg p-4 flex items-start gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group cursor-pointer">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0 ${item.color}`}>{item.type}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate leading-tight mb-1 group-hover:text-indigo-600">{item.title}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
                                </div>
                                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500"><DownloadIcon className="w-4 h-4" /></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <style>{`
                .mask-gradient-vertical { mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); }
                .animate-scroll-up { animation: scroll-up 40s linear infinite; }
                @keyframes scroll-up { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
                .animate-ping-slow { animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
            `}</style>
        </div>
    );
};

// --- Mock UI Components ---
const MockCockpit = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-64 w-full transform transition-transform hover:scale-[1.02] duration-500 relative">
        <div className="h-10 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="flex-1 p-4 flex gap-4">
            <div className="w-16 flex flex-col gap-3"><div className="w-full h-16 bg-indigo-50 rounded-lg"></div></div>
            <div className="flex-1 flex flex-col gap-3">
                <div className="flex gap-3 h-20"><div className="flex-1 bg-blue-50 rounded-lg"></div><div className="flex-1 bg-purple-50 rounded-lg"></div></div>
                <div className="flex-1 bg-gray-50 rounded-lg"></div>
            </div>
        </div>
    </div>
);
const MockCompetitiveness = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden flex h-64 w-full relative">
        <div className="flex-1 p-4 border-r border-gray-100 bg-gray-50/30"><div className="w-16 h-16 bg-gray-200 rounded-lg mb-4 mx-auto"></div></div>
        <div className="flex-1 p-4 bg-white"><div className="w-16 h-16 bg-indigo-100 rounded-lg mb-4 mx-auto border border-indigo-200"></div></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center font-black text-xs text-slate-900 border-2 border-slate-100 z-10">VS</div>
    </div>
);
const MockDeepDive = () => (
    <div className="relative h-64 w-full bg-gray-50 rounded-xl border border-gray-200 shadow-xl overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-100/50 via-transparent to-transparent opacity-50"></div>
        <div className="w-20 h-28 bg-white border border-gray-300 rounded shadow-sm flex flex-col items-center justify-center gap-2 absolute left-10 transform -rotate-6 z-10">
            <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-500 font-bold text-xs">PDF</div>
        </div>
        <div className="w-32 h-1 bg-gradient-to-r from-gray-300 via-indigo-500 to-gray-300 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg z-20"><SparklesIcon className="w-4 h-4 text-white" /></div></div>
        <div className="w-24 h-36 bg-white border border-indigo-200 rounded-lg shadow-md flex flex-col overflow-hidden absolute right-10 transform rotate-6 z-10"><div className="h-4 bg-indigo-500 w-full"></div></div>
    </div>
);
const MockEvent = () => (
    <div className="bg-gray-900 rounded-xl shadow-xl overflow-hidden h-64 w-full relative flex">
        <div className="flex-1 relative"><div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/30"><div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-white border-b-[6px] border-b-transparent ml-1"></div></div></div></div>
        <div className="w-32 bg-gray-800 border-l border-gray-700 p-3 flex flex-col gap-2"><div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">AI Summary</div></div>
    </div>
);
const MockReport = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden h-64 w-full flex flex-col items-center justify-center relative p-6">
        <div className="w-full max-w-xs h-10 bg-white border border-purple-200 rounded-full shadow-sm flex items-center px-4 mb-6 relative z-10"><div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div></div>
        <div className="mb-4 text-purple-300"><ArrowRightIcon className="w-5 h-5 rotate-90" /></div>
        <div className="w-32 h-40 bg-white border border-gray-200 shadow-lg rounded-lg relative top-2 transform transition-transform hover:-translate-y-2 duration-300 flex flex-col items-center pt-4">
             <div className="w-24 h-16 bg-purple-50 rounded border border-purple-100 flex items-center justify-center"><ChartIcon className="w-8 h-8 text-purple-200" /></div>
        </div>
    </div>
);

// --- Feature Section ---
const FeatureSection: React.FC<{
    title: string;
    description: string;
    icon: React.FC<any>;
    color: string;
    reverse?: boolean;
    MockVisual: React.FC<any>;
}> = ({ title, description, icon: Icon, color, reverse, MockVisual }) => {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        green: 'text-green-600 bg-green-50 border-green-100',
        red: 'text-red-600 bg-red-50 border-red-100',
    }[color];

    return (
        <div className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 py-16 ${reverse ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1 space-y-6">
                <div className={`inline-flex p-3 rounded-2xl border shadow-sm ${colorClasses}`}><Icon className="w-8 h-8" /></div>
                <h3 className="text-3xl font-bold text-gray-900 leading-tight">{title}</h3>
                <p className="text-lg text-gray-600 leading-relaxed">{description}</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors">了解更多 <ArrowRightIcon className="w-4 h-4" /></div>
            </div>
            <div className="flex-1 w-full max-w-lg perspective-1000"><MockVisual /></div>
        </div>
    );
};

const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } }, { threshold: 0.1 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return <div ref={ref} className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
};

// --- Main Page ---
export const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
    const [showDemoModal, setShowDemoModal] = useState(false);

    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
            <BackgroundBlobs />
            <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-visible z-10">
                <HeroParticleConvergence />
                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <ScrollReveal>
                        <div className="flex justify-center mb-6">
                            <div className="w-24 h-24 rounded-3xl bg-white/50 backdrop-blur-md border border-white/60 shadow-xl shadow-indigo-500/10 flex items-center justify-center p-5 transform hover:scale-105 transition-transform duration-500">
                                <LogoIcon className="w-full h-full" />
                            </div>
                        </div>
                    </ScrollReveal>
                    <ScrollReveal delay={50}>
                        <div className="mx-auto mb-8 inline-flex items-center rounded-full border border-indigo-100 bg-white/80 backdrop-blur-sm px-4 py-1.5 shadow-sm ring-1 ring-indigo-50">
                            <span className="flex h-2 w-2 mr-2 relative"><span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span></span>
                            <span className="text-[10px] sm:text-xs font-bold text-indigo-700 tracking-wide uppercase">AUTO INSIGHT • INTELLIGENCE AS A SERVICE</span>
                        </div>
                    </ScrollReveal>
                    <ScrollReveal delay={100}>
                        <h1 className="mx-auto max-w-5xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.1] drop-shadow-sm">
                            全域情报自动精炼，<br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">AI 实时交付决策研报</span>
                        </h1>
                    </ScrollReveal>
                    <ScrollReveal delay={200}>
                        <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg text-slate-600 leading-relaxed px-4 font-medium">
                            <strong className="text-slate-900 font-bold">专为智能汽车行业打造。</strong> 覆盖 <span className="inline-block mx-1 text-indigo-700 font-bold bg-white/50 px-1.5 rounded border border-indigo-100 shadow-sm text-sm">技术趋势</span>、<span className="inline-block mx-1 text-indigo-700 font-bold bg-white/50 px-1.5 rounded border border-indigo-100 shadow-sm text-sm">竞品动态</span> 与 <span className="inline-block mx-1 text-indigo-700 font-bold bg-white/50 px-1.5 rounded border border-indigo-100 shadow-sm text-sm">市场舆情</span>。<br className="hidden sm:inline"/>
                            告别繁琐的人工搜集，AI 为您完成从 <strong>全网感知、数据清洗到结构化报告</strong> 的最后一公里。
                        </p>
                    </ScrollReveal>
                    <ScrollReveal delay={300}><DataProcessingVisual /></ScrollReveal>
                    <ScrollReveal delay={400}>
                        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row px-4">
                            <button onClick={onEnter} className="w-full sm:w-auto group relative inline-flex h-12 sm:h-14 items-center justify-center overflow-hidden rounded-full bg-slate-900 px-8 sm:px-10 font-medium text-white shadow-xl shadow-slate-900/20 transition-all duration-300 hover:bg-indigo-600 hover:scale-105 hover:shadow-indigo-600/30 focus:outline-none">
                                <span className="mr-2 text-base sm:text-lg">进入工作台</span><ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>
                            <button 
                                onClick={() => setShowDemoModal(true)}
                                className="w-full sm:w-auto inline-flex h-12 sm:h-14 items-center justify-center rounded-full border border-slate-200 bg-white/80 backdrop-blur px-8 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 focus:outline-none"
                            >
                                <VideoCameraIcon className="mr-2 h-5 w-5 text-slate-500" /> 观看演示
                            </button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            <section className="relative py-24 border-t border-slate-200/60 bg-white/50 backdrop-blur-lg">
                <div className="mx-auto max-w-6xl px-6 lg:px-8 space-y-12">
                    <ScrollReveal><FeatureSection title="AI 情报洞察" description="您的全天候行业雷达。实时聚合全网资讯，AI 自动去重、清洗、打标。通过仪表盘直观展示行业热度、竞品动态和关键风险，让您第一时间掌握市场脉搏。" icon={EyeIcon} color="blue" MockVisual={MockCockpit} /></ScrollReveal>
                    <ScrollReveal><FeatureSection title="竞争力看板" description="参数级的竞品透视。一键对比车型配置、技术参数和供应链信息。系统自动追踪技术路线演进，生成 SWOT 分析图谱，辅助产品定义与战略决策。" icon={ChartIcon} color="indigo" reverse MockVisual={MockCompetitiveness} /></ScrollReveal>
                    <ScrollReveal><FeatureSection title="深度洞察 (PDF重构工厂)" description="激活您沉睡的私有文档。上传行业研报或技术白皮书 (PDF)，AI 深度解析并重构为结构化的知识库。生成精美的 HTML 页面或移动端适配版本，让静态文档变成可交互、可搜索的流动智慧。" icon={DocumentTextIcon} color="purple" MockVisual={MockDeepDive} /></ScrollReveal>
                    <ScrollReveal><FeatureSection title="发布会智能分析" description="不错过任何关键时刻。全自动录制车企发布会直播，实时语音转写与视觉分析。AI 自动提炼关键参数、营销话术与亮点功能，会后即刻生成结构化纪要。" icon={VideoCameraIcon} color="red" reverse MockVisual={MockEvent} /></ScrollReveal>
                    <ScrollReveal><FeatureSection title="AI 报告生成" description="从一句话到专业研报。只需输入研究主题，AI 自动调用知识库，构建逻辑大纲，填充数据图表，数分钟内交付一份逻辑严密、排版精美的行业分析报告。" icon={SparklesIcon} color="green" MockVisual={MockReport} /></ScrollReveal>
                </div>
            </section>

            <footer className="bg-white py-12 text-center border-t border-slate-200 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4 text-slate-400">
                    <LogoIcon className="w-8 h-8" />
                    <div className="flex items-center text-lg ml-2"><span className="font-extrabold text-[#2563EB]">Auto</span><span className="font-semibold text-[#7C3AED]">Insight</span></div>
                </div>
                <p className="text-sm text-slate-400">&copy; 2024 Automotive Intelligence Platform. All rights reserved.</p>
            </footer>

            {showDemoModal && (
                <ProductDemoModal 
                    onClose={() => setShowDemoModal(false)} 
                    onRegister={() => { setShowDemoModal(false); onEnter(); }} 
                />
            )}
        </div>
    );
};
