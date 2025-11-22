
import React, { useEffect, useRef, useState } from 'react';
import { 
    FeedIcon, DiveIcon, ChartIcon, SparklesIcon, ArrowRightIcon, 
    CheckIcon, VideoCameraIcon, DocumentTextIcon, LogoIcon, 
    TrendingUpIcon, ShieldCheckIcon, RssIcon, BrainIcon, GlobeIcon,
    UsersIcon
} from '../icons';

interface HomePageProps {
    onEnter: () => void;
}

// --- 视觉组件：数据处理引擎动画 ---
const DataProcessingVisual: React.FC = () => {
    return (
        <div className="relative w-full max-w-[800px] h-[400px] mx-auto mt-12 perspective-1000">
            {/* 1. 核心：AI 处理器 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 z-20">
                {/* 核心光晕 */}
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse-slow"></div>
                {/* 物理核心 */}
                <div className="relative w-full h-full bg-white rounded-full border border-blue-100 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-white"></div>
                    <div className="relative z-10 text-blue-600">
                        <BrainIcon className="w-12 h-12 animate-pulse" />
                    </div>
                    {/* 扫描线 */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-scan"></div>
                </div>
                {/* 轨道环 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-blue-200/50 rounded-full animate-spin-slow"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-dashed border-blue-200/30 rounded-full animate-spin-reverse-slower"></div>
            </div>

            {/* 2. 左侧：杂乱的数据海洋 (Input) */}
            <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden z-10 mask-image-linear-gradient-to-r">
                {/* 漂浮的粒子：代表原始数据 */}
                {[...Array(8)].map((_, i) => (
                    <div 
                        key={`in-${i}`}
                        className="absolute flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-400 animate-float-in"
                        style={{
                            top: `${Math.random() * 80 + 10}%`,
                            left: `-${Math.random() * 20 + 10}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    >
                        {i % 4 === 0 ? <DocumentTextIcon className="w-5 h-5" /> : 
                         i % 4 === 1 ? <RssIcon className="w-5 h-5" /> :
                         i % 4 === 2 ? <VideoCameraIcon className="w-5 h-5" /> :
                         <GlobeIcon className="w-5 h-5" />}
                    </div>
                ))}
            </div>

            {/* 3. 右侧：结构化的情报 (Output) */}
            <div className="absolute top-0 right-0 w-1/2 h-full z-10">
                {/* 发射出的卡片：代表成品情报 */}
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={`out-${i}`}
                        className="absolute flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border border-blue-100 rounded-lg shadow-md text-blue-900 animate-float-out opacity-0"
                        style={{
                            top: `${20 + i * 12}%`, // 更有序的排列
                            left: '50%',
                            animationDelay: `${1.5 + Math.random() * 1.5}s`,
                            animationDuration: '4s'
                        }}
                    >
                        <CheckIcon className="w-4 h-4 text-green-500" />
                        <div className="h-2 w-24 bg-blue-100 rounded-full"></div>
                    </div>
                ))}
            </div>

            {/* 连接线 */}
            <div className="absolute top-1/2 left-0 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
            <div className="absolute top-1/2 right-0 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
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
                /* 核心动画定义 */
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                @keyframes float-in {
                    0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
                    20% { opacity: 1; }
                    100% { transform: translate(200px, 100px) scale(0); opacity: 0; } /* 向中心汇聚 */
                }
                @keyframes float-out {
                    0% { transform: translate(-50px, 0) scale(0.5); opacity: 0; }
                    30% { opacity: 1; transform: translate(0, 0) scale(1); }
                    90% { opacity: 1; transform: translate(150px, 0); }
                    100% { transform: translate(180px, 0); opacity: 0; }
                }
                @keyframes spin-slow {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes spin-reverse-slower {
                    from { transform: translate(-50%, -50%) rotate(360deg); }
                    to { transform: translate(-50%, -50%) rotate(0deg); }
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                .animate-scan { animation: scan 3s ease-in-out infinite; }
                .animate-float-in { animation-name: float-in; animation-timing-function: ease-in; animation-iteration-count: infinite; }
                .animate-float-out { animation-name: float-out; animation-timing-function: ease-out; animation-iteration-count: infinite; }
                .animate-spin-slow { animation: spin-slow 10s linear infinite; }
                .animate-spin-reverse-slower { animation: spin-reverse-slower 20s linear infinite; }
                .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
                
                .perspective-1000 { perspective: 1000px; }
                .mask-image-linear-gradient-to-r { mask-image: linear-gradient(to right, black 0%, transparent 100%); }
            `}</style>
        </div>
    );
};
