
import React, { useState } from 'react';
import { ScenarioManager } from './ScenarioManager';
import { SparklesIcon, ViewGridIcon } from '../../icons';

type SubView = 'scenarios';

export const StratifyAiManager: React.FC = () => {
    const [subView, setSubView] = useState<SubView>('scenarios');

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex-shrink-0 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <SparklesIcon className="w-8 h-8 text-indigo-600" />
                    Agent 场景引擎
                </h1>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
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
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <ScenarioManager />
            </div>
        </div>
    );
};
