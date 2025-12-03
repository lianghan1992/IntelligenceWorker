
import React, { useState } from 'react';
import { ServerIcon, LightningBoltIcon, BrainIcon } from '../icons';
import { IntelligenceStats } from './IntelligenceTaskManager';
import { GeminiSettingsManager } from './GeminiSettingsManager';
import { IntelligencePointManager } from './IntelligencePointManager';
import { GenericCrawlerManager } from './GenericCrawlerManager';
import { PendingArticlesManager } from './PendingArticlesManager';
import { IntelligenceChunkManager } from './IntelligenceChunkManager';
import { LlmSortingManager } from './LlmSortingManager';
import { IntelligenceDataManager } from './IntelligenceDataManager';

// --- Main Dashboard Component ---
export const IntelligenceDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cockpit' | 'pipeline' | 'retrieval'>('cockpit');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 pt-4 pb-0 flex-shrink-0 z-10 sticky top-0">
                <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('cockpit')}
                        className={`
                            pb-3 px-2 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap
                            ${activeTab === 'cockpit' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        <ServerIcon className={`w-5 h-5 ${activeTab === 'cockpit' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        系统驾驶舱
                    </button>
                    <button
                        onClick={() => setActiveTab('pipeline')}
                        className={`
                            pb-3 px-2 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap
                            ${activeTab === 'pipeline' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        <LightningBoltIcon className={`w-5 h-5 ${activeTab === 'pipeline' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        采集流水线
                    </button>
                    <button
                        onClick={() => setActiveTab('retrieval')}
                        className={`
                            pb-3 px-2 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap
                            ${activeTab === 'retrieval' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        <BrainIcon className={`w-5 h-5 ${activeTab === 'retrieval' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        知识检索
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'cockpit' && (
                    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                        <section>
                            <IntelligenceStats compact={false} />
                        </section>
                        <section>
                            <GeminiSettingsManager />
                        </section>
                        <section className="h-[600px] flex flex-col">
                             <div className="mb-4 flex items-center gap-2">
                                <h3 className="font-bold text-slate-700">全网情报源概览</h3>
                                <div className="h-px flex-1 bg-slate-200"></div>
                             </div>
                             <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <IntelligencePointManager />
                             </div>
                        </section>
                    </div>
                )}

                {activeTab === 'pipeline' && (
                    <div className="h-full flex flex-col p-4 md:p-6 gap-6 overflow-y-auto custom-scrollbar">
                        <div className="h-[600px] flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <GenericCrawlerManager />
                        </div>
                        <div className="h-[600px] flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <PendingArticlesManager />
                        </div>
                    </div>
                )}

                {activeTab === 'retrieval' && (
                    <div className="h-full flex flex-col p-4 md:p-6 gap-6 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px] flex-shrink-0">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <IntelligenceChunkManager />
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <LlmSortingManager />
                            </div>
                        </div>
                        <div className="h-[800px] flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <IntelligenceDataManager />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
