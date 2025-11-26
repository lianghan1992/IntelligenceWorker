
import React, { useState } from 'react';
import { IntelligencePointManager } from './IntelligencePointManager';
import { IntelligenceStats } from './IntelligenceTaskManager'; // Renamed/Refactored Component
import { IntelligenceDataManager } from './IntelligenceDataManager';
import { IntelligenceChunkManager } from './IntelligenceChunkManager';
import { LlmSortingManager } from './LlmSortingManager';
import { GeminiSettingsManager } from './GeminiSettingsManager';
import { RssIcon, DocumentTextIcon, ChartIcon, ViewGridIcon, SparklesIcon, GearIcon } from '../icons';

type IntelligenceSubView = 'points' | 'stats' | 'data' | 'chunks' | 'llm' | 'gemini';

const subNavItems: { view: IntelligenceSubView; label: string; icon: React.FC<any> }[] = [
    { view: 'stats', label: '系统看板', icon: ChartIcon },
    { view: 'points', label: '源与采集配置', icon: RssIcon },
    { view: 'data', label: '文章库管理', icon: DocumentTextIcon },
    { view: 'chunks', label: '向量分段', icon: ViewGridIcon },
    { view: 'llm', label: 'AI 智能分拣', icon: SparklesIcon },
    { view: 'gemini', label: '引擎配置', icon: GearIcon },
];

export const IntelligenceDashboard: React.FC = () => {
    const [subView, setSubView] = useState<IntelligenceSubView>('stats');

    const renderSubView = () => {
        switch (subView) {
            case 'points': return <IntelligencePointManager />;
            case 'stats': return <IntelligenceStats />;
            case 'data': return <IntelligenceDataManager />;
            case 'chunks': return <IntelligenceChunkManager />;
            case 'llm': return <LlmSortingManager />;
            case 'gemini': return <GeminiSettingsManager />;
            default: return <IntelligenceStats />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm px-6 pt-4">
                <h1 className="text-2xl font-bold text-slate-800 mb-4">情报中台管理</h1>
                <div className="overflow-x-auto -mb-px">
                     <style>{`
                        .scrollbar-hide::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    <nav className="flex space-x-8 scrollbar-hide" aria-label="Tabs">
                        {subNavItems.map(item => (
                            <button
                                key={item.view}
                                onClick={() => setSubView(item.view)}
                                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                    subView === item.view
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 ${subView === item.view ? 'text-indigo-500' : 'text-slate-400'}`} />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            <div className="flex-1 overflow-hidden p-4 md:p-6">
                {renderSubView()}
            </div>
        </div>
    );
};
