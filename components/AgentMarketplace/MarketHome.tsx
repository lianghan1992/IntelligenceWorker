
import React, { useState, useMemo, useEffect } from 'react';
import { AgentConfig, AgentCategory } from './types';
import { AGENT_REGISTRY } from './registry';
import { 
    SearchIcon, CubeIcon, SparklesIcon, LockClosedIcon, 
    ArrowRightIcon, BrainIcon,
    GlobeIcon, ChipIcon, TruckIcon, UsersIcon, DocumentTextIcon,
    FilterIcon, PlayIcon
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
        desc: "从代码生成到论文研读，让 AI 成为每一位工程师的超级副驾驶，加速技术落地周期。",
        theme: "indigo"
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1554744512-d6c603f27c54?q=80&w=2070&auto=format&fit=crop",
        tag: "MARKET INTELLIGENCE",
        title: "数据驱动的战略决策",
        desc: "实时监控全网竞品动态与用户舆情，将海量噪音转化为可执行的商业洞察。",
        theme: "blue"
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop",
        tag: "SUPPLY CHAIN RESILIENCE",
        title: "预见供应链的未来",
        desc: "通过深度学习预测原材料价格波动与供应风险，构建更具韧性的全球制造网络。",
        theme: "orange"
    }
];

export const MarketHome: React.FC<MarketHomeProps> = ({ onSelectAgent }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<AgentCategory>('全部');
    
    // Carousel State
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-play Logic
    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
        }, 6000); // 6 seconds per slide
        return () => clearInterval(timer);
    }, [isHovered]);

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
        <div className="h-full flex flex-col bg-[#f8fafc] font-sans overflow-hidden">
            
            {/* 1. Compact Fixed Header (High Efficiency) */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 z-30 shadow-sm relative">
                <div className="max-w-[1920px] mx-auto w-full">
                    {/* Top Row: Brand & Search */}
                    <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* Left: Title (Simplified) */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <BrainIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">
                                    Efficiency Market
                                </h1>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Digital Workforce Platform
                                </p>
                            </div>
                        </div>

                        {/* Right: Search Bar (Compact) */}
                        <div className="relative w-full md:w-96 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索数字员工、技能或岗位..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                            />
                             {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <span className="text-xs">✕</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bottom Row: Navigation Tabs */}
                    <div className="px-4 md:px-6 flex gap-1 overflow-x-auto no-scrollbar border-t border-slate-100 bg-slate-50/50">
                        {CATEGORIES.map(cat => {
                            const isActive = activeCategory === cat;
                            const config = BATTLEFIELD_CONFIG[cat];
                            const Icon = config.icon;

                            return (
                                <button
                                    key={cat}
                                    onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
                                    className={`
                                        relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap
                                        ${isActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400 opacity-70'}`} />
                                    <span>{cat}</span>
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* 2. Scrollable Grid Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-[#f8fafc]">
                <div className="max-w-[1920px] mx-auto">
                    
                    {/* --- Hero Carousel Section (Visual Impact) --- */}
                    {activeCategory === '全部' && !searchQuery && (
                        <div 
                            className="relative w-full h-[280px] md:h-[320px] rounded-2xl overflow-hidden mb-8 shadow-xl shadow-slate-200 group"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            {HERO_SLIDES.map((slide, index) => (
                                <div 
                                    key={slide.id}
                                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                >
                                    {/* Image */}
                                    <img 
                                        src={slide.image} 
                                        alt={slide.title} 
                                        className="w-full h-full object-cover transform transition-transform duration-[10s] ease-linear scale-100 group-hover:scale-105" 
                                    />
                                    
                                    {/* Gradient Overlay (Left to Right) */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent"></div>
                                    
                                    {/* Content */}
                                    <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-3xl">
                                        <div className={`inline-flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-100`}>
                                            <span className={`h-6 px-2 rounded flex items-center text-[10px] font-black tracking-widest bg-white/10 text-white backdrop-blur-sm border border-white/20`}>
                                                {slide.tag}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                                            {slide.title}
                                        </h2>
                                        <p className="text-sm md:text-lg text-slate-200 font-medium leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                            {slide.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Indicators */}
                            <div className="absolute bottom-6 right-8 z-20 flex gap-2">
                                {HERO_SLIDES.map((_, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`h-1 transition-all duration-300 rounded-full ${idx === currentSlide ? 'w-8 bg-white' : 'w-4 bg-white/30 hover:bg-white/60'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Category Intro Banner (When specific category selected) */}
                    {activeCategory !== '全部' && (
                        <div className="mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md bg-gradient-to-br ${BATTLEFIELD_CONFIG[activeCategory].gradient}`}>
                                    {React.createElement(BATTLEFIELD_CONFIG[activeCategory].icon, { className: "w-4 h-4" })}
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">{activeCategory}战区</h2>
                                    <p className="text-xs text-slate-500 font-medium">{BATTLEFIELD_CONFIG[activeCategory].desc}</p>
                                </div>
                             </div>
                             <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                                 {filteredAgents.length} Agents
                             </span>
                        </div>
                    )}

                    {filteredAgents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredAgents.map((agent, idx) => {
                                const config = BATTLEFIELD_CONFIG[agent.category] || BATTLEFIELD_CONFIG['全部'];
                                
                                return (
                                    <div 
                                        key={agent.id}
                                        onClick={() => !agent.disabled && onSelectAgent(agent.id)}
                                        className={`
                                            group relative flex flex-col bg-white rounded-xl border p-5 transition-all duration-300
                                            ${agent.disabled 
                                                ? 'border-slate-100 opacity-60 grayscale cursor-not-allowed bg-slate-50' 
                                                : 'border-slate-200 cursor-pointer hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5'
                                            }
                                        `}
                                        style={{ animationDelay: `${idx * 30}ms` }}
                                    >
                                        {/* Top Row: Icon & Status */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`
                                                w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform duration-300 group-hover:scale-110
                                                ${agent.disabled ? 'bg-slate-400' : `bg-gradient-to-br ${config.gradient}`}
                                            `}>
                                                <agent.icon className="w-5 h-5" />
                                            </div>
                                            
                                            {agent.comingSoon && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider border border-slate-200 flex items-center gap-1">
                                                    <LockClosedIcon className="w-2.5 h-2.5"/> Soon
                                                </span>
                                            )}
                                            {agent.isBeta && !agent.comingSoon && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[9px] font-bold uppercase border border-purple-100">
                                                    Beta
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-h-[80px]">
                                            <h3 className="text-sm font-bold text-slate-900 mb-1.5 group-hover:text-indigo-700 transition-colors line-clamp-1">
                                                {agent.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                                                {agent.description}
                                            </p>
                                        </div>

                                        {/* Footer Tags */}
                                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex gap-1 overflow-hidden">
                                                {agent.tags?.slice(0, 2).map(tag => (
                                                    <span key={tag} className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 truncate max-w-[60px]">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            {!agent.disabled && (
                                                <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <ArrowRightIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FilterIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">未找到匹配的 Agent</h3>
                            <p className="text-xs text-slate-500 mt-1">请尝试调整搜索关键词或切换分类。</p>
                            <button 
                                onClick={() => { setSearchQuery(''); setActiveCategory('全部'); }}
                                className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                重置筛选
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
