
import React from 'react';
import { TaskManager } from './TaskManager';

export const DeepInsightManager: React.FC = () => {
    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50">
            <div className="flex-1 overflow-hidden">
                <TaskManager />
            </div>
        </div>
    );
};
