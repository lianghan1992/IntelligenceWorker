
import React, { useState } from 'react';
import { ScenarioManager } from './ScenarioManager';
import { TaskManager } from './TaskManager';
import { QueueStatus } from './QueueStatus';
import { SparklesIcon, DocumentTextIcon, ClockIcon, ViewGridIcon } from '../../icons';

type SubView = 'scenarios' | 'tasks' | 'status';

export const StratifyAiManager: React.FC = () => {
    const [subView, setSubView] = useState<SubView>('scenarios');

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
                            onClick={() => setSubView('scenarios')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'scenarios' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ViewGridIcon className="w-5 h-5" />
                            生成场景配置
                        </button>
                        <button
                            onClick={() => setSubView('tasks')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'tasks' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ClockIcon className="w-5 h-5" />
                            报告任务流水
                        </button>
                        <button
                            onClick={() => setSubView('status')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2
                                ${subView === 'status' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                            队列状态
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {subView === 'scenarios' && <ScenarioManager />}
                {subView === 'tasks' && <TaskManager />}
                {subView === 'status' && <QueueStatus />}
            </div>
        </div>
    );
};
