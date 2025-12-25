
import React from 'react';
import { StratifyScenario } from '../../types';
import { SparklesIcon, ArrowRightIcon, DocumentTextIcon, ChartIcon, BrainIcon } from '../icons';

interface ScenarioSelectorProps {
    scenarios: StratifyScenario[];
    onSelect: (scenario: StratifyScenario) => void;
}

// 动态背景组件
const AnimatedBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" />
        <div className="absolute top-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-indigo-200/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50rem] h-[50rem] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
);

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ scenarios, onSelect }) => {
    
    // 获取渐变色配置
    const getGradient = (index: number) => {
        const gradients = [
            'from-indigo-500 to-purple-600',
            'from-blue-500 to-cyan-600',
            'from-emerald-500 to-teal-600',
            'from-orange-500 to-pink-600',
        ];
        return gradients[index % gradients.length];
    };

    // 获取图标颜色
    const getIconColor = (index: number) => {
        const colors = [
            'text-indigo-600',
            'text-blue-600',
            'text-emerald-600',
            'text-orange-600',
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="relative w-full h-full bg-slate-50 overflow-y-auto custom-scrollbar p-6 md:p-12">
            <AnimatedBackground />

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-indigo-100 shadow-sm backdrop-blur-sm mb-4">
                        <SparklesIcon className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-900 tracking-wide uppercase">StratifyAI Engine</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">
                        选择您的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">智能分析场景</span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                        每个场景都内置了专家级思维链（CoT）与行业知识库。
                        <br className="hidden md:block" />
                        点击卡片，立即启动针对特定领域的深度生成任务。
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {scenarios.map((scenario, idx) => {
                        const gradient = getGradient(idx);
                        const iconColor = getIconColor(idx);
                        
                        return (
                            <div 
                                key={scenario.id}
                                onClick={() => onSelect(scenario)}
                                className="group relative bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full min-h-[260px]"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                {/* Subtle Gradient Background on Hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}></div>
                                
                                {/* Top Row: Icon & Arrow */}
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} p-[1px] shadow-sm group-hover:shadow-md transition-shadow duration-300`}>
                                        <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                                            {idx % 3 === 0 ? <DocumentTextIcon className={`w-7 h-7 ${iconColor}`} /> : 
                                             idx % 3 === 1 ? <ChartIcon className={`w-7 h-7 ${iconColor}`} /> : 
                                             <BrainIcon className={`w-7 h-7 ${iconColor}`} />}
                                        </div>
                                    </div>

                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-slate-50 group-hover:text-slate-900 transition-all duration-300">
                                        <ArrowRightIcon className="w-5 h-5 transform -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="relative z-10 flex-1 flex flex-col">
                                    <h3 className="text-xl font-extrabold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">
                                        {scenario.title || scenario.name}
                                    </h3>
                                    
                                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                                        {scenario.description || '该场景包含自动化分析流程，可快速生成专业报告。'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {scenarios.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                            <DocumentTextIcon className="w-16 h-16 opacity-20 mb-4" />
                            <p>暂无可用场景，请联系管理员在后台配置。</p>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 10s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};
