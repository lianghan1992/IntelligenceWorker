
import React, { useState } from 'react';
import { IntelligencePointManager } from './IntelligencePointManager';
import { IntelligenceDataManager } from './IntelligenceDataManager';
import { IntelligenceChunkManager } from './IntelligenceChunkManager';
import { LlmSortingManager } from './LlmSortingManager';
import { GeminiSettingsManager } from './GeminiSettingsManager';
import { GenericCrawlerManager } from './GenericCrawlerManager';
import { PendingArticlesManager } from './PendingArticlesManager';
import { IntelligenceStats } from './IntelligenceTaskManager';
import { 
    ChartIcon, ServerIcon, SearchIcon, ViewGridIcon, 
    SparklesIcon, CheckCircleIcon, DatabaseIcon, RssIcon 
} from '../icons';

// --- Sub-Components for Layout ---

// 1. System Cockpit View
const CockpitView: React.FC = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ChartIcon className="w-5 h-5 text-indigo-600" />
                数据全景
            </h3>
            <IntelligenceStats />
        </section>
        <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                引擎配置
            </h3>
            <GeminiSettingsManager />
        </section>
    </div>
);

// 2. Data Pipeline View
const PipelineView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'generic' | 'pending' | 'standard'>('generic');

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-4 self-start">
                {[
                    { id: 'generic', label: '通用爬虫 & 任务', icon: ServerIcon },
                    { id: 'pending', label: '人工审核队列', icon: CheckCircleIcon },
                    { id: 'standard', label: '标准源配置', icon: RssIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === tab.id 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>
            
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {activeTab === 'generic' && <GenericCrawlerManager />}
                {activeTab === 'pending' && <PendingArticlesManager />}
                {activeTab === 'standard' && <IntelligencePointManager />}
            </div>
        </div>
    );
};

// 3. Retrieval View
const RetrievalView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'chunk' | 'llm' | 'library'>('chunk');

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-4 self-start">
                {[
                    { id: 'chunk', label: '分段语义检索', icon: ViewGridIcon },
                    { id: 'llm', label: 'LLM 智能分析', icon: SparklesIcon },
                    { id: 'library', label: '文章数据库', icon: DatabaseIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === tab.id 
                                ? 'bg-white text-purple-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {activeTab === 'chunk' && <IntelligenceChunkManager />}
                {activeTab === 'llm' && <LlmSortingManager />}
                {activeTab === 'library' && <IntelligenceDataManager />}
            </div>
        </div>
    );
};

// --- Main Dashboard ---
export const IntelligenceDashboard: React.FC = () => {
    const [mainView, setMainView] = useState<'cockpit' | 'pipeline' | 'retrieval'>('cockpit');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 flex-shrink-0 z-10 sticky top-0">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">情报中台</h1>
                </div>
                <div className="flex gap-8">
                    {[
                        { id: 'cockpit', label: '系统驾驶舱', icon: ChartIcon },
                        { id: 'pipeline', label: '采集流水线', icon: ServerIcon },
                        { id: 'retrieval', label: '知识检索', icon: SearchIcon },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setMainView(item.id as any)}
                            className={`
                                pb-3 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all
                                ${mainView === item.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            <item.icon className={`w-5 h-5 ${mainView === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden p-4 md:p-6">
                {mainView === 'cockpit' && <CockpitView />}
                {mainView === 'pipeline' && <PipelineView />}
                {mainView === 'retrieval' && <RetrievalView />}
            </div>
        </div>
    );
};
