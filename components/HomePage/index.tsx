
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
    FeedIcon, DiveIcon, SparklesIcon, ArrowRightIcon, 
    CheckIcon, VideoCameraIcon, DocumentTextIcon, LogoIcon, 
    TrendingUpIcon, ShieldCheckIcon, RssIcon, BrainIcon, GlobeIcon,
    UsersIcon, PhotoIcon, MicrophoneIcon, ChartIcon
} from '../icons';

interface HomePageProps {
    onEnter: () => void;
}

// --- 视觉组件：AI 智能精炼流水线 ---
const DataProcessingVisual: React.FC = () => {
    // 1. 左侧：高密度混沌数据粒子
    const particleIcons = [
        { icon: DocumentTextIcon, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
        { icon: VideoCameraIcon, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
        { icon: PhotoIcon, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
        { icon: MicrophoneIcon, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
        { icon: GlobeIcon, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        { icon: ChartIcon, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    ];

    const particles = useMemo(() => Array.from({ length: 40 }).map((_, i) => {
        const type = particleIcons[i % particleIcons.length];
        return {
            id: i,
            ...type,
            top: Math.random() * 90 + 5, // 5% - 95% vertical
            left: Math.random() * 20 - 25, // Start off-screen left (-25% to -5%)
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 2,
            size: 24 + Math.random() * 20,
            rotation: Math.random() * 360,
        };
    }), []);

    // 2. 中间：神经网络节点生成
    const neuralNodes = useMemo(() => {
        return Array.from({ length: 12 }).map((_, i) => ({
            cx: 20 + Math.random() * 60, // 20-80%
            cy: 20 + Math.random() * 60,
            r: 2 + Math.random() * 3,
            delay: Math.random() * 2
        }));
    }, []);

    // 3. 右侧：有序报告卡片
    const cards = [
        { title: '竞品分析报告', type: 'PDF', color: 'bg-red-100 text-red-600' },
        { title: '行业趋势洞察', type: 'PPT', color: 'bg-orange-100 text-orange-600' },
        { title: '技术路线图谱', type: 'DOC', color: 'bg-blue-100 text-blue-600' },
        { title: '舆情监测摘要', type: 'AI',  color: 'bg-purple-100 text-purple-600' },
    ];

    return (
        <div className="relative w-full max-w-[1100px] h-[450px] mx-auto mt-16 perspective-1000 select-none overflow-visible">
            
            {/* 氛围背景光 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-100/20 blur-[80px] rounded-full pointer-events-none"></div>

            {/* --- 1. 左侧：混沌数据流 (Input) --- */}
            <div className="absolute inset-y-0 left-0 w-[45%] z-10 mask-image-fade-right overflow-hidden pointer-events-none">
                {particles.map((p) => (
                    <div 
                        key={p.id}
                        className={`absolute flex items-center justify-center ${p.bg} ${p.border} border shadow-sm rounded-lg animate-chaos-flow opacity-0`}
                        style={{
                            top: `${p.top}%`,
                            width: p.size,
                            height: p.size,
                            '--tw-enter-opacity': '0',
                            '--tw-enter-scale': '0.5',
                            '--tw-enter-rotate': `${p.rotation}deg`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`
                        } as React.CSSProperties}
                    >
                        <p.icon className={`w-[60%] h-[60%] ${p.color}`} />
                    </div>
                ))}
            </div>

            {/* --- 2. 中间：神经元推理核心 (Processing) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-center scale-110">
                
                {/* 外部能量轨道 */}
                <div className="absolute w-[280px] h-[280px] rounded-full border border-blue-100/30 animate-spin-slow pointer-events-none"></div>
                <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-indigo-200/40 animate-spin-reverse-slower pointer-events-none"></div>
                <div className="absolute w-[320px] h-[320px] bg-gradient-radial from-blue-500/5 to-transparent opacity-50 pointer-events-none"></div>

                {/* 核心球体 */}
                <div className="relative w-40 h-40 rounded-full bg-slate-900 shadow-[0_0_60px_rgba(59,130,246,0.4)] border border-slate-700/50 flex items-center justify-center z-20 overflow-hidden ring-1 ring-white/10">
                    
                    {/* 内部：动态神经网络 SVG */}
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-60">
                        {/* 连接线 */}
                        {neuralNodes.map((node, i) => (
                            neuralNodes.slice(i + 1, i + 4).map((target, j) => (
                                <line 
                                    key={`${i}-${j}`}
                                    x1={node.cx} y1={node.cy}
                                    x2={target.cx} y2={target.cy}
                                    stroke="url(#lineGradient)"
                                    strokeWidth="0.5"
                                    className="animate-pulse"
                                    style={{ animationDuration: `${1 + Math.random()}s` }}
                                />
                            ))
                        ))}
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
                            </linearGradient>
                        </defs>
                        {/* 节点 */}
                        {neuralNodes.map((node, i) => (
                            <circle 
                                key={i} 
                                cx={node.cx} cy={node.cy} r={node.r} 
                                className="fill-blue-400 animate-ping-slow"
                                style={{ animationDelay: `${node.delay}s` }}
                            />
                        ))}
                    </svg>

                    {/* 核心文字 */}
                    <div className="relative z-10 text-center backdrop-blur-[1px]">
                        <div className="text-xs font-mono text-blue-300 tracking-[0.2em] opacity-70 mb-1">NEURAL</div>
                        <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                            AI
                        </h2>
                        <div className="h-0.5 w-12 bg-blue-500 rounded-full mt-2 mx-auto animate-pulse"></div>
                    </div>

                    {/* 表面光泽 */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                </div>
                
                {/* 底部倒影 */}
                <div className="absolute -bottom-16 w-32 h-4 bg-black/20 blur-xl rounded-[100%]"></div>
            </div>

            {/* --- 3. 右侧：有序情报输出 (Output) --- */}
            <div className="absolute inset-y-0 right-0 w-[42%] z-20 flex items-center pl-8 mask-image-fade-left">
                <div className="relative w-full h-[300px] flex flex-col justify-center gap-4">
                    {cards.map((card, i) => (
                        <div 
                            key={i}
                            className="relative flex items-center gap-4 p-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/50 animate-card-slide-out hover:scale-105 transition-transform duration-300"
                            style={{
                                animationDelay: `${1.5 + i * 1.2}s`,
                                animationFillMode: 'both',
                                zIndex: 10 - i
                            }}
                        >
                            {/* 左侧图标 */}
                            <div className={`flex-shrink-0 w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-xs font-bold border border-white shadow-sm`}>
                                {card.type}
                            </div>
                            
                            {/* 右侧内容骨架 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="h-2.5 w-24 bg-slate-800 rounded-full"></div>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full mb-1.5"></div>
                                <div className="h-1.5 w-4/5 bg-slate-200 rounded-full"></div>
                            </div>

                            {/* 标签 */}
                            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-white border border-gray-100 text-[10px] font-semibold text-gray-500 rounded-md shadow-sm whitespace-nowrap">
                                {card.title}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

// --- 滚动显现容器 ---
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

// --- Bento Grid Card ---
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

const StatBadge: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-5 py-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            {icon}
        </div>
        <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-extrabold text-slate-900">{value}</p>
        </div>
    </div>
);

export const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
    return (
        <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            
            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
                {/* Light Mode Technical Background */}
                <div className="absolute inset-0 z-0">
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
                    <div className="absolute right-0 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-purple-300 opacity-20 blur-[120px]"></div>
                </div>

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <ScrollReveal>
                        <div className="mx-auto mb-8 inline-flex items-center rounded-full border border-blue-200 bg-blue-50/50 px-3 py-1 backdrop-blur-sm">
                            <span className="mr-2 flex h-2 w-2">
                                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                            </span>
                            <span className="text-xs font-semibold text-blue-700 tracking-wide uppercase">Intelligence as a Service</span>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={100}>
                        <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl leading-tight">
                            从
                            <span className="relative whitespace-nowrap text-blue-600 mx-2">
                                <svg aria-hidden="true" viewBox="0 0 418 42" className="absolute top-2/3 left-0 h-[0.58em] w-full fill-blue-200/50" preserveAspectRatio="none"><path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C61.669 13.798 24.659 16.218 3.042 19.36c-3.825.557-3.825 6.496 0 7.054 65.22 9.47 203.367 12.394 270.246 3.793 56.973-7.327 136.678-22.429 142.365-24.576 3.045-1.15 1.956-6.233-1.956-6.233-54.369 0-110.095 1.268-210.326 1.518Z"></path></svg>
                                <span className="relative">信息海洋</span>
                            </span>
                            提炼
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 ml-2">决策信号</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal delay={200}>
                        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
                            我们利用先进的 AI 引擎，全天候监控数万个行业渠道。
                            <br className="hidden sm:block" />
                            主动感知、深度去噪、自动分析，将海量数据转化为开箱即用的结构化情报。
                        </p>
                    </ScrollReveal>

                    <ScrollReveal delay={300}>
                        <DataProcessingVisual />
                    </ScrollReveal>

                    <ScrollReveal delay={400}>
                        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <button
                                onClick={onEnter}
                                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-blue-600 px-8 font-medium text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:bg-blue-700 hover:scale-105 hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                            >
                                <span className="mr-2">进入工作台</span>
                                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </button>
                            <button className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                                <VideoCameraIcon className="mr-2 h-4 w-4 text-slate-500" />
                                观看演示
                            </button>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={500}>
                        <div className="mt-16 flex flex-wrap justify-center gap-6 sm:gap-8">
                            <StatBadge label="日处理数据" value="100,000+" icon={<TrendingUpIcon className="w-5 h-5" />} />
                            <StatBadge label="覆盖渠道源" value="5,000+" icon={<RssIcon className="w-5 h-5" />} />
                            <StatBadge label="AI 准确率" value="98.5%" icon={<ShieldCheckIcon className="w-5 h-5" />} />
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* --- Features Section --- */}
            <section className="relative py-24 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="mb-16 text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                全维度的情报生产管线
                            </h2>
                            <p className="mt-4 text-lg text-slate-600">
                                告别繁琐的手工检索，让 AI 成为您的超级分析师
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
                        {/* Feature 1: Big Card */}
                        <div className="col-span-1 sm:col-span-2 row-span-2">
                            <ScrollReveal delay={100}>
                                <BentoCard 
                                    title="实时情报追踪" 
                                    desc="不仅仅是搜索，更是主动感知。系统实时聚合全网新闻、公告、研报与社交媒体。自动去重、摘要，并根据您的关注点生成个性化简报。我们帮您从噪音中识别信号。"
                                    icon={<FeedIcon className="w-6 h-6" />}
                                    className="h-full min-h-[320px] bg-gradient-to-br from-white to-blue-50/50"
                                />
                            </ScrollReveal>
                        </div>

                        {/* Feature 2 */}
                        <div className="col-span-1">
                            <ScrollReveal delay={200}>
                                <BentoCard 
                                    title="深度洞察专题" 
                                    desc="针对特定技术路线（如固态电池、NOA）的持续追踪报告。像维基百科一样不断自我更新的活文档。"
                                    icon={<DiveIcon className="w-6 h-6" />}
                                    className="h-full min-h-[240px]"
                                />
                            </ScrollReveal>
                        </div>

                        {/* Feature 3 */}
                        <div className="col-span-1">
                            <ScrollReveal delay={300}>
                                <BentoCard 
                                    title="全自动事件解读" 
                                    desc="发布会刚结束，深度报告已生成。AI 自动分段录制、抽帧分析、提取关键参数，不错过任何细节。"
                                    icon={<VideoCameraIcon className="w-6 h-6" />}
                                    className="h-full min-h-[240px]"
                                />
                            </ScrollReveal>
                        </div>
                        
                        {/* Feature 4 */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                             <ScrollReveal delay={400}>
                                <BentoCard 
                                    title="AI 报告生成" 
                                    desc="只需一个想法，AI 即可为您生成结构完整的行业分析报告或 PPT 大纲。支持上传私有数据进行增强分析。"
                                    icon={<SparklesIcon className="w-6 h-6" />}
                                    className="h-full min-h-[240px] bg-gradient-to-tl from-white to-purple-50/50"
                                />
                            </ScrollReveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Value Proposition (Target Audience) --- */}
            <section className="py-24 bg-slate-50 border-t border-slate-200">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
                        <ScrollReveal>
                            <div>
                                <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 mb-6">
                                    <UsersIcon className="mr-1.5 h-3.5 w-3.5" />
                                    为专业决策者打造
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-6">
                                    赋能每一个关键角色
                                </h2>
                                <div className="space-y-8">
                                    {[
                                        { title: "战略规划专家", desc: "缩短 90% 的信息收集时间，将精力聚焦于推演与判断。" },
                                        { title: "市场销售总监", desc: "比竞争对手提前 48 小时捕获关键商机，提升线索转化率。" },
                                        { title: "证券行业分析师", desc: "自动过滤 99% 的市场噪音，直达核心逻辑与数据真相。" }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm text-blue-600">
                                                <CheckIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                                                <p className="mt-1 text-slate-600 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>
                        
                        <ScrollReveal delay={200}>
                            <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                                <div className="relative rounded-xl bg-slate-50 overflow-hidden aspect-video flex items-center justify-center border border-slate-100">
                                    {/* Abstract UI Representation */}
                                    <div className="w-full h-full p-8 relative flex flex-col">
                                        {/* Header Skeleton */}
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-full bg-blue-100"></div>
                                            <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                                        </div>
                                        {/* Content Skeleton */}
                                        <div className="flex gap-6 h-full">
                                            <div className="w-1/4 bg-white border border-slate-200 rounded-lg shadow-sm p-3 space-y-3">
                                                <div className="h-3 w-full bg-slate-100 rounded"></div>
                                                <div className="h-3 w-4/5 bg-slate-100 rounded"></div>
                                                <div className="h-3 w-2/3 bg-slate-100 rounded"></div>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-4">
                                                <div className="h-32 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <SparklesIcon className="w-4 h-4 text-blue-500" />
                                                        <div className="h-3 w-24 bg-blue-200 rounded"></div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="h-2 w-full bg-slate-100 rounded"></div>
                                                        <div className="h-2 w-full bg-slate-100 rounded"></div>
                                                        <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 bg-white border border-slate-200 rounded-lg"></div>
                                            </div>
                                        </div>
                                        {/* Overlay Badge */}
                                        <div className="absolute bottom-8 right-8 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 animate-bounce-slow">
                                            <SparklesIcon className="w-4 h-4 text-yellow-400" />
                                            AI 深度分析完成
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* --- CTA Section --- */}
            <section className="relative py-24 overflow-hidden">
                <div className="absolute inset-0 bg-blue-600">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    {/* Abstract Circles */}
                    <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500 blur-3xl opacity-50"></div>
                    <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-500 blur-3xl opacity-50"></div>
                </div>
                
                <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
                    <ScrollReveal>
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-6">
                            准备好升级您的情报系统了吗？
                        </h2>
                        <p className="mx-auto max-w-2xl text-xl text-blue-100 mb-10">
                            加入行业领先企业的行列，体验数据转化为洞察的极速快感。
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={onEnter}
                                className="min-w-[200px] rounded-full bg-white px-8 py-4 text-base font-bold text-blue-900 shadow-xl transition-transform hover:scale-105 hover:bg-blue-50"
                            >
                                免费开始使用
                            </button>
                            <button className="min-w-[200px] rounded-full border border-white/30 bg-blue-700/50 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-blue-700">
                                联系企业服务
                            </button>
                        </div>
                        <p className="mt-6 text-sm text-blue-200/80">无需绑定信用卡 · 14天专业版免费试用</p>
                    </ScrollReveal>
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

            <style>{`
                /* --- 动画关键帧定义 --- */
                
                @keyframes chaos-flow {
                    0% { transform: translate(0, 0) scale(0.5) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translate(600px, 50px) scale(0.1) rotate(180deg); opacity: 0; }
                }

                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-reverse-slower {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }

                @keyframes card-slide-out {
                    0% { transform: translateX(-100px) scale(0.8); opacity: 0; }
                    20% { opacity: 1; transform: translateX(0) scale(1); }
                    80% { opacity: 1; transform: translateX(0) scale(1); }
                    100% { transform: translateX(200px) scale(0.9); opacity: 0; }
                }

                @keyframes ping-slow {
                    0% { transform: scale(1); opacity: 0.8; }
                    75%, 100% { transform: scale(2); opacity: 0; }
                }

                /* 类名绑定 */
                .animate-chaos-flow { animation-name: chaos-flow; animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); animation-iteration-count: infinite; }
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
                .animate-spin-reverse-slower { animation: spin-reverse-slower 20s linear infinite; }
                .animate-card-slide-out { animation: card-slide-out 6s ease-in-out infinite; }
                .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
                
                .perspective-1000 { perspective: 1000px; }
                .mask-image-fade-right { mask-image: linear-gradient(to right, black 0%, transparent 100%); }
                .mask-image-fade-left { mask-image: linear-gradient(to right, transparent 0%, black 20%); }
                .bg-gradient-radial { background-image: radial-gradient(var(--tw-gradient-stops)); }
            `}</style>
        </div>
    );
};
