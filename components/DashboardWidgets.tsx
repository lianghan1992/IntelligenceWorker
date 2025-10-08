import React from 'react';
import { DocumentTextIcon, BookmarkIcon, RssIcon } from './icons';

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

export const DashboardWidgets: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard 
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title="今日新增情报"
                value="28"
                description="来自您关注的所有来源"
            />
            <StatCard 
                icon={<BookmarkIcon className="w-6 h-6" />}
                title="我的关注点"
                value="3 个"
                description="2 个关注点有新动态"
            />
            <StatCard 
                icon={<RssIcon className="w-6 h-6" />}
                title="我的情报源"
                value="4 个"
                description="系统及自定义来源总数"
            />
        </div>
    );
};