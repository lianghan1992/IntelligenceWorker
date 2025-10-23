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
    const subscribers = useMemo(() => Math.floor(1000 + Math.random() * 9000), []);

    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group">
            <div>
                <h3 className="text-base font-bold text-gray-800 truncate group-hover:text-blue-600" title={source.source_name}>{source.source_name}</h3>
                <div className="text-xs text-gray-500 mt-3 space-y-2">
                    <p className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 bg-slate-100 rounded-full border border-slate-200"><RssIcon className="w-3 h-3 text-slate-500" /></span>
                        <span>{source.points_count} 个情报点</span>
                    </p>
                    <p className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 bg-slate-100 rounded-full border border-slate-200"><UsersIcon className="w-3 h-3 text-slate-500" /></span>
                        <span>{subscribers.toLocaleString()} 订阅</span>
                    </p>
                </div>
            </div>
            <button
                onClick={() => onToggleSubscription(source.id, isSubscribed)}
                disabled={isLoading}
                className={`w-full mt-4 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 transform active:scale-95 ${
                    isSubscribed
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                } disabled:opacity-50 disabled:cursor-wait`}
            >
                {isLoading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : isSubscribed ? (
                    <><CheckIcon className="w-4 h-4"/>已订阅</>
                ) : (
                    <><PlusIcon className="w-4 h-4"/>订阅</>
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