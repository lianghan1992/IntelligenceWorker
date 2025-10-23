import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SystemSource } from '../../types';
import { getSources, getUserSubscribedSources, addUserSourceSubscription, deleteUserSourceSubscription } from '../../api';
import { RssIcon, CheckIcon, PlusIcon, UsersIcon } from '../icons';

const SourceCard: React.FC<{
    source: SystemSource;
    isSubscribed: boolean;
    onToggleSubscription: (sourceId: string, isSubscribed: boolean) => void;
    isLoading: boolean;
}> = ({ source, isSubscribed, onToggleSubscription, isLoading }) => {
    // Mocked subscriber count as API does not provide it.
    const subscribers = useMemo(() => Math.floor(1000 + Math.random() * 9000), []);

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full">
            <div>
                <h3 className="text-base font-bold text-gray-800 truncate" title={source.source_name}>{source.source_name}</h3>
                <div className="text-xs text-gray-500 mt-2 space-y-1.5">
                    <p className="flex items-center gap-1.5">
                        <RssIcon className="w-3.5 h-3.5" />
                        <span>{source.points_count} 个情报点</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                        <UsersIcon className="w-3.5 h-3.5" />
                        <span>{subscribers.toLocaleString()} 订阅</span>
                    </p>
                </div>
            </div>
            <button
                onClick={() => onToggleSubscription(source.id, isSubscribed)}
                disabled={isLoading}
                className={`w-full mt-4 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    isSubscribed
                        ? 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                } disabled:opacity-50 disabled:cursor-wait`}
            >
                {isSubscribed ? <CheckIcon className="w-4 h-4 text-green-500"/> : <PlusIcon className="w-4 h-4"/>}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
