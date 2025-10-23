import React, { useState, useMemo } from 'react';
import { Subscription, User, InfoItem, View } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { FeedIcon, GearIcon } from '../icons';
import { FireIcon } from './icons';
import { SubscriptionManager } from './SubscriptionManager';
import { FocusPointManagerModal } from './FocusPointManagerModal';
import { TodaysEvents } from './TodaysEvents'; // New import

// --- Helper Functions ---
const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return '早上好';
    if (hour >= 11 && hour < 13) return '中午好';
    if (hour >= 13 && hour < 18) return '下午好';
    return '晚上好';
};

// --- 1. AI Daily Briefing ---
const DailyBriefing: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl opacity-50"></div>
        <div className="absolute -bottom-1/2 -left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl opacity-50"></div>
        
        <div className="relative z-10 flex">
            <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-800">👋 {user.username}，{getGreeting()}！</h2>
                <p className="text-gray-600 mt-2 leading-relaxed">
                    这是您的AI每日晨报：自您上次登录以来，平台共为您监控到 <strong className="text-blue-600">1,254</strong> 条新情报。其中，您的核心竞品 <strong className="font-semibold text-gray-800">“比亚迪”</strong> 发布了DM5.0技术，被判定为 <span className="font-semibold text-red-600">高影响力事件</span>。同时，您关注的 <strong className="font-semibold text-gray-800">“固态电池”</strong> 技术有 <strong className="text-blue-600">2</strong> 条新进展。今日建议重点关注欧盟关税政策的最新动向。
                </p>
            </div>
        </div>
    </div>
);

// --- 2. Focus Points Section ---
const IntelligenceItem: React.FC<{ item: any; onCtaClick: () => void }> = ({ item, onCtaClick }) => {
    let Icon, tag, tagColor, title, source, cta;

    switch (item.type) {
        case 'briefing':
            Icon = FireIcon;
            tag = '[AI洞察简报]';
            tagColor = 'text-orange-500';
            title = item.title;
            source = `来源: ${item.source}`;
            cta = '查看溯源';
            break;
        case 'conference':
            Icon = FeedIcon; // Changed for consistency, as Calendar icon is in TodaysEvents
            tag = '[相关发布会]';
            tagColor = 'text-indigo-500';
            title = item.title;
            source = `来源: ${item.source}`;
            cta = '立即查看';
            break;
        default: // news
            Icon = FeedIcon;
            tag = '';
            tagColor = 'text-gray-400';
            title = item.title;
            source = `来源: ${item.source}`;
            cta = '';
            break;
    }
    
    return (
        <div className="flex items-start space-x-4 py-3">
            <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${tagColor}`} />
            <div className="flex-grow">
                <p className="text-gray-800 text-base leading-snug">
                    {tag && <span className={`font-semibold mr-1.5 text-blue-600`}>{tag}</span>}
                    {title}
                    {cta && <button onClick={onCtaClick} className="ml-2 text-sm font-semibold text-blue-600 hover:underline focus:outline-none">{cta}</button>}
                </p>
                <div className="flex justify-between items-center mt-1.5">
                    <span className="text-sm text-gray-500">{source}</span>
                </div>
            </div>
        </div>
    );
};


const FocusPointCard: React.FC<{ entityName: string; items: any[]; onNavigate: (view: View) => void; }> = ({ entityName, items, onNavigate }) => {
    const hasUpdates = items.length > 0;
    
    const handleCtaClick = (itemType: string) => {
        if (itemType === 'conference') {
            onNavigate('events');
        } else {
            onNavigate('feed');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-800">{entityName}</h3>
                {hasUpdates ? (
                    <span className="text-sm font-semibold text-gray-600">今日新增 <span className="text-blue-600 font-bold">{items.length}</span> 条高价值情报</span>
                ) : (
                     <span className="text-sm text-gray-500">暂无重大更新</span>
                )}
            </div>
            {hasUpdates && (
                 <div className="px-5 divide-y divide-gray-100">
                    {items.map((item, index) => <IntelligenceItem key={index} item={item} onCtaClick={() => handleCtaClick(item.type)} />)}
                </div>
            )}
        </div>
    );
};

const FocusPointsSection: React.FC<{ infoItems: InfoItem[]; onNavigate: (view: View) => void; onManageClick: () => void; }> = ({ infoItems, onNavigate, onManageClick }) => {
    const groupedItems = useMemo(() => {
        const bydItems = [
            { type: 'briefing', title: '发布第五代DM技术，以2.9L油耗和2100公里续航挑战A级车市场。', source: 'AI情报洞察' },
            { type: 'news', title: '秦L、海豹06 DM-i正式上市，售价9.98万元起。', source: '情报信息流' },
            { type: 'conference', title: '“第五代DM技术发布暨秦L/海豹06上市发布会”AI解读报告已生成。', source: '发布会' },
        ];
        
        return [
            { name: '比亚迪', items: bydItems },
            { name: '特斯拉', items: [] }
        ];
    }, [infoItems]);

    return (
        <div>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">我的关注点</h2>
                <button onClick={onManageClick} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                    <GearIcon className="w-4 h-4" />
                    管理关注点
                </button>
             </div>
             <div className="space-y-6">
                {groupedItems.map(group => (
                    <FocusPointCard key={group.name} entityName={group.name} items={group.items} onNavigate={onNavigate} />
                ))}
             </div>
        </div>
    );
};

// --- Main Dashboard Component ---
interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
    infoItems: InfoItem[];
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions, infoItems, onNavigate }) => {
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);

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

    return (
        <>
            <div className="p-6 bg-gray-50/50 overflow-y-auto h-full">
                <div className="max-w-7xl mx-auto space-y-10">
                    <DailyBriefing user={user} />
                    <DashboardWidgets stats={stats} />
                    <FocusPointsSection 
                        infoItems={infoItems} 
                        onNavigate={onNavigate} 
                        onManageClick={() => setIsFocusPointModalOpen(true)}
                    />
                    <TodaysEvents onNavigate={onNavigate} />
                    <SubscriptionManager />
                </div>
            </div>
            {isFocusPointModalOpen && (
                <FocusPointManagerModal onClose={() => setIsFocusPointModalOpen(false)} />
            )}
        </>
    );
};