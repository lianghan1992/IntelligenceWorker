
import React from 'react';
import { StratifyScenario } from '../../../types';
import { ArrowLeftIcon, SparklesIcon, DocumentTextIcon, ChartIcon } from '../../icons';

interface SpecificScenarioProps {
    scenario: StratifyScenario;
    onBack: () => void;
}

/**
 * 场景 ID: 5e99897c-6d91-4c72-88e5-653ea162e52b
 * 这是一个完全独立的场景组件，拥有自己的 UI 逻辑和状态管理。
 */
export const ScenarioWorkstation: React.FC<SpecificScenarioProps> = ({ scenario, onBack }) => {
    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* 顶部导航栏 (独立设计) */}
            <header className="flex-shrink-0 px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors"
                        title="返回场景选择"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-slate-800 leading-none flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-purple-600" />
                            {scenario.title || '特定场景分析'}
                        </h1>
                        <span className="text-[10px] text-slate-400 font-mono mt-1">ID: {scenario.id.slice(0, 8)}...</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100">
                        Workstation Active
                    </span>
                </div>
            </header>

            {/* 主工作区 */}
            <div className="flex-1 overflow-hidden flex">
                {/* 左侧：输入/配置区 (示例布局) */}
                <div className="w-1/3 min-w-[320px] border-r border-slate-100 bg-slate-50 p-6 overflow-y-auto">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">分析主题</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                placeholder="请输入..."
                            />
                        </div>
                        
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <h3 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                                <DocumentTextIcon className="w-3.5 h-3.5" /> 场景描述
                            </h3>
                            <p className="text-xs text-blue-600 leading-relaxed">
                                {scenario.description}
                            </p>
                        </div>

                        <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors shadow-lg shadow-slate-200">
                            开始执行任务
                        </button>
                    </div>
                </div>

                {/* 右侧：结果展示区 (示例布局) */}
                <div className="flex-1 bg-white p-8 overflow-y-auto flex flex-col items-center justify-center text-slate-300">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <ChartIcon className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">等待输入指令...</p>
                </div>
            </div>
        </div>
    );
};
