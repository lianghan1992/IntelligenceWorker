import React, { useState, useMemo } from 'react';
import { AgentConfig } from './types';
import { AGENT_REGISTRY } from './registry';
// Added ArrowRightIcon to imports
import { SearchIcon, CubeIcon, SparklesIcon, LockClosedIcon, ChevronRightIcon, ArrowRightIcon } from '../icons';

interface MarketHomeProps {
    onSelectAgent: (agentId: string) => void;
}

const CATEGORIES = ['全部', '战略研究', '技术研发', '市场营销', '数字化办公', '其他'];

export const MarketHome: React.FC<MarketHomeProps> = ({ onSelectAgent }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('全部');

    const filteredAgents = useMemo(() => {
        return AGENT_REGISTRY.filter(agent => {
            const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  agent.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === '全部' || agent.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory]);

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar selection:bg-indigo-100 selection:text-indigo-900">
            {/* 1. Hero Section with Mesh Gradient Background */}
            <div className="relative pt-20 pb-16 px-6 overflow-hidden border-b border-slate-100">
                {/* Visual Decor: Diffused Lights */}
                <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-indigo-50 rounded-full filter blur-[100px] opacity-60 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[35rem] h-[35rem] bg-purple-50 rounded-full filter blur-[80px] opacity-60"></div>
                
                <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 animate-in fade-in zoom-in duration-700">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Agent Intelligence Marketplace</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                        按<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">岗位</span>武装大脑
                    </h1>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
                        探索专为汽车行业设计的 AI 智能体集群。每一个 Agent，都是一位数字领域的行业专家。
                    </p>
                    
                    {/* Floating Search Island */}
                    <div className="max-w-2xl mx-auto relative mt-10">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
                        <div className="relative bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200/60 flex items-center p-1.5 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <div className="pl-4 pr-2 text-slate-400">
                                <SearchIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="搜索岗位助手或功能关键词..."
                                className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 h-12 font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="p-2 text-slate-300 hover:text-slate-500">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                
                {/* Category Pills Navigation */}
                <div className="flex justify-center">
                    <nav className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-100">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`
                                    px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                                    ${activeCategory === cat 
                                        ? 'bg-white text-indigo-600 shadow-md shadow-indigo-500/5 ring-1 ring-slate-200 transform scale-105' 
                                        : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Agent Grid */}
                {filteredAgents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredAgents.map((agent, idx) => (
                            <div 
                                key={agent.id}
                                onClick={() => !agent.disabled && onSelectAgent(agent.id)}
                                className={`
                                    group relative bg-white rounded-[32px] border p-8 flex flex-col h-full transition-all duration-500 animate-in fade-in slide-in-from-bottom-4
                                    ${agent.disabled 
                                        ? 'border-slate-100 grayscale opacity-60 cursor-not-allowed bg-slate-50' 
                                        : 'border-slate-200 cursor-pointer hover:border-indigo-400 hover:shadow-[0_32px_64px_-16px_rgba(79,70,229,0.12)] hover:-translate-y-2'
                                    }
                                `}
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                {/* Glow Effect on Hover */}
                                {!agent.disabled && (
                                    <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                )}
                                
                                <div className="relative z-10 flex-1 flex flex-col">
                                    {/* Icon Container with Gradient Background */}
                                    <div className={`
                                        w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg transition-transform duration-500 group-hover:scale-110
                                        ${agent.disabled 
                                            ? 'bg-slate-300 shadow-none' 
                                            : 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-200'}
                                    }`}>
                                        <agent.icon className="w-7 h-7" />
                                    </div>

                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <h3 className={`text-xl font-black transition-colors ${agent.disabled ? 'text-slate-400' : 'text-slate-900 group-hover:text-indigo-700'}`}>
                                            {agent.name}
                                        </h3>
                                        {!agent.disabled && agent.isBeta && (
                                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-wider border border-purple-100 flex items-center gap-1">
                                                <SparklesIcon className="w-2.5 h-2.5" /> Beta
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-3 mb-6">
                                        {agent.description}
                                    </p>
                                </div>

                                {/* Footer info */}
                                <div className="relative z-10 mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                                        {agent.category}
                                    </span>
                                    {agent.disabled ? (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                            <LockClosedIcon className="w-3.5 h-3.5" /> 内部维护中
                                        </div>
                                    ) : (
                                        <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            {/* Error fixed: ArrowRightIcon now imported */}
                                            <ArrowRightIcon className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="relative mb-8">
                             <div className="absolute inset-0 bg-slate-100 rounded-full blur-2xl opacity-50"></div>
                             <div className="relative w-32 h-32 bg-white rounded-3xl border border-slate-100 shadow-xl flex items-center justify-center">
                                <CubeIcon className="w-16 h-16 text-slate-200" />
                             </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800">未检索到相关智能体</h3>
                        <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto">请尝试更换搜索词，或切换分类筛选。我们正在持续研发更多垂直岗位 Agent...</p>
                        <button 
                            onClick={() => { setActiveCategory('全部'); setSearchQuery(''); }}
                            className="mt-8 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all active:scale-95"
                        >
                            重置筛选条件
                        </button>
                    </div>
                )}
            </div>
            
            {/* Bottom Footer Decor */}
            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10"></div>
        </div>
    );
};

const CloseIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);