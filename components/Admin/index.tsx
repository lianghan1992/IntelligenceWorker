import React from 'react';
import { LivestreamTaskManager } from './LivestreamTaskManager';

export const AdminPage: React.FC = () => {
    return (
        <div className="p-6 bg-gray-50/50 min-h-full">
            <LivestreamTaskManager />
        </div>
    );
};