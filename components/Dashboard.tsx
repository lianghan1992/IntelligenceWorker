import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Subscription, User, SystemSource, FocusPoint, InfoItem, ApiPoi } from '../types';
import { DashboardWidgets } from './DashboardWidgets';
import { PlusIcon, TagIcon, CloseIcon, TrashIcon } from './icons';
import {
  searchArticles,
  getSources,
  getArticles,
  getUserPois,
  addUserPoi,
  deleteUserPoi,
  getUserSubscribedSources,
  addUserSourceSubscription,
  deleteUserSourceSubscription,
  getPointsBySourceName,
} from '../api';
import { ConfirmationModal } from './ConfirmationModal';


interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- MODAL FOR ADDING FOCUS POINT ---
const AddFocusPointModal: React.FC<{
    onClose: () => void;
    onAdd: (title: string, keywords: string) => void;
    isLoading: boolean;
}> = ({ onClose, onAdd, isLoading }) => {
    const [title, setTitle] = useState('');
    const [keywords, setKeywords] = useState('');
    const isFormValid = title.trim() && keywords.trim();

    const handleSubmit = () => {
        if (isFormValid && !isLoading) {
            onAdd(title, keywords);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">添加新的关注点</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="focus-title" className="block text-sm font-medium text-gray-700 mb-1">关注点内容/标题</label>
                        <input
                            id="focus-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                            placeholder="例如：800V高压平台技术与应用"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="focus-keywords" className="block text-sm font-medium text-gray-700 mb-1">关键词 (用逗号分隔)</label>
                        <textarea
                            id="focus-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                            rows={3}
                            placeholder="例如: 800V, 高压快充, 碳化硅, SiC, 供应链"
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={handleSubmit} disabled={!isFormValid || isLoading}
                        className="py-2 px-4 w-28 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
                    >
                        {isLoading ? <Spinner /> : '添加'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- REFACTORED MY FOCUS POINTS ---
const FocusPointCard: React.FC<{ point: FocusPoint, onDelete: () => void }> = ({ point, onDelete }) => (
    <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group relative">
        <button 
            onClick={onDelete}
            className="absolute top-1 right-1 p-1 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`删除 ${point.title}`}
        >
            <TrashIcon className="w-3 h-3" />
        </button>
        <div className="flex justify-between items-start">
            <h4 className="font-semibold text-slate-800 text-sm pr-4 group-hover:text-blue-600 transition-colors line-clamp-2">{point.title}</h4>
            <div className="text-center flex-shrink-0 bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5">
                <p className="font-bold text-sm">{point.relatedCount}</p>
                <p className="text-xs -mt-1 leading-tight">条</p>
            </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
            {point.keywords.slice(0, 3).map(keyword => (
                <span key={keyword} className="px-1.5 py-0.5 text-xs font-medium text-slate-600 bg-slate-200/70 rounded-full">{keyword}</span>
            ))}
        </div>
    </div>
);


const MyFocusPoints: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [focusPoints, setFocusPoints] = useState<FocusPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [pointToDelete, setPointToDelete] = useState<FocusPoint | null>(null);

    const allPointIds = useMemo(() => subscriptions.map(sub => sub.id), [subscriptions]);

    const transformApiPoiToFocusPoint = (apiPoi: ApiPoi, relatedCount = 0): FocusPoint => ({
        id: apiPoi.id,
        title: apiPoi.content,
        keywords: apiPoi.keywords.split(',').map(k => k.trim()).filter(Boolean),
        relatedCount: relatedCount,
    });

    useEffect(() => {
        const fetchPoisAndCounts = async () => {
            setIsLoading(true);
            setError('');
            try {
                const apiPois = await getUserPois();

                if (allPointIds.length === 0) {
                    const initialPoints = apiPois.map(poi => transformApiPoiToFocusPoint(poi, 0));
                    setFocusPoints(initialPoints);
                    return;
                }
                
                const countPromises = apiPois.map(poi => 
                    searchArticles(poi.content, allPointIds, 50)
                        .then(results => ({ poiId: poi.id, count: results.length }))
                        .catch(err => {
                            console.error(`Failed to get count for POI ${poi.id}:`, err);
                            return { poiId: poi.id, count: 0 };
                        })
                );

                const countsResults = await Promise.all(countPromises);
                
                const countsMap = new Map(countsResults.map(res => [res.poiId, res.count]));

                const enrichedFocusPoints = apiPois.map(poi => 
                    transformApiPoiToFocusPoint(poi, countsMap.get(poi.id) || 0)
                );

                setFocusPoints(enrichedFocusPoints);

            } catch (err: any) {
                setError('无法加载关注点: ' + err.message);
                setFocusPoints([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPoisAndCounts();
    }, [allPointIds]);

    const handleAddFocusPoint = async (title: string, keywords: string) => {
        if (allPointIds.length === 0) {
            setError('请先在后台管理页面添加至少一个情报订阅点以进行搜索。');
            setIsModalOpen(false);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const newApiPoi = await addUserPoi({
                content: title,
                keywords: keywords,
            });

            const searchResults = await searchArticles(title, allPointIds, 50);
            const newPoint = transformApiPoiToFocusPoint(newApiPoi, searchResults.length);
            
            setFocusPoints(prev => [newPoint, ...prev]);
            setIsModalOpen(false);

        } catch (err: any) {
            setError(err.message || '添加关注点失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!pointToDelete) return;
        setIsLoading(true);
        setError('');
        try {
            await deleteUserPoi(pointToDelete.id);
            setFocusPoints(prev => prev.filter(p => p.id !== pointToDelete.id));
            setPointToDelete(null);
        } catch (err: any) {
            setError('删除失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">我的关注点</h2>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition"
                >
                    <PlusIcon className="w-4 h-4" />
                    添加关注
                </button>
            </div>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            
            {isLoading && !focusPoints.length ? (
                <div className="text-center py-10">加载中...</div>
            ) : focusPoints.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {focusPoints.map(point => (
                        <FocusPointCard key={point.id} point={point} onDelete={() => setPointToDelete(point)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white border border-dashed rounded-xl">
                    <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">暂无关注点</h3>
                    <p className="mt-1 text-sm text-gray-500">点击“添加关注”来创建您的第一个情报追踪主题。</p>
                </div>
            )}
            
            {isModalOpen && <AddFocusPointModal onClose={() => setIsModalOpen(false)} onAdd={handleAddFocusPoint} isLoading={isLoading} />}
            {pointToDelete && (
                <ConfirmationModal
                    title="确认删除关注点"
                    message={`您确定要删除 "${pointToDelete.title}" 吗？此操作无法撤销。`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setPointToDelete(null)}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

// --- REFACTORED SOURCE SUBSCRIPTIONS ---
const SourceLogo: React.FC<{ sourceName: string }> = ({ sourceName }) => {
    const [imgError, setImgError] = useState(false);
    const iconUrl = `https://logo.clearbit.com/${sourceName.replace(/ /g, '').toLowerCase()}.com`;

    useEffect(() => {
        setImgError(false);
    }, [iconUrl]);

    if (imgError || !sourceName) {
        return (
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                {sourceName ? sourceName.charAt(0) : '?'}
            </div>
        );
    }

    return (
        <img 
            src={iconUrl} 
            alt={sourceName} 
            className="w-10 h-10 rounded-lg object-contain bg-white border flex-shrink-0"
            onError={() => setImgError(true)}
        />
    );
};

const SourceCard: React.FC<{
    source: SystemSource;
    isSubscribed: boolean;
    onToggleSubscription: (sourceId: string, isSubscribed: boolean) => void;
}> = ({ source, isSubscribed, onToggleSubscription }) => (
    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col items-center text-center">
        <SourceLogo sourceName={source.name} />
        <h3 className="font-semibold text-slate-800 mt-2 truncate w-full text-sm">{source.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
            {source.points_count} 个情报点
        </p>
        <button
            onClick={() => onToggleSubscription(source.id, isSubscribed)}
            className={`mt-3 w-full px-3 py-1.5 font-semibold rounded-md transition text-xs ${
                isSubscribed
                ? 'bg-white text-slate-600 border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                : 'bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700'
            }`}
        >
            {isSubscribed ? '取消订阅' : '订阅'}
        </button>
    </div>
);

const SourceSubscriptions: React.FC = () => {
    const [allSources, setAllSources] = useState<SystemSource[]>([]);
    const [userSourceIds, setUserSourceIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [baseSources, userSourcesData] = await Promise.all([
                getSources(),
                getUserSubscribedSources(),
            ]);
            
            const enrichedSources = await Promise.all(
                baseSources.map(async (source) => {
                    try {
                        const points = await getPointsBySourceName(source.name);
                        return { ...source, points_count: points.length };
                    } catch (err) {
                        console.error(`Failed to get point count for ${source.name}`, err);
                        return source;
                    }
                })
            );

            setAllSources(enrichedSources);
            setUserSourceIds(new Set(userSourcesData.map(s => s.id)));

        } catch (err: any) {
            setError('加载情报源失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleSubscription = async (sourceId: string, isCurrentlySubscribed: boolean) => {
        const originalUserSourceIds = new Set(userSourceIds);
        const optimisticIds = new Set(userSourceIds);
        
        if (isCurrentlySubscribed) {
            optimisticIds.delete(sourceId);
        } else {
            optimisticIds.add(sourceId);
        }
        setUserSourceIds(optimisticIds);
        
        try {
            if (isCurrentlySubscribed) {
                await deleteUserSourceSubscription(sourceId);
            } else {
                await addUserSourceSubscription(sourceId);
            }
        } catch (err: any) {
            setError(`操作失败: ${err.message}`);
            setUserSourceIds(originalUserSourceIds);
        }
    };


    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">情报源订阅</h2>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            {isLoading ? (
                <div className="text-center p-8">正在加载情报源...</div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
                    {allSources.map(source => (
                        <SourceCard
                            key={source.id}
                            source={source}
                            isSubscribed={userSourceIds.has(source.id)}
                            onToggleSubscription={handleToggleSubscription}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions }) => {
    
    const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
    
    const loadArticles = useCallback(async () => {
        try {
            const pointIds = subscriptions.map(sub => sub.id);
            if (pointIds.length === 0) {
                setInfoItems([]);
                return; 
            }
            const data = await getArticles(pointIds, { page: 1, limit: 50 });
            setInfoItems(data.items);
        } catch (error) {
            console.error("Failed to load articles:", error);
            setInfoItems([]);
        }
    }, [subscriptions]);

    useEffect(() => {
        loadArticles();
    }, [loadArticles]);


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
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">早上好, {user.username}！</h1>
                    <p className="text-gray-500 mt-1">这是您今天的情报概览。</p>
                </div>

                {/* Widgets */}
                <DashboardWidgets stats={stats} />
                
                {/* My Focus Points */}
                <MyFocusPoints subscriptions={subscriptions} />

                {/* Source Subscriptions */}
                <SourceSubscriptions />
            </div>
        </div>
    );
};