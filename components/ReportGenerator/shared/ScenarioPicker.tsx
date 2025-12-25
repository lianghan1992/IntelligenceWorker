
import React from 'react';
import { StratifyScenario } from '../../../types';
import { SparklesIcon, ArrowRightIcon, DocumentTextIcon } from '../../icons';

interface ScenarioPickerProps {
    scenarios: StratifyScenario[];
    onSelect: (id: string) => void;
}

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({ scenarios, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        选择您的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">AI 智能体</span>
                    </h1>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                        每个智能体都经过专业调优，能够处理特定的行业分析任务。点击即可启动工作流。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map((scenario) => (
                        <div 
                            key={scenario.id}
                            onClick={() => onSelect(scenario.id)}
                            className="group relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <SparklesIcon className="w-24 h-24 text-indigo-600 transform rotate-12" />
                            </div>
                            
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <DocumentTextIcon className="w-6 h-6" />
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{scenario.title || scenario.name}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
                                    {scenario.description || '该智能体可以协助您完成深度分析任务。'}
                                </p>
                                
                                <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                                    立即开始 <ArrowRightIcon className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {scenarios.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400">
                            暂无可用场景，请联系管理员配置。
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
