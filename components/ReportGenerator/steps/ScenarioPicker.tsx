
import React from 'react';
import { Scenario } from '../../../types';
import { SparklesIcon, ArrowRightIcon, ViewGridIcon } from '../../icons';

export const ScenarioPicker: React.FC<{
    scenarios: Scenario[];
    onSelect: (name: string) => void;
}> = ({ scenarios, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col items-center">
            <div className="max-w-5xl w-full">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter">选择您的报告场景</h2>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        每个场景都预设了针对性的专家级提示词流水线，为您提供最专业的行业深度分析。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {scenarios.map((s) => (
                        <div 
                            key={s.name}
                            onClick={() => onSelect(s.name)}
                            className="group relative bg-white p-8 rounded-[32px] border-2 border-slate-100 hover:border-indigo-500 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col h-full overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <SparklesIcon className="w-32 h-32 text-indigo-600" />
                            </div>

                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <ViewGridIcon className="w-8 h-8" />
                            </div>

                            <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">{s.name}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1">
                                {s.description || '基于该场景的专业逻辑链条，深入剖析市场动态并生成高质量结构化报告。'}
                            </p>

                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                开启工作坊 <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))}
                    
                    {/* Placeholder for custom dev */}
                    <div className="p-8 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-50">
                        <PlusIcon className="w-10 h-10 text-slate-300 mb-4" />
                        <p className="text-slate-400 font-bold">自定义开发场景</p>
                        <p className="text-xs text-slate-400 mt-2">预留流水线接口</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
