
import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, RssIcon, TrendingUpIcon } from '../icons';
import { BookmarkIcon } from './icons';
import { Subscription } from '../../types';
import { searchArticlesFiltered } from '../../api';


interface DashboardWidgetsProps {
    subscriptions: Subscription[];
}

const StatCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    description: string; 
    colorClass: 'blue' | 'green' | 'purple' | 'orange'; 
}> = ({ icon, title, value, description, colorClass }) => {
    const colors = {
        blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconText: 'text-blue-600', ring: 'hover:ring-blue-200' },
        green: { bg: 'bg-green-50', iconBg: 'bg-green-100', iconText: 'text-green-600', ring: 'hover:ring-green-200' },
        purple: { bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', ring: 'hover:ring-indigo-200' },
        orange: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconText: 'text-amber-600', ring: 'hover:ring-amber-200' },
    }[colorClass];

    return (
        <div className={`p-5 rounded-2xl border border-gray-200/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:ring-2 ${colors.ring} ${colors.bg}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-xl ${colors.iconBg} ${colors.iconText}`}>
                    {icon}
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">{description}</p>
        </div>
    );
};


export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ subscriptions }) => {
    const [stats, setStats] = useState({
        articlesToday: 0,
        pointsWithUpdates: 0,
        totalPoints: 0,
        totalSources: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);

            // Calculate stats derived directly from subscriptions
            const totalPoints = subscriptions.length;
            const totalSources = new Set(subscriptions.map(sub => sub.source_name)).size;
            
            try {
                // const sourceNames = Array.from(new Set(subscriptions.map(s => s.source_name)));
                
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const year = startOfToday.getFullYear();
                const month = String(startOfToday.getMonth() + 1).padStart(2, '0');
                const day = String(startOfToday.getDate()).padStart(2, '0');
                const todayTimestamp = `${year}-${month}-${day}T00:00:00`;


                // Fetch today's articles
                // NOTE: Removed `source_names` filter temporarily to ensure data visibility. 
                // If we want strictly subscribed content, we would add `source_names: sourceNames.length > 0 ? sourceNames : undefined`
                // But given the user report of 0 data, showing global daily updates is a better fallback.
                const articlesData = await searchArticlesFiltered({
                    // source_names: sourceNames, // Relaxed filter
                    publish_date_start: todayTimestamp,
                    query_text: '*',
                    limit: 50, // Reduced from 100 to stay within API recommendations
                    page: 1,
                });

                const articlesTodayCount = articlesData.total;
                // If showing global stats, calculating pointsWithUpdates based on response items is still valid,
                // but it might count points the user doesn't subscribe to. This is acceptable for "platform vitality" display.
                const pointsWithUpdatesCount = new Set(articlesData.items.map(item => item.point_id)).size;
                
                setStats({
                    articlesToday: articlesTodayCount,
                    pointsWithUpdates: pointsWithUpdatesCount,
                    totalPoints,
                    totalSources,
                });

            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
                setStats({
                    articlesToday: 0,
                    pointsWithUpdates: 0,
                    totalPoints,
                    totalSources,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [subscriptions]);
    
    const valueOrLoading = (value: number) => isLoading ? '...' : value.toLocaleString();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="今日新增情报"
                value={valueOrLoading(stats.articlesToday)}
                description="平台今日新收录的情报总数"
                colorClass="blue"
            />
            <StatCard 
                icon={<TrendingUpIcon className="w-6 h-6" />}
                title="有动态的情报点"
                value={valueOrLoading(stats.pointsWithUpdates)}
                description="今日产出新情报的情报点数量"
                colorClass="green"
            />
            <StatCard 
                icon={<BookmarkIcon className="w-6 h-6" />}
                title="情报点总数"
                value={valueOrLoading(stats.totalPoints)}
                description="您创建的所有情报追踪点"
                colorClass="purple"
            />
            <StatCard 
                icon={<RssIcon className="w-6 h-6" />}
                title="情报源总数"
                value={valueOrLoading(stats.totalSources)}
                description="您订阅的情报来源总数"
                colorClass="orange"
            />
        </div>
    );
};