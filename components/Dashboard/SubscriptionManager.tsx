
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SystemSource } from '../../types';
import { getSources, getUserSubscribedSources, addUserSourceSubscription, deleteUserSourceSubscription } from '../../api';
import { RssIcon, CheckIcon, PlusIcon } from '../icons';

const CompactSourceCard: React.FC<{
    source: SystemSource;
    isSubscribed: boolean;
    onToggleSubscription: (sourceId: string, isSubscribed: boolean) => void;
    isLoading: boolean;
}> = ({ source, isSubscribed, onToggleSubscription, isLoading }) => {
    
    return (
        <div className="flex-shrink-0 w-40 p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center group">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 border border-blue-100">
                <RssIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 truncate w-full px-1" title={source.source_name}>{source.source_name}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 mb-3">{source.points_count} 个情报点</p>
            
            <button
                onClick={() => onToggleSubscription(source.id, isSubscribed)}
                disabled={isLoading}
                className={`w-full py-1.5 px-2 text-[10px] font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-1 transform active:scale-95 ${
                    isSubscribed
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
            >
                {isLoading ? (
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : isSubscribed ? (
                    <><CheckIcon className="w-3 h-3"/>已订阅</>
                ) : (
                    <><PlusIcon className="w-3 h-3"/>订阅</>
                )}
            </button>
        </div>
    );
};


export const SubscriptionManager: React.FC = () => {
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [allSources, subscribedSources] = await Promise.all([
                getSources(),
                getUserSubscribedSources(),
            ]);
            setSources(allSources);
            setSubscribedIds(new Set(subscribedSources.map(s => s.id)));
        } catch (err: any) {
            setError(err.message || '加载情报源失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleSubscription = async (sourceId: string, isCurrentlySubscribed: boolean) => {
        setActionLoadingId(sourceId);
        setError(null);
        try {
            if (isCurrentlySubscribed) {
                await deleteUserSourceSubscription(sourceId);
                setSubscribedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(sourceId);
                    return newSet;
                });
            } else {
                await addUserSourceSubscription(sourceId);
                setSubscribedIds(prev => new Set(prev).add(sourceId));
            }
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setActionLoadingId(null);
        }
    };
    
    if (isLoading) {
        return <div className="text-center p-8 text-gray-500 text-sm">正在加载情报源...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500 text-sm">错误: {error}</div>;
    }

    // Sort sources: Subscribed first
    const sortedSources = [...sources].sort((a, b) => {
        const aSub = subscribedIds.has(a.id) ? 1 : 0;
        const bSub = subscribedIds.has(b.id) ? 1 : 0;
        return bSub - aSub;
    });

    return (
        <div className="border-t border-gray-200 pt-8 mt-4">
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <RssIcon className="w-5 h-5 text-blue-600"/>
                    情报源订阅
                </h2>
                <span className="text-xs text-gray-400">滑动查看更多</span>
            </div>
            
            <div className="relative group">
                {/* Left Fade */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none"></div>
                
                {/* Horizontal Scroll Container */}
                <div className="flex overflow-x-auto gap-3 pb-4 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent snap-x">
                    {sortedSources.map(source => (
                        <div key={source.id} className="snap-start">
                            <CompactSourceCard
                                source={source}
                                isSubscribed={subscribedIds.has(source.id)}
                                onToggleSubscription={handleToggleSubscription}
                                isLoading={actionLoadingId === source.id}
                            />
                        </div>
                    ))}
                </div>

                {/* Right Fade */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none"></div>
            </div>
        </div>
    );
};
