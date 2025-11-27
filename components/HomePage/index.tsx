
import React, { useEffect, useRef, useState } from 'react';
import { 
    ArrowRightIcon, VideoCameraIcon, DocumentTextIcon, LogoIcon, 
    ChartIcon, EyeIcon, SparklesIcon, DownloadIcon, RssIcon, GlobeIcon
} from '../icons';

interface HomePageProps {
    onEnter: () => void;
}

// --- 1. Light Background Effects ---
const BackgroundEffects: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-slate-50">
        {/* Subtle Noise */}
        <div className="absolute inset-0 z-0 opacity-[0.02]" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>
        
        {/* Moving Blobs (Light Colors) */}
        <div className="absolute top-[-10%] left-[20%] w-[40rem] h-[40rem] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[10%] w-[35rem] h-[35rem] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[30%] w-[45rem] h-[45rem] bg-cyan-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
        
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

// --- 2. Visual Components ---
const MockCockpit = () => (
    <div className="bg-white rounded-2xl border border-white/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col h-64 w-full transform transition-transform hover:scale-[1.02] duration-500 relative backdrop-blur-sm">
        <div className="h-10 bg-slate-50/50 border-b border-slate-100 flex items-center px-4 gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            <div className="flex-1"></div>
        </div>
        <div className="flex-1 p-5 flex gap-4">
            <div className="w-16 flex flex-col gap-3">
                <div className="w-full h-16 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-500 flex items-center justify-center text-xs font-bold">AI</div>
                </div>
                <div className="w-full h-8 bg-slate-50 rounded-lg"></div>
                <div className="w-full h-8 bg-slate-50 rounded-lg"></div>
            </div>
            <div className="flex-1 flex flex-col gap-3">
                <div className="flex gap-3 h-24">
                    <div className="flex-1 bg-blue-50/50 rounded-xl border border-blue-100 p-3 relative">
                        <div className="absolute bottom-3 left-3 w-16 h-2 bg-blue-200 rounded-full"></div>
                        <div className="absolute bottom-7 left-3 w-8 h-8 bg-blue-100 rounded-lg"></div>
                    </div>
                    <div className="flex-1 bg-purple-50/50 rounded-xl border border-purple-100 p-3 relative">
                        <div className="absolute bottom-3 left-3 w-16 h-2 bg-purple-200 rounded-full"></div>
                        <div className="absolute bottom-7 left-3 w-8 h-8 bg-purple-100 rounded-lg"></div>
                    </div>
                </div>
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100"></div>
            </div>
        </div>
    </div>
);

const MockDoc = () => (
    <div className="bg-white rounded-2xl border border-white/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden h-64 w-full relative flex items-center justify-center">
        <div className="w-32 h-40 bg-white border border-slate-200 shadow-xl rounded-lg rotate-[-6deg] absolute left-20 z-10 flex flex-col p-3">
            <div className="w-12 h-12 bg-red-50 rounded mb-2 flex items-center justify-center text-red-400 text-xs font-bold">PDF</div>
            <div className="w-full h-1 bg-slate-100 mb-1"></div>
            <div className="w-2/3 h-1 bg-slate-100 mb-1"></div>
        </div>
        <div className="w-12 h-12 bg-white rounded-full shadow-lg z-20 flex items-center justify-center text-indigo-500 relative">
            <SparklesIcon className="w-6 h-6" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100 animate-ping"></div>
        </div>
        <div className="w-32 h-40 bg-white border border-indigo-100 shadow-xl rounded-lg rotate-[6deg] absolute right-20 z-10 flex flex-col p-3">
            <div className="w-full h-16 bg-indigo-50/50 rounded mb-2"></div>
            <div className="w-full h-1 bg-slate-100 mb-1"></div>
            <div className="w-full h-1 bg-slate-100 mb-1"></div>
            <div className="w-2/3 h-1 bg-slate-100"></div>
        </div>
    </div>
);

// --- 3. Feature Section ---
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
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
    }[color] || 'text-slate-600 bg-slate-50 border-slate-100';

    return (
        <div className={`flex flex-col md:flex-row items-center gap-12 py-20 ${reverse ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1 space-y-6">
                <div className={`inline-flex p-3 rounded-2xl border shadow-sm ${colorClasses}`}>
                    <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">{title}</h3>
                <p className="text-lg text-slate-600 leading-relaxed font-medium">{description}</p>
            </div>
            <div className="flex-1 w-full max-w-lg perspective-1000">
                <MockVisual />
            </div>
        </div>
    );
};

// --- 4. Scroll Reveal ---
const ScrollReveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={ref} 
            className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <BackgroundEffects />
            
            {/* Hero */}
            <section className="relative pt-32 pb-20 sm:pt-48 sm:pb-32 z-10">
                <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
                    <ScrollReveal>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200 shadow-sm mb-8 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Auto Insight 2.0</span>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={100}>
                        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1]">
                            The Future of <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600">Automotive Intelligence</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal delay={200}>
                        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                            AI 驱动的全域情报平台。从全网感知到深度决策，为您构建自动化的情报流水线。
                        </p>
                    </ScrollReveal>

                    <ScrollReveal delay={300}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={onEnter} className="group relative px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-indigo-600 hover:shadow-indigo-600/30 transition-all hover:-translate-y-1 overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    Enter Cockpit <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                            <button className="px-8 py-4 bg-white text-slate-700 rounded-full font-bold text-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-all hover:-translate-y-1">
                                Learn More
                            </button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Features */}
            <section className="relative py-24 bg-white/60 backdrop-blur-lg border-t border-slate-200">
                <div className="mx-auto max-w-6xl px-6 lg:px-8">
                    <ScrollReveal>
                        <FeatureSection 
                            title="AI 全域感知"
                            description="实时聚合全网资讯。AI 自动去重、清洗、打标，通过全息仪表盘直观展示行业热度与竞品动态。"
                            icon={EyeIcon}
                            color="blue"
                            MockVisual={MockCockpit}
                        />
                    </ScrollReveal>

                    <ScrollReveal>
                        <FeatureSection 
                            title="深度文档重构"
                            description="唤醒沉睡的 PDF。上传行业研报或技术白皮书，AI 将其重构为结构化知识库，支持语义检索与移动端阅读。"
                            icon={DocumentTextIcon}
                            color="purple"
                            reverse
                            MockVisual={MockDoc}
                        />
                    </ScrollReveal>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-slate-200 text-center relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4 text-slate-400">
                    <LogoIcon className="w-6 h-6"/>
                    <span className="font-bold text-lg text-slate-500">Auto Insight</span>
                </div>
                <p className="text-sm text-slate-400">© 2024 Automotive Intelligence Platform</p>
            </footer>
        </div>
    );
};
