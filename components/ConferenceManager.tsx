import React, { useState } from 'react';
import { LivestreamTask } from '../types';
import { PlusIcon } from './icons';
import { CreateAnalysisTaskModal } from './CreateAnalysisTaskModal';

// Mock data, can be replaced with API call
const mockTasks: LivestreamTask[] = [];

export const ConferenceManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>(mockTasks);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddTaskSuccess = (newTask: LivestreamTask) => {
        setTasks(prev => [newTask, ...prev]);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">发布会/活动管理</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>新增分析任务</span>
                </button>
            </div>
            
            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p>发布会/活动管理功能正在开发中...</p>
                {/* A list of tasks would be rendered here */}
            </div>

            {isModalOpen && (
                <CreateAnalysisTaskModal 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleAddTaskSuccess}
                />
            )}
        </div>
    );
};
