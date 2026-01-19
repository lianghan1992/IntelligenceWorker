
import React from 'react';
import { TaskManager } from './TaskManager';
import { DocumentTextIcon } from '../../icons';

export const DeepInsightManager: React.FC = () => {
    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex-shrink-0 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <DocumentTextIcon className="w-8 h-8 text-indigo-600" />
                            深度洞察管理
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 ml-11">
                            管理行业研报、技术文档，配置自动化分类标签。
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <TaskManager />
            </div>
        </div>
    );
};
