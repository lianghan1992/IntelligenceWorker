import React from 'react';
import { DocumentTextIcon, RssIcon, TrendingUpIcon } from '../icons';
import { BookmarkIcon } from './icons';

interface DashboardWidgetsProps {
    stats: {
        articlesToday: number;
        pointsWithUpdates: number;
        totalPoints: number;
        totalSources: number;
    }
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


export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="今日新增情报"
                value={stats.articlesToday.toLocaleString()}
                description="来自您关注的所有来源"
                colorClass="blue"
            />
            <StatCard 
                icon={<TrendingUpIcon className="w-6 h-6" />}
                title="有动态的关注点"
                value={stats.pointsWithUpdates.toLocaleString()}
                description="今日有新情报的关注点数量"
                colorClass="green"
            />
            <StatCard 
                icon={<BookmarkIcon className="w-6 h-6" />}
                title="情报点总数"
                value={stats.totalPoints.toLocaleString()}
                description="您创建的所有情报追踪点"
                colorClass="purple"
            />
            <StatCard 
                icon={<RssIcon className="w-6 h-6" />}
                title="情报源总数"
                value={stats.totalSources.toLocaleString()}
                description="系统及自定义来源总数"
                colorClass="orange"
            />
        </div>
    );
};