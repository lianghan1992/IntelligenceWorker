
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
    colorTheme: 'primary' | 'tertiary' | 'secondary' | 'error'; 
}> = ({ icon, title, value, description, colorTheme }) => {
    
    // Material 3 Color Mappings (Approximate with Tailwind)
    const themes = {
        primary: { 
            bg: 'bg-blue-50', 
            text: 'text-blue-900', 
            container: 'bg-blue-100', 
            onContainer: 'text-blue-700',
            decoration: 'bg-blue-200'
        },
        secondary: { 
            bg: 'bg-purple-50', 
            text: 'text-purple-900', 
            container: 'bg-purple-100', 
            onContainer: 'text-purple-700',
            decoration: 'bg-purple-200'
        },
        tertiary: { 
            bg: 'bg-emerald-50', 
            text: 'text-emerald-900', 
            container: 'bg-emerald-100', 
            onContainer: 'text-emerald-700',
            decoration: 'bg-emerald-200'
        },
        error: { 
            bg: 'bg-orange-50', 
            text: 'text-orange-900', 
            container: 'bg-orange-100', 
            onContainer: 'text-orange-700',
            decoration: 'bg-orange-200'
        },
    }[colorTheme];

    return (
        <div className={`relative overflow-hidden p-6 rounded-[24px] border-0 transition-all duration-300 hover:shadow-lg group ${themes.bg}`}>
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className={`text-sm font-medium opacity-70 tracking-wide ${themes.text}`}>{title}</p>
                    <p className={`text-4xl font-normal mt-2 ${themes.text} font-sans`}>{value}</p>
                </div>
                <div className={`p-4 rounded-[16px] ${themes.container} ${themes.onContainer}`}>
                    {icon}
                </div>
            </div>
            <p className={`text-xs mt-4 opacity-60 font-medium ${themes.text} flex items-center gap-1`}>
                {description}
            </p>
            
            {/* Decorative Circle */}
            <div className={`absolute -bottom-4 -right-4 w-32 h-32 rounded-full opacity-20 ${themes.decoration} group-hover:scale-110 transition-transform duration-500 ease-out`}></div>
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
                // FIX: Use ISO-like format with T separator which is safer for backend parsing
                const todayStart = `${year}-${month}-${day}T00:00:00`; 

                const articlesData = await searchArticlesFiltered({
                    publish_date_start: todayStart,
                    query_text: '*', // 获取所有
                    limit: 100, // 获取足够的条目以统计涉及的情报点
                    page: 1,
                });

                const articlesTodayCount = articlesData.total;
                
                // 统计涉及的情报点数量 (排重)
                const uniquePointIds = new Set(
                    articlesData.items
                        .map(item => item.point_id)
                        .filter(id => id) // 过滤掉空ID
                );
                
                setStats({
                    articlesToday: articlesTodayCount,
                    pointsWithUpdates: uniquePointIds.size,
                    totalPoints,
                    totalSources,
                });

            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
                // 即使失败也保留基础订阅数据
                setStats(prev => ({ ...prev, articlesToday: 0, pointsWithUpdates: 0 }));
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [subscriptions]);
    
    const valueOrLoading = (value: number) => isLoading ? '-' : value.toLocaleString();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="今日新增情报"
                value={valueOrLoading(stats.articlesToday)}
                description="平台今日收录的新增内容"
                colorTheme="primary"
            />
            <StatCard 
                icon={<TrendingUpIcon className="w-6 h-6" />}
                title="活跃情报点"
                value={valueOrLoading(stats.pointsWithUpdates)}
                description="今日捕获动态的监控项"
                colorTheme="tertiary"
            />
            <StatCard 
                icon={<BookmarkIcon className="w-6 h-6" />}
                title="监控情报点"
                value={valueOrLoading(stats.totalPoints)}
                description="您配置的全部追踪目标"
                colorTheme="secondary"
            />
            <StatCard 
                icon={<RssIcon className="w-6 h-6" />}
                title="覆盖情报源"
                value={valueOrLoading(stats.totalSources)}
                description="已连接的信息渠道总数"
                colorTheme="error"
            />
        </div>
    );
};
