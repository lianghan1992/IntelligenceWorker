
import React, { useEffect, useRef, useState } from 'react';
import { 
    ArrowRightIcon, VideoCameraIcon, LogoIcon, 
    EyeIcon, ChartIcon, DocumentTextIcon, SparklesIcon,
    GlobeIcon, ChipIcon, LightningBoltIcon
} from '../icons';

interface HomePageProps {
    onEnter: () => void;
}

// --- Visual Components ---

const BackgroundBlobs: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute inset-0 z-0 opacity-[0.03]" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>
        <div className="absolute top-[-10%] left-[10%] w-[45rem] h-[45rem] bg-indigo-400/20 rounded-full filter blur-[80px] opacity-60 animate-blob will-change-transform mix-blend-multiply"></div>
        <div className="absolute top-[-10%] right-[10%] w-[40rem] h-[40rem] bg-purple-400/20 rounded-full filter blur-[80px] opacity-60 animate-blob animation-delay-2000 will-change-transform mix-blend-multiply"></div>
        <div className="absolute bottom-[-20%] left-[30%] w-[50rem] h-[50rem] bg-blue-400/20 rounded-full filter blur-[80px] opacity-60 animate-blob animation-delay-4000 will-change-transform mix-blend-multiply"></div>
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
        `}</style>
    </div>
);

const HeroParticleConvergence: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <svg className="w-full h-full opacity-60" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
                <path id="hero-p1" d="M -100,200 Q 360,400 720,400 T 1540,200" fill="none" stroke="url(#grad1)" strokeWidth="0.5" />
                <path id="hero-p2" d="M -100,600 Q 360,400 720,400 T 1540,600" fill="none" stroke="url(#grad2)" strokeWidth="0.5" />
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                        <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
                        <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                    </linearGradient>
                </defs>

                <g>
                    <circle r="3" fill="#6366f1" opacity="0.8">
                        <animateMotion dur="6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p1"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="6s" repeatCount="indefinite" />
                    </circle>
                    <circle r="2" fill="#a855f7" opacity="0.6">
                        <animateMotion dur="8s" begin="1s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
                            <mpath href="#hero-p2"/>
                        </animateMotion>
                        <animate attributeName="opacity" values="0;1;0" dur="8s" repeatCount="indefinite" />
                    </circle>
                </g>
            </svg>
        </div>
    );
};

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

const FeatureCard: React.FC<{
    icon: React.ElementType;
    title: string;
    desc: string;
    color: string;
}> = ({ icon: Icon, title, desc, color }) => (
    <div className="group relative p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 ${color}`}>
            <Icon className="w-24 h-24" />
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg ${color.replace('text-', 'bg-').replace('500', '500')}`}>
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
            {desc}
        </p>
    </div>
);

// --- Main Page ---

export const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
            
            <BackgroundBlobs />
            
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-sm border-b border-white/50">
                <div className="flex items-center gap-2">
                    <LogoIcon className="w-8 h-8" />
                    <span className="font-extrabold text-lg tracking-tight">
                        <span className="text-[#2563EB]">Auto</span><span className="text-[#7C3AED]">Insight</span>
                    </span>
                </div>
                <button 
                    onClick={onEnter}
                    className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                    进入工作台
                </button>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 sm:pt-48 sm:pb-32 overflow-visible z-10">
                <HeroParticleConvergence />
                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    
                    <ScrollReveal>
                        <div className="flex justify-center mb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-indigo-100 shadow-sm backdrop-blur-md">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-xs font-bold text-indigo-900 tracking-wide uppercase">Intelligence Automation Platform</span>
                            </div>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={100}>
                        <h1 className="mx-auto max-w-5xl text-5xl font-black tracking-tight text-slate-900 sm:text-7xl lg:text-8xl leading-[1.1] mb-8">
                            全域情报
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"> 自动精炼</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal delay={200}>
                        <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-500 leading-relaxed font-medium">
                            专为汽车行业打造的 AI 决策大脑。
                            <br className="hidden sm:block"/>
                            从全网感知、数据清洗到结构化报告生成，<span className="text-slate-900 font-bold">只需一键。</span>
                        </p>
                    </ScrollReveal>

                    <ScrollReveal delay={400}>
                        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row px-4">
                            <button onClick={onEnter} className="w-full sm:w-auto group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-slate-900 px-10 font-bold text-white shadow-xl shadow-slate-900/20 transition-all duration-300 hover:bg-indigo-600 hover:scale-105 hover:shadow-indigo-600/30 focus:outline-none">
                                <span className="mr-2 text-lg">立即体验</span>
                                <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>
                            <button onClick={onEnter} className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white/60 backdrop-blur px-10 font-bold text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-slate-900 focus:outline-none">
                                <VideoCameraIcon className="mr-2 h-5 w-5 text-slate-400" />
                                观看演示
                            </button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="relative py-20 bg-white/50 border-t border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal>
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">核心能力矩阵</h2>
                            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
                                集成多模态 AI 引擎，打通情报获取、分析、生产全链路。
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <ScrollReveal delay={100}>
                            <FeatureCard 
                                icon={EyeIcon}
                                title="AI 情报洞察"
                                desc="实时监控全网数千个信源，利用 NLP 技术自动去重、分类并提取关键事实，构建行业知识图谱。"
                                color="text-indigo-500"
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={200}>
                            <FeatureCard 
                                icon={SparklesIcon}
                                title="深度研报生成"
                                desc="输入主题，AI 自动搜集资料、构建大纲、撰写万字长文，并一键渲染为精美的 HTML 幻灯片。"
                                color="text-purple-500"
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={300}>
                            <FeatureCard 
                                icon={ChartIcon}
                                title="竞争力看板"
                                desc="结构化拆解竞品参数，从智能驾驶、座舱、三电等维度进行细颗粒度对标，发现技术趋势。"
                                color="text-blue-500"
                            />
                        </ScrollReveal>
                        <ScrollReveal delay={400}>
                            <FeatureCard 
                                icon={VideoCameraIcon}
                                title="发布会直播分析"
                                desc="实时转录发布会语音，结合视觉分析提取关键帧，即时生成能够刷屏的传播金句与总结。"
                                color="text-orange-500"
                            />
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* Data Visual Strip (Simplified Representation) */}
            <section className="py-20 overflow-hidden relative bg-slate-900 text-white">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold mb-6">数据驱动决策</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                    <GlobeIcon className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">全球视野</h4>
                                    <p className="text-slate-400 text-sm">覆盖中、美、欧主流车企动态与供应链情报</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                                    <ChipIcon className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">硬核技术</h4>
                                    <p className="text-slate-400 text-sm">深挖芯片、算法、电池等底层技术参数</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
                                    <LightningBoltIcon className="w-6 h-6 text-orange-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">极速响应</h4>
                                    <p className="text-slate-400 text-sm">事件发生后分钟级推送分析报告</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 w-full max-w-lg">
                        {/* Abstract Dashboard Graphic */}
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-4">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-20 bg-indigo-900/50 rounded-lg w-full animate-pulse"></div>
                                <div className="flex gap-3">
                                    <div className="h-32 bg-slate-700/50 rounded-lg flex-1"></div>
                                    <div className="h-32 bg-slate-700/50 rounded-lg flex-1"></div>
                                </div>
                                <div className="h-4 bg-slate-700/30 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 text-center border-t border-slate-200 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4 text-slate-400">
                    <LogoIcon className="w-8 h-8" />
                    <div className="flex items-center text-lg ml-2">
                        <span className="font-extrabold text-[#2563EB]">Auto</span>
                        <span className="font-semibold text-[#7C3AED]">Insight</span>
                    </div>
                </div>
                <p className="text-sm text-slate-400">
                    &copy; 2024 Automotive Intelligence Platform. All rights reserved.
                </p>
            </footer>
        </div>
    );
};
