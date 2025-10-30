import React, { useState } from 'react';
import { AdminView } from '../../types';
import { LivestreamTaskManager } from './LivestreamTaskManager';
import { IntelligenceDashboard } from './IntelligenceDashboard';
import { UserManager } from './UserManager';
import { UsersIcon, VideoCameraIcon, RssIcon, BrainIcon, DocumentTextIcon } from '../icons';
import { CompetitivenessManager } from './CompetitivenessManager';
import { MarkdownToHtmlManager } from './MarkdownToHtmlManager';

const navItems: { view: AdminView; label: string; icon: React.FC<any> }[] = [
    { view: 'users', label: '用户管理', icon: UsersIcon },
    { view: 'events', label: '发布会管理', icon: VideoCameraIcon },
    { view: 'intelligence', label: '情报管理', icon: RssIcon },
    { view: 'competitiveness', label: '竞争力管理', icon: BrainIcon },
    { view: 'markdown2html', label: 'Markdown转HTML', icon: DocumentTextIcon },
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
            default:
                return <UserManager />;
        }
    };

    return (
        <div className="flex h-full bg-gray-50/50">
            <aside className="w-56 bg-white border-r flex-shrink-0">
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
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};
