import React, { useMemo } from 'react';
import { InfoItem, Subscription, User } from '../types';
import { DashboardWidgets } from './DashboardWidgets';
import { PlusIcon, ArrowRightIcon } from './icons';

interface DashboardProps {
    user: User;
    infoItems: InfoItem[];
    subscriptions: Subscription[];
    onAddSource: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, infoItems, subscriptions, onAddSource }) => {
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const articlesToday = infoItems.filter(item => new Date(item.created_at) >= today);
        const pointsWithUpdates = new Set(articlesToday.map(item => item.point_id)).size;
        const totalPoints = subscriptions.length;
        const totalSources = new Set(subscriptions.map(sub => sub.source_name)).size;

        return {
            articlesToday: articlesToday.length,
            pointsWithUpdates,
            totalPoints,
            totalSources,
        };
    }, [infoItems, subscriptions]);
    
    const recentActivity = useMemo(() => {
         return [...infoItems]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
    }, [infoItems]);

    return (
        <div className="p-6 bg-gray-50/50 overflow-y-auto h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">早上好, {user.username}！</h1>
                        <p className="text-gray-500 mt-1">这是您今天的情报概览。</p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                         <button 
                            onClick={onAddSource}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            添加自定义情报源
                        </button>
                    </div>
                </div>

                {/* Widgets */}
                <DashboardWidgets stats={stats} />
                
                {/* Recent Activity */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">最新动态</h2>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <ul className="divide-y divide-gray-200">
                             {recentActivity.length > 0 ? recentActivity.map(item => (
                                <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-blue-600 truncate">{item.title}</p>
                                            <p className="text-sm text-gray-500 truncate">
                                                <span className="font-medium text-gray-700">{item.source_name}</span> / {item.point_name}
                                            </p>
                                        </div>
                                        <div className="ml-4 flex-shrink-0 text-right">
                                             <p className="text-sm text-gray-700">{new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                                             <a href={item.original_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                                                查看
                                             </a>
                                        </div>
                                    </div>
                                </li>
                            )) : (
                                <li className="p-6 text-center text-gray-500">
                                    暂无最新动态。
                                </li>
                            )}
                        </ul>
                         {infoItems.length > 0 && (
                            <div className="p-4 border-t border-gray-200 bg-gray-50/50 text-center rounded-b-xl">
                                <a href="#" className="text-sm font-semibold text-blue-600 hover:underline flex items-center justify-center gap-1">
                                    查看全部情报 <ArrowRightIcon className="w-4 h-4"/>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
