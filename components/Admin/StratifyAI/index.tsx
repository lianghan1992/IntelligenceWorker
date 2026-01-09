
import React, { useState } from 'react';
import { ScenarioManager } from './ScenarioManager';
import { ChannelManager } from './ChannelManager';
import { PricingManager } from './PricingManager';
import { UsageStatsManager } from './UsageStatsManager';
import { SparklesIcon, ViewGridIcon, ServerIcon, ChartIcon, TrendingUpIcon } from '../../icons';

type SubView = 'channels' | 'scenarios' | 'pricing' | 'stats';

export const StratifyAiManager: React.FC = () => {
    const [subView, setSubView] = useState<SubView>('channels');

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex-shrink-0 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <SparklesIcon className="w-8 h-8 text-indigo-600" />
                    AI 报告引擎管理
                </h1>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setSubView('channels')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'channels' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ServerIcon className="w-5 h-5" />
                            模型渠道管理
                        </button>
                        <button
                            onClick={() => setSubView('scenarios')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'scenarios' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ViewGridIcon className="w-5 h-5" />
                            场景与提示词
                        </button>
                        <button
                            onClick={() => setSubView('pricing')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'pricing' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ChartIcon className="w-5 h-5" />
                            计费与定价管理
                        </button>
                        <button
                            onClick={() => setSubView('stats')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'stats' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <TrendingUpIcon className="w-5 h-5" />
                            用量统计
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {subView === 'channels' && <ChannelManager />}
                {subView === 'scenarios' && <ScenarioManager />}
                {subView === 'pricing' && <PricingManager />}
                {subView === 'stats' && <UsageStatsManager />}
            </div>
        </div>
    );
};
