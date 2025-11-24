import React, { useState } from 'react';
import { TaskManager } from './TaskManager';
import { CategoryManager } from './CategoryManager';
import { GeminiSettings } from './GeminiSettings';
import { DocumentTextIcon, ViewGridIcon, GearIcon } from '../../icons';

type SubView = 'tasks' | 'categories' | 'settings';

export const DeepInsightManager: React.FC = () => {
    const [subView, setSubView] = useState<SubView>('tasks');

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex-shrink-0 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">深度洞察管理</h1>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setSubView('tasks')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                ${subView === 'tasks' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                            文档任务
                        </button>
                        <button
                            onClick={() => setSubView('categories')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                ${subView === 'categories' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ViewGridIcon className="w-5 h-5" />
                            分类管理
                        </button>
                        <button
                            onClick={() => setSubView('settings')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                ${subView === 'settings' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <GearIcon className="w-5 h-5" />
                            Gemini 配置
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {subView === 'tasks' && <TaskManager />}
                {subView === 'categories' && <CategoryManager />}
                {subView === 'settings' && <GeminiSettings />}
            </div>
        </div>
    );
};
