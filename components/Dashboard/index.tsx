
import React, { useState } from 'react';
import { User, View, Subscription } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { SubscriptionManager } from './SubscriptionManager';
import { TodaysEvents } from './TodaysEvents';
import { RecentDeepDives } from './RecentDeepDives';
import { FocusPointManagerModal } from './FocusPointManagerModal';
import { PlusIcon } from '../icons';

interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
    const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);

    return (
        <div className="h-full overflow-y-auto bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">欢迎回来, {user.username}</h1>
                        <p className="text-gray-500 mt-1">这是您今天的汽车行业情报概览</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsFocusModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            管理关注点
                        </button>
                        <button
                            onClick={() => onNavigate('ai')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            生成报告
                        </button>
                    </div>
                </div>

                {/* Widgets */}
                <DashboardWidgets />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <SubscriptionManager />
                        </section>
                        <section>
                            <RecentDeepDives onNavigate={onNavigate} />
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 h-[500px]">
                            <TodaysEvents onNavigate={onNavigate} />
                        </section>
                    </div>
                </div>
            </div>

            {isFocusModalOpen && (
                <FocusPointManagerModal onClose={() => setIsFocusModalOpen(false)} />
            )}
        </div>
    );
};
