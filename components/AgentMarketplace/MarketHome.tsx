
import React, { useState, useMemo } from 'react';
import { AgentConfig } from './types';
import { AGENT_REGISTRY } from './registry';
import { 
    SearchIcon, CubeIcon, SparklesIcon, LockClosedIcon, 
    ArrowRightIcon, FilterIcon, ServerIcon, CheckCircleIcon,
    ChevronRightIcon
} from '../icons';

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
        <div className="h-full flex bg-[#f8fafc] overflow-hidden">
            {/* 1. Left Sidebar: Navigation & Filters */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <CubeIcon className="w-5 h-5" />
                    </div>
                    <span className="font-black text-slate-800 tracking-tight">效率集市</span>
                </div>
                
                <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    <div className="px-3 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">岗位分类筛选</div>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`
                                w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all
                                ${activeCategory === cat 
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                            `}
                        >
                            <span>{cat}</span>
                            {activeCategory === cat && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm"></div>}
                        </button>
                    ))}

                    <div className="pt-8 px-3 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">资源统计</div>
                    <div className="px-3 py-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">可用智能体</span>
                            <span className="text-slate-900 font-black">{AGENT_REGISTRY.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">覆盖岗位</span>
                            <span className="text-slate-900 font-black">{CATEGORIES.length - 1}</span>
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Seres AI 效率集市持续收录行业垂直 Agent，助力数字化转型。
                    </p>
                </div>
            </aside>

            {/* 2. Main Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                {/* Search Header */}
                <header className="h-16 px-8 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <span>集市首页</span>
                        <ChevronRightIcon className="w-3 h-3" />
                        <span className="text-slate-900">{activeCategory}</span>
                    </div>

                    <div className="relative w-full max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索岗位智能体名称、功能或标签..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all outline-none"
                        />
                    </div>
                </header>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fcfdfe]">
                    <div className="max-w-7xl mx-auto">
                        {filteredAgents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {filteredAgents.map((agent, idx) => (
                                    <div 
                                        key={agent.id}
                                        onClick={() => !agent.disabled && onSelectAgent(agent.id)}
                                        className={`
                                            group bg-white rounded-2xl border p-5 flex flex-col h-full transition-all duration-300 relative
                                            ${agent.disabled 
                                                ? 'opacity-60 grayscale border-slate-100 cursor-not-allowed' 
                                                : 'border-slate-200 cursor-pointer hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1'
                                            }
                                        `}
                                        style={{ animationDelay: `${idx * 40}ms` }}
                                    >
                                        {/* Compact Card Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`
                                                w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md
                                                ${agent.disabled ? 'bg-slate-300' : 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-100'}
                                            }`}>
                                                <agent.icon className="w-5 h-5" />
                                            </div>
                                            {!agent.disabled && agent.isBeta && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-wider border border-purple-100">BETA</span>
                                            )}
                                            {agent.disabled && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black border border-slate-200">维修中</span>
                                            )}
                                        </div>

                                        <h3 className="text-base font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors truncate">
                                            {agent.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1 font-medium">
                                            {agent.description}
                                        </p>

                                        {/* Footer tags */}
                                        <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex gap-1.5 overflow-hidden">
                                                {agent.tags?.slice(0, 2).map(tag => (
                                                    <span key={tag} className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <ArrowRightIcon className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                    <SearchIcon className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-600">未找到相关智能体</h3>
                                <p className="text-sm text-slate-400 mt-2">请尝试搜索其他关键词或分类</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
