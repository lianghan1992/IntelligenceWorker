
import React, { useState, useEffect, useCallback } from 'react';
import { SystemSource } from '../../types';
import { getSources, getUserSubscribedSources, addUserSourceSubscription, deleteUserSourceSubscription } from '../../api';
import { RssIcon, CheckCircleIcon, PlusIcon, RefreshIcon } from '../icons';

export const SubscriptionManager: React.FC = () => {
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allSources, subscribed] = await Promise.all([
                getSources(),
                getUserSubscribedSources()
            ]);
            setSources(allSources);
            setSubscribedIds(new Set(subscribed.map(s => s.id)));
        } catch (error) {
            console.error("Failed to load sources", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleSubscription = async (source: SystemSource) => {
        const isSubscribed = subscribedIds.has(source.id);
        setProcessingId(source.id);
        try {
            if (isSubscribed) {
                await deleteUserSourceSubscription(source.id);
                setSubscribedIds(prev => {
                    const next = new Set(prev);
                    next.delete(source.id);
                    return next;
                });
            } else {
                await addUserSourceSubscription(source.id);
                setSubscribedIds(prev => new Set(prev).add(source.id));
            }
        } catch (error) {
            console.error("Toggle failed", error);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <RssIcon className="w-5 h-5 text-indigo-600" />
                    订阅源管理
                </h2>
                <button onClick={fetchData} className="text-gray-400 hover:text-gray-600">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="p-6">
                {isLoading && sources.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sources.map(source => {
                            const isSubscribed = subscribedIds.has(source.id);
                            const isProcessing = processingId === source.id;
                            
                            return (
                                <div 
                                    key={source.id}
                                    className={`
                                        relative flex items-center justify-between p-4 rounded-lg border transition-all
                                        ${isSubscribed 
                                            ? 'bg-indigo-50 border-indigo-200' 
                                            : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <RssIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className={`font-medium ${isSubscribed ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                {source.source_name}
                                            </h3>
                                            <p className={`text-xs ${isSubscribed ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                {isSubscribed ? '已订阅' : '未订阅'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => toggleSubscription(source)}
                                        disabled={isProcessing}
                                        className={`
                                            p-2 rounded-full transition-colors
                                            ${isSubscribed 
                                                ? 'text-indigo-600 hover:bg-indigo-100' 
                                                : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        {isProcessing ? (
                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : isSubscribed ? (
                                            <CheckCircleIcon className="w-6 h-6" />
                                        ) : (
                                            <PlusIcon className="w-6 h-6" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
