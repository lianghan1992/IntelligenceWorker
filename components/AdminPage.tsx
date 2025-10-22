import React, { useState } from 'react';
import { AdminView } from '../types';
import { UsersIcon, RssIcon, DiveIcon, VideoCameraIcon } from './icons';
import { UserManager } from './UserManager';
import { LivestreamTaskManager } from './LivestreamTaskManager';

const navItems: { view: AdminView; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { view: 'users', label: '用户管理', icon: UsersIcon },
    { view: 'intelligence', label: '情报点管理', icon: RssIcon },
    { view: 'events', label: '发布会管理', icon: VideoCameraIcon },
    { view: 'dives', label: '深度洞察管理', icon: DiveIcon },
];

const PlaceholderManager: React.FC<{ title: string }> = ({ title }) => (
    <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <div className="mt-8 text-center py-20 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500">此功能模块正在开发中。</p>
        </div>
    </div>
);


export const AdminPage: React.FC = () => {
    const [currentView, setCurrentView] = useState<AdminView>('users');

    const renderView = () => {
        switch (currentView) {
            case 'users':
                return <UserManager />;
            case 'intelligence':
                return <PlaceholderManager title="情报点管理" />;
            case 'events':
                return <LivestreamTaskManager />;
            case 'dives':
                return <PlaceholderManager title="深度洞察管理" />;
            default:
                return <UserManager />;
        }
    };

    return (
        <div className="flex h-full bg-gray-50/70">
            <aside className="w-64 bg-white border-r flex-shrink-0">
                <div className="p-4">
                    <h2 className="text-xl font-bold text-gray-800">后台管理</h2>
                </div>
                <nav className="p-2 space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.view}
                            onClick={() => setCurrentView(item.view)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                currentView === item.view
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
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
