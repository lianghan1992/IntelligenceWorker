
import React, { Suspense } from 'react';
import { AgentConfig } from '../types';
import { ChevronLeftIcon, CloseIcon, RefreshIcon } from '../../icons';

interface AgentWorkspaceProps {
    agent: AgentConfig;
    onClose: () => void;
}

export const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ agent, onClose }) => {
    return (
        <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-in slide-in-from-right-10 duration-300">
            {/* Workspace Header */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1 group"
                    >
                        <ChevronLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-sm font-bold">返回集市</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                            <agent.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">{agent.name}</h2>
                            <p className="text-[10px] text-slate-400">{agent.category.toUpperCase()} WORKSPACE</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Future: Add Favorite / Share buttons here */}
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Agent Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-3">
                        <RefreshIcon className="w-8 h-8 animate-spin text-indigo-500" />
                        <span className="text-sm font-medium">正在加载智能体资源...</span>
                    </div>
                }>
                    <agent.component />
                </Suspense>
            </div>
        </div>
    );
};
