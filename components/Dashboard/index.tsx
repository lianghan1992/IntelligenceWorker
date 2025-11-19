
import React, { useState, useEffect, useMemo } from 'react';
import { Subscription, User, InfoItem, View, ApiPoi } from '../../types';
import { DashboardWidgets } from './DashboardWidgets';
import { FeedIcon, GearIcon } from '../icons';
import { FireIcon } from './icons';
import { SubscriptionManager } from './SubscriptionManager';
import { FocusPointManagerModal } from './FocusPointManagerModal';
import { TodaysEvents } from './TodaysEvents';
import { getUserPois, searchArticlesFiltered } from '../../api';
import { LazyLoadModule, TodaysEventsSkeleton, FocusPointsSkeleton, SubscriptionManagerSkeleton } from './LazyLoadModule';


// --- Helper Functions ---
const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return '早上好';
    if (hour >= 11 && hour < 13) return '中午好';
    if (hour >= 13 && hour < 18) return '下午好';
    return '晚上好';
};

// --- 1. AI Daily Briefing ---
interface DailyBriefingProps {
    user: User;
    subscriptions: Subscription[];
    onManageFocusPoints: () => void;
}

const DailyBriefing: React.FC<DailyBriefingProps> = ({ user, subscriptions, onManageFocusPoints }) => {
    const [briefingText, setBriefingText] = useState<React.ReactNode>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateBriefing = async () => {
            setIsLoading(true);
            try {
                // 1. Get total articles today
                // const sourceNames = Array.from(new Set(subscriptions.map(sub => sub.source_name)));
                
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const year = startOfToday.getFullYear();
                const month = String(startOfToday.getMonth() + 1).padStart(2, '0');
                const day = String(startOfToday.getDate()).padStart(2, '0');
                const todayTimestamp = `${year}-${month}-${day}T00:00:00`;


                let totalArticlesToday = 0;
                // Relaxed filter: Fetch global today's articles to ensure the briefing works
                // Even if user hasn't subscribed to much, showing global activity is better than 0.
                const articlesData = await searchArticlesFiltered({
                    // source_names: sourceNames.length > 0 ? sourceNames : undefined, 
                    publish_date_start: todayTimestamp,
                    query_text: '*',
                    limit: 1,
                    page: 1,
                });
                totalArticlesToday = articlesData.total;
                
                // 2. Get user's focus points (POIs)
                const pois = await getUserPois();

                if (pois.length === 0) {
                    // Fallback text if no focus points are set
                    setBriefingText(
                        <p className="text-gray-600 mt-2 leading-relaxed">
                            这是您的AI每日晨报：平台今日已为您监控到 <strong className="text-blue-600">{totalArticlesToday}</strong> 条新情报。您还没有设置关注点，
                            <button onClick={onManageFocusPoints} className="font-semibold text-blue-600 hover:underline ml-1">立即设置</button>
                            来获取个性化洞察吧。
                        </p>
                    );
                    return;
                }

                // 3. Get update count for each POI
                const poiUpdatePromises = pois.map(poi => 
                    searchArticlesFiltered({
                        // source_names: sourceNames.length > 0 ? sourceNames : undefined,
                        publish_date_start: todayTimestamp,
                        query_text: poi.content,
                        limit: 1,
                        page: 1,
                    }).then(result => ({
                        content: poi.content,
                        count: result.total
                    }))
                );

                const poiUpdates = await Promise.all(poiUpdatePromises);
                
                // 4. Find top updated POIs
                const sortedPois = poiUpdates.filter(p => p.count > 0).sort((a, b) => b.count - a.count);

                let topPoi: { content: string, count: number } | null = sortedPois.length > 0 ? sortedPois[0] : null;
                let secondPoi: { content: string, count: number } | null = sortedPois.length > 1 ? sortedPois[1] : null;
                
                // 5. Construct the final text
                let mainMessage = '';
                if (topPoi) {
                    mainMessage = `其中，您关注的 <strong class="font-semibold text-gray-800">“${topPoi.content}”</strong> 动态最为频繁，有 <strong class="text-blue-600">${topPoi.count}</strong> 条相关内容。`;
                    if (secondPoi) {
                        mainMessage += ` 同时，<strong class="font-semibold text-gray-800">“${secondPoi.content}”</strong> 也有新进展。`;
                    }
                } else {
                    mainMessage = '您关注的领域今日暂无重要更新。';
                }

                const finalBriefing = `这是您的AI每日晨报：平台今日已为您监控到 <strong class="text-blue-600">${totalArticlesToday}</strong> 条新情报。${mainMessage} 今日建议重点关注以上领域，您可以在下方的“我的关注点”模块中查看详情。`;

                setBriefingText(<p className="text-gray-600 mt-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: finalBriefing }}></p>);

            } catch (error) {
                console.error("Failed to generate daily briefing:", error);
                setBriefingText(
                    <p className="text-gray-600 mt-2 leading-relaxed">
                        AI每日晨报加载失败，请稍后刷新重试。
                    </p>
                );
            } finally {
                setIsLoading(false);
            }
        };

        generateBriefing();
    }, [subscriptions, onManageFocusPoints]);

    const renderLoadingState = () => (
        <div className="space-y-2 mt-2">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl opacity-50"></div>
            <div className="absolute -bottom-1/2 -left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl opacity-50"></div>
            
            <div className="relative z-10 flex">
                <div className="flex-grow">
                    <h2 className="text-2xl font-bold text-gray-800">👋 {user.username}，{getGreeting()}！</h2>
                    {isLoading ? renderLoadingState() : briefingText}
                </div>
            </div>
        </div>
    );
};


// --- 2. Focus Points Section ---
const IntelligenceItem: React.FC<{ item: InfoItem }> = ({ item }) => {
    return (
        <div className="group flex items-start space-x-4 py-3.5 transition-colors hover:bg-slate-50/80 -mx-6 px-6">
            <div className="mt-1 w-5 h-5 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <FeedIcon className="w-3 h-3 text-slate-500" />
            </div>
            <div className="flex-grow">
                <p className="text-slate-800 text-sm leading-snug group-hover:text-blue-600 font-medium">
                    {item.title}
                </p>
                <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs text-slate-400">来源: {item.source_name}</span>
                </div>
            </div>
        </div>
    );
};


const FocusPointCard: React.FC<{ entityName: string; items: InfoItem[]; }> = ({ entityName, items }) => {
    const hasUpdates = items.length > 0;
    
    return (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FireIcon className="w-5 h-5 text-orange-500" />
                    {entityName}
                </h3>
                {hasUpdates ? (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">新增 {items.length} 条</span>
                ) : (
                     <span className="text-xs text-gray-500">今日暂无更新</span>
                )}
            </div>
            {hasUpdates ? (
                 <div className="px-6 divide-y divide-gray-100">
                    {items.map((item) => <IntelligenceItem key={item.id} item={item} />)}
                </div>
            ) : (
                <div className="px-6 py-8 text-center text-sm text-gray-500">
                    今日暂无相关高价值情报
                </div>
            )}
        </div>
    );
};

const FocusPointsSection: React.FC<{ onNavigate: (view: View) => void; onManageClick: () => void; subscriptions: Subscription[] }> = ({ onNavigate, onManageClick, subscriptions }) => {
    const [focusPoints, setFocusPoints] = useState<ApiPoi[]>([]);
    const [focusPointFeeds, setFocusPointFeeds] = useState<Record<string, InfoItem[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const subscribedSourceNames = useMemo(() => {
        if (!subscriptions) return [];
        return Array.from(new Set(subscriptions.map(sub => sub.source_name)));
    }, [subscriptions]);
    
    useEffect(() => {
        const fetchFocusData = async () => {
            setIsLoading(true);
            try {
                const pois = await getUserPois();
                setFocusPoints(pois);

                if (pois.length > 0) {
                    const params: any = {
                        limit: 3,
                        similarity_threshold: 0.35,
                        page: 1
                    };
                    // Keep strict filtering for Focus Points as per user request logic (unless user wants global search here too)
                    // But to be consistent with DashboardWidgets fix, let's use the provided logic but be aware it's working (user said Focus Points has data).
                    if (subscribedSourceNames.length > 0) {
                        params.source_names = subscribedSourceNames;
                    }

                    const feedPromises = pois.map(poi => 
                        searchArticlesFiltered({
                            ...params,
                            query_text: poi.content,
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
    }, [subscribedSourceNames]);


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
    onNavigate: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions, onNavigate }) => {
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);
    const [focusPointsKey, setFocusPointsKey] = useState(0);

    const handleFocusPointModalClose = () => {
        setIsFocusPointModalOpen(false);
        setFocusPointsKey(prev => prev + 1); // Increment key to trigger refetch
    };

    return (
        <>
            <div className="p-6 bg-gray-50/50 min-h-full">
                <div className="max-w-7xl mx-auto space-y-10">
                    <DailyBriefing 
                        user={user} 
                        subscriptions={subscriptions} 
                        onManageFocusPoints={() => setIsFocusPointModalOpen(true)}
                    />
                    <DashboardWidgets subscriptions={subscriptions} />
                    
                    <LazyLoadModule placeholder={<TodaysEventsSkeleton />}>
                        <TodaysEvents onNavigate={onNavigate} />
                    </LazyLoadModule>

                    <LazyLoadModule placeholder={<FocusPointsSkeleton />}>
                        <FocusPointsSection 
                            key={focusPointsKey}
                            onNavigate={onNavigate} 
                            onManageClick={() => setIsFocusPointModalOpen(true)}
                            subscriptions={subscriptions}
                        />
                    </LazyLoadModule>
                    
                    <LazyLoadModule placeholder={<SubscriptionManagerSkeleton />}>
                        <SubscriptionManager />
                    </LazyLoadModule>
                </div>
            </div>
            {isFocusPointModalOpen && (
                <FocusPointManagerModal onClose={handleFocusPointModalClose} />
            )}
        </>
    );
};