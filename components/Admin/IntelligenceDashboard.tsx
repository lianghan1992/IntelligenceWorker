
import React, { useState } from 'react';
import { IntelligencePointManager } from './IntelligencePointManager';
import { IntelligenceDataManager } from './IntelligenceDataManager';
import { IntelligenceChunkManager } from './IntelligenceChunkManager';
import { LlmSortingManager } from './LlmSortingManager';
import { GeminiSettingsManager } from './GeminiSettingsManager';
import { GenericCrawlerManager } from './GenericCrawlerManager';
import { PendingArticlesManager } from './PendingArticlesManager';
import { RssIcon, DocumentTextIcon, ViewGridIcon, SparklesIcon, GearIcon, ServerIcon, CheckCircleIcon } from '../icons';

type IntelligenceSubView = 'overview' | 'data' | 'chunks' | 'llm' | 'gemini' | 'generic' | 'pending';

const subNavItems: { view: IntelligenceSubView; label: string; icon: React.FC<any> }[] = [
    { view: 'overview', label: '系统概览与配置', icon: RssIcon },
    { view: 'generic', label: '通用爬虫配置', icon: ServerIcon }, // New
    { view: 'pending', label: '待确认文章', icon: CheckCircleIcon }, // New
    { view: 'data', label: '文章库管理', icon: DocumentTextIcon },
    { view: 'chunks', label: '向量分段', icon: ViewGridIcon },
    { view: 'llm', label: 'AI 智能分拣', icon: SparklesIcon },
    { view: 'gemini', label: 'HTML生成配置', icon: GearIcon },
];

export const IntelligenceDashboard: React.FC = () => {
    const [subView, setSubView] = useState<IntelligenceSubView>('overview');

    const renderSubView = () => {
        switch (subView) {
            case 'overview': return <IntelligencePointManager />; 
            case 'generic': return <GenericCrawlerManager />; // New
            case 'pending': return <PendingArticlesManager />; // New
            case 'data': return <IntelligenceDataManager />;
            case 'chunks': return <IntelligenceChunkManager />;
            case 'llm': return <LlmSortingManager />;
            case 'gemini': return <GeminiSettingsManager />;
            default: return <IntelligencePointManager />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm px-6 pt-4 pb-2">
                <div className="overflow-x-auto">
                     <style>{`
                        .scrollbar-hide::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    <nav className="flex space-x-1 scrollbar-hide pb-2" aria-label="Tabs">
                        {subNavItems.map(item => (
                            <button
                                key={item.view}
                                onClick={() => setSubView(item.view)}
                                className={`
                                    whitespace-nowrap px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition-all
                                    ${subView === item.view
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                    }
                                `}
                            >
                                <item.icon className={`w-4 h-4 ${subView === item.view ? 'text-white' : 'text-slate-400'}`} />
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
