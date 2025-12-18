
import React from 'react';
import { Scenario } from '../../../types';
import { SparklesIcon, ArrowRightIcon, ViewGridIcon, LockClosedIcon } from '../../icons';
import { isScenarioSupported } from '../scenarios/registry';

export const ScenarioPicker: React.FC<{
    scenarios: Scenario[];
    onSelect: (name: string) => void;
}> = ({ scenarios, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col items-center custom-scrollbar">
            <div className="max-w-6xl w-full">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter">选择您的报告场景</h2>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        后端已感知到多种专业场景。每个场景都配备了针对性的专家级流水线。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {scenarios.map((s) => {
                        const supported = isScenarioSupported(s.name);
                        return (
                            <div 
                                key={s.name}
                                onClick={() => supported && onSelect(s.name)}
                                className={`group relative bg-white p-8 rounded-[40px] border-2 transition-all flex flex-col h-full overflow-hidden ${
                                    supported 
                                    ? 'cursor-pointer border-slate-100 hover:border-indigo-500 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/10 hover:-translate-y-1' 
                                    : 'cursor-not-allowed border-slate-50 opacity-60 grayscale'
                                }`}
                            >
                                {!supported && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold border border-slate-200">
                                            <LockClosedIcon className="w-3 h-3" /> 前端开发中
                                        </div>
                                    </div>
                                )}

                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <SparklesIcon className="w-32 h-32 text-indigo-600" />
                                </div>

                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 shadow-inner ${supported ? 'bg-indigo-50 text-indigo-600 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
                                    <ViewGridIcon className="w-8 h-8" />
                                </div>

                                <h3 className={`text-2xl font-bold mb-3 transition-colors ${supported ? 'text-slate-800 group-hover:text-indigo-600' : 'text-slate-400'}`}>{s.name}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1">
                                    {s.description || '基于该场景的专业逻辑链条，深入剖析市场动态并生成高质量结构化报告。'}
                                </p>

                                {supported ? (
                                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                        开启工作坊 <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                ) : (
                                    <div className="text-slate-400 font-bold text-sm">即将到来...</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
