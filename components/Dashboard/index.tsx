
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
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const year = startOfToday.getFullYear();
                const month = String(startOfToday.getMonth() + 1).padStart(2, '0');
                const day = String(startOfToday.getDate()).padStart(2, '0');
                const todayTimestamp = `${year}-${month}-${day}T00:00:00`;


                let totalArticlesToday = 0;
                const articlesData = await searchArticlesFiltered({
                    publish_date_start: todayTimestamp,
                    query_text: '*',
                    limit: 1,
                    page: 1,
                });
                totalArticlesToday = articlesData.total;
                
                const pois = await getUserPois();

                if (pois.length === 0) {
                    setBriefingText(
                        <p className="text-gray-600 mt-2 leading-relaxed">
                            这是您的AI每日晨报：平台今日已为您监控到 <strong className="text-blue-600">{totalArticlesToday}</strong> 条新情报。您还没有设置关注点，
                            <button onClick={onManageFocusPoints} className="font-semibold text-blue-600 hover:underline ml-1">立即设置</button>
                            来获取个性化洞察吧。
                        </p>
                    );
                    return;
                }

                const poiUpdatePromises = pois.map(poi => 
                    searchArticlesFiltered({
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
                
                const sortedPois = poiUpdates.filter(p => p.count > 0).sort((a, b) => b.count - a.count);

                let topPoi: { content: string, count: number } | null = sortedPois.length > 0 ? sortedPois[0] : null;
                let secondPoi: { content: string, count: number } | null = sortedPois.length > 1 ? sortedPois[1] : null;
                
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


// --- 2. Focus Points Section (Optimized Layout) ---
const IntelligenceItem: React.FC<{ item: InfoItem }> = ({ item }) => {
    return (
        <div className="group flex items-start space-x-3 py-3 transition-colors hover:bg-slate-50 rounded-lg px-2 -mx-2">
            <div className="mt-1 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
            <div className="flex-grow min-w-0">
                <a 
                    href={item.original_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-slate-700 text-sm leading-snug group-hover:text-blue-600 font-medium block truncate"
                    title={item.title}
                >
                    {item.title}
                </a>
                <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-400 truncate">{item.source_name}</span>
                    <span className="text-[10px] text-slate-300">{new Date(item.publish_date || item.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};


const CompactFocusCard: React.FC<{ entityName: string; items: InfoItem[]; }> = ({ entityName, items }) => {
    const hasUpdates = items.length > 0;
    
    // If no updates, handled by the parent to render differently (e.g. as a chip)
    // This component assumes it is rendering an active card
    
    return (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md break-inside-avoid mb-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-orange-50/30">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 truncate">
                    <FireIcon className="w-4 h-4 text-orange-500" />
                    {entityName}
                </h3>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    +{items.length}
                </span>
            </div>
            <div className="px-3 py-1">
                {items.map((item) => <IntelligenceItem key={item.id} item={item} />)}
                <div className="py-2 text-center border-t border-gray-50 mt-1">
                    <button className="text-xs text-gray-400 hover:text-blue-600 transition-colors">查看全部</button>
                </div>
            </div>
        </div>
    );
};

const QuietFocusChip: React.FC<{ entityName: string }> = ({ entityName }) => (
    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-700 transition-all cursor-default select-none">
        {entityName}
    </div>
);

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
                        limit: 5, // Keep limited to 5 as requested
                        similarity_threshold: 0.35,
                        page: 1
                    };
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

    // Split points into active (has news) and quiet (no news)
    const { activePoints, quietPoints } = useMemo(() => {
        const active: ApiPoi[] = [];
        const quiet: ApiPoi[] = [];
        focusPoints.forEach(poi => {
            const items = focusPointFeeds[poi.id] || [];
            if (items.length > 0) {
                active.push(poi);
            } else {
                quiet.push(poi);
            }
        });
        return { activePoints: active, quietPoints: quiet };
    }, [focusPoints, focusPointFeeds]);


    return (
        <div>
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-2xl font-bold text-gray-800">我的关注点</h2>
                    {!isLoading && (
                        <span className="text-sm text-gray-500">
                            <span className="text-blue-600 font-bold">{activePoints.length}</span> 个有动态，
                            <span className="text-gray-400"> {quietPoints.length} 个暂无更新</span>
                        </span>
                    )}
                </div>
                <button onClick={onManageClick} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-xs text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                    <GearIcon className="w-3.5 h-3.5" />
                    管理
                </button>
             </div>

             {isLoading ? (
                <div className="text-center py-10 text-gray-500">正在加载关注点动态...</div>
             ) : focusPoints.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed">
                    <p className="text-gray-500">您还未设置任何关注点。</p>
                    <button onClick={onManageClick} className="mt-2 text-sm font-semibold text-blue-600 hover:underline">立即设置</button>
                </div>
             ) : (
                <div className="space-y-6">
                    {/* Active Points in Masonry Layout */}
                    {activePoints.length > 0 && (
                        <div className="columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4">
                            {activePoints.map(point => (
                                <CompactFocusCard 
                                    key={point.id} 
                                    entityName={point.content} 
                                    items={focusPointFeeds[point.id] || []} 
                                />
                            ))}
                        </div>
                    )}

                    {/* Quiet Points in a compact list */}
                    {quietPoints.length > 0 && (
                        <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
                            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">今日暂无动态</p>
                            <div className="flex flex-wrap gap-2">
                                {quietPoints.map(point => (
                                    <QuietFocusChip key={point.id} entityName={point.content} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
             )}
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
