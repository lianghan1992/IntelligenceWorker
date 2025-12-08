
import React, { useState } from 'react';
import { SourceConfig } from './Intelligence/SourceConfig';
import { ArticleList } from './Intelligence/ArticleList';
import { ServiceStatus } from './Intelligence/ServiceStatus';
import { ServerIcon, ViewListIcon, ChartIcon } from '../icons';

export const IntelligenceDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'status' | 'config' | 'articles'>('config');

    return (
        <div className="h-full flex flex-col bg-slate-50/30 p-6">
            <div className="flex-shrink-0 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">情报采集管理</h1>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('status')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'status' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ChartIcon className="w-5 h-5" />
                            服务状态
                        </button>
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'config' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ServerIcon className="w-5 h-5" />
                            情报源配置
                        </button>
                        <button
                            onClick={() => setActiveTab('articles')}
                            className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'articles' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ViewListIcon className="w-5 h-5" />
                            采集文章库
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'status' && <ServiceStatus />}
                {activeTab === 'config' && <SourceConfig />}
                {activeTab === 'articles' && <ArticleList />}
            </div>
        </div>
    );
};
