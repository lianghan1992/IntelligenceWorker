
import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, RssIcon, TrendingUpIcon } from '../icons';
import { BookmarkIcon } from './icons';
import { Subscription } from '../../types';
import { searchArticlesFiltered } from '../../api';

// --- Animated Number Component ---
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const startValue = displayValue;
        const duration = 1500; // 1.5s duration

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4); // Quartic ease out

            const current = Math.floor(startValue + (value - startValue) * ease);
            setDisplayValue(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [value]);

    return <span>{displayValue.toLocaleString()}</span>;
};

interface DashboardWidgetsProps {
    subscriptions: Subscription[];
}

const StatCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    value: number | string | null; 
    description: string; 
    colorTheme: 'blue' | 'green' | 'purple' | 'rose'; 
    isLoading: boolean;
}> = ({ icon, title, value, description, colorTheme, isLoading }) => {
    
    const themes = {
        blue: {
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            borderColor: 'border-blue-100', // Optional
        },
        green: {
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            borderColor: 'border-emerald-100',
        },
        purple: {
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            borderColor: 'border-purple-100',
        },
        rose: {
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            borderColor: 'border-rose-100',
        },
    }[colorTheme];

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${themes.iconBg} flex items-center justify-center ${themes.iconColor} transition-transform group-hover:scale-110`}>
                    {icon}
                </div>
                {/* Optional: Trend Indicator can go here */}
            </div>
            
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <div className="text-3xl font-bold text-gray-900 tracking-tight font-sans">
                    {isLoading ? (
                        <div className="h-9 w-24 bg-gray-100 rounded animate-pulse"></div>
                    ) : (
                        typeof value === 'number' ? <AnimatedNumber value={value} /> : value
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-2 font-medium">{description}</p>
            </div>
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

            const totalPoints = subscriptions.length;
            const totalSources = new Set(subscriptions.map(sub => sub.source_name)).size;
            
            try {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const todayStart = `${year}-${month}-${day}T00:00:00`; 

                const articlesData = await searchArticlesFiltered({
                    publish_date_start: todayStart,
                    query_text: '*', 
                    limit: 100, 
                    page: 1,
                });

                const articlesTodayCount = articlesData.total;
                
                const uniquePointIds = new Set(
                    articlesData.items
                        .map(item => item.point_id)
                        .filter(id => id)
                );
                
                setStats({
                    articlesToday: articlesTodayCount,
                    pointsWithUpdates: uniquePointIds.size,
                    totalPoints,
                    totalSources,
                });

            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
                setStats(prev => ({ ...prev, articlesToday: 0, pointsWithUpdates: 0 }));
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [subscriptions]);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="今日新增情报"
                value={stats.articlesToday}
                description="平台今日收录总量"
                colorTheme="blue"
                isLoading={isLoading}
            />
            <StatCard 
                icon={<TrendingUpIcon className="w-6 h-6" />}
                title="有动态的情报点"
                value={stats.pointsWithUpdates}
                description="今日有更新的监控项"
                colorTheme="green"
                isLoading={isLoading}
            />
            <StatCard 
                icon={<BookmarkIcon className="w-6 h-6" />}
                title="情报点总数"
                value={stats.totalPoints}
                description="当前配置的追踪目标"
                colorTheme="purple"
                isLoading={isLoading}
            />
            <StatCard 
                icon={<RssIcon className="w-6 h-6" />}
                title="情报源总数"
                value={stats.totalSources}
                description="已连接的信息渠道"
                colorTheme="rose"
                isLoading={isLoading}
            />
        </div>
    );
};
