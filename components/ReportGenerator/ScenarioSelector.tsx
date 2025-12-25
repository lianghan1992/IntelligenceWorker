
import React from 'react';
import { StratifyScenario } from '../../types';
import { SparklesIcon, ArrowRightIcon, DocumentTextIcon, ChartIcon, BrainIcon } from '../../icons';

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
    
    // 根据场景名称或ID分配不同的视觉风格
    const getCardStyle = (index: number) => {
        const styles = [
            'from-indigo-500 to-purple-600 shadow-indigo-200',
            'from-blue-500 to-cyan-600 shadow-blue-200',
            'from-emerald-500 to-teal-600 shadow-emerald-200',
            'from-orange-500 to-pink-600 shadow-orange-200',
        ];
        return styles[index % styles.length];
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                    {scenarios.map((scenario, idx) => {
                        const gradient = getCardStyle(idx);
                        
                        return (
                            <div 
                                key={scenario.id}
                                onClick={() => onSelect(scenario)}
                                className="group relative h-72 rounded-[32px] bg-white border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer overflow-hidden isolate"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                {/* Hover Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 z-0`}></div>
                                
                                {/* Decorative Circle */}
                                <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${gradient} rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700 ease-out blur-2xl`}></div>

                                <div className="relative z-10 h-full flex flex-col p-8">
                                    {/* Icon Box */}
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        {idx % 3 === 0 ? <DocumentTextIcon className="w-7 h-7" /> : 
                                         idx % 3 === 1 ? <ChartIcon className="w-7 h-7" /> : 
                                         <BrainIcon className="w-7 h-7" />}
                                    </div>

                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-indigo-700 transition-colors">
                                        {scenario.title || scenario.name}
                                    </h3>
                                    
                                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                                        {scenario.description || '该场景包含自动化分析流程，可快速生成专业报告。'}
                                    </p>

                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-100 group-hover:border-slate-200/0 transition-colors">
                                        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                            {scenario.model_id ? `${scenario.channel_code}@${scenario.model_id}` : 'Auto Model'}
                                        </span>
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <ArrowRightIcon className="w-5 h-5 -ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {scenarios.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px] bg-white/50">
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
