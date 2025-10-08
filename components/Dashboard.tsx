
import React, { useState, useEffect, useMemo } from 'react';
import { User, Subscription, InfoItem, FocusPoint } from '../types';
import { DashboardWidgets } from './DashboardWidgets';
import { getArticles } from '../api';
import { SearchIcon } from './icons';

interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
}

// Mock data for "My Focus Points"
const mockFocusPoints: FocusPoint[] = [
    { id: 1, title: '端到端自动驾驶', keywords: ['BEV', 'Transformer', 'World Model'], relatedCount: 23 },
    { id: 2, title: '比亚迪第五代DM-i技术', keywords: ['热效率', '油耗', '秦L'], relatedCount: 15 },
    { id: 3, title: '一体化压铸技术', keywords: ['特斯拉', '成本', '供应链'], relatedCount: 8 },
];

export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions }) => {
    const [articles, setArticles] = useState<InfoItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTodaysArticles = async () => {
            setIsLoading(true);
            try {
                // In a real scenario, you'd filter by today's date on the backend.
                // Here we fetch a recent batch and filter on the client.
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const response = await getArticles({ page: 1, limit: 200 });
                const todaysArticles = response.items.filter(item => new Date(item.created_at) >= today);
                setArticles(todaysArticles);
            } catch (error) {
                console.error("Failed to fetch articles for dashboard", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTodaysArticles();
    }, []);

    const stats = useMemo(() => {
        const pointsWithUpdates = new Set(articles.map(a => a.point_id)).size;
        const totalPoints = subscriptions.length;
        const totalSources = new Set(subscriptions.map(s => s.source_name)).size;

        return {
            articlesToday: articles.length,
            pointsWithUpdates,
            totalPoints,
            totalSources,
        };
    }, [articles, subscriptions]);

    return (
        <div className="p-6 bg-gray-50/50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Welcome Header */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-800">下午好, {user.username}!</h1>
                    <p className="text-gray-500 mt-1">这是您今天的情报概览。</p>
                </div>

                {/* Main Widgets */}
                <DashboardWidgets stats={stats} />

                {/* Search and Focus Points */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">语义搜索</h2>
                         <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="跨情报库搜索: “寻找关于800V高压平台SiC方案的最新进展”"
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {/* Search results would be displayed here */}
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">我的关注焦点</h2>
                        <div className="space-y-3">
                            {mockFocusPoints.map(point => (
                                <div key={point.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm text-gray-800">{point.title}</p>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{point.relatedCount}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {point.keywords.map(kw => (
                                            <span key={kw} className="text-xs text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
