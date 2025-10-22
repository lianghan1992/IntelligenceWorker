import React, { useState } from 'react';
import { AdminView } from '../../types';
import { LivestreamTaskManager } from './LivestreamTaskManager';
import { IntelligenceDashboard } from './IntelligenceDashboard'; // 新增

// Placeholders for other admin components
const UserManagerPlaceholder: React.FC = () => <div className="p-6">User Management Coming Soon...</div>;
const DivesManagerPlaceholder: React.FC = () => <div className="p-6">Deep Dives Management Coming Soon...</div>;

const navItems: { view: AdminView; label: string }[] = [
    { view: 'events', label: '发布会任务' },
    { view: 'intelligence', label: '情报中枢' },
    { view: 'users', label: '用户管理' },
    { view: 'dives', label: '深度洞察' },
];

export const AdminPage: React.FC = () => {
    const [view, setView] = useState<AdminView>('intelligence');

    const renderView = () => {
        switch (view) {
            case 'events':
                return <LivestreamTaskManager />;
            case 'intelligence':
                return <IntelligenceDashboard />; // 替换
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
                <nav className="p-2 mt-4">
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
            <main className="flex-1 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};
