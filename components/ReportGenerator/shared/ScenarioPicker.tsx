
import React from 'react';
import { StratifyScenario } from '../../../types';
import { isScenarioSupported } from '../scenarios/registry';
import { SparklesIcon, ChevronRightIcon, LockClosedIcon, ViewGridIcon } from '../../icons';

// 方案色系与动态特效配置
const COLOR_SCHEMES = [
    {
        id: 'indigo',
        bg: 'from-indigo-500 to-blue-600',
        iconCol: 'text-indigo-600',
        light: 'bg-indigo-400/20',
        anim: 'animate-flow-diagonal'
    },
    {
        id: 'emerald',
        bg: 'from-emerald-500 to-teal-600',
        iconCol: 'text-emerald-600',
        light: 'bg-emerald-400/20',
        anim: 'animate-pulse-slow'
    },
    {
        id: 'violet',
        bg: 'from-violet-500 to-purple-600',
        iconCol: 'text-violet-600',
        light: 'bg-violet-400/20',
        anim: 'animate-float-subtle'
    },
    {
        id: 'amber',
        bg: 'from-orange-400 to-rose-500',
        iconCol: 'text-orange-600',
        light: 'bg-orange-300/20',
        anim: 'animate-wave-subtle'
    }
];

export const ScenarioPicker: React.FC<{
    scenarios: StratifyScenario[];
    onSelect: (name: string) => void;
}> = ({ scenarios, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col items-center custom-scrollbar bg-white">
            <style>{`
                @keyframes flow-diag { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
                .animate-flow-diagonal { background-size: 200% 200%; animation: flow-diag 8s linear infinite; }
                
                @keyframes float-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-float-subtle { animation: float-subtle 4s ease-in-out infinite; }
                
                .animate-pulse-slow { animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                
                @keyframes wave-subtle { 0% { border-radius: 24px 24px 24px 24px; } 50% { border-radius: 40px 20px 40px 20px; } 100% { border-radius: 24px 24px 24px 24px; } }
                .animate-wave-subtle { animation: wave-subtle 5s ease-in-out infinite; }

                .card-glass { background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%); }
            `}</style>

            <div className="max-w-[1200px] w-full">
                <header className="mb-12 text-center">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-3">选择 Agent 场景</h2>
                    <p className="text-slate-500 text-sm font-medium">请选择预设的专家提示词流水线，开始您的智能创作。</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {scenarios.map((s, idx) => {
                        // 核心：调用更新后的支持检查函数，传入整个场景对象
                        const supported = isScenarioSupported(s);
                        const scheme = COLOR_SCHEMES[idx % COLOR_SCHEMES.length];

                        return (
                            <div 
                                key={s.id}
                                onClick={() => supported && onSelect(s.id)}
                                className={`group relative h-[180px] rounded-[24px] overflow-hidden transition-all duration-500 shadow-lg ${
                                    supported 
                                    ? 'cursor-pointer hover:scale-[1.04] hover:shadow-2xl active:scale-95' 
                                    : 'cursor-not-allowed grayscale opacity-40'
                                }`}
                            >
                                {/* 动态渐变背景层 */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${scheme.bg} ${scheme.anim}`}></div>
                                
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-3xl"></div>

                                <div className="absolute inset-0 card-glass backdrop-blur-[1px]"></div>

                                <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/95 shadow-sm flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12">
                                            <ViewGridIcon className={`w-4 h-4 ${scheme.id === 'amber' ? 'text-orange-500' : scheme.iconCol}`} />
                                        </div>
                                        <h3 className="font-extrabold text-white text-base tracking-tight leading-none drop-shadow-sm">
                                            {s.title || s.name}
                                        </h3>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[11px] text-white/80 line-clamp-3 leading-relaxed font-medium">
                                            {s.description || '基于行业专家逻辑链条构建的智能创作流水线，一键产出高价值研报。'}
                                        </p>
                                        
                                        <div className="flex items-center justify-between">
                                            {supported ? (
                                                <div className="flex items-center gap-1 text-[10px] font-black text-white/90 uppercase tracking-widest">
                                                    Enter Workflow <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                    <LockClosedIcon className="w-3 h-3" /> Coming Soon
                                                </div>
                                            )}
                                            <SparklesIcon className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-all group-hover:rotate-[30deg]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-white/60 group-hover:w-full transition-all duration-700"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
