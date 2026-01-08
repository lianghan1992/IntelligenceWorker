
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
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* Unified Agent Header */}
            <div className="h-16 px-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors group"
                        title="返回集市"
                    >
                        <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    
                    <div className="h-6 w-px bg-slate-200"></div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            {Icon ? <Icon className="w-4 h-4" /> : <CubeIcon className="w-4 h-4" />}
                        </div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
                    </div>
                </div>
            </div>

            {/* Agent Workspace */}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>
        </div>
    );
};
