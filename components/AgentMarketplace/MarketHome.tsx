
import React, { useState, useMemo } from 'react';
import { AgentConfig } from './types';
import { AGENT_REGISTRY } from './registry';
import { SearchIcon, CubeIcon, SparklesIcon, LockClosedIcon } from '../icons';
import { User } from '../../types';

interface MarketHomeProps {
    onSelectAgent: (agentId: string) => void;
    user?: User;
}

const CATEGORIES = ['全部', '数据分析', '内容创作', '办公提效', '开发工具', '其他'];

export const MarketHome: React.FC<MarketHomeProps> = ({ onSelectAgent, user }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('全部');

    const filteredAgents = useMemo(() => {
        return AGENT_REGISTRY.filter(agent => {
            // Permission Check
            if (agent.allowedEmails && agent.allowedEmails.length > 0) {
                if (!user || !agent.allowedEmails.includes(user.email)) {
                    return false; // Hide if user not in whitelist
                }
            }

            const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  agent.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === '全部' || agent.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory, user]);

    return (
        <div className="h-full overflow-y-auto bg-[#f8fafc] p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Hero / Header */}
                <div className="text-center space-y-4 py-8">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">效率集市</h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        探索 AI 智能体应用。即插即用，扩展您的无限可能。
                    </p>
                    
                    {/* Search Bar */}
                    <div className="max-w-xl mx-auto relative mt-6 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center p-2">
                            <div className="pl-4 pr-3 text-slate-400">
                                <SearchIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="搜索智能体 (如：会议助手, 代码生成...)"
                                className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-center border-b border-slate-200">
                    <div className="flex gap-8 overflow-x-auto no-scrollbar pb-px">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                                    activeCategory === cat 
                                        ? 'border-indigo-600 text-indigo-600' 
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {filteredAgents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAgents.map(agent => (
                            <div 
                                key={agent.id}
                                onClick={() => !agent.disabled && onSelectAgent(agent.id)}
                                className={`group bg-white rounded-2xl border p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 ${
                                    agent.disabled 
                                        ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-75' 
                                        : 'border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-900/5'
                                }`}
                            >
                                {!agent.disabled && (
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0">
                                        <div className="bg-indigo-50 text-indigo-600 rounded-full p-2">
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="mb-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 transition-transform duration-300 ${
                                        agent.disabled 
                                            ? 'bg-slate-200 shadow-none grayscale' 
                                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 group-hover:scale-110'
                                    }`}>
                                        <agent.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <h3 className={`text-lg font-bold mb-2 transition-colors ${agent.disabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-indigo-700'}`}>
                                            {agent.name}
                                        </h3>
                                        {agent.disabled && (
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                                                <LockClosedIcon className="w-3 h-3" /> 维护中
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                        {agent.description}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded">
                                        {agent.category}
                                    </span>
                                    {!agent.disabled && agent.isBeta && (
                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center gap-1">
                                            <SparklesIcon className="w-3 h-3" /> Beta
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <CubeIcon className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600">暂无相关智能体</h3>
                        <p className="text-slate-400 mt-2">敬请期待更多应用接入...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simple internal icons for layout
const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
);
