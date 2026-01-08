
import React, { useState, useMemo } from 'react';
import { SearchIcon, CubeIcon } from '../icons';
import { agents } from './agentRegistry';
import { AgentCategory, AgentConfig, CATEGORY_LABELS } from './types';
import { AgentCard } from './components/AgentCard';
import { CategoryPill } from './components/CategoryPill';
import { AgentWorkspace } from './components/AgentWorkspace';

export const EfficiencyMart: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<AgentCategory>('all');
    const [activeAgent, setActiveAgent] = useState<AgentConfig | null>(null);

    // Filter Logic
    const filteredAgents = useMemo(() => {
        return agents.filter(agent => {
            const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  agent.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    const handleAgentClick = (agent: AgentConfig) => {
        setActiveAgent(agent);
    };

    const handleCloseWorkspace = () => {
        setActiveAgent(null);
    };

    return (
        <div className="relative h-full flex flex-col bg-[#f8fafc] overflow-hidden">
            
            {/* --- Workspace Overlay --- */}
            {activeAgent && (
                <AgentWorkspace agent={activeAgent} onClose={handleCloseWorkspace} />
            )}

            {/* --- Mart Header (Hero) --- */}
            <div className="bg-white border-b border-slate-200 px-8 py-10 md:py-16 relative overflow-hidden flex-shrink-0">
                {/* Decoration */}
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <CubeIcon className="w-64 h-64 text-indigo-600 transform rotate-12" />
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50/50 via-white to-white pointer-events-none"></div>

                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4 tracking-tight">
                        效率集市 <span className="text-indigo-600">Efficiency Mart</span>
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto mb-8">
                        集成多种 AI 智能体，为您提供一站式的生产力工具库。从文本润色到数据分析，即插即用。
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-xl mx-auto relative group">
                        <div className="absolute inset-0 bg-indigo-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative bg-white border border-slate-200 rounded-2xl flex items-center shadow-lg shadow-slate-100 transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-400">
                            <div className="pl-4 text-slate-400">
                                <SearchIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="搜索智能体，如 '润色'、'格式化'..."
                                className="w-full bg-transparent p-4 text-slate-700 placeholder:text-slate-400 focus:outline-none font-medium"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Filter & Grid --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    
                    {/* Category Filter */}
                    <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
                        {(Object.keys(CATEGORY_LABELS) as AgentCategory[]).map(cat => (
                            <CategoryPill 
                                key={cat} 
                                category={cat} 
                                isActive={selectedCategory === cat} 
                                onClick={setSelectedCategory} 
                            />
                        ))}
                    </div>

                    {/* Grid */}
                    {filteredAgents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAgents.map(agent => (
                                <AgentCard key={agent.id} agent={agent} onClick={handleAgentClick} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <CubeIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 text-sm">未找到匹配的智能体</p>
                            <button 
                                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                                className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
                            >
                                清除筛选条件
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
