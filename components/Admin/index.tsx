
import React from 'react';
import { LivestreamTaskManager } from './LivestreamTaskManager';

export const AdminPage: React.FC = () => {
    return (
        <div className="p-6 bg-gray-50/50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">后台管理</h1>
            <LivestreamTaskManager />
        </div>
    );
};
