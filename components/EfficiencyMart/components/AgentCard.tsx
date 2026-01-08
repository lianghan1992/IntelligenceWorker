
import React from 'react';
import { AgentConfig } from '../types';
import { ArrowRightIcon, SparklesIcon, FireIcon } from '../../icons';

interface AgentCardProps {
    agent: AgentConfig;
    onClick: (agent: AgentConfig) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick }) => {
    return (
        <div 
            onClick={() => onClick(agent)}
            className="group relative bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 flex flex-col h-full overflow-hidden"
        >
            {/* Hover Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div className="relative z-10 flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                    <agent.icon className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                    {agent.isNew && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" /> NEW
                        </span>
                    )}
                    {agent.isHot && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full border border-orange-200 flex items-center gap-1">
                            <FireIcon className="w-3 h-3" /> HOT
                        </span>
                    )}
                </div>
            </div>

            <div className="relative z-10 flex-1">
                <h3 className="text-base font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                    {agent.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
                    {agent.description}
                </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                <div className="flex gap-2">
                    {agent.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowRightIcon className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
};
