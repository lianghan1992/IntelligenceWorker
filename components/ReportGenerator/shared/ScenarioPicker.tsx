
import React from 'react';
import { Scenario } from '../../../types';
import { isScenarioSupported } from '../scenarios/registry';
import { SparklesIcon, ChevronRightIcon, LockClosedIcon, ViewGridIcon, LightningBoltIcon, GlobeIcon, BrainIcon } from '../../icons';

// 高能量颜色与动画配置
const ENERGY_SCHEMES = [
    {
        id: 'electric',
        from: 'from-blue-600',
        to: 'to-indigo-500',
        iconCol: 'text-blue-600',
        glow: 'shadow-blue-500/20',
        effect: 'liquid-glow'
    },
    {
        id: 'mint',
        from: 'from-emerald-500',
        to: 'to-teal-400',
        iconCol: 'text-emerald-600',
        glow: 'shadow-emerald-500/20',
        effect: 'particle-rise'
    },
    {
        id: 'sunset',
        from: 'from-orange-500',
        to: 'to-rose-500',
        iconCol: 'text-orange-600',
        glow: 'shadow-orange-500/20',
        effect: 'digital-pulse'
    },
    {
        id: 'cyber',
        from: 'from-purple-600',
        to: 'to-fuchsia-500',
        iconCol: 'text-purple-600',
        glow: 'shadow-purple-500/20',
        effect: 'geo-rotate'
    }
];

const ICONS = [ViewGridIcon, LightningBoltIcon, GlobeIcon, BrainIcon];

export const ScenarioPicker: React.FC<{
    scenarios: Scenario[];
    onSelect: (name: string) => void;
}> = ({ scenarios, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center custom-scrollbar bg-white">
            <style>{`
                /* 1. 炫光流体动画 */
                @keyframes liquid {
                    0% { transform: translate(-10%, -10%) rotate(0deg); }
                    50% { transform: translate(10%, 10%) rotate(180deg); }
                    100% { transform: translate(-10%, -10%) rotate(360deg); }
                }
                .animate-liquid { animation: liquid 15s linear infinite; }

                /* 2. 粒子上升动画 */
                @keyframes particle {
                    0% { transform: translateY(100%) scale(0.5); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(-100%) scale(1.2); opacity: 0; }
                }
                .animate-particle { animation: particle 3s ease-in infinite; }

                /* 3. 数码脉冲 (线条穿梭) */
                @keyframes pulse-line {
                    0% { left: -100%; top: 20%; }
                    100% { left: 200%; top: 80%; }
                }
                .animate-pulse-line { animation: pulse-line 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

                /* 4. 几何旋转 */
                @keyframes geo-float {
                    0% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.3); }
                    100% { transform: rotate(360deg) scale(1); }
                }
                .animate-geo { animation: geo-float 10s ease-in-out infinite; }
                
                .glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(2px); }
            `}</style>

            <div className="max-w-[1200px] w-full">
                <header className="mb-12 text-left ml-2">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Workspace</h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Select Agent Scenario to Start</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {scenarios.map((s, idx) => {
                        const supported = isScenarioSupported(s.name);
                        const scheme = ENERGY_SCHEMES[idx % ENERGY_SCHEMES.length];
                        const Icon = ICONS[idx % ICONS.length];

                        return (
                            <div 
                                key={s.name}
                                onClick={() => supported && onSelect(s.name)}
                                className={`group relative h-[135px] rounded-[28px] overflow-hidden transition-all duration-500 border border-slate-100 shadow-xl ${
                                    supported 
                                    ? `cursor-pointer hover:scale-[1.05] hover:shadow-2xl ${scheme.glow} active:scale-95` 
                                    : 'cursor-not-allowed grayscale opacity-40'
                                }`}
                            >
                                {/* --- 动态能量背景层 --- */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${scheme.from} ${scheme.to} opacity-90 transition-opacity group-hover:opacity-100`}></div>
                                
                                {/* 动态特效引擎渲染 */}
                                {scheme.effect === 'liquid-glow' && (
                                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.4)_0%,transparent_60%)] animate-liquid"></div>
                                    </div>
                                )}
                                
                                {scheme.effect === 'particle-rise' && (
                                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="absolute bottom-0 w-1 h-1 bg-white rounded-full animate-particle" style={{ left: `${i * 20}%`, animationDelay: `${i * 0.4}s` }}></div>
                                        ))}
                                    </div>
                                )}

                                {scheme.effect === 'digital-pulse' && (
                                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                        <div className="absolute w-[150%] h-[1px] bg-white/40 rotate-[15deg] animate-pulse-line"></div>
                                        <div className="absolute w-[150%] h-[1px] bg-white/40 rotate-[15deg] animate-pulse-line delay-700"></div>
                                    </div>
                                )}

                                {scheme.effect === 'geo-rotate' && (
                                    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                                        <div className="w-32 h-32 border-2 border-white/20 rounded-full animate-geo"></div>
                                        <div className="absolute w-20 h-20 border border-white/10 rotate-45 animate-geo delay-500"></div>
                                    </div>
                                )}

                                {/* --- 内容层 --- */}
                                <div className="absolute inset-0 glass-card flex flex-col p-5 justify-between z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white shadow-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12 group-hover:scale-110">
                                            <Icon className={`w-4 h-4 ${scheme.iconCol}`} />
                                        </div>
                                        <h3 className="font-black text-white text-base tracking-tight leading-none drop-shadow-md">
                                            {s.title || s.name}
                                        </h3>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] text-white/80 line-clamp-2 leading-relaxed font-bold tracking-tight">
                                            {s.description || '基于行业专家逻辑链条构建的智能创作流水线，一键产出高价值研报。'}
                                        </p>
                                        
                                        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                            <div className="flex items-center gap-1 text-[9px] font-black text-white uppercase tracking-widest">
                                                Activate <ChevronRightIcon className="w-2.5 h-2.5" />
                                            </div>
                                            <SparklesIcon className="w-3.5 h-3.5 text-white/60 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* 卡片装饰线条 */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20"></div>
                                <div className="absolute bottom-0 right-0 w-1/3 h-1 bg-white/30 rounded-full mb-1 mr-4 group-hover:w-1/2 transition-all"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
