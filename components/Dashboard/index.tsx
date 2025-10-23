import React, { useState, useMemo, useEffect } from 'react';
import { Subscription, User, InfoItem, View, ApiPoi } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { FeedIcon, GearIcon } from '../icons';
import { FireIcon } from './icons';
import { SubscriptionManager } from './SubscriptionManager';
import { FocusPointManagerModal } from './FocusPointManagerModal';
import { TodaysEvents } from './TodaysEvents';
import { getUserPois, searchArticlesFiltered } from '../../api';

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
const IntelligenceItem: React.FC<{ item: InfoItem; onCtaClick: () => void }> = ({ item, onCtaClick }) => {
    return (
        <div className="flex items-start space-x-4 py-3">
            <FeedIcon className="w-6 h-6 mt-0.5 flex-shrink-0 text-blue-500" />
            <div className="flex-grow">
                <p className="text-gray-800 text-base leading-snug">
                    {item.title}
                </p>
                <div className="flex justify-between items-center mt-1.5">
                    <span className="text-sm text-gray-500">来源: {item.source_name}</span>
                </div>
            </div>
        </div>
    );
};


const FocusPointCard: React.FC<{ entityName: string; items: InfoItem[]; onNavigate: (view: View) => void; }> = ({ entityName, items, onNavigate }) => {
    const hasUpdates = items.length > 0;
    
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
                    {items.map((item) => <IntelligenceItem key={item.id} item={item} onCtaClick={() => onNavigate('feed')} />)}
                </div>
            )}
        </div>
    );
};

const FocusPointsSection: React.FC<{ onNavigate: (view: View) => void; onManageClick: () => void; }> = ({ onNavigate, onManageClick }) => {
    const [focusPoints, setFocusPoints] = useState<ApiPoi[]>([]);
    const [focusPointFeeds, setFocusPointFeeds] = useState<Record<string, InfoItem[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchFocusData = async () => {
            setIsLoading(true);
            try {
                const pois = await getUserPois();
                setFocusPoints(pois);

                if (pois.length > 0) {
                    const feedPromises = pois.map(poi => 
                        searchArticlesFiltered({
                            query_text: poi.content,
                            limit: 3
                        }).then(result => ({ poiId: poi.id, items: result.items }))
                    );
                    const results = await Promise.all(feedPromises);
                    const feeds = results.reduce((acc, current) => {
                        acc[current.poiId] = current.items;
                        return acc;
                    }, {} as Record<string, InfoItem[]>);
                    setFocusPointFeeds(feeds);
                }
            } catch (error) {
                console.error("Failed to fetch focus points data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFocusData();
    }, []);


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
                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">正在加载关注点动态...</div>
                ) : focusPoints.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed">
                        <p className="text-gray-500">您还未设置任何关注点。</p>
                        <button onClick={onManageClick} className="mt-2 text-sm font-semibold text-blue-600 hover:underline">立即设置</button>
                    </div>
                ) : (
                    focusPoints.map(point => (
                        <FocusPointCard 
                            key={point.id} 
                            entityName={point.content} 
                            items={focusPointFeeds[point.id] || []} 
                            onNavigate={onNavigate} 
                        />
                    ))
                )}
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
                    <TodaysEvents onNavigate={onNavigate} />
                    <FocusPointsSection 
                        onNavigate={onNavigate} 
                        onManageClick={() => setIsFocusPointModalOpen(true)}
                    />
                    <SubscriptionManager />
                </div>
            </div>
            {isFocusPointModalOpen && (
                <FocusPointManagerModal onClose={() => setIsFocusPointModalOpen(false)} />
            )}
        </>
    );
};