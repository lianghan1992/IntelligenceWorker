
import React from 'react';
import { Scenario } from '../../../types';
import { SparklesIcon, ArrowRightIcon, ViewGridIcon, LockClosedIcon } from '../../icons';
import { isScenarioSupported } from '../scenarios/registry';

// 绚丽配色方案
const COLOR_SCHEMES = [
    { from: 'from-indigo-600', via: 'via-purple-600', to: 'to-pink-600', iconBg: 'bg-white/20', text: 'text-white' },
    { from: 'from-blue-600', via: 'via-cyan-600', to: 'to-emerald-600', iconBg: 'bg-white/20', text: 'text-white' },
    { from: 'from-amber-500', via: 'via-orange-600', to: 'to-red-600', iconBg: 'bg-white/20', text: 'text-white' },
    { from: 'from-violet-600', via: 'via-fuchsia-600', to: 'to-rose-600', iconBg: 'bg-white/20', text: 'text-white' },
];

export const ScenarioPicker: React.FC<{
    scenarios: Scenario[];
    onSelect: (name: string) => void;
}> = ({ scenarios, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col items-center custom-scrollbar bg-slate-50/50">
            <div className="max-w-6xl w-full">
                <div className="text-center mb-16 space-y-4 mt-8">
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter">选择创作场景</h2>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        基于行业专家逻辑链条构建的 AI 创作流水线。
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {scenarios.map((s, idx) => {
                        const supported = isScenarioSupported(s.name);
                        const scheme = COLOR_SCHEMES[idx % COLOR_SCHEMES.length];

                        return (
                            <div 
                                key={s.name}
                                onClick={() => supported && onSelect(s.name)}
                                className={`group relative h-72 rounded-[32px] p-6 transition-all duration-500 flex flex-col justify-between overflow-hidden shadow-lg ${
                                    supported 
                                    ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2' 
                                    : 'cursor-not-allowed opacity-40 grayscale'
                                }`}
                            >
                                {/* 绚丽背景层 */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${scheme.from} ${scheme.via} ${scheme.to} transition-transform duration-700 group-hover:scale-110`}></div>
                                
                                {/* 动态光晕特效 */}
                                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[100px] animate-pulse"></div>
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <SparklesIcon className="w-40 h-40 text-white" />
                                </div>

                                {/* 内容层 */}
                                <div className="relative z-10">
                                    {!supported && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md text-white/80 rounded-full text-[10px] font-bold border border-white/10 w-fit mb-4">
                                            <LockClosedIcon className="w-3 h-3" /> 开发中
                                        </div>
                                    )}

                                    <div className={`w-12 h-12 ${scheme.iconBg} backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-inner ring-1 ring-white/20`}>
                                        <ViewGridIcon className="w-6 h-6 text-white" />
                                    </div>

                                    {/* 修正：优先显示 s.label，如果为空则显示 s.name */}
                                    <h3 className="text-xl font-black text-white tracking-tight mb-2 group-hover:translate-x-1 transition-transform">
                                        {s.label || s.name}
                                    </h3>
                                    <p className="text-white/70 text-xs leading-relaxed line-clamp-3 font-medium">
                                        {s.description || '基于该场景的专业逻辑，深入剖析市场动态。'}
                                    </p>
                                </div>

                                <div className="relative z-10 flex items-center justify-between mt-4">
                                    {supported ? (
                                        <div className="flex items-center gap-2 text-white font-black text-sm">
                                            开启任务 <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                                        </div>
                                    ) : (
                                        <div className="text-white/40 font-bold text-xs uppercase tracking-widest">Coming Soon</div>
                                    )}
                                </div>

                                {/* 底部装饰线 */}
                                <div className="absolute bottom-0 left-0 h-1.5 w-0 bg-white/40 group-hover:w-full transition-all duration-700"></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>
        </div>
    );
};
