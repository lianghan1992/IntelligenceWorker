import React, { useState } from 'react';
import { SourceConfig } from './Intelligence/SourceConfig';
import { ArticleList } from './Intelligence/ArticleList';
import { ServiceStatus } from './Intelligence/ServiceStatus';
import { SegmentManager } from './Intelligence/SegmentManager';
import { LlmTaskManager } from './Intelligence/LlmTaskManager';
import { GenericAnalysisManager } from './Intelligence/GenericAnalysisManager';
import { ServerIcon, ViewListIcon, ChartIcon, PuzzleIcon, BrainIcon, SparklesIcon } from '../icons';

export const IntelligenceDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'status' | 'config' | 'articles' | 'segments' | 'llm' | 'analysis'>('status');

    return (
        <div className="h-full flex flex-col bg-slate-50/30 p-4 md:p-6">
            <div className="flex-shrink-0 mb-4 md:mb-6">
                <div className="border-b border-gray-200 overflow-x-auto no-scrollbar">
                    <nav className="-mb-px flex space-x-6 md:space-x-8 min-w-max">
                        <button
                            onClick={() => setActiveTab('status')}
                            className={`
                                whitespace-nowrap pb-3 md:pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
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
                                whitespace-nowrap pb-3 md:pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
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
                                whitespace-nowrap pb-3 md:pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'articles' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <ViewListIcon className="w-5 h-5" />
                            文章库
                        </button>
                        <button
                            onClick={() => setActiveTab('segments')}
                            className={`
                                whitespace-nowrap pb-3 md:pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'segments' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <PuzzleIcon className="w-5 h-5" />
                            分段检索
                        </button>
                        <button
                            onClick={() => setActiveTab('llm')}
                            className={`
                                whitespace-nowrap pb-3 md:pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'llm' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <BrainIcon className="w-5 h-5" />
                            LLM 检索
                        </button>
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={`
                                whitespace-nowrap pb-3 md:pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'analysis' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <SparklesIcon className="w-5 h-5" />
                            通用分析
                        </button>
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative rounded-xl border border-gray-100 bg-white shadow-sm">
                {activeTab === 'status' && <ServiceStatus />}
                {activeTab === 'config' && <SourceConfig />}
                {activeTab === 'articles' && <ArticleList />}
                {activeTab === 'segments' && <SegmentManager />}
                {activeTab === 'llm' && <LlmTaskManager />}
                {activeTab === 'analysis' && <GenericAnalysisManager />}
            </div>
        </div>
    );
};