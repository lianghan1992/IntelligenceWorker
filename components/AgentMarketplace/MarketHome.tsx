
import React, { useState, useMemo } from 'react';
import { AgentConfig, AgentCategory } from './types';
import { AGENT_REGISTRY } from './registry';
import { 
    SearchIcon, CubeIcon, SparklesIcon, LockClosedIcon, 
    ArrowRightIcon, ChevronRightIcon, BrainIcon,
    GlobeIcon, ChipIcon, TruckIcon, UsersIcon, DocumentTextIcon
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

// Battlefield Configuration (Colors, Icons, Descriptions)
const BATTLEFIELD_CONFIG: Record<string, { 
    color: string; 
    bg: string; 
    border: string; 
    gradient: string;
    icon: React.FC<any>;
    desc: string;
}> = {
    '战略与产品': { 
        color: 'text-purple-600', 
        bg: 'bg-purple-50', 
        border: 'border-purple-200', 
        gradient: 'from-purple-500 to-indigo-600',
        icon: GlobeIcon,
        desc: '洞察市场趋势，定义爆款车型'
    },
    '智能研发': { 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        border: 'border-blue-200', 
        gradient: 'from-blue-500 to-cyan-600',
        icon: ChipIcon,
        desc: '攻克核心技术，加速智驾落地'
    },
    '品牌与营销': { 
        color: 'text-pink-600', 
        bg: 'bg-pink-50', 
        border: 'border-pink-200', 
        gradient: 'from-pink-500 to-rose-600',
        icon: SparklesIcon,
        desc: '传递品牌价值，引爆市场声量'
    },
    '供应链与制造': { 
        color: 'text-orange-600', 
        bg: 'bg-orange-50', 
        border: 'border-orange-200', 
        gradient: 'from-orange-500 to-amber-600',
        icon: TruckIcon,
        desc: '保障交付韧性，极致成本控制'
    },
    '综合效能': { 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        gradient: 'from-emerald-500 to-teal-600',
        icon: UsersIcon,
        desc: '提升组织效率，护航合规运营'
    },
    '全部': {
        color: 'text-slate-600',
        bg: 'bg-slate-100',
        border: 'border-slate-200',
        gradient: 'from-slate-700 to-slate-900',
        icon: CubeIcon,
        desc: '全栈 AI 赋能'
    }
};

export const MarketHome: React.FC<MarketHomeProps> = ({ onSelectAgent }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<AgentCategory>('全部');

    const filteredAgents = useMemo(() => {
        return AGENT_REGISTRY.filter(agent => {
            const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (agent.tags && agent.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
            const matchesCategory = activeCategory === '全部' || agent.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory]);

    // Grouping for "All" view to show sections? Or just flat list. 
    // Let's stick to flat list for simplicity but sort by category if 'All' is selected.
    
    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-y-auto custom-scrollbar font-sans">
            
            {/* 1. Hero Section: The "AI Workforce" Banner */}
            <section className="relative w-full bg-white overflow-hidden border-b border-slate-200">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none"></div>
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-20 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 mb-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex -space-x-1">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white"></div>
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white"></div>
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-red-500 border-2 border-white"></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 tracking-wide">AUTO INSIGHT DIGITAL WORKFORCE</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">AI Team</span>
                    </h1>
                    
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 font-medium">
                        在 AI 时代重构汽车行业生产力。从战略规划到工程落地，为您匹配最专业的数字员工，让每一个岗位都拥有超级外脑。
                    </p>

                    {/* Search Bar */}
                    <div className="w-full max-w-2xl relative group animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <SearchIcon className="w-6 h-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索岗位（如产品经理）、能力（如竞品分析）或 Agent 名称..."
                            className="w-full pl-14 pr-6 py-5 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/50 text-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                        />
                         <div className="absolute inset-y-2 right-2">
                            <button className="h-full px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-md">
                                搜索
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Navigation: Battlefields Pills */}
            <div className="sticky top-0 z-30 bg-[#f8fafc]/95 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 py-3 overflow-x-auto no-scrollbar">
                <div className="max-w-7xl mx-auto flex gap-3 min-w-max">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat;
                        const config = BATTLEFIELD_CONFIG[cat];
                        const Icon = config.icon;

                        return (
                            <button
                                key={cat}
                                onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
                                className={`
                                    group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border
                                    ${isActive 
                                        ? `bg-white border-transparent shadow-lg shadow-indigo-100 ring-2 ring-${config.color.split('-')[1]}-500/20 text-slate-900` 
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                    }
                                `}
                            >
                                <div className={`
                                    p-1 rounded-lg transition-colors
                                    ${isActive ? config.bg : 'bg-slate-100 group-hover:bg-slate-200'}
                                    ${isActive ? config.color : 'text-slate-400'}
                                `}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span>{cat}</span>
                                {isActive && (
                                    <div className={`w-1.5 h-1.5 rounded-full ${config.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Main Grid */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
                
                {/* Category Header (If specific category selected) */}
                {activeCategory !== '全部' && (
                    <div className="mb-8 flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${BATTLEFIELD_CONFIG[activeCategory].gradient} text-white shadow-lg`}>
                            {React.createElement(BATTLEFIELD_CONFIG[activeCategory].icon, { className: "w-6 h-6" })}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">{activeCategory}战区</h2>
                            <p className="text-slate-500 text-sm font-medium">{BATTLEFIELD_CONFIG[activeCategory].desc}</p>
                        </div>
                    </div>
                )}

                {filteredAgents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {filteredAgents.map((agent, idx) => {
                            const config = BATTLEFIELD_CONFIG[agent.category] || BATTLEFIELD_CONFIG['全部'];
                            
                            return (
                                <div 
                                    key={agent.id}
                                    onClick={() => !agent.disabled && onSelectAgent(agent.id)}
                                    className={`
                                        group relative flex flex-col bg-white rounded-[24px] border border-slate-200/60 p-6 transition-all duration-500
                                        ${agent.disabled 
                                            ? 'opacity-70 grayscale cursor-not-allowed bg-slate-50/50' 
                                            : 'cursor-pointer hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-indigo-100'
                                        }
                                    `}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    {/* Hover Glow Background */}
                                    {!agent.disabled && (
                                        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-[24px]`}></div>
                                    )}

                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-5 relative z-10">
                                        <div className={`
                                            w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3
                                            ${agent.disabled ? 'bg-slate-400' : `bg-gradient-to-br ${config.gradient}`}
                                        `}>
                                            <agent.icon className="w-7 h-7" />
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            {agent.isBeta && (
                                                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider border border-purple-100">BETA</span>
                                            )}
                                            {agent.comingSoon && (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200 flex items-center gap-1">
                                                    <LockClosedIcon className="w-3 h-3"/> Coming Soon
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 relative z-10">
                                        <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-900 transition-colors">
                                            {agent.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 font-medium">
                                            {agent.description}
                                        </p>
                                    </div>

                                    {/* Footer (Tags & Action) */}
                                    <div className="mt-6 pt-4 border-t border-slate-100 relative z-10">
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {agent.tags?.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        
                                        <button 
                                            className={`
                                                w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
                                                ${agent.disabled 
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                                    : 'bg-white border border-slate-200 text-slate-700 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 shadow-sm'
                                                }
                                            `}
                                        >
                                            {agent.comingSoon ? (
                                                <>敬请期待</>
                                            ) : (
                                                <>
                                                    聘用 Agent <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-60">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <SearchIcon className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">未找到相关数字员工</h3>
                        <p className="text-sm text-slate-500 mt-2">请尝试搜索其他岗位、技能或切换战区。</p>
                        <button 
                            onClick={() => { setSearchQuery(''); setActiveCategory('全部'); }}
                            className="mt-6 px-6 py-2 bg-white border border-slate-300 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            清除筛选
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};
