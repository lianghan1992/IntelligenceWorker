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

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; description: string; }> = ({ icon, title, value, description }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-start space-x-4">
        <div className="bg-blue-100 text-blue-600 rounded-lg p-3 flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
    </div>
);

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="今日新增情报"
                value={stats.articlesToday.toLocaleString()}
                description="来自您关注的所有来源"
            />
            <StatCard 
                icon={<TrendingUpIcon className="w-6 h-6" />}
                title="有动态的关注点"
                value={stats.pointsWithUpdates.toLocaleString()}
                description="今日有新情报的关注点数量"
            />
            <StatCard 
                icon={<BookmarkIcon className="w-6 h-6" />}
                title="情报点总数"
                value={stats.totalPoints.toLocaleString()}
                description="您创建的所有情报追踪点"
            />
            <StatCard 
                icon={<RssIcon className="w-6 h-6" />}
                title="情报源总数"
                value={stats.totalSources.toLocaleString()}
                description="系统及自定义来源总数"
            />
        </div>
    );
};
