
import React, { useState } from 'react';
import { IntelligencePointManager } from './IntelligencePointManager';
import { IntelligenceTaskManager } from './IntelligenceTaskManager';
import { IntelligenceDataManager } from './IntelligenceDataManager';
import { IntelligenceChunkManager } from './IntelligenceChunkManager';
import { LlmSortingManager } from './LlmSortingManager';
import { RssIcon, DocumentTextIcon, ChartIcon, ViewGridIcon, SparklesIcon } from '../icons';

type IntelligenceSubView = 'points' | 'tasks' | 'data' | 'chunks' | 'llm';

const subNavItems: { view: IntelligenceSubView; label: string; icon: React.FC<any> }[] = [
    { view: 'points', label: '情报源管理', icon: RssIcon },
    { view: 'tasks', label: '采集任务监控', icon: ChartIcon },
    { view: 'data', label: '情报数据管理', icon: DocumentTextIcon },
    { view: 'chunks', label: '分段管理', icon: ViewGridIcon },
    { view: 'llm', label: 'LLM分拣', icon: SparklesIcon },
];

export const IntelligenceDashboard: React.FC = () => {
    const [subView, setSubView] = useState<IntelligenceSubView>('points');

    const renderSubView = () => {
        switch (subView) {
            case 'points': return <IntelligencePointManager />;
            case 'tasks': return <IntelligenceTaskManager />;
            case 'data': return <IntelligenceDataManager />;
            case 'chunks': return <IntelligenceChunkManager />;
            case 'llm': return <LlmSortingManager />;
            default: return <IntelligencePointManager />;
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <div className="border-b border-gray-200">
                    <div className="overflow-x-auto -mb-px" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                         <style>{`
                            .scrollbar-hide::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        <nav className="flex space-x-6 scrollbar-hide" aria-label="Tabs">
                            {subNavItems.map(item => (
                                <button
                                    key={item.view}
                                    onClick={() => setSubView(item.view)}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                        subView === item.view
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
            <div className="flex-1 mt-6 overflow-hidden">
                {renderSubView()}
            </div>
        </div>
    );
};