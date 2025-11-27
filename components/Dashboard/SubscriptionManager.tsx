
import React, { useState, useEffect, useCallback } from 'react';
import { SystemSource } from '../../types';
import { getSources, getUserSubscribedSources, addUserSourceSubscription, deleteUserSourceSubscription } from '../../api';
import { RssIcon, CheckIcon, PlusIcon, RefreshIcon } from '../icons';

const SourceNode: React.FC<{
    source: SystemSource;
    isSubscribed: boolean;
    onToggle: (id: string, current: boolean) => void;
    isLoading: boolean;
}> = ({ source, isSubscribed, onToggle, isLoading }) => {
    return (
        <div 
            onClick={() => !isLoading && onToggle(source.id, isSubscribed)}
            className={`
                relative group cursor-pointer overflow-hidden rounded-[1.5rem] p-5 transition-all duration-300 select-none
                ${isSubscribed 
                    ? 'bg-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.3)] border border-indigo-100 transform hover:-translate-y-1' 
                    : 'bg-white/40 border border-slate-200 hover:bg-white/60 hover:border-slate-300'
                }
            `}
        >
            {/* Active Indicator Glow */}
            {isSubscribed && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-xl rounded-bl-full -mr-4 -mt-4"></div>
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                    ${isSubscribed ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}
                `}>
                    <RssIcon className="w-5 h-5" />
                </div>
                <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300
                    ${isSubscribed 
                        ? 'bg-indigo-600 border-indigo-600 text-white scale-100' 
                        : 'bg-transparent border-slate-300 text-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-400'
                    }
                `}>
                    {isLoading ? (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : isSubscribed ? (
                        <CheckIcon className="w-3 h-3" />
                    ) : (
                        <PlusIcon className="w-3 h-3" />
                    )}
                </div>
            </div>

            <div className="relative z-10">
                <h3 className={`font-bold text-base mb-1 transition-colors ${isSubscribed ? 'text-slate-800' : 'text-slate-500'}`}>
                    {source.source_name}
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${isSubscribed ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <span className="text-xs font-medium text-slate-400">
                        {isSubscribed ? '已连接' : '未订阅'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const SubscriptionManager: React.FC = () => {
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allSources, subscribedSources] = await Promise.all([
                getSources(),
                getUserSubscribedSources(),
            ]);
            setSources(allSources);
            setSubscribedIds(new Set(subscribedSources.map(s => s.id)));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggle = async (sourceId: string, isSubscribed: boolean) => {
        setActionLoadingId(sourceId);
        try {
            if (isSubscribed) {
                await deleteUserSourceSubscription(sourceId);
                setSubscribedIds(prev => {
                    const next = new Set(prev);
                    next.delete(sourceId);
                    return next;
                });
            } else {
                await addUserSourceSubscription(sourceId);
                setSubscribedIds(prev => new Set(prev).add(sourceId));
            }
        } catch (error) {
            console.error("Toggle failed", error);
        } finally {
            setActionLoadingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-white/40 rounded-[1.5rem] animate-pulse border border-white/50"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {sources.map(source => (
                    <SourceNode
                        key={source.id}
                        source={source}
                        isSubscribed={subscribedIds.has(source.id)}
                        onToggle={handleToggle}
                        isLoading={actionLoadingId === source.id}
                    />
                ))}
                
                {/* Add New Placehoder (Visual Only) */}
                <div className="border-2 border-dashed border-slate-300/50 rounded-[1.5rem] flex flex-col items-center justify-center text-slate-400 p-6 hover:bg-white/30 hover:border-indigo-300 hover:text-indigo-500 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2 group-hover:bg-indigo-50 transition-colors">
                        <PlusIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">请求新数据源</span>
                </div>
            </div>
        </div>
    );
};
