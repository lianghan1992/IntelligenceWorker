
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SystemSource } from '../../types';
import { getSources, getUserSubscribedSources, addUserSourceSubscription, deleteUserSourceSubscription } from '../../api';
import { RssIcon, CheckIcon, PlusIcon } from '../icons';

const SourceCard: React.FC<{
    source: SystemSource;
    isSubscribed: boolean;
    onToggleSubscription: (sourceId: string, isSubscribed: boolean) => void;
    isLoading: boolean;
}> = ({ source, isSubscribed, onToggleSubscription, isLoading }) => {
    // Mocked subscriber count as API does not provide it.
    const subscribers = useMemo(() => Math.floor(1000 + Math.random() * 9000), []);

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col items-start justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
                <h3 className="text-lg font-bold text-gray-800">{source.source_name}</h3>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <p>{source.points_count}个情报点</p>
                    <p>{subscribers.toLocaleString('en-US')}人已订阅</p>
                </div>
            </div>
            <button
                onClick={() => onToggleSubscription(source.id, isSubscribed)}
                disabled={isLoading}
                className={`w-full mt-4 py-2 px-4 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    isSubscribed
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:bg-gray-200 disabled:cursor-wait`}
            >
                {isSubscribed ? <CheckIcon className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}
                {isSubscribed ? '已订阅' : '订阅'}
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
        return <div className="text-center p-8 text-gray-500">正在加载情报源...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">错误: {error}</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <RssIcon className="w-6 h-6 text-blue-600"/>
                    情报源订阅
                </h2>
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {sources.map(source => (
                    <SourceCard
                        key={source.id}
                        source={source}
                        isSubscribed={subscribedIds.has(source.id)}
                        onToggleSubscription={handleToggleSubscription}
                        isLoading={actionLoadingId === source.id}
                    />
                ))}
            </div>
        </div>
    );
};