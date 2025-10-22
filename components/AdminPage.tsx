import React, { useState } from 'react';
import { AdminView } from '../types';
import { UserManager } from './UserManager';
import { LivestreamTaskManager } from './LivestreamTaskManager';

const IntelligenceManager: React.FC = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800">情报点与任务管理</h2>
        <p className="mt-2 text-gray-600">此功能正在开发中。您将能够在此处管理所有情报订阅点、查看处理任务状态并手动触发任务。</p>
    </div>
);

const DeepDiveManager: React.FC = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800">深度洞察管理</h2>
        <p className="mt-2 text-gray-600">此功能正在开发中。您将能够在此处创建、编辑和发布深度洞察报告。</p>
    </div>
);

export const AdminPage: React.FC = () => {
    const [view, setView] = useState<AdminView>('users');

    const navItems: { view: AdminView; label: string }[] = [
        { view: 'users', label: '用户管理' },
        { view: 'intelligence', label: '情报管理' },
        { view: 'dives', label: '洞察管理' },
        { view: 'events', label: '发布会管理' },
    ];

    const renderView = () => {
        switch (view) {
            case 'users':
                return <UserManager />;
            case 'intelligence':
                return <IntelligenceManager />;
            case 'dives':
                return <DeepDiveManager />;
            case 'events':
                return <LivestreamTaskManager />;
            default:
                return <UserManager />;
        }
    };
    
    return (
        <div className="p-6 bg-gray-50/50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">后台管理</h1>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {navItems.map((item) => (
                        <button
                            key={item.view}
                            onClick={() => setView(item.view)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                view === item.view
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div>
                {renderView()}
            </div>
        </div>
    );
};