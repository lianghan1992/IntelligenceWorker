import React, { useState } from 'react';
import { AdminView } from '../../types';
import { LivestreamTaskManager } from './LivestreamTaskManager';
import { IntelligenceDashboard } from './IntelligenceDashboard';
import { UserManager } from './UserManager';
import { UsersIcon, VideoCameraIcon, RssIcon, BrainIcon, DocumentTextIcon, ViewGridIcon } from '../icons';
import { CompetitivenessManager } from './CompetitivenessManager';
import { MarkdownToHtmlManager } from './MarkdownToHtmlManager';
import { DeepInsightManager } from './DeepInsight/index';

const navItems: { view: AdminView; label: string; icon: React.FC<any> }[] = [
    { view: 'users', label: '用户', icon: UsersIcon },
    { view: 'events', label: '发布会', icon: VideoCameraIcon },
    { view: 'intelligence', label: '情报', icon: RssIcon },
    { view: 'competitiveness', label: '竞争力', icon: BrainIcon },
    { view: 'markdown2html', label: 'Markdown', icon: DocumentTextIcon },
    { view: 'deep_insight', label: '深度洞察', icon: ViewGridIcon },
];

export const AdminPage: React.FC = () => {
    const [view, setView] = useState<AdminView>('users');

    const renderView = () => {
        switch (view) {
            case 'users':
                return <UserManager />;
            case 'events':
                return <LivestreamTaskManager />;
            case 'intelligence':
                return <IntelligenceDashboard />;
            case 'competitiveness':
                return <CompetitivenessManager />;
            case 'markdown2html':
                return <MarkdownToHtmlManager />;
            case 'deep_insight':
                return <DeepInsightManager />;
            default:
                return <UserManager />;
        }
    };

    return (
        <div className="flex h-full bg-gray-50/50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-56 bg-white border-r flex-shrink-0">
                <nav className="p-2 mt-4 space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.view}
                            onClick={() => setView(item.view)}
                            className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                view === item.view
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}管理
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {renderView()}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-t-md flex justify-around z-30 overflow-x-auto">
                {navItems.map(item => (
                    <button
                        key={item.view}
                        onClick={() => setView(item.view)}
                        className={`flex flex-col items-center justify-center text-center p-2 min-w-[4rem] transition-colors ${
                            view === item.view
                                ? 'text-blue-600'
                                : 'text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-xs truncate">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};
