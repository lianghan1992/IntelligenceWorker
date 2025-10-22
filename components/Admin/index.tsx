import React, { useState } from 'react';
import { AdminView } from '../../types';
import { LivestreamTaskManager } from './LivestreamTaskManager';

// Placeholders for other admin components
const IntelligenceManagerPlaceholder: React.FC = () => <div className="p-6">Intelligence Sources & Points Management Coming Soon...</div>;
const UserManagerPlaceholder: React.FC = () => <div className="p-6">User Management Coming Soon...</div>;
const DivesManagerPlaceholder: React.FC = () => <div className="p-6">Deep Dives Management Coming Soon...</div>;

const navItems: { view: AdminView; label: string }[] = [
    { view: 'events', label: '发布会任务' },
    { view: 'intelligence', label: '情报点管理' },
    { view: 'users', label: '用户管理' },
    { view: 'dives', label: '深度洞察' },
];

export const AdminPage: React.FC = () => {
    const [view, setView] = useState<AdminView>('events');

    const renderView = () => {
        switch (view) {
            case 'events':
                return <LivestreamTaskManager />;
            case 'intelligence':
                return <IntelligenceManagerPlaceholder />;
            case 'users':
                return <UserManagerPlaceholder />;
            case 'dives':
                return <DivesManagerPlaceholder />;
            default:
                return <LivestreamTaskManager />;
        }
    };

    return (
        <div className="flex h-full bg-gray-50/50">
            <aside className="w-56 bg-white border-r flex-shrink-0">
                <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-800">后台管理</h2>
                </div>
                <nav className="p-2">
                    {navItems.map(item => (
                        <button
                            key={item.view}
                            onClick={() => setView(item.view)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                view === item.view
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto p-6">
                {renderView()}
            </main>
        </div>
    );
};
