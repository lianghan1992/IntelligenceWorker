
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AgentConfig, AgentCategory } from './types';
import { AGENT_REGISTRY } from './registry';
import { 
    SearchIcon, CubeIcon, SparklesIcon, LockClosedIcon, 
    ArrowRightIcon, BrainIcon,
    GlobeIcon, ChipIcon, TruckIcon, UsersIcon, 
    FilterIcon
} from '../icons';

interface MarketHomeProps {
    onSelectAgent: (agentId: string) => void;
}

const CATEGORIES: AgentCategory[] = [
    '全部', 
    '战略与产品', 
    '智能研发', 
    '品牌与营销', 
    '供应链与制造', 
    '综合效能'
];

// Battlefield Configuration
const BATTLEFIELD_CONFIG: Record<string, { 
    color: string; 
    bg: string; 
    gradient: string;
    icon: React.FC<any>;
    desc: string;
}> = {
    '战略与产品': { 
        color: 'text-purple-600', 
        bg: 'bg-purple-50', 
        gradient: 'from-purple-500 to-indigo-600',
        icon: GlobeIcon,
        desc: '洞察市场趋势'
    },
    '智能研发': { 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        gradient: 'from-blue-500 to-cyan-600',
        icon: ChipIcon,
        desc: '攻克核心技术'
    },
    '品牌与营销': { 
        color: 'text-pink-600', 
        bg: 'bg-pink-50', 
        gradient: 'from-pink-500 to-rose-600',
        icon: SparklesIcon,
        desc: '引爆市场声量'
    },
    '供应链与制造': { 
        color: 'text-orange-600', 
        bg: 'bg-orange-50', 
        gradient: 'from-orange-500 to-amber-600',
        icon: TruckIcon,
        desc: '保障交付韧性'
    },
    '综合效能': { 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        gradient: 'from-emerald-500 to-teal-600',
        icon: UsersIcon,
        desc: '提升组织效率'
    },
    '全部': {
        color: 'text-slate-600',
        bg: 'bg-slate-100',
        gradient: 'from-slate-700 to-slate-900',
        icon: CubeIcon,
        desc: '全栈赋能'
    }
};

// --- Hero Banner Data ---
const HERO_SLIDES = [
    {
        id: 1,
        image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=2070&auto=format&fit=crop",
        tag: "R&D REVOLUTION",
        title: "重构汽车研发生产力",
        desc: "AI 驱动的代码生成与论文研读，让工程师拥有超级副驾驶。",
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1554744512-d6c603f27c54?q=80&w=2070&auto=format&fit=crop",
        tag: "MARKET INTELLIGENCE",
        title: "数据驱动的战略决策",
        desc: "实时监控竞品动态，将海量噪音转化为可执行的商业洞察。",
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop",
        tag: "SUPPLY CHAIN",
        title: "预见供应链的未来",
        desc: "深度学习预测原材料价格波动，构建强韧的全球制造网络。",
    }
];

export const MarketHome: React.FC<MarketHomeProps> = ({ onSelectAgent }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<AgentCategory>('全部');
    
    // Carousel State
    const [currentSlide, setCurrentSlide] = useState(0);

    // Scroll State for Morphing Header
    const [isScrolled, setIsScrolled] = useState(false);
    const mainRef = useRef<HTMLDivElement>(null);

    // Auto-play Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
        }, 5000); 
        return () => clearInterval(timer);
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const threshold = 50; // Pixel threshold to trigger compaction
        if (scrollTop > threshold && !isScrolled) {
            setIsScrolled(true);
        } else if (scrollTop <= threshold && isScrolled) {
            setIsScrolled(false);
        }
    };

    const filteredAgents = useMemo(() => {
        return AGENT_REGISTRY.filter(agent => {
            const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (agent.tags && agent.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
            const matchesCategory = activeCategory === '全部' || agent.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory]);
    
    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] font-sans overflow-hidden">
            
            {/* --- Dynamic Header Section --- */}
            <header className="bg-white border-b border-slate-200 flex-shrink-0 relative z-30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] transition-all duration-300">
                <div className="max-w-[1920px] mx-auto w-full px-6 md:px-8">
                    
                    {/* Part 1: Collapsible Hero (Left: Carousel, Right: Intro) */}
                    <div 
                        className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                            isScrolled ? 'max-h-0 opacity-0 mb-0 py-0' : 'max-h-[300px] opacity-100 py-6'
                        }`}
                    >
                        <div className="flex flex-col md:flex-row gap-8 items-center h-full">
                            {/* Left: Carousel (Compact) */}
                            <div className="w-full md:w-[480px] h-[200px] flex-shrink-0 relative group rounded-2xl overflow-hidden shadow-lg shadow-indigo-100/50">
                                {HERO_SLIDES.map((slide, index) => (
                                    <div 
                                        key={slide.id}
                                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                    >
                                        <img 
                                            src={slide.image} 
                                            alt={slide.title} 
                                            className="w-full h-full object-cover transition-transform duration-[8s] ease-linear scale-105 group-hover:scale-110" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-5 w-full">
                                            <span className="inline-block px-1.5 py-0.5 mb-2 text-[9px] font-black tracking-widest text-white bg-white/20 backdrop-blur-md rounded border border-white/20">
                                                {slide.tag}
                                            </span>
                                            <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">{slide.title}</h3>
                                        </div>
                                    </div>
                                ))}
                                {/* Indicators */}
                                <div className="absolute top-4 right-4 flex gap-1 z-20">
                                    {HERO_SLIDES.map((_, idx) => (
                                        <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
                                    ))}
                                </div>
                            </div>

                            {/* Right: Intro Text */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                        <BrainIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                                            Efficiency Market
                                        </h1>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                                            Digital Workforce Platform
                                        </p>
                                    </div>
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-900 leading-tight mb-3 tracking-tight">
                                    Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">AI Team</span>
                                </h2>
                                <p className="text-slate-500 text-sm max-w-xl leading-relaxed hidden md:block">
                                    在 AI 时代重构汽车行业生产力。从战略规划到工程落地，为您匹配最专业的数字员工。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Part 2: Sticky Control Bar (Tabs Left, Search Right) */}
                    <div className="flex items-center justify-between pb-2 pt-2 gap-4 h-[60px]">
                        
                        {/* Left: Logo (Conditional) & Tabs */}
                        <div className="flex items-center gap-6 overflow-hidden flex-1">
                            {/* Small Logo appears when scrolled */}
                            <div 
                                className={`flex items-center gap-2 transition-all duration-500 ${
                                    isScrolled ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 pointer-events-none'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md flex-shrink-0">
                                    <BrainIcon className="w-5 h-5" />
                                </div>
                                <span className="font-black text-slate-800 text-sm hidden lg:block whitespace-nowrap">Efficiency Market</span>
                                <div className="h-4 w-px bg-slate-200 ml-2 hidden lg:block"></div>
                            </div>

                            {/* Tabs */}
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                {CATEGORIES.map(cat => {
                                    const isActive = activeCategory === cat;
                                    const Icon = BATTLEFIELD_CONFIG[cat].icon;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
                                            className={`
                                                relative flex items-center gap-2 px-3 py-2 text-sm font-bold transition-all whitespace-nowrap rounded-lg
                                                ${isActive 
                                                    ? 'bg-slate-900 text-white shadow-md' 
                                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                                }
                                            `}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                                            <span>{cat}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Search */}
                        <div className="w-[240px] md:w-[280px] flex-shrink-0">
                             <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                </div>
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="搜索数字员工、技能..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 focus:bg-white"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <span className="text-[10px] font-bold bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center">✕</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </header>

            {/* 2. Scrollable Grid Content */}
            <main 
                ref={mainRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-[#F8FAFC] scroll-smooth"
                onScroll={handleScroll}
            >
                <div className="max-w-[1920px] mx-auto min-h-[101%]"> {/* Ensure min-height > 100% to allow scroll even if empty */}
                    
                    {/* Active Category Header (Only show if not 'All' or if scrolled to give context) */}
                    <div className={`mb-8 flex items-center justify-between transition-opacity duration-300 ${isScrolled || activeCategory !== '全部' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${BATTLEFIELD_CONFIG[activeCategory].gradient}`}>
                                {React.createElement(BATTLEFIELD_CONFIG[activeCategory].icon, { className: "w-5 h-5" })}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{activeCategory}战区</h2>
                                <p className="text-xs text-slate-500 font-medium">{BATTLEFIELD_CONFIG[activeCategory].desc}</p>
                            </div>
                         </div>
                         <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                             {filteredAgents.length} Agents Available
                         </div>
                    </div>

                    {filteredAgents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                            {filteredAgents.map((agent, idx) => {
                                const config = BATTLEFIELD_CONFIG[agent.category] || BATTLEFIELD_CONFIG['全部'];
                                
                                return (
                                    <div 
                                        key={agent.id}
                                        onClick={() => !agent.disabled && onSelectAgent(agent.id)}
                                        className={`
                                            group relative flex flex-col bg-white rounded-3xl p-6 transition-all duration-300
                                            ${agent.disabled 
                                                ? 'border border-slate-100 opacity-60 cursor-not-allowed bg-slate-50' 
                                                : 'border border-slate-100 cursor-pointer hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-indigo-100/50'
                                            }
                                        `}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        {/* Status Tag */}
                                        <div className="flex justify-between items-start mb-5">
                                            <div className={`
                                                w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
                                                ${agent.disabled ? 'bg-slate-300' : `bg-gradient-to-br ${config.gradient}`}
                                            `}>
                                                <agent.icon className="w-7 h-7" />
                                            </div>
                                            
                                            {agent.comingSoon ? (
                                                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200 flex items-center gap-1">
                                                    <LockClosedIcon className="w-3 h-3"/> Soon
                                                </span>
                                            ) : agent.isBeta ? (
                                                <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider border border-purple-100 shadow-sm">
                                                    Beta
                                                </span>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600">
                                                    <ArrowRightIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 mb-4">
                                            <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-indigo-700 transition-colors">
                                                {agent.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 font-medium">
                                                {agent.description}
                                            </p>
                                        </div>

                                        {/* Footer Tags */}
                                        <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                                            {agent.tags?.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        
                                        {/* Hover Overlay for Disabled */}
                                        {agent.disabled && (
                                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-3xl z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-white/90 px-4 py-2 rounded-xl text-xs font-bold shadow-lg text-slate-600">
                                                    暂未开放
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                <FilterIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-base font-bold text-slate-700">未找到匹配的数字员工</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-6">请尝试调整搜索关键词或切换战区。</p>
                            <button 
                                onClick={() => { setSearchQuery(''); setActiveCategory('全部'); }}
                                className="px-6 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                            >
                                清除筛选
                            </button>
                        </div>
                    )}
                    
                    {/* Bottom Padding to ensure scrolling past hero is easy */}
                    <div className="h-20"></div>
                </div>
            </main>
        </div>
    );
};
