
import React, { ReactNode } from 'react';
import { ArrowLeftIcon, CubeIcon } from '../icons';

interface AgentLayoutProps {
    title: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    onBack: () => void;
    children: ReactNode;
}

export const AgentLayout: React.FC<AgentLayoutProps> = ({ title, icon: Icon, onBack, children }) => {
    return (
        <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500">
            {/* Unified Premium Agent Header */}
            <header className="h-18 px-6 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl flex items-center justify-between shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
                <div className="flex items-center gap-5">
                    <button 
                        onClick={onBack}
                        className="p-2.5 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all group flex items-center gap-2"
                        title="返回效率集市"
                    >
                        <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Market</span>
                    </button>
                    
                    <div className="h-8 w-px bg-slate-200"></div>
                    
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 ring-4 ring-white">
                            {Icon ? <Icon className="w-6 h-6" /> : <CubeIcon className="w-6 h-6" />}
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">{title}</h1>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">AI Powered Autonomous Agent</p>
                        </div>
                    </div>
                </div>
                
                {/* Header right: Common system indicator */}
                <div className="flex items-center gap-4">
                     <div className="hidden md:flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        AGENT ONLINE
                     </div>
                </div>
            </header>

            {/* Agent Workspace */}
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
};
