import React, { useState, useMemo, useEffect } from 'react';
import { InfoItem, Subscription, User, SystemSource, SearchResult } from '../types';
import { DashboardWidgets } from './DashboardWidgets';
import { PlusIcon, SearchIcon, RssIcon, ChevronDownIcon, ChevronUpIcon, UsersIcon, BookmarkIcon } from './icons';
import { searchArticles, getSources } from '../api';

interface DashboardProps {
    user: User;
    infoItems: InfoItem[];
    subscriptions: Subscription[];
    onAddSource: () => void;
}

const FocusPointCard: React.FC<{
    point: { id: number; query: string; results: SearchResult[]; isOpen: boolean; };
    onToggle: (id: number) => void;
}> = ({ point, onToggle }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-300">
        <button onClick={() => onToggle(point.id)} className="w-full p-4 text-left flex justify-between items-center">
            <div>
                <p className="font-semibold text-gray-800">{point.query}</p>
                <p className="text-sm text-gray-500">{point.results.length} 条相关情报</p>
            </div>
            {point.isOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
        </button>
        {point.isOpen && (
            <div className="px-4 pb-4 animate-in fade-in-0 duration-300">
                <ul className="divide-y divide-gray-100 border-t">
                    {point.results.length > 0 ? point.results.map(result => (
                        <li key={result.article_id} className="py-3">
                            <p className="text-sm font-medium text-blue-600 truncate">{result.title}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                <span>来源: {result.article?.source_name || '未知'}</span>
                                <span className="font-mono text-blue-500">得分: {result.score.toFixed(2)}</span>
                            </div>
                        </li>
                    )) : (
                        <li className="py-4 text-center text-sm text-gray-500">未找到相关情报。</li>
                    )}
                </ul>
            </div>
        )}
    </div>
);

const MyFocusPoints: React.FC<{ subscriptions: Subscription[]; allArticles: InfoItem[] }> = ({ subscriptions, allArticles }) => {
    const [focusPoints, setFocusPoints] = useState<Array<{ id: number; query: string; results: SearchResult[]; isOpen: boolean; }>>([]);
    const [newQuery, setNewQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const allPointIds = useMemo(() => subscriptions.map(sub => sub.id), [subscriptions]);

    const handleAddFocusPoint = async () => {
        if (!newQuery.trim()) return;
        if (allPointIds.length === 0) {
            setError('请先在后台管理页面添加至少一个情报订阅点以进行搜索。');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const results = await searchArticles(newQuery, allPointIds, 5);
            const enrichedResults = results.map(result => ({
                ...result,
                article: allArticles.find(item => item.id === result.article_id)
            })).filter(r => r.article) as (SearchResult & { article: InfoItem })[];

            const newFocusPoint = {
                id: Date.now(),
                query: newQuery,
                results: enrichedResults,
                isOpen: true,
            };
            setFocusPoints(prev => [newFocusPoint, ...prev]);
            setNewQuery('');
        } catch (err: any) {
            setError(err.message || '搜索失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleFocusPoint = (id: number) => {
        setFocusPoints(prev => prev.map(fp => fp.id === id ? { ...fp, isOpen: !fp.isOpen } : fp));
    };

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">我的关注点</h2>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={newQuery}
                            onChange={(e) => setNewQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddFocusPoint()}
                            placeholder="输入您关心的话题，如“800V高压平台最新进展”"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        onClick={handleAddFocusPoint}
                        disabled={isLoading || !newQuery.trim()}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex-shrink-0"
                    >
                        {isLoading ? '搜索中...' : '添加关注'}
                    </button>
                </div>
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
            <div className="mt-4 space-y-3">
                {focusPoints.map(point => (
                    <FocusPointCard key={point.id} point={point} onToggle={toggleFocusPoint} />
                ))}
            </div>
        </div>
    );
};

const SourceSubscriptions: React.FC = () => {
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const data = await getSources();
                setSources(data);
            } catch (error) {
                console.error("Failed to fetch sources for dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSources();
    }, []);

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">情报源订阅</h2>
            {isLoading ? (
                <div className="text-center p-8">正在加载情报源...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sources.map(source => (
                        <div key={source.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center mb-3">
                                    <img src={source.iconUrl} alt={source.name} className="w-10 h-10 rounded-lg mr-3" />
                                    <h3 className="font-bold text-gray-800">{source.name}</h3>
                                </div>
                                <div className="flex justify-around text-center my-4">
                                    <div>
                                        <p className="font-bold text-lg text-blue-600">{source.subscription_count}</p>
                                        <p className="text-xs text-gray-500">情报点</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-blue-600">{(source.subscriberCount || 0).toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">订阅数</p>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full mt-2 py-2 px-4 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition text-sm">
                                订阅
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ user, infoItems, subscriptions, onAddSource }) => {
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
        <div className="p-6 bg-gray-50/50 overflow-y-auto h-full">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">早上好, {user.username}！</h1>
                        <p className="text-gray-500 mt-1">这是您今天的情报概览。</p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                         <button 
                            onClick={onAddSource}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            添加自定义情报源
                        </button>
                    </div>
                </div>

                {/* Widgets */}
                <DashboardWidgets stats={stats} />
                
                {/* My Focus Points */}
                <MyFocusPoints subscriptions={subscriptions} allArticles={infoItems} />

                {/* Source Subscriptions */}
                <SourceSubscriptions />
            </div>
        </div>
    );
};